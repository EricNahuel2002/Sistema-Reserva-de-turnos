# Sistema-Reserva-de-turnos

Sistema de reserva de turnos de hospital (vista del cliente). Frontend en React + Supabase.

## Requisitos

- [pnpm](https://pnpm.io/installation) (requiere Node.js 18+)
- Una cuenta gratuita en [Supabase](https://supabase.com)

## Configuración

1. **Instalar dependencias**
   ```bash
   pnpm install
   ```

2. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   Editar `.env` con las credenciales de tu proyecto de Supabase:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```

3. **Configurar Supabase**
   - Crear un proyecto en [supabase.com](https://supabase.com)
   - Ir a **Authentication → Providers** y habilitar **Email/Password**
   - (Opcional) Habilitar **Google** y configurar las credenciales de OAuth
   - Copiar la **URL del proyecto** y la **anon key** desde **Settings → API**

4. **Iniciar el servidor de desarrollo**
   ```bash
   pnpm dev
   ```
   Abrir [http://localhost:5173](http://localhost:5173)

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Inicia el servidor de desarrollo |
| `pnpm build` | Type-check y build de producción |
| `pnpm lint` | Ejecuta ESLint |
| `pnpm test` | Ejecuta los tests |
| `pnpm preview` | Previsualiza el build de producción |

## Stack

- **React 19** + TypeScript
- **Vite 6** (bundler)
- **Tailwind CSS v4** (estilos)
- **Supabase** (autenticación y base de datos)
- **React Router v7** (ruteo)
- **Vitest** + **Testing Library** (tests)

## Estructura

```
src/
├── components/    # Componentes reutilizables
├── hooks/         # Custom hooks (useAuth)
├── lib/           # Cliente de Supabase
├── types/         # Tipos de TypeScript
├── views/         # Páginas (Login, Register, Dashboard, NotFound)
├── App.tsx        # Componente raíz con ruteo
├── main.tsx       # Punto de entrada
└── index.css      # Estilos globales (Tailwind)
```

Diagrama de base entidad-relacion utilizada
<img width="1538" height="807" alt="supabase-schema-ttlwyiezvugspqwfkcxj" src="https://github.com/user-attachments/assets/9e3d7c0e-f6d9-4e4c-964c-abfe92106eac" />

