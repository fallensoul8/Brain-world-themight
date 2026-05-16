import { getNPCMemory, getNPCPipeline } from '../ai'
import type { NPCAction } from '../ai'

export interface NPCRecord {
  id: string; name: string; personality: string; role: string; faction?: string
  state: { npcId: string; position: { x: number; y: number; z: number }; inventory: string[]; relationships: Record<string, number>; status: string }
  lastAction?: NPCAction; memoryCount: number; tickCount: number
}

export interface SimulationState {
  running: boolean; tickRate: number; tick: number; npcs: NPCRecord[]; activityLog: string[]
}

type Listener = (state: SimulationState) => void

export class SimulationEngine {
  private state: SimulationState = {
    running: false, tickRate: 2000, tick: 0, npcs: [], activityLog: [],
  }
  private timer: ReturnType<typeof setInterval> | null = null
  private listeners: Set<Listener> = new Set()

  addNPC(id: string, name: string, personality: string, role: string, faction?: string) {
    if (this.state.npcs.find(n => n.id === id)) return
    const npc: NPCRecord = {
      id, name, personality, role, faction,
      state: { npcId: id, position: { x: Math.random() * 100 - 50, y: 0, z: Math.random() * 100 - 50 }, inventory: [], relationships: {}, status: 'idle' },
      memoryCount: 0, tickCount: 0,
    }
    this.state.npcs.push(npc)
    getNPCMemory(id) // initialize memory store
    this.log(`🧑 ${name} the ${role} joined the world`)
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
    if (this.state.running) { this.stop(); this.start() }
    this.notify()
  }

  private async tick() {
    this.state.tick++
    for (const npc of this.state.npcs) {
      npc.tickCount++
      const pipeline = getNPCPipeline(npc.id)
      const memory = getNPCMemory(npc.id)
      if (!pipeline) continue

      try {
        const action = await pipeline.process({
          npcId: npc.id,
          perception: {
            nearbyNpcs: this.state.npcs.filter(n => n.id !== npc.id).map(n => n.id),
            nearbyItems: npc.state.inventory, location: `(${npc.state.position.x.toFixed(0)}, ${npc.state.position.z.toFixed(0)})`,
            timeOfDay: 'day',
          },
          context: `${npc.name} the ${npc.role} is ${npc.state.status}`,
        })
        npc.lastAction = action
        npc.state.status = action.type === 'move' ? 'moving' : action.type === 'think' ? 'thinking' : 'interacting'
        this.log(`🧠 ${npc.name}: ${action.type}${action.target ? ' → ' + action.target : ''}`)
      } catch { npc.state.status = 'idle' }

      if (memory) npc.memoryCount = memory.getStats().total
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
}

export const simulationEngine = new SimulationEngine()
