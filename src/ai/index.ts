// AI System - Main Export Barrel
// Unified entry point for all AI subsystems and integrations

// ─── Type Contracts ───
export type {
  MemoryStore,
  MemoryEntry,
  LLMProvider,
  LLMOptions,
  DecisionPipeline,
  NPCDecisionInput,
  NPCAction,
  MultiAgentOrchestrator,
  ConversationResult,
  ConversationMessage,
  FactionCrew,
  FactionState,
  AIBridgeAdapter,
  NPCWorldState,
  NPCInteraction,
  AISystemManager,
  SystemHealth,
} from './types.js';

// ─── Ollama LLM ───
export { OllamaClient, getOllamaClient, resetOllamaClient } from './ollama.js';

// ─── Memory Store ───
export { NPCMemory, getNPCMemory, clearNPCMemory, getAllNPCMemories } from './memory.js';

// ─── Decision Pipeline ───
export { NPCDecisionPipeline, getNPCPipeline, removeNPCPipeline, getAllPipelines } from './decision-pipeline.js';

// ─── System Manager ───
export { AISystemManager, getAISystem, resetAISystem } from './system.js';
export type { AISystemConfig } from './system.js';

// ─── Bridge Adapter ───
export { AIBridgeAdapter, getAIBridge, resetAIBridge, AgentshireBridgeIntegration } from './bridge-adapter.js';
export type { WorldStateProvider, ActionExecutor } from './bridge-adapter.js';

// ─── Quick Start Helpers ───

/**
 * Initialize the complete AI system with Agentshire integration
 * Call this from your plugin's register() method
 */
export async function initializeAI(config?: { ollamaEndpoint?: string; ollamaModel?: string }): Promise<void> {
  const system = getAISystem({
    ollamaEndpoint: config?.ollamaEndpoint,
    ollamaModel: config?.ollamaModel,
    enableMemory: true,
    enablePipeline: true,
    enableOrchestrator: true,
    enableCrews: true,
  });

  await system.initialize();

  const bridge = getAIBridge();
  system.setBridge(bridge);

  console.log('[ai] 🤖 AI system initialized and ready');
}

/**
 * Shutdown AI system gracefully
 */
export async function shutdownAI(): Promise<void> {
  const system = getAISystem();
  await system.shutdown();
  resetAIBridge();
  resetOllamaClient();
  resetAISystem();
  console.log('[ai] 🤖 AI system shut down');
}

/**
 * Register NPC with AI (personality + memory + decision pipeline)
 */
export async function registerNPCWithAI(npcId: string, personality: string): Promise<void> {
  const bridge = getAIBridge();
  await bridge.initializeNPC(npcId, personality);
  console.log(`[ai] 🎭 NPC ${npcId} registered with personality: ${personality}`);
}

/**
 * Process NPC decision tick (called from world sim loop)
 */
export async function processNPCDecision(npcId: string, worldState: any): Promise<any> {
  const bridge = getAIBridge();
  return bridge.onNPCTick(npcId, worldState);
}

/**
 * Handle NPC interaction event
 */
export async function handleNPCInteraction(npcId: string, interaction: any): Promise<void> {
  const bridge = getAIBridge();
  await bridge.onNPCInteraction(npcId, interaction);
}

/**
 * Remove NPC from AI system
 */
export async function unregisterNPCFromAI(npcId: string): Promise<void> {
  const bridge = getAIBridge();
  await bridge.shutdownNPC(npcId);
}

/**
 * Get AI system diagnostics
 */
export async function getAIDiagnostics(): Promise<Record<string, unknown>> {
  const bridge = getAIBridge();
  return bridge.getDiagnostics();
}

/**
 * Create a faction crew
 */
export function createFaction(factionId: string, factionName: string, members?: string[]): any {
  const system = getAISystem();
  return system.registerFaction(factionId, factionName, members);
}

/**
 * Get NPC memory for manual access
 */
export function getNPC_Memory(npcId: string): any {
  return getNPCMemory(npcId);
}

/**
 * Get NPC decision pipeline for debugging
 */
export function getNPC_Pipeline(npcId: string): any {
  return getNPCPipeline(npcId);
}
