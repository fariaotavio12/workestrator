# Workestrator Community Platform Plan

## Goal

Transform Workestrator from a squad orchestrator into a community platform for reusable AI capabilities:

- Skills that users can create, edit, version, publish, import, and export as Markdown.
- Squads that can be shared publicly and imported into another user account.
- Knowledge bases that can be private or public, with semantic search powered by embeddings.
- Scripts and command templates that can be shared safely.
- A public Explore area on the landing page.
- A Workestrator MCP preset/server so external tools can import and use Workestrator assets.
- A workspace-style assistant experience, closer to an agent command center.

## Phase 1 Delivered

- [x] Public Explore route on the landing app.
- [x] Paginated public asset API: `GET /explore/assets`.
- [x] Authenticated owner asset API: `GET /explore/assets/me`.
- [x] Authenticated community asset creation API: `POST /explore/assets`.
- [x] Authenticated import API: `POST /explore/assets/{id}/import`.
- [x] Generic `community_assets` model for squads, skills, knowledge, scripts, commands, and MCP presets.
- [x] Initial verified seed catalog with six starter assets.
- [x] Explore frontend filters by type and search.
- [x] Explore import button calls the backend when logged in and redirects to login when logged out.
- [x] Landing navbar, footer, and CTA point to Explore.

## Phase 2 Delivered

- [x] Authenticated owner library route in the dashboard: `/dashboard/recursos`.
- [x] Owner library UI for imported and created assets.
- [x] Publish action for owned assets.
- [x] Unpublish action for owned assets.
- [x] Skills workspace saves Markdown skills to the backend as `SKILL` community assets.
- [x] Asset responses include payload, visibility, origin asset and update date.
- [x] Dashboard navigation exposes Recursos and MCP.

## MCP Delivered

- [x] Authenticated MCP preset endpoint: `GET /explore/mcp/preset`.
- [x] Preset includes search, mine, create, import and publish tool definitions.
- [x] Dashboard MCP page renders the preset JSON.
- [x] Preset can be copied from the UI.
- [x] Preset includes the authenticated user's current assets.

## Branch Strategy

- [x] Implementation branch created: `feature/assistant-workspace-plan`.
- [ ] Future community platform branches should start from `dev`:

```bash
git switch dev
git pull origin dev
git switch -c feature/community-skills-platform
```

- [ ] Open PRs into `dev` for validation.
- [ ] Promote `dev` to `main` only through admin-controlled production PR.

## Product Principles

- [ ] Store skills as Markdown content in the backend.
- [ ] Use Postgres as the source of truth.
- [ ] Use embeddings/RAG for search, discovery, recommendations, and assistant context.
- [ ] Do not use RAG as the only storage for user-created content.
- [ ] Keep every public asset importable, forkable, and versioned.
- [ ] Never export secrets, tokens, provider credentials, private uploads, or private execution history.
- [ ] Treat scripts as potentially dangerous and require explicit trust/approval before use.

## Recommended Data Model

### Shared Base

- [ ] Create `CommunityAsset`.
- [ ] Create `CommunityVersion`.
- [ ] Create `CommunityImport`.
- [ ] Create `CommunityLike`.
- [ ] Create `CommunityBookmark`.
- [ ] Create `CommunityReport`.

Common fields:

```txt
id
ownerUserId
type
title
slug
description
visibility: PRIVATE | UNLISTED | PUBLIC
status: DRAFT | PUBLISHED | ARCHIVED | MODERATED
tags
createdAt
updatedAt
publishedAt
importCount
likeCount
version
sourceAssetId
forkedFromId
```

Asset types:

```txt
SKILL
SQUAD
KNOWLEDGE
SCRIPT
COMMAND_PACK
MCP_PRESET
```

## Phase 1: Backend Community Foundation

### Tasks

- [ ] Add database migrations for community assets.
- [ ] Add entities and repositories.
- [ ] Add DTOs for public and authenticated views.
- [ ] Add service layer for create, update, publish, archive, import, and fork.
- [ ] Add visibility rules: owner, public, unlisted, admin.
- [ ] Add public Explore endpoints.
- [ ] Add authenticated library endpoints.
- [ ] Add moderation endpoints for reports and admin review.
- [ ] Add import counters and like/bookmark counters.
- [ ] Add slug generation and conflict handling.
- [ ] Add audit fields for publish/import/fork actions.

### Acceptance Criteria

- [ ] A user can create a private community asset.
- [ ] A user can publish an asset publicly.
- [ ] Another user can view a public asset.
- [ ] Another user can import a public asset into their account.
- [ ] Private assets are never visible to other users.
- [ ] Public endpoints do not leak private owner data.

## Phase 2: Skills as Markdown

### Backend Tasks

- [ ] Create `Skill` entity or typed `CommunitySkill` extension.
- [ ] Store `contentMarkdown`.
- [ ] Store parsed frontmatter.
- [ ] Store compatibility metadata.
- [ ] Add Markdown validation.
- [ ] Add frontmatter validation.
- [ ] Add version history.
- [ ] Add export endpoint for `.md`.
- [ ] Add import endpoint from public skill.

Suggested export format:

```md
---
name: github-pr-review
description: Helps review PRs and checks
tags:
  - github
  - review
visibility: public
---

# Skill

Instructions...
```

### Frontend Tasks

- [ ] Create `src/features/security/skills`.
- [ ] Add skill list page.
- [ ] Add skill create/edit page.
- [ ] Add Markdown editor with preview.
- [ ] Add frontmatter panel.
- [ ] Add publish/unpublish controls.
- [ ] Add version history view.
- [ ] Add import confirmation dialog.
- [ ] Add export `.md` action.

### Acceptance Criteria

- [ ] User can create a skill in Markdown.
- [ ] User can preview the rendered skill.
- [ ] User can save draft.
- [ ] User can publish.
- [ ] User can import a public skill.
- [ ] User can export a skill as Markdown.

## Phase 3: Public Explore

### Public Routes

```txt
/explore
/explore/skills
/explore/squads
/explore/knowledge
/explore/scripts
/explore/:type/:slug
```

### Tasks

- [ ] Create `src/features/public/explore`.
- [ ] Add Explore landing page section.
- [ ] Add type filters.
- [ ] Add tag filters.
- [ ] Add sorting: popular, recent, most imported.
- [ ] Add search by text.
- [ ] Add public asset detail page.
- [ ] Add "Import" CTA.
- [ ] If user is logged out, route import CTA to login and resume import after auth.
- [ ] Add cards with author, tags, imports, likes, and compatibility.

### Acceptance Criteria

- [ ] Public users can browse published assets.
- [ ] Logged-in users can import assets.
- [ ] Logged-out users get a clear sign-in flow.
- [ ] Explore does not expose private assets.

## Phase 4: Public and Importable Squads

### Tasks

- [ ] Add squad publish action.
- [ ] Add public squad preview.
- [ ] Export safe squad configuration.
- [ ] Import squad into current user account.
- [ ] Add dependency resolution wizard for missing skills, models, and knowledge.
- [ ] Exclude secrets, provider credentials, private uploads, and private history.
- [ ] Add fork metadata.
- [ ] Add version history.

Safe export fields:

```txt
agents
roles
model requirements
skills linked
knowledge linked
workflow
commands
```

### Acceptance Criteria

- [ ] User can publish a squad.
- [ ] Public users can preview a squad.
- [ ] Logged-in users can import a squad.
- [ ] Imported squad does not include sensitive data.

## Phase 5: Knowledge and RAG

### Backend Tasks

- [ ] Create `KnowledgeBase`.
- [ ] Create `KnowledgeDocument`.
- [ ] Create `KnowledgeChunk`.
- [ ] Create embedding storage.
- [ ] Add document chunking.
- [ ] Add reindex flow.
- [ ] Add semantic search endpoint.
- [ ] Add link between knowledge and skills/squads/commands.

### Frontend Tasks

- [ ] Add knowledge library.
- [ ] Add document create/edit.
- [ ] Add Markdown upload/paste.
- [ ] Add indexing status.
- [ ] Add semantic search UI.
- [ ] Add publish/import flow for knowledge bases.

### Acceptance Criteria

- [ ] User can create a private knowledge base.
- [ ] User can add Markdown documents.
- [ ] Knowledge can be indexed.
- [ ] Assistant can retrieve relevant chunks.
- [ ] Public knowledge can be imported.

## Phase 6: Scripts Library

### Tasks

- [ ] Create script entity.
- [ ] Support languages: bash, powershell, node, python, sql.
- [ ] Add risk level: SAFE, NEEDS_REVIEW, DANGEROUS.
- [ ] Add explicit approval requirement before use.
- [ ] Add syntax-highlighted editor.
- [ ] Add public script preview.
- [ ] Add import flow.
- [ ] Do not auto-execute imported public scripts.
- [ ] Add future sandbox/runner design note.

### Acceptance Criteria

- [ ] User can save private scripts.
- [ ] User can publish scripts with risk metadata.
- [ ] Public scripts can be imported but not auto-executed.
- [ ] Dangerous scripts show clear warnings.

## Phase 7: Commands Platform

### Concept

Command templates are reusable assistant actions that combine prompt, skill, context, optional script, optional squad, and optional knowledge.

```txt
Command = prompt + skill + context + optional script + optional squad + optional knowledge
```

### Tasks

- [ ] Create `CommandTemplate`.
- [ ] Create command library.
- [ ] Add "Run with assistant".
- [ ] Add "Run with squad".
- [ ] Add "Run with MCP".
- [ ] Add execution history.
- [ ] Add favorites.
- [ ] Add public sharing.
- [ ] Add import flow.

### Acceptance Criteria

- [ ] User can create a command.
- [ ] User can execute a command.
- [ ] User can link command to skills/knowledge/squad.
- [ ] Public commands can be imported.

## Phase 8: Workestrator MCP

### Initial Tools

```txt
list_public_skills
get_skill
import_skill
list_public_squads
get_squad
import_squad
list_user_commands
create_command
search_knowledge
```

### Tasks

- [ ] Create personal access token model.
- [ ] Add MCP token permissions.
- [ ] Add API endpoints needed by MCP.
- [ ] Add "Connect via MCP" settings page.
- [ ] Generate MCP config snippet.
- [ ] Create first Workestrator MCP server package or embedded Electron MCP bridge.
- [ ] Add import preset for Codex/Claude/OpenHands-style tools.

Example preset:

```json
{
  "mcpServers": {
    "workestrator": {
      "command": "npx",
      "args": ["workestrator-mcp"],
      "env": {
        "WORKESTRATOR_API_URL": "https://workestrator-api.zappyon.com",
        "WORKESTRATOR_TOKEN": ""
      }
    }
  }
}
```

### Acceptance Criteria

- [ ] User can generate a token.
- [ ] User can copy MCP config.
- [ ] MCP can list and fetch public skills.
- [ ] MCP can import an asset into the user account.

## Phase 9: Workspace Assistant Experience

### Goal

Move from "squad runner" to "agent command center".

### Tasks

- [ ] Add assistant workspace route.
- [ ] Add command palette.
- [ ] Add recent commands.
- [ ] Add pinned assets.
- [ ] Add runs/execution history.
- [ ] Add selected skill/context panel.
- [ ] Add selected squad panel.
- [ ] Add knowledge sources panel.
- [ ] Add import/use buttons from Explore.
- [ ] Add empty states for new users.

### Acceptance Criteria

- [ ] User can start from a command, skill, squad, or knowledge base.
- [ ] User can see what context the assistant is using.
- [ ] User can reuse previous executions.

## Phase 10: Sidebar Redesign

### Target Structure

```txt
Workspace
  Assistant
  Commands
  Squads
  Skills
  Knowledge
  Scripts
  Explore
  Runs
  Settings
```

### Tasks

- [ ] Audit current sidebar.
- [ ] Create grouped navigation.
- [ ] Add collapsible sections.
- [ ] Add active route styling.
- [ ] Add "New" contextual action.
- [ ] Add pinned/recent section.
- [ ] Add Explore shortcut.
- [ ] Add public/private/imported badges where useful.
- [ ] Keep mobile behavior polished.
- [ ] Keep design dense and work-focused.

### Acceptance Criteria

- [ ] Navigation feels like a workspace.
- [ ] Skills, Commands, Knowledge, Scripts, and Explore are first-class.
- [ ] Sidebar works on desktop and mobile.

## Phase 11: Security and Moderation

### Tasks

- [ ] Sanitize rendered Markdown.
- [ ] Block unsafe HTML.
- [ ] Add content reporting.
- [ ] Add moderation dashboard.
- [ ] Add admin hide/unhide action.
- [ ] Add import audit logs.
- [ ] Add publish rate limits.
- [ ] Add script risk warnings.
- [ ] Add public content terms.
- [ ] Add owner-only editing.
- [ ] Add fork attribution.

### Acceptance Criteria

- [ ] Public content is safe to render.
- [ ] Reported content can be moderated.
- [ ] Public scripts cannot run without explicit approval.
- [ ] Private user data is never exported.

## Phase 12: Open Source Readiness

### Tasks

- [ ] Add contribution guide.
- [ ] Add issue templates for feature, bug, security.
- [ ] Add PR template.
- [ ] Add public roadmap link.
- [ ] Add license check.
- [ ] Add security policy.
- [ ] Add CODE_OF_CONDUCT.
- [ ] Add docs for `dev` and `main` branch flow.
- [ ] Add docs for local backend/frontend setup.

### Acceptance Criteria

- [ ] Contributors know to target `dev`.
- [ ] Maintainer/admin promotes `dev` to `main`.
- [ ] Security issues have a private reporting path.

## Suggested PR Breakdown

- [ ] PR 1: community schema and backend base services.
- [ ] PR 2: skill Markdown CRUD.
- [ ] PR 3: skill editor UI.
- [ ] PR 4: public Explore for skills.
- [ ] PR 5: import/fork/version flow.
- [ ] PR 6: public/importable squads.
- [ ] PR 7: knowledge/RAG.
- [ ] PR 8: scripts library.
- [ ] PR 9: command templates.
- [ ] PR 10: Workestrator MCP.
- [ ] PR 11: sidebar/workspace redesign.
- [ ] PR 12: moderation and open-source readiness.

## MVP Scope

Build this first:

- [ ] Create/edit skills as Markdown.
- [ ] Save skills in backend.
- [ ] Publish skill as public.
- [ ] Browse public skills in Explore.
- [ ] Import public skill into current user account.
- [ ] Export skill as `.md`.
- [ ] Add sidebar entries for Skills and Explore.

MVP acceptance:

- [ ] A new user can discover a public skill.
- [ ] A logged-in user can import that skill.
- [ ] The imported skill is editable as their own private copy.
- [ ] The skill can be exported as Markdown.

## Later Enhancements

- [ ] Ratings and reviews.
- [ ] Verified creator badge.
- [ ] Organization/team libraries.
- [ ] Paid/private marketplace.
- [ ] Template packs.
- [ ] Agent benchmark/evaluation results.
- [ ] Automatic compatibility checks for imported skills.
- [ ] Assistant recommendations based on current task.
