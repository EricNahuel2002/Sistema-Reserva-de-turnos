# Sistema-Reserva-de-turnos

Sistema de reserva de turnos de hospital con frontend en React + Supabase. Permite a los **clientes** registrarse, iniciar sesión (email/password), solicitar turnos por especialidad y visualizar su agenda. Los **administradores** pueden gestionar turnos (asignar fecha/hora, cancelar) y mantener el catálogo de especialidades médicas.

## Stack

| Tecnología | Versión | Por qué se eligió |
|---|---|---|
| **React** | 19 | Última versión estable con soporte concurrente. Ecosistema maduro y gran comunidad. |
| **TypeScript** | 5.8 | Tipado estático en toda la aplicación. Modo estricto habilitado. |
| **Vite** | 6 | Dev server ultrarrápido con HMR. Build optimizado con code splitting nativo. |
| **Tailwind CSS** | 4 | Estilos utilitarios sin fricción. Configuración CSS-first sin archivo de configuración. |
| **Supabase** | — | Backend como servicio: autenticación, base de datos PostgreSQL y edge functions en Deno. Elimina la necesidad de mantener un backend propio. |
| **React Router** | 7 | Ruteo declarativo con guards de acceso para roles (cliente/admin). |
| **Vitest + Testing Library** | 3 / 16 | Tests unitarios alineados con la configuración de Vite. Rápido y compatible con jsdom. |
| **Deno** | 2 | Runtime de las edge functions de Supabase. TypeScript nativo, permisos granulares. |
| **pnpm** | 9 | Gestor de paquetes rápido y eficiente en disco. |

## Herramientas de IA

Este proyecto se desarrolló con OpenCode, un agente de IA para programación. OpenCode generó la mayor parte del código del frontend (componentes, vistas, hooks, servicios, tests) a partir de descripciones y ajustes pedidos, lo que permitió concentrarse en la lógica de negocio y la arquitectura en lugar de escribir manualmente cada componente del frontend.

## Arquitectura

```
src/                      # Aplicación React
├── views/                # Páginas (Login, Register, Dashboard, AdminDashboard, NotFound)
├── components/           # Componentes reutilizables (modales, agenda, navbar)
├── hooks/                # Lógica de estado compartida (useAuth, useRequestShift)
├── services/             # Capa de acceso a datos (edge functions + consultas Supabase)
├── lib/                  # Clientes externos (Supabase) y utilidades
├── types/                # Definiciones de tipos TypeScript
└── test/                 # Tests unitarios (Vitest)

supabase/functions/       # Edge functions en Deno TypeScript
├── create-client/        # Registro de clientes con validación
├── create-admin/         # Registro de administradores con código secreto
├── create-shift/         # Solicitud de turno por parte del cliente
├── create-specialty/     # Creación de especialidad por el admin
└── cancel-shift/         # Cancelación de turno por el admin
```

**Principios de diseño:**

- **Separación de capas**: Las vistas delegan en componentes, que usan hooks, que llaman a servicios, que abstraen Supabase. Cada capa es testable de forma independiente.
- **Edge functions para lógica sensible**: Operaciones que requieren `service_role` (registro de usuarios, verificación de roles) se ejecutan del lado del servidor, nunca en el cliente.
- **Route guards**: `PublicRoute`, `PrivateRoute` y `AdminRoute` encapsulan la lógica de redirección según autenticación y rol.
- **Base de datos**: PostgreSQL con Row Level Security (RLS) y funciones `security definer` para evitar recursión en políticas.

## Requisitos

- [Node.js 18+](https://nodejs.org)
- [pnpm](https://pnpm.io/installation)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (para desarrollo local de edge functions)
- Una cuenta gratuita en [Supabase](https://supabase.com)

## Configuración

1. **Clonar el repositorio**
   ```bash
   git clone <repo-url>
   cd Sistema-Reserva-de-turnos
   ```

2. **Instalar dependencias**
   ```bash
   pnpm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   Editar `.env` con las credenciales de tu proyecto de Supabase:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   ADMIN_SECRET_CODE=un-codigo-seguro-para-registro-admin
   ```
   > ⚠️ `SUPABASE_SERVICE_ROLE_KEY` otorga permisos de administrador sobre tu base de datos. **Nunca la expongas al cliente ni la comitees** — solo la usan las edge functions del lado del servidor.

4. **Configurar Supabase**
   - Crear un proyecto en [supabase.com](https://supabase.com)
   - Ir a **Authentication → Providers** y habilitar **Email/Password**
   - Copiar la **URL del proyecto** y la **anon key** desde **Settings → API**
   - Configurar el `ADMIN_SECRET_CODE` como secreto en Supabase:
     ```bash
     supabase secrets set ADMIN_SECRET_CODE=un-codigo-seguro
     ```

5. **Ejecutar migraciones de la base de datos**
   ```bash
   supabase migration up
   ```
   Esto crea las tablas `role`, `profile`, `specialty` y `shift`, el trigger de creación automática de perfil, y las políticas de RLS.

6. **Iniciar el servidor de desarrollo**
   ```bash
   pnpm dev
   ```
   Abrir [http://localhost:5173](http://localhost:5173)

7. **(Opcional) Servir edge functions localmente**
   ```bash
   supabase functions serve
   ```

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Inicia el servidor de desarrollo |
| `pnpm build` | Type-check y build de producción |
| `pnpm typecheck` | Solo type-check con TypeScript |
| `pnpm lint` | Ejecuta ESLint |
| `pnpm test` | Ejecuta los tests unitarios del frontend (Vitest) |
| `pnpm test:watch` | Tests en modo watch |
| `pnpm test:edge` | Ejecuta los tests de las edge functions (Deno) |
| `pnpm preview` | Previsualiza el build de producción |

## Tests

El proyecto tiene **dos sistemas de tests**:

- **Frontend** (`pnpm test`): Tests unitarios con Vitest + Testing Library (jsdom). Cubren componentes, hooks, servicios y vistas.
- **Edge functions** (`pnpm test:edge`): Tests en Deno para cada edge function. Verifican validación de entrada, control de acceso, casos de error y flujo feliz mediante inyección de dependencias.

## Despliegue

- **Frontend**: Build con `pnpm build` y deploy a **Vercel** (el proyecto incluye `vercel.json` con rewrites SPA). La salida del build está en `dist/`.
- **Edge functions**: Deploy con Supabase CLI: `supabase functions deploy <nombre>`.

Actualmente desplegado en: https://sistema-reserva-de-turnos.vercel.app/

## Diagrama entidad-relación

<img width="1538" height="807" alt="supabase-schema" src="https://github.com/user-attachments/assets/9e3d7c0e-f6d9-4e4c-964c-abfe92106eac" />
