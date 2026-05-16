import { simulationEngine, type NPCRecord } from '../simulation/SimulationEngine'

export interface Faction {
  id: string
  name: string
  color: string
  goal: string
  reputation: number
  members: { npcId: string; role: string }[]
  sharedMemory: string[]
}

export class FactionManager {
  factions: Map<string, Faction> = new Map()

  create(id: string, name: string, color: string, goal: string) {
    this.factions.set(id, { id, name, color, goal, reputation: 50, members: [], sharedMemory: [] })
  }

  assignNPC(factionId: string, npcId: string, role: string) {
    const f = this.factions.get(factionId)
    if (!f) return
    if (!f.members.find(m => m.npcId === npcId)) f.members.push({ npcId, role })
  }

  addSharedMemory(factionId: string, memory: string) {
    const f = this.factions.get(factionId)
    if (f) { f.sharedMemory.push(memory); if (f.sharedMemory.length > 50) f.sharedMemory.shift() }
  }

  getState() {
    return Array.from(this.factions.values()).map(f => ({
      ...f,
      memberDetails: f.members.map(m => {
        const npc = simulationEngine.getState().npcs.find(n => n.id === m.npcId)
        return { ...m, name: npc?.name ?? 'Unknown' }
      }),
    }))
  }
}

export const factionManager = new FactionManager()
