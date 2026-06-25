import { useAuth } from '../hooks/useAuth'

export function Dashboard() {
  const { user, signOut } = useAuth()

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-gray-600">Bienvenido, {user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Cerrar sesión
          </button>
        </div>
        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            Sesión iniciada con Supabase Auth. ID de usuario: {user?.id}
          </p>
        </div>
      </div>
    </div>
  )
}
