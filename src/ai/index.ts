// AI System - Main Export Barrel

// ─── Type Contracts ───
export type {
  MemoryStore, MemoryEntry, LLMProvider, LLMOptions,
  DecisionPipeline, NPCDecisionInput, NPCAction,
  MultiAgentOrchestrator, ConversationResult, ConversationMessage,
  FactionCrew, FactionState, AIBridgeAdapter,
  NPCWorldState, NPCInteraction, AISystemManager, SystemHealth,
} from './types.js';

// ─── Ollama LLM ───
export { OllamaClient, getOllamaClient } from './ollama.js';

// ─── Memory Store ───
export { NPCMemory, getNPCMemory, clearNPCMemory, getAllNPCMemories } from './memory.js';

// ─── Decision Pipeline ───
export { NPCDecisionPipeline, getNPCPipeline, removeNPCPipeline, getAllPipelines } from './decision-pipeline.js';

// ─── System Manager ───
export { AISystemManager, getAISystem } from './system.js';
export type { AISystemConfig } from './system.js';

// ─── Bridge Adapter ───
export { AgentshireBridgeIntegration } from './bridge-adapter.js';
export type { WorldStateProvider, ActionExecutor } from './bridge-adapter.js';
