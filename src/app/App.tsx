import { useState, useCallback, useEffect } from 'react'
import { TopNav, type AppTab } from './TopNav'
import { TownView } from './TownView'
import { ChatView } from './ChatView'
import { SimulationDashboard } from '@/simulation/SimulationDashboard'
import { FactionPanel } from '@/factions/FactionPanel'
import { GroupChatPanel } from '@/chat/GroupChatView'
import { StateGraphViewer } from '@/graph/StateGraphViewer'
import type { AgentInfo } from '@/hooks/useAgents'

const CHAT_AGENT_STORAGE_KEY = 'agentshire_chat_agent'

function getTabFromHash(): AppTab {
  if (window.location.hash === '#chat') return 'chat'
  if (window.location.hash === '#simulation') return 'simulation'
  if (window.location.hash === '#factions') return 'factions'
  if (window.location.hash === '#groupchat') return 'groupchat'
  if (window.location.hash === '#graph') return 'graph'
  return 'town'
}

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(getTabFromHash)
  const [chatAgent, setChatAgent] = useState<AgentInfo | null>(null)
  const [chatConnected, setChatConnected] = useState(false)

  const handleTabChange = useCallback((tab: AppTab) => {
    setActiveTab(tab)
    const hashMap: Record<AppTab, string> = { town: '', chat: '#chat', simulation: '#simulation', factions: '#factions', groupchat: '#groupchat', graph: '#graph' }
    window.location.hash = hashMap[tab]
  }, [])

  useEffect(() => {
    const onHash = () => setActiveTab(getTabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const handleChatBack = useCallback(() => {
    setChatAgent(null)
    try {
      localStorage.removeItem(CHAT_AGENT_STORAGE_KEY)
    } catch {
      // ignore storage failures
    }
  }, [])

  return (
    <div className="flex flex-col w-full h-dvh bg-bg-base text-text-primary overflow-hidden">
      <TopNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        chatAgent={chatAgent}
        chatConnected={activeTab === 'chat' ? chatConnected : undefined}
        onChatBack={handleChatBack}
      />

      <div className="relative flex-1 overflow-hidden">
        <TownView visible={activeTab === 'town'} />
        <ChatView
          visible={activeTab === 'chat'}
          selectedAgent={chatAgent}
          onAgentChange={setChatAgent}
          onConnectedChange={setChatConnected}
        />
        {activeTab === 'simulation' && <SimulationDashboard />}
        {activeTab === 'factions' && <FactionPanel />}
        {activeTab === 'groupchat' && <GroupChatPanel />}
        {activeTab === 'graph' && <StateGraphViewer />}
      </div>
    </div>
  )
}
