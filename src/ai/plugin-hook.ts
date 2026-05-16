import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import {
  initializeAI,
  shutdownAI,
  registerNPCWithAI,
  processNPCDecision,
  handleNPCInteraction,
  unregisterNPCFromAI,
  getAIDiagnostics,
} from './index.js';
import { AgentshireBridgeIntegration } from './bridge-adapter.js';

/**
 * AI Plugin Hook
 * Integrates AI system with Agentshire plugin lifecycle and NPC events
 */

// Track active NPCs
const activeNPCs = new Map<string, { personality: string; lastTick: number }>();

/**
 * Register AI with OpenClaw plugin API
 * Call this from the main plugin's register() function
 */
export async function registerAIHooks(api: OpenClawPluginApi): Promise<void> {
  console.log('[ai-plugin] Registering AI hooks with plugin...');

  try {
    // ─── Initialize AI on plugin start ───
    await initializeAI({
      ollamaEndpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
      ollamaModel: process.env.OLLAMA_MODEL || 'llama2',
    });

    // ─── Hook: NPC spawned ───
    api.on('npc_spawned', async (event: any) => {
      try {
        const npcId = event.npcId || event.id;
        const personality = event.personality || event.name || 'neutral';

        if (npcId) {
          await registerNPCWithAI(npcId, personality);
          activeNPCs.set(npcId, {
            personality,
            lastTick: Date.now(),
          });

          console.log(`[ai-plugin] NPC spawned: ${npcId}`);
        }
      } catch (err) {
        console.error('[ai-plugin] npc_spawned hook failed:', err);
      }
    });

    // ─── Hook: NPC tick (decision making) ───
    api.on('npc_tick', async (event: any) => {
      try {
        const npcId = event.npcId || event.id;
        const worldState = event.worldState || event.state;

        if (npcId && worldState) {
          const action = await processNPCDecision(npcId, worldState);

          // Broadcast action back to world
          api.emit('ai_action', {
            npcId,
            action,
            timestamp: Date.now(),
          });

          // Update tick time
          const npcInfo = activeNPCs.get(npcId);
          if (npcInfo) {
            npcInfo.lastTick = Date.now();
          }
        }
      } catch (err) {
        console.error('[ai-plugin] npc_tick hook failed:', err);
      }
    });

    // ─── Hook: NPC interaction ───
    api.on('npc_interaction', async (event: any) => {
      try {
        const npcId = event.npcId || event.targetId;
        const interaction = {
          type: event.type || 'chat',
          initiatorId: event.initiatorId || event.fromId,
          content: event.content || event.message,
          data: event.data,
        };

        if (npcId) {
          await handleNPCInteraction(npcId, interaction);
          console.log(`[ai-plugin] Interaction recorded: ${npcId}`);
        }
      } catch (err) {
        console.error('[ai-plugin] npc_interaction hook failed:', err);
      }
    });

    // ─── Hook: NPC despawned ───
    api.on('npc_despawned', async (event: any) => {
      try {
        const npcId = event.npcId || event.id;

        if (npcId) {
          await unregisterNPCFromAI(npcId);
          activeNPCs.delete(npcId);
          console.log(`[ai-plugin] NPC despawned: ${npcId}`);
        }
      } catch (err) {
        console.error('[ai-plugin] npc_despawned hook failed:', err);
      }
    });

    // ─── Tool: AI Diagnostics ───
    api.registerTool({
      id: 'ai_diagnostics',
      name: 'AI System Diagnostics',
      description: 'Get health and status of AI subsystems',
      execute: async () => {
        const diagnostics = await getAIDiagnostics();
        return {
          success: true,
          data: {
            diagnostics,
            activeNPCs: Array.from(activeNPCs.entries()).map(([id, info]) => ({
              npcId: id,
              personality: info.personality,
              tickAge: Date.now() - info.lastTick,
            })),
          },
        };
      },
    });

    // ─── Cleanup on plugin stop ───
    api.on('plugin_stop', async () => {
      console.log('[ai-plugin] Shutting down AI system...');
      try {
        await shutdownAI();
        activeNPCs.clear();
        console.log('[ai-plugin] ✅ AI system shut down');
      } catch (err) {
        console.error('[ai-plugin] Shutdown failed:', err);
      }
    });

    console.log('[ai-plugin] ✅ AI hooks registered');
  } catch (err) {
    console.error('[ai-plugin] Failed to register AI hooks:', err);
    throw err;
  }
}

/**
 * Alternative: Service-based registration (for OpenClaw services)
 * Use this if you want AI to run as a managed service
 */
export function createAIService() {
  return {
    id: 'agentshire-ai',
    name: 'Agentshire AI System',
    description: 'NPC decision-making, memory, and reasoning',

    start: async () => {
      console.log('[ai-service] Starting...');
      await initializeAI();
    },

    stop: async () => {
      console.log('[ai-service] Stopping...');
      await shutdownAI();
    },

    // Health check
    getStatus: async () => {
      const diagnostics = await getAIDiagnostics();
      return diagnostics;
    },
  };
}

/**
 * Get active NPC info for debugging
 */
export function getActiveNPCs(): Array<{
  npcId: string;
  personality: string;
  tickAge: number;
}> {
  return Array.from(activeNPCs.entries()).map(([id, info]) => ({
    npcId: id,
    personality: info.personality,
    tickAge: Date.now() - info.lastTick,
  }));
}

/**
 * Get NPC count
 */
export function getActiveNPCCount(): number {
  return activeNPCs.size;
}
