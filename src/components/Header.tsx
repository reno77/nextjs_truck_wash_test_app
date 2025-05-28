'use client'

import { signOut } from 'next-auth/react'
import Image from 'next/image'
import { useState } from 'react'

interface HeaderProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string | null
  }
}

export function Header({ user }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-white border-b border-gray-200 fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Truck Wash Manager</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {user?.role === 'manager' && (
                <>
                  <a href="/manager/dashboard" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                    Dashboard
                  </a>
                  <a href="/manager/users" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                    Users
                  </a>
                </>
              )}
              {user?.role === 'driver' && (
                <a href="/driver/dashboard" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                  Dashboard
                </a>
              )}
              {user?.role === 'washer' && (
                <>
                  <a href="/washer/washes" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                    Washes
                  </a>
                  <a href="/washer/washes/create" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                    New Wash
                  </a>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <div className="relative ml-3">
              <div>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center max-w-xs bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {user?.image ? (
                      <Image
                        src={user.image}
                        alt="Profile"
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-600">
                        {user?.name?.[0] || user?.email?.[0] || '?'}
                      </span>
                    )}
                  </div>
                </button>
              </div>
              {isMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                    <p className="font-medium">{user?.name || 'User'}</p>
                    <p className="text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
