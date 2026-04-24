'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AppUser } from '@/types'
import { LayoutDashboard, Users, Briefcase, ClipboardList, Settings, LogOut, ChevronRight } from 'lucide-react'

interface Props { user: AppUser }

const NAV = [
  { href: '/dashboard',           label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/customers', label: 'Customers', icon: Users           },
  { href: '/dashboard/jobs',      label: 'Jobs',      icon: Briefcase       },
  { href: '/dashboard/team',      label: 'Team',      icon: ClipboardList, ownerOnly: true },
  { href: '/dashboard/settings',  label: 'Settings',  icon: Settings        },
]

export default function Sidebar({ user }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const roleColor = user.role === 'owner' ? '#E8B84B' : user.role === 'manager' ? '#4F8EF7' : '#3DBF7F'

  return (
    <aside style={{ background: '#0E1117', borderRight: '1px solid rgba(255,255,255,0.06)' }}
           className="w-60 flex flex-col h-full flex-shrink-0">

      {/* Logo */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }} className="px-6 py-5">
        <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
             className="text-2xl font-bold text-white tracking-tight">
          Servaia
        </div>
        <div className="text-xs text-white/30 mt-0.5 truncate">{user.businessName}</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.filter(n => !n.ownerOnly || user.role === 'owner' || user.role === 'manager').map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              style={active ? { background: 'rgba(79,142,247,0.15)' } : {}}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                active ? 'text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}>
              <item.icon size={16} style={active ? { color: '#4F8EF7' } : {}} className={active ? '' : 'text-white/30 group-hover:text-white/60'} />
              {item.label}
              {active && <ChevronRight size={12} className="ml-auto" style={{ color: 'rgba(79,142,247,0.6)' }} />}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="px-3 pb-4 pt-4">
        <div style={{ background: 'rgba(255,255,255,0.04)' }} className="flex items-center gap-3 px-3 py-2 rounded-lg mb-2">
          <div style={{ background: 'rgba(79,142,247,0.2)', color: '#4F8EF7' }}
               className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{user.fullName}</div>
            <div className="text-xs capitalize" style={{ color: roleColor }}>{user.role}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}