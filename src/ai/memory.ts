import type { MemoryStore, MemoryEntry } from './types.js';

/**
 * Extract entities from text (simple word-based)
 */
function extractEntities(text: string): string[] {
  const words = text.split(/\s+/)
  const entities: string[] = []
  for (const w of words) {
    const clean = w.replace(/[^a-zA-Z]/g, '')
    if (clean.length >= 3 && clean[0] === clean[0].toUpperCase()) entities.push(clean)
  }
  return [...new Set(entities)]
}

/**
 * Simple text similarity using word overlap (Jaccard)
 */
function textSimilarity(text1: string, text2: string): number {
  const normalize = (t: string) => t.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));
  if (words1.size === 0 || words2.size === 0) return 0;
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

/**
 * BM25-style keyword scoring
 */
function bm25Score(query: string, text: string): number {
  const qWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const tWords = text.toLowerCase().split(/\s+/)
  let score = 0
  for (const qw of qWords) {
    const freq = tWords.filter(w => w === qw).length
    if (freq > 0) score += Math.log(1 + freq)
  }
  return score / qWords.length
}

/**
 * Temporal recency boost (0-1)
 */
function temporalScore(timestamp: number): number {
  const age = Date.now() - timestamp
  const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
  return Math.max(0, 1 - age / maxAge)
}

/**
 * Multi-signal retrieval: semantic + keyword + entity + temporal
 */
function multiSignalRecall(query: string, memories: MemoryEntry[], limit: number): MemoryEntry[] {
  const qEntities = extractEntities(query)
  return memories
    .map(mem => {
      const semantic = textSimilarity(query, mem.content)
      const keyword = bm25Score(query, mem.content)
      const entityMatch = qEntities.length > 0
        ? extractEntities(mem.content).filter(e => qEntities.includes(e)).length / Math.max(1, qEntities.length)
        : 0
      const temporal = temporalScore(mem.timestamp)
      const combined = semantic * 0.35 + keyword * 0.25 + entityMatch * 0.25 + temporal * 0.15
      return { mem, score: combined }
    })
    .filter(item => item.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.mem)
}

/**
 * In-memory NPC Memory Store with Mem0-inspired multi-signal retrieval
 */
export class NPCMemory implements MemoryStore {
  private memories: Map<string, MemoryEntry> = new Map();
  private idCounter = 0;
  private maxMemories = 2000;
  // Entity index: entity name -> set of memory IDs
  private entityIndex: Map<string, Set<string>> = new Map();

  async store(type: 'episodic' | 'semantic' | 'procedural', content: string, metadata?: Record<string, unknown>): Promise<string> {
    const id = `mem_${++this.idCounter}`;

    if (this.memories.size >= this.maxMemories) {
      const sorted = Array.from(this.memories.values()).sort((a, b) => a.timestamp - b.timestamp);
      const toDelete = sorted.slice(0, Math.ceil(this.maxMemories * 0.1));
      for (const mem of toDelete) {
        this.memories.delete(mem.id);
        // Clean entity index
        for (const [, ids] of this.entityIndex) ids.delete(mem.id)
      }
    }

    const entry: MemoryEntry = {
      id, type, content, timestamp: Date.now(), metadata: metadata || {},
    };

    this.memories.set(id, entry);

    // Index entities
    const entities = extractEntities(content)
    for (const entity of entities) {
      if (!this.entityIndex.has(entity)) this.entityIndex.set(entity, new Set())
      this.entityIndex.get(entity)!.add(id)
    }

    console.log(`[memory] Stored ${type} memory: ${id}`);
    return id;
  }

  async recall(query: string, limit = 5): Promise<MemoryEntry[]> {
    return multiSignalRecall(query, Array.from(this.memories.values()), limit)
  }

  async recallByEntity(entity: string, limit = 5): Promise<MemoryEntry[]> {
    const ids = this.entityIndex.get(entity)
    if (!ids) return []
    return Array.from(ids)
      .map(id => this.memories.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  async update(id: string, content: string): Promise<void> {
    const mem = this.memories.get(id);
    if (!mem) throw new Error(`Memory ${id} not found`);
    mem.content = content;
    mem.timestamp = Date.now();
  }

  async clear(): Promise<void> {
    this.memories.clear();
    this.entityIndex.clear();
  }

  async get(id: string): Promise<MemoryEntry | null> {
    return this.memories.get(id) || null;
  }

  async getByType(type: 'episodic' | 'semantic' | 'procedural'): Promise<MemoryEntry[]> {
    return Array.from(this.memories.values()).filter((m) => m.type === type);
  }

  getStats() {
    const all = Array.from(this.memories.values());
    return {
      total: all.length,
      episodic: all.filter((m) => m.type === 'episodic').length,
      semantic: all.filter((m) => m.type === 'semantic').length,
      procedural: all.filter((m) => m.type === 'procedural').length,
      entities: this.entityIndex.size,
    };
  }
}

const memoryStores = new Map<string, NPCMemory>();
export function getNPCMemory(npcId: string): NPCMemory {
  if (!memoryStores.has(npcId)) memoryStores.set(npcId, new NPCMemory());
  return memoryStores.get(npcId)!;
}
export async function clearNPCMemory(npcId: string): Promise<void> {
  const mem = memoryStores.get(npcId);
  if (mem) { await mem.clear(); memoryStores.delete(npcId); }
}
export function getAllNPCMemories(): Map<string, NPCMemory> { return memoryStores; }
