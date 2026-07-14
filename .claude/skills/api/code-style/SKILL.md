---
name: code-style
description: Kotlin code style and project bans for this Spring Boot codebase. Use when writing or reviewing any Kotlin file — covers idioms, banned libraries, logging, null safety, constants, and language conventions specific to this project.
---

# Code Style

Java 21 target, Kotlin idiomatic. No Lombok, no Reactor (this is a blocking MVC stack). English identifiers everywhere.

## Banned

- **Lombok** — use `data class`, Kotlin properties, named arguments
- **Field injection** (`@Autowired var ...`) — only constructor injection
- **`println` / `System.out` / `System.err`** — use SLF4J `LoggerFactory.getLogger(...)`
- **`!!` non-null assertion** — use `?: throw ResourceNotFoundException(...)`, `?: error("...")`, or smart casts
- **`var` in services or DTOs** — only entities use `var` (Hibernate writes them)
- **Manual error `ResponseEntity`** — throw exceptions from `shared/exceptions/`
- **Comments that explain the obvious** — avoid `// returns goal by id`

## Required

### Constructor injection only

```kotlin
@Service
class GoalService(
    private val repository: GoalRepository,
    private val notifier: GoalNotifier,
)
```

### Named arguments for DTO construction

When building a DTO/domain `data class` with more than 3 properties, always use named arguments:

```kotlin
GoalResponse(
    id = goal.id,
    userId = goal.userId,
    title = goal.title,
    target = goal.target,
    createdAt = goal.createdAt,
)
```

### Constants over magic numbers

```kotlin
private const val DEFAULT_PAGE_SIZE = 20
private const val MAX_PAGE_SIZE = 100
private const val SESSION_DURATION_HOURS = 8L
```

### Logging

```kotlin
class GoalService(...) {
    private val logger = LoggerFactory.getLogger(GoalService::class.java)

    fun create(...) {
        logger.info("Goal created userId={} goalId={}", userId, goal.id)
    }
}
```

Use SLF4J placeholders (`{}`), not string interpolation.

### Null safety

```kotlin
// ✅
val goal = repository.findByIdAndUserId(id, userId)
    ?: throw ResourceNotFoundException("Goal not found")

// ✅
goal?.let { service.archive(it) }

// ❌
val goal = repository.findByIdAndUserId(id, userId)!!
```

### Return early — keep nesting flat

```kotlin
fun update(id: UUID, userId: UUID, request: UpdateGoalRequest): GoalResponse {
    val existing = repository.findByIdAndUserId(id, userId)
        ?: throw ResourceNotFoundException("Goal not found")

    if (existing.isLocked) throw ConflictException("Goal is locked")

    return repository.save(existing.applyUpdate(request)).toResponse()
}
```

### Trailing commas

Multi-line argument lists / parameter lists use a trailing comma — improves diff readability.

```kotlin
class WorkoutService(
    private val repository: WorkoutRepository,
    private val sessionService: WorkoutSessionService,
)
```

### Imports

- No wildcard imports (`com.apibot.features.goal.dto.*`) except for DTO bundles where the whole file is intended to be exported together
- Group by package; let the IDE / formatter handle order

## Spring annotations

| Annotation | Where |
|---|---|
| `@RestController` | Controller class |
| `@RequestMapping("/<feature>")` | Controller class |
| `@Service` | Service class |
| `@Repository @Primary` | Adapter class |
| `@Component` | Cross-cutting beans (resolvers, factories, filters) |
| `@Configuration` | Beans aggregator under `shared/config/` |
| `@ConfigurationProperties` | Typed config under `shared/config/` |
| `@Transactional` | Service methods that mutate state |

## Identifier language

- Code identifiers — **English** (`Goal`, `userId`, `findByIdAndUserId`)
- Swagger text — **English** (`@Operation`, `@Schema`, `@Tag`)
- User-facing exception messages — **English**
- Database table/column names — snake_case English (`user_account`, `created_at`)

## File and class naming

- One public class per file when reasonable; bundling small DTOs (`*Dtos.kt`) is allowed
- File name matches the primary class
- Suffix mandatory: `*Controller`, `*Service`, `*Repository`, `*Entity`, `*Request`, `*Response`, `*Properties`, `*Config`, `*Job`

## Review heuristics

- `lateinit var` outside of test fixtures → likely should be constructor-injected
- `!!` anywhere outside test code → replace with safe call + thrown exception
- `println(...)` / `System.out` → replace with SLF4J
- `@Autowired` on a property → switch to constructor injection
- `var` on a DTO field → must be `val`
- Method body deeply nested (≥ 3 levels) → flatten with early returns
- Magic number repeated twice → extract to `private const val`
