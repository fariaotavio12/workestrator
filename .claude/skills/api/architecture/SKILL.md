---
name: architecture
description: Project architecture rules for this Kotlin + Spring Boot 3.5 backend. Use when planning, implementing, reviewing, or refactoring features, controllers, services, repositories, packages, or migrations between modules.
---

# Architecture

Vertical feature slices. Domain code belongs in `com.apibot.features.<feature>`. Cross-cutting code lives in `com.apibot.shared`.

## Package layout

```txt
com.apibot/
├── ApibotApplication.kt
├── features/
│   └── <feature>/
│       ├── controller/        # @RestController classes
│       ├── service/           # @Service classes
│       │   └── integration/   # External integrations (mail, ai, push, etc.)
│       ├── repository/        # *Repository (port) + Jpa* + Jpa*Adapter
│       ├── model/             # Domain data class + JPA *Entity + mapping fns
│       ├── dto/               # Request/Response DTOs
│       └── domain/exception/  # Feature-specific exceptions (optional)
├── security/                  # @GetUserId annotation + resolver
└── shared/
    ├── config/                # Properties, SecurityConfig, CORS, beans
    ├── constants/             # Cross-feature constants
    ├── exceptions/            # ApiExceptionHandler + canonical exceptions
    ├── extensions/            # AuthenticatedPrincipal, Pagination, ...
    ├── service/               # EmailService and other shared services
    └── clients/               # External API clients
```

Create only sub-folders the feature actually uses.

## Naming

- Packages **lowercase** only — never camelCase or kebab-case
- File and class names PascalCase: `WorkoutController`, `LoginService`, `UserAccountEntity`
- Suffixes are mandatory: `*Controller`, `*Service`, `*Repository`, `*Request`, `*Response`, `*Entity`
- Feature folder is singular when describing one resource, plural when the feature manages a collection (`auth`, `bio`, `workouts`, `notification`)

## Imports

- Domain code: `com.apibot.features.<feature>.*`
- Shared infrastructure: `com.apibot.shared.*`
- Security primitives: `com.apibot.security.GetUserId`
- Never import from `com.apibot.utils` — that legacy package should not grow

## Code conventions

### No Lombok

Lombok is banned. Use Kotlin `data class` for DTOs and domain models. Use Kotlin properties for entities.

### Constructor injection only

```kotlin
// ✅
@Service
class WorkoutService(
    private val repository: WorkoutRepository,
)

// ❌ field injection
@Service
class WorkoutService {
    @Autowired lateinit var repository: WorkoutRepository
}
```

### No magic numbers

```kotlin
// ✅
private const val DEFAULT_PAGE_SIZE = 20

// ❌
fun list(size: Int = 20)
```

### Domain ↔ entity split

Domain models are pure Kotlin `data class`. JPA entities are separate classes. Mapping is done with extension functions:

```kotlin
fun UserAccountEntity.toDomain(): UserAccount = ...
fun UserAccount.toEntity(): UserAccountEntity = ...
```

## Review heuristics

Flag these:

- Domain code under `shared/` or at `com.apibot/` root
- Lombok annotations (`@Data`, `@Getter`, etc.)
- Field injection / `@Autowired` on properties
- Manual error `ResponseEntity` from a service
- A single class mixing JPA annotations and `@Schema` (DTOs)
- `*Controller` doing business logic instead of delegating to a service
- Repositories that do not follow the 3-layer pattern when the feature has persistence

## Migration checklist

- Move existing files to `features/<feature>/...`
- Split domain `data class` from JPA `*Entity`
- Extract `toDomain()` / `toEntity()` extension functions into `model/`
- Replace manual error `ResponseEntity` with throws from `shared/exceptions/`
- Replace per-feature pagination DTOs with `PageRequestParams` / `PageResult`
- Move long-running external integrations into `service/integration/`
