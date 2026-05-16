import { getAISystem } from '../ai/system'
import type { NPCAction, NPCWorldState } from '../ai/types'

export interface NPCRecord {
  id: string
  name: string
  personality: string
  role: string
  faction?: string
  state: NPCWorldState
  lastAction?: NPCAction
  memoryCount: number
  tickCount: number
}

export interface SimulationState {
  running: boolean
  tickRate: number
  tick: number
  npcs: NPCRecord[]
  activityLog: string[]
}

type Listener = (state: SimulationState) => void

export class SimulationEngine {
  private state: SimulationState = {
    running: false,
    tickRate: 2000,
    tick: 0,
    npcs: [],
    activityLog: [],
  }
  private timer: ReturnType<typeof setInterval> | null = null
  private listeners: Set<Listener> = new Set()
  private ai: Awaited<ReturnType<typeof getAISystem>> | null = null

  async init() {
    this.ai = await getAISystem({ ollamaUrl: 'http://localhost:11434' })
    await this.ai.initialize()
    this.notify()
  }

  addNPC(id: string, name: string, personality: string, role: string, faction?: string) {
    if (this.state.npcs.find(n => n.id === id)) return
    const npc: NPCRecord = {
      id, name, personality, role, faction,
      state: {
        npcId: id,
        position: { x: Math.random() * 100 - 50, y: 0, z: Math.random() * 100 - 50 },
        inventory: [],
        relationships: {},
        status: 'idle',
      },
      memoryCount: 0,
      tickCount: 0,
    }
    this.state.npcs.push(npc)
    this.ai?.getNPCMemory(id)
    this.log(`🧑 ${name} joined the world`)
    this.notify()
  }

  start() {
    if (this.state.running) return
    this.state.running = true
    this.timer = setInterval(() => this.tick(), this.state.tickRate)
    this.log('▶️ Simulation started')
    this.notify()
  }

  stop() {
    if (!this.state.running) return
    this.state.running = false
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    this.log('⏹️ Simulation stopped')
    this.notify()
  }

  setTickRate(ms: number) {
    this.state.tickRate = ms
    if (this.state.running) {
      this.stop()
      this.start()
    }
    this.notify()
  }

  private async tick() {
    this.state.tick++
    for (const npc of this.state.npcs) {
      npc.tickCount++
      const pipeline = this.ai?.getNPCPipeline(npc.id)
      if (!pipeline) continue

      try {
        const action = await pipeline.process({
          npcId: npc.id,
          perception: {
            nearbyNpcs: this.state.npcs.filter(n => n.id !== npc.id).map(n => n.id),
            nearbyItems: npc.state.inventory,
            location: `(${npc.state.position.x.toFixed(0)}, ${npc.state.position.z.toFixed(0)})`,
            timeOfDay: 'day',
          },
          context: `${npc.name} the ${npc.role} is ${npc.state.status}`,
        })
        npc.lastAction = action
        npc.state.status = action.type === 'move' ? 'moving' : action.type === 'think' ? 'thinking' : 'interacting'
        this.log(`🧠 ${npc.name}: ${action.type} → ${action.content || action.target || '...'}`)
      } catch {
        npc.state.status = 'idle'
      }

      const memory = this.ai?.getNPCMemory(npc.id)
      if (memory) {
        const stats = memory.getStats()
        npc.memoryCount = stats.total
      }
    }
    this.notify()
  }

  private log(msg: string) {
    this.state.activityLog.push(`[T${this.state.tick}] ${msg}`)
    if (this.state.activityLog.length > 200) this.state.activityLog.shift()
  }

  subscribe(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  getState(): SimulationState { return this.state }
  private notify() { this.listeners.forEach(fn => fn({ ...this.state })) }

  async shutdown() {
    this.stop()
    await this.ai?.shutdown()
  }
}

export const simulationEngine = new SimulationEngine()