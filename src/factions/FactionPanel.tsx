import { useEffect, useState } from 'react'
import { factionManager } from './FactionManager'
import { simulationEngine } from '../simulation/SimulationEngine'

export function FactionPanel() {
  const [, refresh] = useState(0)
  const [newFaction, setNewFaction] = useState({ name: '', goal: '' })
  const factions = factionManager.getState()

  useEffect(() => { const unsub = simulationEngine.subscribe(() => refresh(n => n + 1)); return () => unsub(); }, [])

  const createFaction = () => {
    if (!newFaction.name.trim()) return
    const id = `faction-${Date.now()}`
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899']
    factionManager.create(id, newFaction.name, colors[factions.length % colors.length], newFaction.goal || 'Prosper and grow')
    const state = simulationEngine.getState()
    state.npcs.forEach((npc, i) => {
      if (i % Math.max(1, Math.floor(state.npcs.length / (factions.length + 1))) === 0) {
        const roles = ['Leader', 'Scout', 'Defender', 'Gatherer', 'Diplomat', 'Crafter']
        factionManager.assignNPC(id, npc.id, roles[i % roles.length])
      }
    })
    setNewFaction({ name: '', goal: '' })
  }

  const assignAllNPCs = () => {
    const state = simulationEngine.getState()
    if (factions.length === 0 || state.npcs.length === 0) return
    state.npcs.forEach((npc, i) => {
      const fi = i % factions.length
      const roles = ['Member', 'Scout', 'Guard', 'Crafter']
      const f = factions[fi]
      if (!f.members.find(m => m.npcId === npc.id)) {
        factionManager.assignNPC(f.id, npc.id, roles[i % roles.length])
      }
    })
  }

  if (factions.length === 0 && simulationEngine.getState().npcs.length === 0) {
    return <div className="p-4 text-center text-gray-500">Spawn NPCs first, then create factions.</div>
  }

  return (
    <div className="flex h-full flex-col gap-2 p-4 text-white">
      <h2 className="text-lg font-bold">🏰 Factions</h2>

      <div className="flex gap-2">
        <input value={newFaction.name} onChange={e => setNewFaction(p => ({ ...p, name: e.target.value }))}
          placeholder="Faction name" className="flex-1 rounded bg-gray-800 px-2 py-1 text-sm" />
        <input value={newFaction.goal} onChange={e => setNewFaction(p => ({ ...p, goal: e.target.value }))}
          placeholder="Goal (optional)" className="flex-1 rounded bg-gray-800 px-2 py-1 text-sm" />
        <button onClick={createFaction} className="rounded bg-purple-700 px-3 py-1 text-sm hover:bg-purple-600">+ Create</button>
      </div>

      {factions.length > 0 && <button onClick={assignAllNPCs} className="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600 self-start">Assign NPCs evenly</button>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {factions.map(f => (
          <div key={f.id} className="rounded-lg border p-3" style={{ borderColor: f.color + '44', background: f.color + '11' }}>
            <div className="flex items-center justify-between">
              <span className="font-bold" style={{ color: f.color }}>{f.name}</span>
              <span className="text-xs text-gray-400">❤️ {f.reputation}</span>
            </div>
            <div className="mt-1 text-xs text-gray-400">🎯 {f.goal}</div>
            <div className="mt-2 text-xs font-semibold text-gray-300">Members ({f.members.length}):</div>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {f.memberDetails.map(m => (
                <div key={m.npcId} className="flex items-center gap-1 rounded bg-gray-800/50 px-2 py-0.5 text-xs">
                  <span className="text-cyan-300">{m.name}</span>
                  <span className="text-gray-500">· {m.role}</span>
                </div>
              ))}
            </div>
            {f.sharedMemory.length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] font-semibold text-gray-500">Shared Knowledge:</div>
                <div className="max-h-16 overflow-y-auto text-[10px] text-gray-500">
                  {f.sharedMemory.map((m, i) => <div key={i}>📖 {m}</div>)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
