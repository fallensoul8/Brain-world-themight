import type { NPCWorldState, NPCInteraction, NPCAction, NPCDecisionInput } from './types.js';
import { getNPCPipeline } from './decision-pipeline.js';
import { getNPCMemory } from './memory.js';
import { getAISystem } from './system.js';

/**
 * AI ↔ Agentshire World Bridge
 * Adapts world state → AI reasoning → world actions
 */
export class AIBridgeAdapter implements AIBridgeAdapter {
  private npcPersonalities = new Map<string, string>();
  private npcWorldStates = new Map<string, NPCWorldState>();
  private worldStateProvider: WorldStateProvider | null = null;
  private actionExecutor: ActionExecutor | null = null;

  constructor() {
    console.log('[bridge] AI Bridge initialized');
  }

  /**
   * Set callbacks for world state and action execution
   */
  setWorldInterface(provider: WorldStateProvider, executor: ActionExecutor): void {
    this.worldStateProvider = provider;
    this.actionExecutor = executor;
    console.log('[bridge] World interface registered');
  }

  /**
   * Initialize AI for a new NPC
   */
  async initializeNPC(npcId: string, personality: string): Promise<void> {
    this.npcPersonalities.set(npcId, personality);

    // Store personality as semantic memory
    const memory = getNPCMemory(npcId);
    await memory.store('semantic', `Personality: ${personality}`);

    console.log(`[bridge] NPC ${npcId} AI initialized with personality: "${personality}"`);
  }

  /**
   * Called every frame/tick for NPC decision-making
   */
  async onNPCTick(npcId: string, worldState: NPCWorldState): Promise<NPCAction> {
    try {
      // Cache world state
      this.npcWorldStates.set(npcId, worldState);

      // Prepare decision input
      const decisionInput = await this.prepareDecisionInput(npcId, worldState);

      // Get pipeline and process
      const pipeline = getNPCPipeline(npcId);
      const action = await pipeline.process(decisionInput);

      // Execute action in world
      if (this.actionExecutor) {
        await this.actionExecutor.execute(npcId, action);
      }

      return action;
    } catch (err) {
      console.error(`[bridge] Tick failed for NPC ${npcId}:`, err);
      // Return safe fallback
      return {
        type: 'think',
        content: 'Processing...',
        reasoning: 'Error recovery',
      };
    }
  }

  /**
   * Handle interaction events (chat, trade, conflict)
   */
  async onNPCInteraction(npcId: string, interaction: NPCInteraction): Promise<void> {
    try {
      const memory = getNPCMemory(npcId);

      // Store interaction as episodic memory
      const description = `${interaction.type} with ${interaction.initiatorId}: ${interaction.content || '(no content)'}`;
      await memory.store('episodic', description, {
        interactionType: interaction.type,
        withNPC: interaction.initiatorId,
        timestamp: Date.now(),
      });

      console.log(`[bridge] NPC ${npcId} interaction recorded: ${interaction.type}`);

      // Update relationships based on interaction type
      const worldState = this.npcWorldStates.get(npcId);
      if (worldState) {
        const currentAffinity = worldState.relationships[interaction.initiatorId] ?? 0;
        let delta = 0;

        switch (interaction.type) {
          case 'chat':
            delta = 5; // Positive
            break;
          case 'trade':
            delta = 10; // Very positive
            break;
          case 'conflict':
            delta = -15; // Very negative
            break;
          case 'quest':
            delta = 20; // Extremely positive
            break;
        }

        worldState.relationships[interaction.initiatorId] = Math.max(-100, Math.min(100, currentAffinity + delta));
      }
    } catch (err) {
      console.error(`[bridge] Interaction handling failed for NPC ${npcId}:`, err);
    }
  }

  /**
   * Cleanup when NPC is removed
   */
  async shutdownNPC(npcId: string): Promise<void> {
    try {
      this.npcPersonalities.delete(npcId);
      this.npcWorldStates.delete(npcId);
      console.log(`[bridge] NPC ${npcId} AI shut down`);
    } catch (err) {
      console.error(`[bridge] Shutdown failed for NPC ${npcId}:`, err);
    }
  }

  /**
   * Prepare AI decision input from world state
   */
  private async prepareDecisionInput(npcId: string, worldState: NPCWorldState): Promise<NPCDecisionInput> {
    const personality = this.npcPersonalities.get(npcId) || 'neutral';
    const memory = getNPCMemory(npcId);

    // Get relevant memories for context
    const recentMemories = await memory.recall(worldState.currentActivity || worldState.status, 2);

    // Build context string
    const contextParts = [
      `Role: ${personality}`,
      `Status: ${worldState.status}`,
      ...(worldState.currentActivity ? [`Activity: ${worldState.currentActivity}`] : []),
    ];

    const context = contextParts.join('; ');

    // Get location context from world provider
    let location = `Location[${worldState.position.x.toFixed(1)},${worldState.position.y.toFixed(1)}]`;
    if (this.worldStateProvider) {
      try {
        location = await this.worldStateProvider.getLocationName(worldState.position);
      } catch {
        // Use fallback
      }
    }

    // Get nearby NPCs and items
    let nearbyNpcs: string[] = [];
    let nearbyItems: string[] = [];

    if (this.worldStateProvider) {
      try {
        nearbyNpcs = await this.worldStateProvider.getNearbyNPCs(npcId, worldState.position, 5); // 5 unit radius
        nearbyItems = await this.worldStateProvider.getNearbyItems(worldState.position, 5);
      } catch {
        // Use defaults
      }
    }

    // Determine time of day (placeholder)
    const hour = new Date().getHours();
    const timeOfDay =
      hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

    return {
      npcId,
      perception: {
        nearbyNpcs,
        nearbyItems,
        location,
        timeOfDay,
      },
      context,
      recentMemories,
    };
  }

  /**
   * Get cached world state for an NPC
   */
  getWorldState(npcId: string): NPCWorldState | null {
    return this.npcWorldStates.get(npcId) || null;
  }

  /**
   * Get personality description
   */
  getPersonality(npcId: string): string {
    return this.npcPersonalities.get(npcId) || 'unknown';
  }

  /**
   * Get system diagnostics
   */
  async getDiagnostics(): Promise<Record<string, unknown>> {
    const system = getAISystem();
    const health = await system.getHealth();

    return {
      bridge: {
        npcCount: this.npcWorldStates.size,
        personalitiesLoaded: this.npcPersonalities.size,
      },
      health,
      timestamp: Date.now(),
    };
  }
}

/**
 * World State Provider - interface for querying world data
 */
export interface WorldStateProvider {
  /**
   * Get human-readable location name from coordinates
   */
  getLocationName(position: { x: number; y: number; z: number }): Promise<string>;

  /**
   * Get nearby NPC IDs within radius
   */
  getNearbyNPCs(npcId: string, position: { x: number; y: number; z: number }, radius: number): Promise<string[]>;

  /**
   * Get nearby items within radius
   */
  getNearbyItems(position: { x: number; y: number; z: number }, radius: number): Promise<string[]>;
}

/**
 * Action Executor - interface for executing AI actions in world
 */
export interface ActionExecutor {
  /**
   * Execute an action in the world
   */
  execute(npcId: string, action: NPCAction): Promise<void>;
}

/**
 * Singleton instance
 */
let bridgeInstance: AIBridgeAdapter | null = null;

/**
 * Get or create bridge adapter singleton
 */
export function getAIBridge(): AIBridgeAdapter {
  if (!bridgeInstance) {
    bridgeInstance = new AIBridgeAdapter();
  }
  return bridgeInstance;
}

/**
 * Reset singleton (for testing)
 */
export function resetAIBridge(): void {
  bridgeInstance = null;
}

/**
 * Example integration with Agentshire
 * This shows how to wire the bridge into the plugin
 */
export class AgentshireBridgeIntegration {
  private bridge = getAIBridge();
  private system = getAISystem();

  /**
   * Initialize bridge with Agentshire callbacks
   */
  async setup(agentshireAPI: unknown): Promise<void> {
    // Set up world state provider
    const provider: WorldStateProvider = {
      async getLocationName(pos) {
        // Query Agentshire for location name
        return `Spot[${pos.x},${pos.y}]`;
      },
      async getNearbyNPCs(npcId, pos, radius) {
        // Query Agentshire for nearby NPCs
        return [];
      },
      async getNearbyItems(pos, radius) {
        // Query Agentshire for nearby items
        return [];
      },
    };

    // Set up action executor
    const executor: ActionExecutor = {
      async execute(npcId, action) {
        // Execute action in Agentshire world
        console.log(`[agentshire] NPC ${npcId} action: ${action.type}`);
      },
    };

    this.bridge.setWorldInterface(provider, executor);
    await this.system.initialize();

    console.log('[integration] Agentshire ↔ AI bridge ready');
  }

  /**
   * Register an NPC with AI
   */
  async registerNPC(npcId: string, personality: string): Promise<void> {
    await this.bridge.initializeNPC(npcId, personality);
  }

  /**
   * Tick an NPC (called from main sim loop)
   */
  async tickNPC(npcId: string, worldState: NPCWorldState): Promise<NPCAction> {
    return this.bridge.onNPCTick(npcId, worldState);
  }

  /**
   * Handle NPC interaction
   */
  async handleInteraction(npcId: string, interaction: NPCInteraction): Promise<void> {
    await this.bridge.onNPCInteraction(npcId, interaction);
  }

  /**
   * Cleanup NPC
   */
  async unregisterNPC(npcId: string): Promise<void> {
    await this.bridge.shutdownNPC(npcId);
  }
}
