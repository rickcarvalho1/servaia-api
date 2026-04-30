import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/ui/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('team_members')
    .select('*, service_companies(id, name, company_name, logo_url, trade)')
    .eq('user_id', user.id)
    .eq('active', true)
    .single()

  if (!member) redirect('/login')

  const appUser = {
    id:           user.id,
    email:        user.email!,
    businessId:   member.service_companies.id,
    businessName: member.service_companies.company_name || member.service_companies.name,
    logoUrl:      member.service_companies.logo_url,
    fullName:     member.full_name,
    role:         member.role,
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8F9FC' }}>
      <Sidebar user={appUser} />
      <main className="flex-1 overflow-y-auto lg:ml-0 pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  )
}