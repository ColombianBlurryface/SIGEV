import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="h-screen flex-1 overflow-y-auto px-10 py-8">
        <Outlet />
      </main>
    </div>
  )
}
