import type { SystemHealth, LLMProvider, FactionState } from './types.js';
import { OllamaClient, getOllamaClient } from './ollama.js';
import { NPCMemory, getNPCMemory } from './memory.js';
import { NPCDecisionPipeline, getNPCPipeline } from './decision-pipeline.js';

export interface AISystemConfig {
  ollamaEndpoint?: string;
  ollamaModel?: string;
  enableMemory?: boolean;
  enablePipeline?: boolean;
}

export class AISystemManager {
  private llm: OllamaClient | null = null;
  private initialized = false;
  private config: AISystemConfig = {};

  constructor(config?: Partial<AISystemConfig>) { if (config) this.config = config; }

  async initialize() {
    this.llm = getOllamaClient({ baseUrl: this.config.ollamaEndpoint || 'http://localhost:11434' });
    const healthy = await this.llm.isHealthy();
    if (!healthy) console.warn('[ai] Ollama not reachable at', this.config.ollamaEndpoint);
    this.initialized = true;
    console.log('[ai] AI system initialized');
  }

  async shutdown() {
    this.initialized = false;
    console.log('[ai] AI system shut down');
  }

  getLLM() { return this.llm; }
  getNPCMemory(npcId: string) { return getNPCMemory(npcId); }
  getNPCPipeline(npcId: string) { return getNPCPipeline(npcId); }

  async getHealth(): Promise<SystemHealth> {
    const llmHealthy = this.llm ? await this.llm.isHealthy() : false;
    return { memory: true, llm: llmHealthy, orchestrator: false, bridge: false, timestamp: Date.now() };
  }
}

let systemInstance: AISystemManager | null = null;

export function getAISystem(config?: Partial<AISystemConfig>): AISystemManager {
  if (!systemInstance) systemInstance = new AISystemManager(config);
  return systemInstance;
}
