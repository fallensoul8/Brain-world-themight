import { useState, useCallback, useEffect } from 'react'
import { simulationEngine } from '../simulation/SimulationEngine'

interface ChatMessage {
  from: string
  to: string | 'all'
  content: string
  timestamp: number
  type: 'say' | 'whisper' | 'broadcast'
}

export function GroupChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [selectedNpcs, setSelectedNpcs] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'selected'>('all')
  const state = simulationEngine.getState()

  useEffect(() => {
    if (state.npcs.length > 0 && selectedNpcs.length === 0) {
      setSelectedNpcs(state.npcs.slice(0, 3).map(n => n.id))
    }
  }, [state.npcs.length])

  const sendMessage = useCallback(() => {
    if (!input.trim() || selectedNpcs.length === 0) return
    const msg: ChatMessage = {
      from: '🧑 User', to: activeTab === 'all' ? 'all' : selectedNpcs.join(', '),
      content: input.trim(), timestamp: Date.now(), type: activeTab === 'all' ? 'broadcast' : 'whisper',
    }
    setMessages(prev => [...prev, msg])

    // Auto-reply from selected NPCs
    const targets = state.npcs.filter(n => selectedNpcs.includes(n.id))
    setTimeout(() => {
      targets.forEach((npc, i) => {
        setTimeout(() => {
          const replies = [
            `"${input.trim().slice(0, 20)}..." mutters ${npc.name}`,
            `${npc.name} considers: "An interesting proposition."`,
            `${npc.name} the ${npc.role} nods thoughtfully.`,
            `"I shall remember this," says ${npc.name}.`,
            `${npc.name} glances around and replies: "Let me think about that."`,
          ]
          const reply: ChatMessage = {
            from: `🧑‍🦰 ${npc.name}`, to: 'all',
            content: replies[i % replies.length],
            timestamp: Date.now(), type: 'say',
          }
          setMessages(prev => [...prev, reply])
        }, 500 + i * 800)
      })
    }, 300)

    setInput('')
  }, [input, selectedNpcs, activeTab, state.npcs])

  const toggleNpc = (id: string) => {
    setSelectedNpcs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="flex h-full flex-col text-white">
      <div className="flex items-center gap-2 border-b border-gray-700 p-2">
        <button onClick={() => setActiveTab('all')}
          className={`rounded px-3 py-1 text-xs ${activeTab === 'all' ? 'bg-blue-700' : 'bg-gray-800'}`}>Group Chat</button>
        <button onClick={() => setActiveTab('selected')}
          className={`rounded px-3 py-1 text-xs ${activeTab === 'selected' ? 'bg-blue-700' : 'bg-gray-800'}`}>Whisper</button>
        <span className="text-xs text-gray-500">{selectedNpcs.length}/{state.npcs.length} NPCs</span>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-700 p-2">
        {state.npcs.map(npc => (
          <button key={npc.id} onClick={() => toggleNpc(npc.id)}
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs transition-colors ${
              selectedNpcs.includes(npc.id) ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>
            {npc.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {messages.map((msg, i) => (
          <div key={i} className={`rounded px-2 py-1 text-xs leading-relaxed ${
            msg.from.includes('User') ? 'bg-blue-900/30 ml-4' : 'bg-gray-800/50 mr-4'
          }`}>
            <span className="font-semibold text-cyan-300">{msg.from}</span>
            {msg.to !== 'all' && <span className="text-gray-600"> → {msg.to}</span>}
            <div className="text-gray-200">{msg.content}</div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="py-12 text-center text-gray-600">Select NPCs and start chatting.</div>
        )}
      </div>

      <div className="flex gap-2 border-t border-gray-700 p-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder={activeTab === 'all' ? 'Message all NPCs...' : 'Whisper to selected NPCs...'}
          className="flex-1 rounded bg-gray-800 px-3 py-2 text-sm outline-none" />
        <button onClick={sendMessage} className="rounded bg-blue-700 px-4 py-2 text-sm hover:bg-blue-600">Send</button>
      </div>
    </div>
  )
}
