import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Calendar, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const { user, profile, signOut } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const isAdmin = pathname.startsWith('/admin')

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className={`mx-auto flex h-16 items-center justify-between px-4 ${
        isAdmin ? 'max-w-7xl lg:ml-64' : 'max-w-5xl'
      }`}>
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-blue-600">
          <Calendar className="h-6 w-6" />
          Sistema Turnos
        </Link>
        {user && (
          <>
            <div className="hidden items-center gap-4 md:flex">
              {profile?.role.name === 'admin' ? (
                <Link to="/admin/dashboard" className="text-sm font-medium text-gray-700 hover:text-blue-600">
                  Panel Admin
                </Link>
              ) : (
                <Link to="/dashboard" className="text-sm font-medium text-gray-700 hover:text-blue-600">
                  Dashboard
                </Link>
              )}
              <span className="text-sm text-gray-500">{profile?.full_name}</span>
              <button
                onClick={signOut}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" /> Salir
              </button>
            </div>
            <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </>
        )}
        {!user && (
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-blue-600">
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Registrarse
            </Link>
          </div>
        )}
      </div>
      {menuOpen && user && (
        <div className="border-t border-gray-200 px-4 py-3 md:hidden">
          {profile?.role.name === 'admin' && (
            <Link
              to="/admin/dashboard"
              className="block py-2 text-sm font-medium text-gray-700"
              onClick={() => setMenuOpen(false)}
            >
              Panel Admin
            </Link>
          )}
          <Link
            to="/dashboard"
            className="block py-2 text-sm font-medium text-gray-700"
            onClick={() => setMenuOpen(false)}
          >
            Dashboard
          </Link>
          <button
            onClick={() => { signOut(); setMenuOpen(false) }}
            className="block py-2 text-sm text-red-600"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </nav>
  )
}
