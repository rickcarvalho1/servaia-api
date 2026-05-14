'use client'

interface Props {
  enabled: boolean
  children: React.ReactNode
}

export default function DashboardPaywall({ enabled, children }: Props) {
  return <>{children}</>
}