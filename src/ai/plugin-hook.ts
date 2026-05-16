/**
 * Standalone AI Plugin Hook
 * Manages AI lifecycle - init, shutdown, NPC registration
 * Acts as the bridge between the simulation world and the AI layer
 */
import { getAISystem } from './system.js';
import { getNPCMemory } from './memory.js';
import { getNPCPipeline, removeNPCPipeline } from './decision-pipeline.js';

export interface PluginConfig {
  ollamaUrl?: string;
  ollamaModel?: string;
}

export class AIPlugin {
  private config: PluginConfig;
  private npcs = new Set<string>();

  constructor(config: PluginConfig = {}) { this.config = config; }

  async initialize() {
    const system = getAISystem({
      ollamaEndpoint: this.config.ollamaUrl || 'http://localhost:11434',
      ollamaModel: this.config.ollamaModel || 'llama3.2',
    });
    await system.initialize();
    console.log('[ai-plugin] AI system initialized');
  }

  async registerNPC(npcId: string, personality: string) {
    if (this.npcs.has(npcId)) return;
    this.npcs.add(npcId);
    const mem = getNPCMemory(npcId);
    await mem.store('semantic', `Personality: ${personality}`, { npcId });
    console.log(`[ai-plugin] NPC ${npcId} registered`);
  }

  async unregisterNPC(npcId: string) {
    this.npcs.delete(npcId);
    removeNPCPipeline(npcId);
    console.log(`[ai-plugin] NPC ${npcId} unregistered`);
  }

  async shutdown() {
    const system = getAISystem();
    await system.shutdown();
    this.npcs.clear();
    console.log('[ai-plugin] AI system shut down');
  }

  isHealthy(): boolean { return this.npcs.size > 0; }
  getNPCCount(): number { return this.npcs.size; }
}
