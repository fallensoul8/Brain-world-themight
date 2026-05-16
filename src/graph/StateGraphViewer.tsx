import { useEffect, useState, useRef } from 'react'
import { simulationEngine } from '../simulation/SimulationEngine'

interface GraphNode {
  id: string
  label: string
  type: 'perception' | 'memory' | 'risk' | 'decision' | 'action'
  x: number
  y: number
}

interface GraphEdge {
  from: string
  to: string
  label?: string
}

const DEFAULT_NODES: GraphNode[] = [
  { id: 'perception', label: '👁️ Perception', type: 'perception', x: 100, y: 80 },
  { id: 'memory', label: '🧠 Memory Recall', type: 'memory', x: 300, y: 80 },
  { id: 'risk', label: '⚖️ Risk Eval', type: 'risk', x: 500, y: 80 },
  { id: 'decision', label: '🎯 Decision', type: 'decision', x: 500, y: 220 },
  { id: 'action', label: '⚡ Action', type: 'action', x: 300, y: 220 },
]

const DEFAULT_EDGES: GraphEdge[] = [
  { from: 'perception', to: 'memory', label: 'context' },
  { from: 'memory', to: 'risk', label: 'memories' },
  { from: 'risk', to: 'decision', label: 'risk_score' },
  { from: 'decision', to: 'action', label: 'plan' },
]

export function StateGraphViewer() {
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null)
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const state = simulationEngine.getState()
  const svgRef = useRef<SVGSVGElement>(null)

  const selectedNpc = state.npcs.find(n => n.id === selectedNpcId)
  const nodes = DEFAULT_NODES
  const edges = DEFAULT_EDGES

  useEffect(() => {
    if (state.npcs.length > 0 && !selectedNpcId) setSelectedNpcId(state.npcs[0].id)
  }, [state.npcs.length])

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'perception': return '#3b82f6'
      case 'memory': return '#a855f7'
      case 'risk': return '#f59e0b'
      case 'decision': return '#22c55e'
      case 'action': return '#ef4444'
      default: return '#6b7280'
    }
  }

  return (
    <div className="flex h-full flex-col text-white">
      <div className="flex items-center gap-2 border-b border-gray-700 p-2">
        <span className="text-sm font-bold">🔄 Decision Graph</span>
        <select onChange={e => setSelectedNpcId(e.target.value || null)}
          className="rounded bg-gray-800 px-2 py-1 text-xs text-white" value={selectedNpcId ?? ''}>
          <option value="">Select NPC...</option>
          {state.npcs.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
        {selectedNpc && (
          <span className="text-xs text-gray-400">
            {selectedNpc.name} · {selectedNpc.state.status} · {selectedNpc.memoryCount} memories
          </span>
        )}
      </div>

      <div className="relative flex-1">
        <svg ref={svgRef} className="h-full w-full" viewBox="0 0 700 320">
          {/* Edges */}
          {edges.map((edge, i) => {
            const from = nodes.find(n => n.id === edge.from)
            const to = nodes.find(n => n.id === edge.to)
            if (!from || !to) return null
            return (
              <g key={i}>
                <line x1={from.x + 60} y1={from.y + 20} x2={to.x} y2={to.y + 20}
                  stroke={activeNode === edge.from ? getNodeColor(from.type) : '#374151'}
                  strokeWidth={activeNode === edge.from ? 2.5 : 1.5}
                  strokeDasharray={activeNode === edge.from ? 'none' : '5,3'} />
                {edge.label && (
                  <text x={(from.x + to.x + 60) / 2} y={(from.y + to.y + 40) / 2}
                    fill="#6b7280" fontSize={11} textAnchor="middle">
                    {edge.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const isActive = activeNode === node.id
            const actionType = selectedNpc?.lastAction?.type
            const isActionMatch = node.type === 'action' && actionType
            return (
              <g key={node.id} onClick={() => setActiveNode(isActive ? null : node.id)}
                className="cursor-pointer">
                <rect x={node.x} y={node.y} width={120} height={40} rx={8}
                  fill={isActive ? getNodeColor(node.type) + '33' : '#1f2937'}
                  stroke={isActive ? getNodeColor(node.type) : '#374151'}
                  strokeWidth={isActive ? 2 : 1} />
                <text x={node.x + 60} y={node.y + 24} fill="white" fontSize={12}
                  textAnchor="middle" fontWeight={isActive ? 'bold' : 'normal'}>
                  {node.label}
                </text>
                {isActionMatch && node.type === 'action' && (
                  <text x={node.x + 60} y={node.y + 55} fill="#22c55e" fontSize={10}
                    textAnchor="middle">{selectedNpc?.lastAction?.type}</text>
                )}
              </g>
            )
          })}
        </svg>

        {selectedNpc?.lastAction && (
          <div className="absolute bottom-2 left-2 right-2 rounded bg-gray-900/90 p-2 text-xs">
            <span className="font-semibold text-purple-300">Last Action:</span>
            <span className="ml-2 text-gray-300">{selectedNpc.lastAction.type}</span>
            {selectedNpc.lastAction.target && <span className="ml-1 text-gray-500">→ {selectedNpc.lastAction.target}</span>}
            <div className="mt-0.5 text-gray-500">{selectedNpc.lastAction.reasoning}</div>
          </div>
        )}
      </div>
    </div>
  )
}
