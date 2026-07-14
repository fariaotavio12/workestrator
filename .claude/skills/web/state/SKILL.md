---
name: state
description: Client state rules for this React Vite web app. Use when creating, reading, reviewing, or migrating Zustand stores, React Context state, selectors, standalone actions, or store hydration.
---

# State

Use TanStack Query for server state. Use local `useState` for local UI state. Use Zustand only for global client state that is shared across unrelated features.

Existing React Context providers may remain until deliberately migrated. Do not create new app-wide context for domain state when a feature-local Zustand store is a better fit.

## Store Location

```txt
src/features/<feature>/model/
  use-<feature>-store.ts
  index.ts
```

## Store Pattern

```ts
import { create } from "zustand";

type CustomerFiltersState = {
	search: string;
	setSearch: (search: string) => void;
	reset: () => void;
};

const initialState = {
	search: "",
};

export const useCustomerFiltersStore = create<CustomerFiltersState>((set) => ({
	...initialState,
	setSearch: (search) => set({ search }),
	reset: () => set(initialState),
}));

export const resetCustomerFilters = () => useCustomerFiltersStore.getState().reset();
```

If `createSelectors` exists in the project, wrap stores with it and use selector helpers. Otherwise use explicit selectors:

```ts
const search = useCustomerFiltersStore((state) => state.search);
```

## Rules

- Stores live under `src/features/<feature>/model`.
- Export through `model/index.ts`.
- Export standalone actions when needed outside React components.
- Never use Zustand for API data.
- Keep state minimal and domain-owned.
- Persist to browser storage only when the user experience requires it.
