# Frontend

Lingua Pro frontend built with Next.js App Router. It provides a public landing dashboard, authenticated learning pages, admin-aware navigation, and GraphQL communication through API Gateway only.

## Stack

- Framework: Next.js 15+ (App Router), React 19
- Language: TypeScript (strict)
- Styling: TailwindCSS
- Server state: TanStack Query
- Client state: Zustand
- GraphQL: Typed custom client + persisted query manifest
- Forms/validation: React Hook Form + Zod
- Audio: MediaRecorder (Web Audio API)

## Routing And Access

Public routes (no login required):
- `/dashboard`
- `/contact`
- `/privacy`
- `/terms`
- `/faq`
- `/login`

Protected routes (login required):
- `/listening`
- `/reading`
- `/writing`
- `/speaking`
- `/stats`
- `/settings`
- `/admin`

Role-sensitive behavior:
- Header shows `Admin` button only when `user.role === 'admin'`.
- Non-admin users do not see the admin header entry.

## UI Structure

- All pages use a unified visual frame:
	- top header (`LanguageLab`, role-aware nav)
	- main content area
	- bottom footer (`Contact Us`, `Privacy Policy`, `Terms and Conditions`, `FAQ`)
- Dashboard uses large skill cards with image icons:
	- Speaking
	- Listening
	- Reading
	- Writing

## Data Layer

- GraphQL requests go through `src/app/api/graphql/route.ts`.
- The route proxies to API Gateway (`API_GATEWAY_URL`) and resolves persisted query hashes.
- Typed request/response contracts live in:
	- `src/lib/graphql-types.ts`
	- `src/lib/graphql-hooks.ts`
	- `src/lib/graphql-client.ts`

## Streaming

- AI feedback stream endpoint: `src/app/api/ai-feedback/route.ts`
- UI consumer: `src/components/streamed-feedback.tsx`

## Key Files

- `src/components/lab-frame.tsx`: shared page frame (header/footer/layout)
- `src/components/dashboard-home.tsx`: public dashboard
- `src/components/login-page.tsx`: login page
- `src/components/app-shell.tsx`: auth gate for route access
- `src/store/app-store.ts`: Zustand auth/settings/task state
- `src/app/health/route.ts`: health endpoint

## Environment

- Frontend port: `3000`
- Gateway URL (Docker default): `http://api-gateway:8080/graphql`
- Set local gateway URL with `.env`:

```env
API_GATEWAY_URL=http://localhost:8080/graphql
```

## Scripts

- `pnpm dev`: start development server (`:3000`)
- `pnpm build`: production build
- `pnpm start`: run production server (`:3000`)