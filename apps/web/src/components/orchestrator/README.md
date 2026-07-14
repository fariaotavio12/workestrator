# Orchestrator Components

Shared UI for the Workestrator orchestrator screens.

Use this module for components reused by more than one orchestrator feature, such as squads, squad detail, executions, and the app sidebar.

```ts
import { ConfirmDialog, RunDialog, SquadFormDialog } from "@/components/orchestrator";
```

Feature-specific UI stays inside its owning feature folder under `src/features/security/<feature>/components`.

The orchestrator domain model, store, runtime, and seed data stay in `src/features/security/orchestrator-shared`.
