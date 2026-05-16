import type { DecisionPipeline, NPCDecisionInput, NPCAction, NPCWorldState } from './types.js';
import { getNPCMemory } from './memory.js';
import { getOllamaClient } from './ollama.js';

/**
 * LangGraph-style Decision Pipeline
 * Perception → Memory → Risk Eval → Decision → Action
 */
export class NPCDecisionPipeline implements DecisionPipeline {
  private npcId: string;
  private state: Record<string, unknown> = {};
  private llm = getOllamaClient();
  private memory = getNPCMemory(''); // Will be set per NPC

  constructor(npcId: string) {
    this.npcId = npcId;
    this.memory = getNPCMemory(npcId);
    this.initializeState();
  }

  private initializeState(): void {
    this.state = {
      step: 'idle',
      perception: null,
      recalledMemories: [],
      riskLevel: 0,
      decisionReasoning: '',
      action: null,
    };
  }

  /**
   * Main processing pipeline
   */
  async process(input: NPCDecisionInput): Promise<NPCAction> {
    try {
      // Step 1: Perception
      await this.stepPerception(input);

      // Step 2: Memory Recall
      await this.stepMemoryRecall(input);

      // Step 3: Risk Evaluation
      await this.stepRiskEvaluation(input);

      // Step 4: Decision Making
      await this.stepDecisionMaking(input);

      // Step 5: Action Formation
      const action = await this.stepActionFormation();

      // Store outcome as memory
      await this.memory.store('episodic', `Action taken: ${action.type} - ${action.content || action.target || ''}`);

      return action;
    } catch (err) {
      console.error(`[decision-pipeline] Process failed for NPC ${this.npcId}:`, err);
      // Fallback to idle action
      return {
        type: 'think',
        content: 'Something went wrong, let me think...',
        reasoning: 'Error recovery - fallback to idle state',
      };
    }
  }

  /**
   * Step 1: Perception - Process sensory input from world
   */
  private async stepPerception(input: NPCDecisionInput): Promise<void> {
    this.state.step = 'perception';

    const perception = {
      location: input.perception.location,
      timeOfDay: input.perception.timeOfDay,
      nearbyNpcCount: input.perception.nearbyNpcs.length,
      nearbyItemCount: input.perception.nearbyItems.length,
      nearbyNpcs: input.perception.nearbyNpcs.slice(0, 3), // Limit to 3 closest
      nearbyItems: input.perception.nearbyItems.slice(0, 3),
    };

    this.state.perception = perception;
    console.log(`[decision-pipeline] ${this.npcId} Step 1 (Perception):`, perception);
  }

  /**
   * Step 2: Memory Recall - Retrieve relevant memories
   */
  private async stepMemoryRecall(input: NPCDecisionInput): Promise<void> {
    this.state.step = 'memory_recall';

    const query = `${input.perception.location} ${input.perception.nearbyNpcs.join(' ')} ${input.context}`.slice(0, 100);
    const memories = await this.memory.recall(query, 3);

    this.state.recalledMemories = memories.map((m) => ({
      type: m.type,
      content: m.content,
      age: Date.now() - m.timestamp,
    }));

    console.log(`[decision-pipeline] ${this.npcId} Step 2 (Memory): Retrieved ${memories.length} memories`);
  }

  /**
   * Step 3: Risk Evaluation - Assess threat/opportunity level
   */
  private async stepRiskEvaluation(input: NPCDecisionInput): Promise<void> {
    this.state.step = 'risk_eval';

    const riskPrompt = `You are analyzing a situation for an NPC named ${this.npcId}.

Current situation:
- Location: ${input.perception.location}
- Nearby NPCs: ${input.perception.nearbyNpcs.length}
- Nearby items: ${input.perception.nearbyItems.length}
- Time: ${input.perception.timeOfDay}
- Context: ${input.context}

Rate the risk level on a scale of 0-10 where:
0 = completely safe/boring
5 = neutral
10 = extremely dangerous/critical opportunity

Respond with ONLY a single number 0-10.`;

    try {
      const response = await this.llm.generate(riskPrompt, { temperature: 0.3, maxTokens: 10 });
      const riskLevel = Math.min(10, Math.max(0, parseInt(response.trim(), 10) || 5));
      this.state.riskLevel = riskLevel;
      console.log(`[decision-pipeline] ${this.npcId} Step 3 (Risk): Level ${riskLevel}`);
    } catch (err) {
      console.warn(`[decision-pipeline] Risk eval failed, defaulting to 5:`, err);
      this.state.riskLevel = 5;
    }
  }

  /**
   * Step 4: Decision Making - Use LLM to decide action
   */
  private async stepDecisionMaking(input: NPCDecisionInput): Promise<void> {
    this.state.step = 'decision';

    const decisionPrompt = `You are an NPC making a decision. Be concise and decisive.

Context:
- Your role/goal: ${input.context}
- Current location: ${input.perception.location}
- Nearby: ${input.perception.nearbyNpcs.length} NPCs, ${input.perception.nearbyItems.length} items
- Risk level: ${this.state.riskLevel}/10
- Time: ${input.perception.timeOfDay}

Recent memories: ${
      (this.state.recalledMemories as unknown[] | undefined)?.slice(0, 2).map((m: unknown) => {
        const mem = m as { content?: string };
        return mem.content;
      }).join('; ') || 'None'
    }

Decide your next action. Choose ONE: move, interact, speak, or think.
Format: ACTION: [move|interact|speak|think]
TARGET: [location|npc_id|item_name|self]
REASON: [brief reason]`;

    try {
      const response = await this.llm.generate(decisionPrompt, { temperature: 0.7, maxTokens: 100 });
      this.state.decisionReasoning = response;
      console.log(`[decision-pipeline] ${this.npcId} Step 4 (Decision):`, response.slice(0, 100));
    } catch (err) {
      console.warn(`[decision-pipeline] Decision making failed:`, err);
      this.state.decisionReasoning = 'ACTION: think\nTARGET: self\nREASON: Pausing to think';
    }
  }

  /**
   * Step 5: Action Formation - Parse decision into structured action
   */
  private async stepActionFormation(): Promise<NPCAction> {
    this.state.step = 'action_formation';

    const reasoning = String(this.state.decisionReasoning || '');
    const actionMatch = reasoning.match(/ACTION:\s*(\w+)/i);
    const targetMatch = reasoning.match(/TARGET:\s*(\S+)/i);
    const reasonMatch = reasoning.match(/REASON:\s*(.+?)(?:\n|$)/i);

    const actionType = (actionMatch?.[1]?.toLowerCase() || 'think') as 'move' | 'interact' | 'speak' | 'think' | 'emote';
    const target = targetMatch?.[1] || 'self';
    const reason = reasonMatch?.[1]?.trim() || 'No specific reason';

    const action: NPCAction = {
      type: actionType,
      target: target === 'self' ? undefined : target,
      content: actionType === 'speak' ? `I should ${reason}` : undefined,
      reasoning: reason,
    };

    console.log(`[decision-pipeline] ${this.npcId} Step 5 (Action):`, action.type, action.target || 'N/A');
    return action;
  }

  /**
   * Get current pipeline state for debugging
   */
  getState(): Record<string, unknown> {
    return { ...this.state, npcId: this.npcId };
  }

  /**
   * Reset pipeline state
   */
  reset(): void {
    this.initializeState();
  }
}

/**
 * Singleton factories per NPC
 */
const pipelines = new Map<string, NPCDecisionPipeline>();

/**
 * Get or create pipeline for an NPC
 */
export function getNPCPipeline(npcId: string): NPCDecisionPipeline {
  if (!pipelines.has(npcId)) {
    pipelines.set(npcId, new NPCDecisionPipeline(npcId));
  }
  return pipelines.get(npcId)!;
}

/**
 * Remove pipeline for an NPC (cleanup)
 */
export function removeNPCPipeline(npcId: string): void {
  pipelines.delete(npcId);
}

/**
 * Get all active pipelines
 */
export function getAllPipelines(): Map<string, NPCDecisionPipeline> {
  return pipelines;
}
