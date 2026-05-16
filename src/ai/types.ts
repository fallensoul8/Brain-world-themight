// AI Agent Integration Contracts
// Used by NPC agents to reason, remember, and act

// ─── Memory System (Mem0) ───
export interface MemoryStore {
  /** Store a fact about the world/NPC */
  store(type: 'episodic' | 'semantic' | 'procedural', content: string, metadata?: Record<string, unknown>): Promise<string>;
  
  /** Retrieve relevant memories for context */
  recall(query: string, limit?: number): Promise<MemoryEntry[]>;
  
  /** Update an existing memory */
  update(id: string, content: string): Promise<void>;
  
  /** Clear memories for reset/cleanup */
  clear(): Promise<void>;
}

export interface MemoryEntry {
  id: string;
  type: 'episodic' | 'semantic' | 'procedural';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ─── LLM Provider (Ollama) ───
export interface LLMProvider {
  /** Generate text via LLM */
  generate(prompt: string, options?: LLMOptions): Promise<string>;
  
  /** Stream generation (for real-time responses) */
  stream(prompt: string, onChunk: (chunk: string) => void, options?: LLMOptions): Promise<void>;
  
  /** Check if provider is healthy */
  isHealthy(): Promise<boolean>;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

// ─── NPC Decision-Making (LangGraph) ───
export interface DecisionPipeline {
  /** Run perception → memory → decision chain */
  process(input: NPCDecisionInput): Promise<NPCAction>;
  
  /** Get current state for debugging */
  getState(): Record<string, unknown>;
}

export interface NPCDecisionInput {
  npcId: string;
  perception: {
    nearbyNpcs: string[];
    nearbyItems: string[];
    location: string;
    timeOfDay: string;
  };
  context: string; // Additional context from game world
  recentMemories?: MemoryEntry[];
}

export interface NPCAction {
  type: 'move' | 'interact' | 'speak' | 'think' | 'emote';
  target?: string; // NPC ID or item ID
  content?: string; // What to say/think
  reasoning: string; // Why this action
}

// ─── Multi-Agent Orchestration (AutoGen) ───
export interface MultiAgentOrchestrator {
  /** Start a conversation between multiple NPCs */
  startConversation(initiatorId: string, participantIds: string[], topic: string): Promise<ConversationResult>;
  
  /** Handle NPC-to-NPC message routing */
  routeMessage(from: string, to: string, message: string): Promise<string>;
  
  /** Check if conversation is active */
  isConversationActive(npcId: string): boolean;
}

export interface ConversationResult {
  initiator: string;
  participants: string[];
  topic: string;
  messages: ConversationMessage[];
  outcome: 'resolved' | 'ongoing' | 'deadlocked';
}

export interface ConversationMessage {
  speaker: string;
  content: string;
  timestamp: number;
}

// ─── Faction Management (CrewAI) ───
export interface FactionCrew {
  /** ID of the faction */
  id: string;
  
  /** Members in this faction */
  members: string[]; // NPC IDs
  
  /** Assign a role to an NPC */
  assignRole(npcId: string, role: string): Promise<void>;
  
  /** Execute a faction-level goal */
  executeGoal(goal: string): Promise<void>;
  
  /** Get faction state */
  getState(): FactionState;
}

export interface FactionState {
  id: string;
  name: string;
  members: { npcId: string; role: string }[];
  goals: string[];
  reputation: number;
}

// ─── World → AI Bridge ───
export interface AIBridgeAdapter {
  /** Called when an NPC needs to decide its next action */
  onNPCTick(npcId: string, worldState: NPCWorldState): Promise<NPCAction>;
  
  /** Called when NPC receives interaction event */
  onNPCInteraction(npcId: string, interaction: NPCInteraction): Promise<void>;
  
  /** Initialize AI for an NPC */
  initializeNPC(npcId: string, personality: string): Promise<void>;
  
  /** Cleanup AI resources for an NPC */
  shutdownNPC(npcId: string): Promise<void>;
}

export interface NPCWorldState {
  npcId: string;
  position: { x: number; y: number; z: number };
  inventory: string[];
  relationships: Record<string, number>; // npcId -> affinity (-100 to 100)
  status: 'idle' | 'moving' | 'interacting' | 'thinking';
  currentActivity?: string;
}

export interface NPCInteraction {
  type: 'chat' | 'trade' | 'conflict' | 'quest';
  initiatorId: string;
  content?: string;
  data?: Record<string, unknown>;
}

// ─── AI System Manager ───
export interface AISystemManager {
  /** Initialize all AI subsystems */
  initialize(): Promise<void>;
  
  /** Shutdown all AI subsystems */
  shutdown(): Promise<void>;
  
  /** Get a subsystem by name */
  get<T>(name: 'memory' | 'llm' | 'orchestrator' | 'crews' | 'bridge'): T;
  
  /** Check health of all systems */
  getHealth(): Promise<SystemHealth>;
}

export interface SystemHealth {
  memory: boolean;
  llm: boolean;
  orchestrator: boolean;
  bridge: boolean;
  timestamp: number;
}
