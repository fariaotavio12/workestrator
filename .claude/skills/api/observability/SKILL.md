---
name: observability
description: Observability setup for this template — Sentry error tracking and Better Stack structured logging. Use when configuring monitoring, adding error tracking, debugging production issues, or setting up logging for a new deployment.
---

# Observability

Two layers: **Sentry** for error tracking, **Better Stack** for structured log shipping.

## What's already configured

| Component | Location | Purpose |
|---|---|---|
| `SentryUserProviderConfig` | `shared/config/` | Attaches `userId` + `email` to every Sentry event |
| `RequestLoggingFilter` | `shared/config/` | Adds `traceId` and `userId` to MDC on every request |
| `logback-spring.xml` | `src/main/resources/` | Dev = human-readable console; prod = JSON to stdout + file + Better Stack |
| `sentry.*` properties | `application.properties` | DSN, environment, sampling rate |

## Environment variables required in production

```
SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
BETTERSTACK_SOURCE_TOKEN=your-token-here
SPRING_PROFILES_ACTIVE=prod
```

## How Sentry works

- `sentry-spring-boot-starter-jakarta` auto-captures all unhandled exceptions
- `SentryUserProviderConfig` reads `AuthenticatedPrincipal` from `SecurityContextHolder` and attaches user context
- DSN empty (`${SENTRY_DSN:}`) = disabled locally, no errors thrown
- Sampling: `traces-sample-rate=0.1` (10% of transactions for performance monitoring)

## How structured logging works

`logback-spring.xml` has two profiles:

**dev / default** — human-readable console:
```
2026-05-28 14:32:01.123 INFO  [traceId] [userId] [http-nio-8080] c.a.s.c.RequestLoggingFilter - --> GET /users
```

**prod** — JSON sent to:
1. stdout (captured by Docker / systemd journal)
2. rotating file at `/var/log/app/application.log` (30 days, max 2GB)
3. Better Stack via async appender

Every JSON log entry includes `traceId` and `userId` as top-level fields, making logs filterable by user or request in the Better Stack dashboard.

## MDC fields available in all log lines (prod)

| Field | Source | Example |
|---|---|---|
| `traceId` | `RequestLoggingFilter` (generated or from `X-Trace-Id` header) | `a3f2c1d4-...` |
| `userId` | `RequestLoggingFilter` (populated after auth, from `AuthenticatedPrincipal`) | `550e8400-...` |

## Adding observability to a new service

No action needed — `traceId` and `userId` are in MDC for the entire request lifecycle. Any `logger.info(...)` call inside a service will automatically include them in prod JSON output.

For business-critical events, log explicitly:
```kotlin
logger.info("payment processed orderId={} amount={}", orderId, amount)
```

## Prod setup checklist

- [ ] Create Sentry project → copy DSN → set `SENTRY_DSN` env var
- [ ] Create Better Stack Log source (Java) → copy source token → set `BETTERSTACK_SOURCE_TOKEN`
- [ ] Create log directory on VPS: `sudo mkdir -p /var/log/app && sudo chown $USER /var/log/app`
- [ ] Set `SPRING_PROFILES_ACTIVE=prod` in deployment environment
- [ ] Set `SENTRY_ENVIRONMENT=production`
