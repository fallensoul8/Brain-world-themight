// src/ai/plugin-hook.ts
// Integration entry point: wires AI system into Agentshire lifecycle

import { getAISystem, getNPCMemory, getNPCPipeline } from './index';
import { AIBridgeAdapter, NPCWorldState, NPCInteraction, NPCAction } from './types';
import { AgentshireBridgeIntegration } from './bridge-adapter';

let aiBridge: AgentshireBridgeIntegration | null = null;

/**
 * Called when the plugin loads
 * Initializes all AI subsystems and hooks into Agentshire events
 */
export async function initializeAIPlugin(agentshireAPI: any): Promise<void> {
  console.log('[AI Plugin] Initializing AI systems...');

  try {
    // Initialize core AI systems (Ollama, Memory, Pipeline, etc.)
    const aiSystem = getAISystem();
    await aiSystem.initialize();
    
    console.log('[AI Plugin] ✅ AI systems initialized');

    // Create bridge adapter with Agentshire API
    aiBridge = new AgentshireBridgeIntegration(agentshireAPI);

    // Hook into NPC lifecycle events
    hookNPCEvents(agentshireAPI);
    
    // Hook into world state events
    hookWorldStateEvents(agentshireAPI);

    console.log('[AI Plugin] ✅ Agentshire hooks registered');
    console.log('[AI Plugin] Ready for NPC AI processing');

  } catch (error) {
    console.error('[AI Plugin] ❌ Failed to initialize:', error);
    throw error;
  }
}

/**
 * Called when the plugin shuts down
 * Cleanup all AI resources
 */
export async function shutdownAIPlugin(): Promise<void> {
  console.log('[AI Plugin] Shutting down AI systems...');

  try {
    const aiSystem = getAISystem();
    await aiSystem.shutdown();
    
    if (aiBridge) {
      aiBridge.shutdown();
      aiBridge = null;
    }

    console.log('[AI Plugin] ✅ AI systems shutdown complete');
  } catch (error) {
    console.error('[AI Plugin] ❌ Shutdown error:', error);
  }
}

/**
 * Hook into NPC tick events
 * Called every frame for each NPC to decide next action
 */
function hookNPCEvents(agentshireAPI: any): void {
  // Example: Hook into NPC.onTick event
  agentshireAPI.on('npc:tick', async (npcId: string, worldState: NPCWorldState) => {
    if (!aiBridge) return;

    try {
      // Get AI decision for this NPC
      const action = await aiBridge.onNPCTick(npcId, worldState);

      // Execute action in world
      await executeNPCAction(agentshireAPI, npcId, action);

      // Record action in NPC memory
      const memory = getNPCMemory(npcId);
      await memory.store(
        'episodic',
        `Performed action: ${action.type} (${action.reasoning})`,
        { actionType: action.type, target: action.target }
      );

    } catch (error) {
      console.error(`[AI Plugin] Error processing NPC tick for ${npcId}:`, error);
    }
  });

  // Hook into NPC interaction events
  agentshireAPI.on('npc:interaction', async (npcId: string, interaction: NPCInteraction) => {
    if (!aiBridge) return;

    try {
      await aiBridge.onNPCInteraction(npcId, interaction);

      // Record interaction in memory
      const memory = getNPCMemory(npcId);
      await memory.store(
        'episodic',
        `Interaction with ${interaction.initiatorId}: ${interaction.type} - ${interaction.content || ''}`,
        { 
          interactionType: interaction.type,
          initiator: interaction.initiatorId,
          timestamp: Date.now()
        }
      );

    } catch (error) {
      console.error(`[AI Plugin] Error processing NPC interaction for ${npcId}:`, error);
    }
  });

  // Hook into NPC initialization
  agentshireAPI.on('npc:spawn', async (npcId: string, npcData: any) => {
    try {
      const personality = npcData.personality || 'neutral';
      await aiBridge?.initializeNPC(npcId, personality);

      console.log(`[AI Plugin] ✅ NPC ${npcId} AI initialized`);
    } catch (error) {
      console.error(`[AI Plugin] Error initializing NPC ${npcId}:`, error);
    }
  });

  // Hook into NPC destruction
  agentshireAPI.on('npc:despawn', async (npcId: string) => {
    try {
      await aiBridge?.shutdownNPC(npcId);
      console.log(`[AI Plugin] ✅ NPC ${npcId} AI cleaned up`);
    } catch (error) {
      console.error(`[AI Plugin] Error cleaning up NPC ${npcId}:`, error);
    }
  });
}

/**
 * Hook into world state events
 * Broadcast world changes to all NPCs
 */
function hookWorldStateEvents(agentshireAPI: any): void {
  // Hook into time of day changes
  agentshireAPI.on('world:timeOfDay', (timeOfDay: string) => {
    console.log(`[AI Plugin] World time: ${timeOfDay}`);
    // NPCs will pick this up in their perception during next tick
  });

  // Hook into location changes
  agentshireAPI.on('world:locationChanged', (npcId: string, newLocation: string) => {
    console.log(`[AI Plugin] NPC ${npcId} moved to ${newLocation}`);
  });

  // Hook into faction events
  agentshireAPI.on('faction:eventOccurred', (factionId: string, event: string) => {
    console.log(`[AI Plugin] Faction ${factionId} event: ${event}`);
  });
}

/**
 * Execute an AI decision in the Agentshire world
 */
async function executeNPCAction(
  agentshireAPI: any,
  npcId: string,
  action: NPCAction
): Promise<void> {
  try {
    switch (action.type) {
      case 'move':
        await agentshireAPI.npc(npcId).moveTo(action.target);
        break;

      case 'interact':
        await agentshireAPI.npc(npcId).interact(action.target, action.content);
        break;

      case 'speak':
        await agentshireAPI.npc(npcId).say(action.content);
        break;

      case 'think':
        await agentshireAPI.npc(npcId).think(action.content);
        break;

      case 'emote':
        await agentshireAPI.npc(npcId).emote(action.content);
        break;

      default:
        console.warn(`[AI Plugin] Unknown action type: ${action.type}`);
    }
  } catch (error) {
    console.error(`[AI Plugin] Error executing action for ${npcId}:`, error);
  }
}

/**
 * Register an NPC with AI system
 * Call this when spawning a new NPC
 */
export async function registerNPCWithAI(
  npcId: string,
  personality: string
): Promise<void> {
  if (!aiBridge) {
    throw new Error('AI system not initialized');
  }

  await aiBridge.initializeNPC(npcId, personality);
}

/**
 * Get diagnostics for AI system
 * Useful for debugging
 */
export function getAIDiagnostics() {
  if (!aiB ridge) {
    return { error: 'AI system not initialized' };
  }

  const aiSystem = getAISystem();
  return {
    health: aiSystem.getHealth(),
    diagnostics: aiB ridge.getDiagnostics(),
  };
}

/**
 * Export for Agentshire plugin integration
 */
export const AIPluginHook = {
  initialize: initializeAIPlugin,
  shutdown: shutdownAIPlugin,
  registerNPC: registerNPCWithAI,
  getDiagnostics: getAIDiagnostics,
};
