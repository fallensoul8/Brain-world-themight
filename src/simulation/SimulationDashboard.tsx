import { useEffect, useState, useCallback } from 'react'
import { simulationEngine } from './SimulationEngine'
import type { SimulationState } from './SimulationEngine'

const NPC_TEMPLATES = [
  { name: 'Chen', personality: 'Friendly shopkeeper, loves gossip', role: 'Merchant', faction: 'Traders' },
  { name: 'Mei', personality: 'Curious scholar, asks many questions', role: 'Scholar', faction: 'Academy' },
  { name: 'Jack', personality: 'Brave but reckless guard', role: 'Guard', faction: 'Town Watch' },
  { name: 'Luna', personality: 'Mysterious wanderer, speaks in riddles', role: 'Wanderer' },
  { name: 'Hiro', personality: 'Diligent farmer, practical thinker', role: 'Farmer', faction: 'Farmers Guild' },
]

export function SimulationDashboard() {
  const [state, setState] = useState<SimulationState>(simulationEngine.getState())

  useEffect(() => {
    simulationEngine.init()
    const unsub = simulationEngine.subscribe(setState)
    return () => unsub()
  }, [])

  const toggle = useCallback(() => {
    state.running ? simulationEngine.stop() : simulationEngine.start()
  }, [state.running])

  const spawnNPCs = useCallback(() => {
    for (const tpl of NPC_TEMPLATES) {
      simulationEngine.addNPC(
        `npc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tpl.name, tpl.personality, tpl.role, tpl.faction
      )
    }
  }, [])

  return (
    <div className="flex h-full flex-col gap-4 p-4 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🧠 Brainworld Simulation</h1>
        <div className="flex gap-2">
          <button onClick={spawnNPCs} className="rounded bg-green-700 px-3 py-1 text-sm hover:bg-green-600">
            + Spawn NPCs
          </button>
          <button onClick={toggle} className={`rounded px-4 py-1 text-sm font-bold ${
            state.running ? 'bg-red-700 hover:bg-red-600' : 'bg-blue-700 hover:bg-blue-600'
          }`}>
            {state.running ? '⏹ Stop' : '▶ Start'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 text-xs text-gray-400">
        <span>Tick: {state.tick}</span>
        <span>NPCs: {state.npcs.length}</span>
        <span>Rate: {state.tickRate}ms</span>
        {!state.running && <span className="text-yellow-400">🔴 Stopped</span>}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {state.npcs.map(npc => (
          <div key={npc.id} className="rounded-lg border border-gray-700 bg-gray-900 p-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300">{npc.name}</span>
              <span className={`text-xs ${npc.state.status === 'thinking' ? 'text-yellow-400' : npc.state.status === 'moving' ? 'text-green-400' : 'text-gray-500'}`}>
                {npc.state.status}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-400">{npc.role}{npc.faction ? ` · ${npc.faction}` : ''}</div>
            <div className="mt-1 text-xs text-gray-500 italic">"{npc.personality}"</div>
            {npc.lastAction && (
              <div className="mt-2 rounded bg-gray-800 p-1.5 text-xs">
                <span className="text-purple-300">{npc.lastAction.type}</span>
                {npc.lastAction.target && <span className="text-gray-400"> → {npc.lastAction.target}</span>}
                {npc.lastAction.content && <div className="mt-0.5 text-gray-300">{npc.lastAction.content}</div>}
                <div className="mt-0.5 text-[10px] text-gray-600">{npc.lastAction.reasoning}</div>
              </div>
            )}
            <div className="mt-1 flex gap-2 text-[10px] text-gray-600">
              <span>🧠 {npc.memoryCount} memories</span>
              <span>🔄 {npc.tickCount} ticks</span>
            </div>
          </div>
        ))}
        {state.npcs.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 py-12 text-gray-500">
            <span className="text-4xl">🏘️</span>
            <p>No NPCs yet. Click "Spawn NPCs" to populate the world.</p>
          </div>
        )}
      </div>

      <div className="mt-auto">
        <h2 className="mb-1 text-sm font-semibold text-gray-400">Activity Log</h2>
        <div className="h-32 overflow-y-auto rounded bg-gray-950 p-2 text-[11px] leading-5 text-gray-500">
          {state.activityLog.slice(-50).map((entry, i) => (
            <div key={i}>{entry}</div>
          ))}
          {state.activityLog.length === 0 && <div className="text-gray-700">Waiting for activity...</div>}
        </div>
      </div>
    </div>
  )
}