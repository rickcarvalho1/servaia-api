'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Company {
  id: string
  name: string
  ownerEmail: string
  createdAt: string
  customerCount: number
  jobCount: number
}

interface Props {
  companies: Company[]
}

const PRESETS = {
  HVAC: [
    { name: 'Furnace Cleaning', emoji: '🔥', unit: 'service', default_price: 150 },
    { name: 'AC Maintenance', emoji: '❄️', unit: 'service', default_price: 120 },
    { name: 'Duct Cleaning', emoji: '💨', unit: 'service', default_price: 200 },
    { name: 'Thermostat Installation', emoji: '🌡️', unit: 'service', default_price: 100 },
  ],
  Plumbing: [
    { name: 'Leak Repair', emoji: '🔧', unit: 'service', default_price: 180 },
    { name: 'Drain Cleaning', emoji: '🚿', unit: 'service', default_price: 140 },
    { name: 'Water Heater Install', emoji: '🔥', unit: 'service', default_price: 950 },
    { name: 'Toilet Replacement', emoji: '🚽', unit: 'service', default_price: 230 },
  ],
  'Auto Detail': [
    { name: 'Full Interior Detail', emoji: '🧽', unit: 'service', default_price: 150 },
    { name: 'Exterior Wash & Wax', emoji: '🚗', unit: 'service', default_price: 80 },
    { name: 'Engine Bay Cleaning', emoji: '🔧', unit: 'service', default_price: 50 },
    { name: 'Headlight Restoration', emoji: '💡', unit: 'service', default_price: 100 },
  ],
  Landscaping: [
    { name: 'Lawn Mowing', emoji: '🌱', unit: 'hour', default_price: 60 },
    { name: 'Tree Trimming', emoji: '🌳', unit: 'service', default_price: 150 },
    { name: 'Garden Maintenance', emoji: '🌺', unit: 'visit', default_price: 100 },
    { name: 'Snow Removal', emoji: '❄️', unit: 'service', default_price: 80 },
  ],
  'Pest Control': [
    { name: 'Termite Inspection', emoji: '🐜', unit: 'service', default_price: 180 },
    { name: 'Mosquito Treatment', emoji: '🦟', unit: 'visit', default_price: 120 },
    { name: 'Rodent Exclusion', emoji: '🐭', unit: 'service', default_price: 220 },
    { name: 'Seasonal Preventive Service', emoji: '🍂', unit: 'subscription', default_price: 95 },
  ],
  Hardscaping: [
    { name: 'Patio Installation', emoji: '🪨', unit: 'project', default_price: 2800 },
    { name: 'Retaining Wall', emoji: '🧱', unit: 'project', default_price: 3200 },
    { name: 'Walkway', emoji: '🧭', unit: 'project', default_price: 1400 },
    { name: 'Fire Pit', emoji: '🔥', unit: 'project', default_price: 1800 },
    { name: 'Steps', emoji: '🪜', unit: 'project', default_price: 900 },
    { name: 'Driveway Pavers', emoji: '🚧', unit: 'project', default_price: 4200 },
  ],
}

export default function AdminPanel({ companies }: Props) {
  const [demoName, setDemoName] = useState('')
  const [demoLogo, setDemoLogo] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof PRESETS>('HVAC')

  const handleSetDemo = () => {
    const demo = {
      name: demoName,
      logo: demoLogo,
      services: PRESETS[selectedPreset],
    }
    localStorage.setItem('demoMode', JSON.stringify(demo))
    alert('Demo mode set!')
  }

  const handleClearDemo = () => {
    localStorage.removeItem('demoMode')
    alert('Demo mode cleared!')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

      {/* Companies List */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Companies</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Owner Email</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Date Created</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Customers</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Jobs</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-t border-gray-200">
                  <td className="px-4 py-2 text-sm text-gray-900">{company.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{company.ownerEmail}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">{company.customerCount}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{company.jobCount}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    <Link
                      href={`/admin/company/${company.id}`}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View Dashboard
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Demo Mode Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Demo Mode</h2>
        <div className="bg-white p-6 border border-gray-200 rounded-lg max-w-md">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Demo Company Name
            </label>
            <input
              type="text"
              value={demoName}
              onChange={(e) => setDemoName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Acme HVAC"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo URL
            </label>
            <input
              type="url"
              value={demoLogo}
              onChange={(e) => setDemoLogo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industry Preset
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value as keyof typeof PRESETS)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.keys(PRESETS).map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSetDemo}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Set Demo Mode
            </button>
            <button
              onClick={handleClearDemo}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear Demo Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}