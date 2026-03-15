import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'

import { Settings } from './pages/Settings'
import { Dashboard } from './pages/Dashboard'
import { Inventory } from './pages/Inventory'
import { Pos } from './pages/Pos'
import { SalesHistory } from './pages/SalesHistory'
import { RatesProvider } from './context/RatesContext'

function App() {
  const [sidebarWidth, setSidebarWidth] = useState(256);

  return (
    <RatesProvider>
      <div className="flex w-full h-screen overflow-hidden bg-slate-50">
        <div style={{ width: sidebarWidth }} className="flex transition-all duration-300">
          <Sidebar onToggle={setSidebarWidth} />
        </div>
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pos" element={<Pos />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/history" element={<SalesHistory />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>
    </RatesProvider>
  )
}

export default App
