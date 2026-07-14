# Orchestrator Shared

Domain library shared by the protected Workestrator orchestrator surfaces.

This folder is not a page feature. It owns the client-side domain model and pure orchestration helpers reused by:

- `src/features/security/squads`
- `src/features/security/squad-detail`
- `src/features/security/executions`
- `src/components/orchestrator`

## Structure

```txt
orchestrator-shared/
  data/      Static defaults, seed data, provider helpers, avatar metadata
  model/     Runtime-only Zustand store (useOrchestratorRuntimeStore) — never server state
  runtime/   Runner (module-level, reads config from the query cache), model client, parsers
  types/     Domain types and persisted schema contract
```

Server state (providers/squads/scripts/runs) lives in TanStack Query via per-resource, feature-local
`api/` folders (`squads`, `squad-detail`, `scripts`, `models`, `executions`) — not here and not in
Zustand. Only ephemeral runtime (never persisted) uses Zustand, in this folder's `model/`.

## Import Style

Prefer importing from the narrow submodule that owns the contract:

```ts
import { useOrchestratorRuntimeStore } from "@/features/security/orchestrator-shared/model";
import type { Squad } from "@/features/security/orchestrator-shared/types";
import { modelLabel } from "@/features/security/orchestrator-shared/data";
```

Use the root barrel only when a file naturally needs several pieces from the shared library.

## Boundary

Keep UI that is reused across orchestrator screens in `src/components/orchestrator`.
Keep page-specific UI inside the owning feature.
Keep generic, non-domain helpers in `src/lib`.
