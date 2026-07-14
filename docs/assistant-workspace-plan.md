# Assistant Workspace Plan

## Goal

Turn the assistant into the main command center of Workestrator.

The assistant should not be only a chat box or a squad runner. It should become the place where a user can:

- Search available capabilities.
- Attach skills and knowledge.
- Run command templates.
- Start or inspect squad runs.
- Import public resources from Explore.
- Use scripts safely.
- See active context and execution history.
- Connect Workestrator to external tools through MCP.

## Product References

Use these as inspiration, not as direct copies:

- OpenHands: agent control center, agent backend concept, automations, integrations, and workspace-like execution model.
  - https://github.com/OpenHands/OpenHands
  - https://docs.openhands.dev
- Raycast Store: command-first discovery, community extensions, install/import behavior, and dense searchable catalog.
  - https://www.raycast.com/store
- Cursor-style MCP/workspace flows: external tools can bring context and actions into an assistant environment.
  - https://cursor.com/docs

## Product Direction

The assistant should feel like a workspace with attached capabilities:

```txt
Assistant Workspace
  Conversation
  Command palette
  Active context
  Attached skills
  Attached knowledge
  Selected squad
  Scripts/tools
  Execution timeline
```

Core idea:

```txt
User intent + selected context + reusable capability = executable command
```

## Phase 1 Delivered

- [x] Assistant page accepts `?prompt=` to start from commands, skills, and imported flows.
- [x] Assistant workspace side panels for active context and resource discovery.
- [x] Resource cards for commands, routines, squads, knowledge, scripts, skills, and MCP presets.
- [x] Commands page with reusable command templates.
- [x] Skills page with Markdown editor, preview, public/private toggle, and assistant handoff.
- [x] Sidebar entries for Assistant, Commands, and Skills.
- [x] Sidebar visual pass closer to a dense workspace tool.

## Phase 2 Delivered

- [x] Skills can be saved to the backend as Markdown-backed assets.
- [x] Imported or created resources are visible from the dashboard library.
- [x] Public/private sharing is actionable through publish/unpublish.
- [x] MCP preset page gives the assistant platform a ready integration artifact.

## Information Architecture

### New Routes

- [ ] `/assistant`
- [ ] `/assistant/new`
- [ ] `/assistant/runs`
- [ ] `/assistant/runs/:id`
- [ ] `/commands`
- [ ] `/commands/:id`
- [ ] `/commands/new`

### Sidebar Group

```txt
Workspace
  Assistant
  Commands
  Runs
  Squads
  Skills
  Knowledge
  Scripts
  Explore
```

## Core Concepts

### Assistant Session

A session is a work area for an intent.

Fields:

```txt
id
userId
title
status: DRAFT | ACTIVE | COMPLETED | ARCHIVED
input
selectedSkillIds
selectedKnowledgeIds
selectedSquadId
selectedCommandId
createdAt
updatedAt
```

### Command Template

A reusable command users can run again.

Fields:

```txt
id
ownerUserId
title
description
promptMarkdown
visibility
tags
skillIds
knowledgeIds
scriptIds
squadId
defaultMode: ASSISTANT | SQUAD | SCRIPT | MCP
createdAt
updatedAt
```

### Assistant Run

Execution record for one assistant action.

Fields:

```txt
id
sessionId
commandId
status: QUEUED | RUNNING | WAITING_USER | SUCCEEDED | FAILED | CANCELLED
input
resolvedContext
events
result
createdAt
completedAt
```

## Phase 1: UX Skeleton

### Tasks

- [ ] Create `src/features/security/assistant`.
- [ ] Add `/assistant` route.
- [ ] Add assistant shell layout.
- [ ] Add center conversation panel.
- [ ] Add right active-context panel.
- [ ] Add empty state for first use.
- [ ] Add quick actions:
  - [ ] Create command.
  - [ ] Attach skill.
  - [ ] Attach knowledge.
  - [ ] Select squad.
  - [ ] Import from Explore.
- [ ] Add route entry in sidebar.
- [ ] Add skeleton states.
- [ ] Add mobile layout.

### Acceptance Criteria

- [ ] User can open `/assistant`.
- [ ] User sees an empty workspace instead of a generic chat.
- [ ] User can identify where skills, knowledge, squad, and command context will appear.
- [ ] Sidebar exposes Assistant as a first-class workspace item.

## Phase 2: Command Palette

### Tasks

- [ ] Add command palette trigger in assistant header.
- [ ] Search local resources:
  - [ ] Skills.
  - [ ] Commands.
  - [ ] Squads.
  - [ ] Knowledge.
  - [ ] Scripts.
- [ ] Search public Explore resources.
- [ ] Add result grouping by type.
- [ ] Add keyboard navigation.
- [ ] Add attach/import/run actions per result.
- [ ] Add recent searches.
- [ ] Add pinned resources.

### Acceptance Criteria

- [ ] User can press a shortcut or button to search resources.
- [ ] User can attach a skill from search.
- [ ] User can attach knowledge from search.
- [ ] User can select a squad from search.
- [ ] User can import public resource from search.

## Phase 3: Active Context Panel

### Tasks

- [ ] Show selected command.
- [ ] Show attached skills.
- [ ] Show attached knowledge.
- [ ] Show selected squad.
- [ ] Show selected scripts/tools.
- [ ] Add remove actions.
- [ ] Add visibility badges: private, imported, public.
- [ ] Add source badges: personal, community, system.
- [ ] Add estimated risk for scripts.
- [ ] Add "save as command" action.

### Acceptance Criteria

- [ ] User always knows what context the assistant will use.
- [ ] User can remove context before running.
- [ ] User can save current context as a command template.

## Phase 4: Command Templates

### Backend Tasks

- [ ] Add command template entity.
- [ ] Add CRUD endpoints.
- [ ] Add duplicate/import endpoint.
- [ ] Add publish/unpublish endpoint.
- [ ] Add command execution endpoint placeholder.

### Frontend Tasks

- [ ] Create command list page.
- [ ] Create command editor.
- [ ] Add prompt Markdown editor.
- [ ] Add linked skills picker.
- [ ] Add linked knowledge picker.
- [ ] Add linked squad picker.
- [ ] Add linked scripts picker.
- [ ] Add run button.
- [ ] Add publish/import later through community asset model.

### Acceptance Criteria

- [ ] User can create a command.
- [ ] User can attach capabilities to a command.
- [ ] User can run a command in assistant mode.
- [ ] User can edit and reuse a command.

## Phase 5: Assistant Run Timeline

### Tasks

- [ ] Add run status model.
- [ ] Add event stream placeholder.
- [ ] Add timeline UI:
  - [ ] User message.
  - [ ] Context resolution.
  - [ ] Knowledge retrieval.
  - [ ] Skill selection.
  - [ ] Tool/script prompt.
  - [ ] Result.
- [ ] Add retry action.
- [ ] Add cancel action.
- [ ] Add copy result action.
- [ ] Add run detail route.

### Acceptance Criteria

- [ ] User can see what happened during a run.
- [ ] User can inspect context used by the assistant.
- [ ] User can retry or copy a result.

## Phase 6: Explore Integration

### Tasks

- [ ] Add "Import from Explore" button.
- [ ] Add Explore search inside command palette.
- [ ] Add import confirmation modal.
- [ ] Add post-import action:
  - [ ] Attach to current session.
  - [ ] Save to library only.
  - [ ] Open imported item.
- [ ] Add provenance display after import.

### Acceptance Criteria

- [ ] User can find public skills from Assistant.
- [ ] User can import and attach in one flow.
- [ ] Imported assets keep attribution.

## Phase 7: Squads as Execution Mode

### Tasks

- [ ] Add assistant mode selector:
  - [ ] Assistant only.
  - [ ] Squad.
  - [ ] Script.
  - [ ] MCP.
- [ ] Let user select a squad in active context.
- [ ] Convert assistant input into squad run input.
- [ ] Open run timeline from assistant.
- [ ] Preserve existing squad runner behavior.

### Acceptance Criteria

- [ ] User can start a squad run from Assistant.
- [ ] User can see squad run progress from Assistant.
- [ ] Existing squad detail workflow keeps working.

## Phase 8: Skills and Knowledge Attachments

### Tasks

- [ ] Add skill attachment UI.
- [ ] Add knowledge attachment UI.
- [ ] Add context preview before running.
- [ ] Add retrieval result preview for knowledge.
- [ ] Add "why this was used" metadata.
- [ ] Add token/context budget estimate later.

### Acceptance Criteria

- [ ] User can attach multiple skills.
- [ ] User can attach multiple knowledge bases.
- [ ] Assistant run records which assets were used.

## Phase 9: Scripts and Safety

### Tasks

- [ ] Allow script attachment in disabled/safe preview mode first.
- [ ] Show risk warning.
- [ ] Require explicit approval before execution.
- [ ] Add script dry-run placeholder.
- [ ] Add audit log for script usage.

### Acceptance Criteria

- [ ] Public/imported scripts are never executed automatically.
- [ ] User sees clear risk language.
- [ ] Script usage is auditable.

## Phase 10: MCP Preset

### Tasks

- [ ] Add "Connect Workestrator MCP" card in assistant empty state.
- [ ] Add settings page for MCP token.
- [ ] Add generated config snippet.
- [ ] Add MCP tools later:
  - [ ] List skills.
  - [ ] Get skill.
  - [ ] Import skill.
  - [ ] Search knowledge.
  - [ ] Create command.
  - [ ] Run command.

### Acceptance Criteria

- [ ] User understands Workestrator can connect to external agent tools.
- [ ] User can copy a future MCP config from the app.

## Phase 11: Visual Design Requirements

### Layout

- [ ] Left: app sidebar.
- [ ] Center: assistant workspace.
- [ ] Right: active context.
- [ ] Bottom or nested panel: run timeline/logs.

### Style

- [ ] Dense and work-focused.
- [ ] Clear active states.
- [ ] Avoid marketing layout inside the app.
- [ ] Use existing design primitives.
- [ ] Use `Typography`, `Button`, `Tabs`, `SmartOverlay`, `AppSheet`, `ResponsiveTableCustom` where applicable.
- [ ] Use lucide icons.
- [ ] Keep mobile usable through drawers/sheets.

### Acceptance Criteria

- [ ] Assistant feels like a command center.
- [ ] No text overlaps on desktop or mobile.
- [ ] Context panel remains scannable.
- [ ] Primary action is always clear.

## MVP Scope

Build first:

- [ ] `/assistant` route.
- [ ] Assistant workspace shell.
- [ ] Active context panel.
- [ ] Command palette UI with mocked/local search.
- [ ] Attach skill placeholder.
- [ ] Attach knowledge placeholder.
- [ ] Select squad placeholder.
- [ ] Save current setup as command placeholder.
- [ ] Sidebar entry.

MVP acceptance:

- [ ] User can open Assistant.
- [ ] User can search resources.
- [ ] User can attach context.
- [ ] User can see selected context.
- [ ] User can understand the assistant is more than chat.

## Implementation PR Breakdown

- [ ] PR 1: route, assistant shell, sidebar entry.
- [ ] PR 2: command palette UI and local search contract.
- [ ] PR 3: active context panel.
- [ ] PR 4: command template backend.
- [ ] PR 5: command template frontend.
- [ ] PR 6: run timeline.
- [ ] PR 7: Explore import integration.
- [ ] PR 8: squad execution mode.
- [ ] PR 9: skill/knowledge attachment integration.
- [ ] PR 10: MCP preset UI.

## Open Questions

- [ ] Should the assistant create commands directly, or should commands be separate first-class resources from day one?
- [ ] Should a session be saved automatically like chat history?
- [ ] Should imported public assets be copied or referenced by default?
- [ ] Should squad execution run inside the assistant page or link to squad detail?
- [ ] Which actions require explicit confirmation?
- [ ] Which resources can be shared by non-admin users in the first public release?

## Definition of Done for First Release

- [ ] Feature lives behind authenticated routes.
- [ ] No direct Axios calls from page components.
- [ ] API code is feature-local.
- [ ] Loading, empty, and error states exist.
- [ ] Mobile layout works.
- [ ] `npm run build` passes.
- [ ] Relevant tests are added for pure orchestration logic.
- [ ] PR targets `dev`.
