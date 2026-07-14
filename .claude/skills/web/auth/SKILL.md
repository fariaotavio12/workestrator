---
name: auth
description: Authentication patterns for this React Vite web app. Use when implementing login, logout, token storage, auth guards, route protection, hydration, Google OAuth, unauthorized handling, or reading auth status.
---

# Auth

Auth currently uses `AuthProvider` plus TanStack Query hooks. Do not introduce React Native storage, MMKV, Expo deep links, or Expo Router patterns.

## Current Shape

```txt
src/app/providers/authProvider.tsx
src/app/utils/tokenStorage.ts
src/app/routing/middlewareAuth.tsx
src/app/routing/middleware.tsx
src/features/public/auth/
```

Auth API code lives in:

```txt
src/features/public/auth/api/
  index.ts
  keys.ts
  service.ts
  types.ts
```

If protected dashboard auth contracts become shared, keep the owning feature explicit instead of creating new domain code in `src/api`.

## Token Storage

Use `tokenStorage` only. It is the abstraction for browser storage.

```ts
import { tokenStorage } from "@/app/utils/tokenStorage";
```

Never access `localStorage` directly for auth tokens outside `tokenStorage`.

## Login Flow

- Submit through auth API mutation.
- Save returned token via `tokenStorage` when present.
- Refetch `/auth/me`.
- Put the user into `AuthProvider` state.
- Navigate with `useNavigate`.

## Logout Flow

- Clear local user state.
- Clear `tokenStorage`.
- Call logout API.
- Let route guards redirect unauthenticated users.

## Route Guards

Use React Router middleware components. Do not redirect from inside unrelated feature pages.

```tsx
if (isInitializing) return null;
if (!user) return <Navigate to={Rotas.desprotegidas.auth.login} replace />;
return <Outlet />;
```

## Google OAuth

Use browser navigation:

```ts
window.location.href = `${apiUrl}/auth/google/login?registrationId=google`;
```

If the backend returns a `token` query param, read it during auth provider initialization, save it with `tokenStorage`, then clean the URL.

## Rules

- Keep auth UI in `src/features/public/auth`.
- Keep auth API in the auth feature after migration.
- Do not use MMKV, Expo Linking, or native deep link handlers.
- Do not pass tokens manually from components; the Axios interceptor attaches them when available.
- Handle 401 globally in the API client when that behavior is added.
