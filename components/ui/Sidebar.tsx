'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AppUser } from '@/types'
import { LayoutDashboard, Users, Briefcase, ClipboardList, Settings, LogOut, ChevronRight, Menu, X, CreditCard } from 'lucide-react'

interface Props { user: AppUser }

const NAV = [
  { href: '/dashboard',                          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/customers',                label: 'Customers', icon: Users           },
  { href: '/dashboard/jobs',                     label: 'Jobs',      icon: Briefcase       },
  { href: '/dashboard/team',                     label: 'Team',      icon: ClipboardList, ownerOnly: true },
  { href: '/dashboard/settings/stripe-connect',  label: 'Payments',  icon: CreditCard, ownerOnly: true },
  { href: '/dashboard/settings',                 label: 'Settings',  icon: Settings        },
]

export default function Sidebar({ user }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [demo, setDemo] = useState<{name: string, logo: string} | null>(null)

  useEffect(() => {
    const demoData = localStorage.getItem('demoMode')
    if (demoData) {
      try {
        setDemo(JSON.parse(demoData))
      } catch {}
    }
  }, [])

  const businessName = demo?.name || user.businessName
  const logoUrl = demo?.logo || user.logoUrl

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const roleColor = user.role === 'owner' ? '#E8B84B' : user.role === 'manager' ? '#4F8EF7' : '#3DBF7F'

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#DDE1EC] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={businessName} className="h-6 w-6 rounded object-cover" />
          ) : null}
          <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
               className="text-lg font-bold text-[#0E1117] tracking-tight truncate">
            {businessName}
          </div>
        </div>
        <button
          onClick={() => {
            const sidebar = document.getElementById('mobile-sidebar')
            const overlay = document.getElementById('mobile-overlay')
            sidebar?.classList.remove('-translate-x-full')
            sidebar?.classList.add('translate-x-0')
            overlay?.classList.remove('hidden')
          }}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu size={20} className="text-[#6B7490]" />
        </button>
      </div>

      {/* Mobile Overlay */}
      <div
        id="mobile-overlay"
        className="lg:hidden fixed inset-0 bg-black/50 z-40 hidden"
        onClick={() => {
          const sidebar = document.getElementById('mobile-sidebar')
          sidebar?.classList.add('-translate-x-full')
          sidebar?.classList.remove('translate-x-0')
          document.getElementById('mobile-overlay')?.classList.add('hidden')
        }}
      />

      {/* Sidebar */}
      <aside
        id="mobile-sidebar"
        style={{ background: '#0E1117', borderRight: '1px solid rgba(255,255,255,0.06)' }}
        className="w-60 flex flex-col h-full flex-shrink-0 fixed lg:static top-0 left-0 z-50 -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out lg:z-auto"
      >
        {/* Close button for mobile */}
        <button
          onClick={() => {
            const sidebar = document.getElementById('mobile-sidebar')
            sidebar?.classList.add('-translate-x-full')
            sidebar?.classList.remove('translate-x-0')
            document.getElementById('mobile-overlay')?.classList.add('hidden')
          }}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X size={20} className="text-white/60" />
        </button>

        {/* Logo */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }} className="px-6 py-5 pt-12 lg:pt-5">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={businessName} className="h-8 w-8 rounded object-cover" />
            ) : null}
            <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                 className="text-2xl font-bold text-white tracking-tight">
              {businessName}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.filter(n => !n.ownerOnly || user.role === 'owner' || user.role === 'manager').map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  // Close mobile sidebar on navigation
                  const sidebar = document.getElementById('mobile-sidebar')
                  sidebar?.classList.add('-translate-x-full')
                  sidebar?.classList.remove('translate-x-0')
                  document.getElementById('mobile-overlay')?.classList.add('hidden')
                }}
                style={active ? { background: 'rgba(79,142,247,0.15)' } : {}}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  active ? 'text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
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
    </>
  )
}