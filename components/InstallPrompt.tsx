'use client'

import { useEffect, useState } from 'react'

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem('pwa-dismissed')) return

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // iOS detection
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    const safari = /safari/.test(navigator.userAgent.toLowerCase())
    setIsIOS(ios && safari)

    if (ios && safari) {
      setTimeout(() => setShowPrompt(true), 3000)
      return
    }

    // Android/Chrome install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setShowPrompt(true), 3000)
    })
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
      }
    }
  }, [])

  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then(() => {
        setShowPrompt(false)
        setDeferredPrompt(null)
      })
    }
  }

  function handleDismiss() {
    localStorage.setItem('pwa-dismissed', '1')
    setShowPrompt(false)
    setDismissed(true)
  }

  if (!showPrompt || dismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 lg:p-6 lg:max-w-sm lg:left-auto lg:right-6 lg:bottom-6">
      <div className="bg-[#0E1117] border border-[rgba(201,168,76,0.3)] rounded-2xl shadow-2xl p-5">
        <div className="flex items-start gap-4">
          <img src="/servaia-icon.jpg" alt="Servaia" className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm mb-0.5">Add Servaia to Home Screen</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              {isIOS
                ? 'Tap the share button below, then "Add to Home Screen" for quick access.'
                : 'Install Servaia for quick one-tap access — no App Store needed.'}
            </p>
          </div>
          <button onClick={handleDismiss} className="text-gray-600 hover:text-gray-400 flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isIOS ? (
          <div className="mt-4 flex items-center gap-2 bg-[#1a1f2e] rounded-xl px-4 py-3">
            <svg className="w-5 h-5 text-[#C9A84C] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <p className="text-gray-300 text-xs">Tap <strong className="text-white">Share</strong> then <strong className="text-white">Add to Home Screen</strong></p>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <button onClick={handleDismiss}
              className="flex-1 py-2.5 border border-gray-700 text-gray-400 text-sm rounded-xl hover:bg-gray-800 transition-colors">
              Not now
            </button>
            <button onClick={handleInstall}
              className="flex-2 flex-grow py-2.5 bg-[#C9A84C] text-[#0E1117] text-sm font-semibold rounded-xl hover:bg-yellow-400 transition-colors">
              Install App
            </button>
          </div>
        )}
      </div>
    </div>
  )
}