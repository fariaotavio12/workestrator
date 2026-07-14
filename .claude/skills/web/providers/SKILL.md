---
name: providers
description: Provider pattern for this React Vite web app. Use when adding, reviewing, or understanding the global provider tree, app bootstrap components, theme, routing, auth, TanStack Query, sidebar, overlays, or toasts.
---

# Providers

Global providers live in `src/app/providers/appProvider.tsx`.

## Current Provider Tree

```tsx
<ThemeProvider>
	<QueryClientProvider>
		<BrowserRouter>
			<AuthProvider>
				<SidebarProvider>
					<OverlayPreferenceProvider>
						<AppInner>{children}</AppInner>
					</OverlayPreferenceProvider>
				</SidebarProvider>
			</AuthProvider>
			<Toaster />
		</BrowserRouter>
	</QueryClientProvider>
</ThemeProvider>
```

## Rules

- Add app-wide providers in `AppProvider`, wrapping as close to the leaves as possible.
- Do not wrap individual feature pages with global providers.
- Use small null/renderless components for bootstrap logic that needs hooks.
- Keep `BrowserRouter` at the app root only.
- Keep TanStack Query client creation in shared client infrastructure.
- Keep toasts global through `Toaster`.

## Adding a Provider

Add the provider in `AppProvider` only when multiple unrelated features need it. Feature-specific context should live near the feature instead.

```tsx
<OverlayPreferenceProvider>
	<NewProvider>
		<AppInner>{children}</AppInner>
	</NewProvider>
</OverlayPreferenceProvider>
```

## Bootstrap Components

Use renderless components for app-level side effects:

```tsx
const NotificationsBootstrap = () => {
	useNotificationWatcher();
	return null;
};
```

Keep domain effects in the owning feature unless they are truly app-wide.
