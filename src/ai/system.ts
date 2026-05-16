import type { AISystemManager, SystemHealth, MemoryStore, LLMProvider, DecisionPipeline, MultiAgentOrchestrator, FactionCrew, AIBridgeAdapter } from './types.js';
import { OllamaClient, getOllamaClient } from './ollama.js';
import { NPCMemory, getNPCMemory } from './memory.js';
import { NPCDecisionPipeline, getNPCPipeline } from './decision-pipeline.js';

/**
 * Central AI System Manager
 * Initializes, manages, and monitors all AI subsystems
 */
export class AISystemManager implements AISystemManager {
  private llm: OllamaClient | null = null;
  private memories = new Map<string, NPCMemory>();
  private pipelines = new Map<string, NPCDecisionPipeline>();
  private orchestrator: MultiAgentOrchestrator | null = null;
  private crews = new Map<string, FactionCrew>();
  private bridge: AIBridgeAdapter | null = null;
  private initialized = false;
  private config: AISystemConfig;

  constructor(config?: Partial<AISystemConfig>) {
    this.config = {
      ollamaEndpoint: 'http://localhost:11434',
      ollamaModel: 'llama2',
      enableMemory: true,
      enablePipeline: true,
      enableOrchestrator: true,
      enableCrews: true,
      healthCheckIntervalMs: 30000,
      ...config,
    };
  }

  /**
   * Initialize all AI subsystems
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('[ai-system] Already initialized');
      return;
    }

    console.log('[ai-system] Initializing AI subsystems...');

    try {
      // 1. Initialize LLM
      if (this.config.enableMemory || this.config.enablePipeline) {
        this.llm = getOllamaClient(this.config.ollamaEndpoint, this.config.ollamaModel);
        const llmHealthy = await this.llm.isHealthy();
        if (!llmHealthy) {
          console.warn('[ai-system] ⚠️  Ollama not reachable. AI features will be degraded.');
          console.warn(`[ai-system] Make sure Ollama is running: ${this.config.ollamaEndpoint}`);
        } else {
          console.log('[ai-system] ✓ Ollama LLM initialized');
        }
      }

      // 2. Initialize Memory subsystem
      if (this.config.enableMemory) {
        console.log('[ai-system] ✓ Memory subsystem ready');
      }

      // 3. Initialize Decision Pipeline
      if (this.config.enablePipeline) {
        console.log('[ai-system] ✓ Decision pipeline ready');
      }

      // 4. Initialize Multi-Agent Orchestrator
      if (this.config.enableOrchestrator) {
        this.orchestrator = new BasicMultiAgentOrchestrator();
        console.log('[ai-system] ✓ Multi-agent orchestrator initialized');
      }

      // 5. Initialize Faction Crews
      if (this.config.enableCrews) {
        console.log('[ai-system] ✓ Faction crews system ready');
      }

      this.initialized = true;
      console.log('[ai-system] ✅ All AI subsystems initialized');

      // Start health monitoring
      this.startHealthMonitoring();
    } catch (err) {
      console.error('[ai-system] Initialization failed:', err);
      throw err;
    }
  }

  /**
   * Shutdown all AI subsystems
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      console.warn('[ai-system] Not initialized');
      return;
    }

    console.log('[ai-system] Shutting down...');

    // Clear all NPC-specific resources
    this.memories.clear();
    this.pipelines.clear();
    this.crews.clear();

    this.initialized = false;
    console.log('[ai-system] ✅ Shutdown complete');
  }

  /**
   * Get subsystem by type
   */
  get<T>(name: 'memory' | 'llm' | 'orchestrator' | 'crews' | 'bridge'): T {
    const systems: Record<string, unknown> = {
      llm: this.llm,
      orchestrator: this.orchestrator,
      bridge: this.bridge,
    };

    if (name === 'memory') {
      return getNPCMemory as any;
    }
    if (name === 'crews') {
      return this.crews;
    }

    return systems[name] as T;
  }

  /**
   * Get or create NPC memory store
   */
  getNPCMemory(npcId: string): MemoryStore {
    if (!this.config.enableMemory) {
      throw new Error('Memory subsystem is disabled');
    }
    return getNPCMemory(npcId);
  }

  /**
   * Get or create NPC decision pipeline
   */
  getNPCPipeline(npcId: string): DecisionPipeline {
    if (!this.config.enablePipeline) {
      throw new Error('Decision pipeline subsystem is disabled');
    }
    return getNPCPipeline(npcId);
  }

  /**
   * Register or get faction crew
   */
  registerFaction(id: string, name: string, members: string[] = []): FactionCrew {
    if (!this.config.enableCrews) {
      throw new Error('Crews subsystem is disabled');
    }

    let crew = this.crews.get(id);
    if (!crew) {
      crew = new BasicFactionCrew(id, name, members);
      this.crews.set(id, crew);
    }
    return crew;
  }

  /**
   * Set AI bridge adapter (for Agentshire world integration)
   */
  setBridge(adapter: AIBridgeAdapter): void {
    this.bridge = adapter;
    console.log('[ai-system] Bridge adapter registered');
  }

  /**
   * Health check for all systems
   */
  async getHealth(): Promise<SystemHealth> {
    const health: SystemHealth = {
      memory: this.config.enableMemory,
      llm: false,
      orchestrator: this.config.enableOrchestrator,
      bridge: this.bridge !== null,
      timestamp: Date.now(),
    };

    if (this.llm) {
      try {
        health.llm = await this.llm.isHealthy();
      } catch {
        health.llm = false;
      }
    }

    return health;
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    if (!this.config.healthCheckIntervalMs) return;

    const interval = setInterval(async () => {
      try {
        const health = await this.getHealth();
        if (!health.llm && this.config.enableMemory) {
          console.warn('[ai-system] ⚠️  LLM health check failed');
        }
      } catch (err) {
        console.error('[ai-system] Health check error:', err);
      }
    }, this.config.healthCheckIntervalMs);

    // Store interval so it can be cleared on shutdown
    (this as any)._healthCheckInterval = interval;
  }
}

/**
 * Configuration for AI system
 */
export interface AISystemConfig {
  ollamaEndpoint: string;
  ollamaModel: string;
  enableMemory: boolean;
  enablePipeline: boolean;
  enableOrchestrator: boolean;
  enableCrews: boolean;
  healthCheckIntervalMs: number;
}

/**
 * Basic Multi-Agent Orchestrator (placeholder)
 * Can be extended with AutoGen integration
 */
class BasicMultiAgentOrchestrator implements MultiAgentOrchestrator {
  private conversations = new Map<string, { participants: string[]; active: boolean }>();

  async startConversation(initiatorId: string, participantIds: string[], topic: string) {
    const id = `conv_${Date.now()}`;
    this.conversations.set(id, {
      participants: [initiatorId, ...participantIds],
      active: true,
    });

    console.log(`[orchestrator] Conversation started: ${id} - Topic: ${topic}`);

    return {
      initiator: initiatorId,
      participants: [initiatorId, ...participantIds],
      topic,
      messages: [],
      outcome: 'ongoing' as const,
    };
  }

  async routeMessage(from: string, to: string, message: string): Promise<string> {
    console.log(`[orchestrator] Route message: ${from} → ${to}`);
    // Placeholder: would route through AutoGen agents
    return `${to} received: ${message.slice(0, 50)}...`;
  }

  isConversationActive(npcId: string): boolean {
    for (const conv of this.conversations.values()) {
      if (conv.participants.includes(npcId) && conv.active) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Basic Faction Crew (placeholder)
 * Can be extended with CrewAI integration
 */
class BasicFactionCrew implements FactionCrew {
  id: string;
  members: string[] = [];
  private roles = new Map<string, string>();
  private goals: string[] = [];
  private reputation = 0;

  constructor(id: string, name: string, members: string[] = []) {
    this.id = id;
    this.members = members;
  }

  async assignRole(npcId: string, role: string): Promise<void> {
    this.roles.set(npcId, role);
    console.log(`[crew:${this.id}] Assigned ${role} role to ${npcId}`);
  }

  async executeGoal(goal: string): Promise<void> {
    this.goals.push(goal);
    console.log(`[crew:${this.id}] Executing goal: ${goal}`);
  }

  getState() {
    return {
      id: this.id,
      name: this.id,
      members: Array.from(this.roles.entries()).map(([npcId, role]) => ({
        npcId,
        role,
      })),
      goals: this.goals,
      reputation: this.reputation,
    };
  }
}

/**
 * Singleton instance
 */
let systemInstance: AISystemManager | null = null;

/**
 * Get or create AI system manager singleton
 */
export function getAISystem(config?: Partial<AISystemConfig>): AISystemManager {
  if (!systemInstance) {
    systemInstance = new AISystemManager(config);
  }
  return systemInstance;
}

/**
 * Reset singleton (for testing)
 */
export function resetAISystem(): void {
  systemInstance = null;
}
