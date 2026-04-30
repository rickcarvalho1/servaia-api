import { Suspense } from 'react'
import SignupForm from './SignupForm'

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0E1117] flex items-center justify-center text-white">Loading...</div>}>
      <SignupForm />
    </Suspense>
  )
}
