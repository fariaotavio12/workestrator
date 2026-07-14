---
name: error-handling
description: Error handling and user feedback rules for this React Vite web app. Use when handling API failures, mutation onError/onSuccess, field errors, network errors, unauthorized responses, loading states, empty states, toasts, or error copy.
---

# Error Handling

Use two layers:

- Inline field errors for validation and field-specific API failures.
- Toasts for global success, warning, and error feedback.

## API Error Message

Use the existing API error helper.

```ts
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
```

Never display raw Axios errors.

## Toasts

Use the local toast abstraction:

```ts
import { notify } from "@/components";

notify.success("Salvo com sucesso");
notify.error(getApiErrorMessage(error, "Nao foi possivel salvar."));
notify.warning("Verifique os dados e tente novamente.");
```

## Mutations

Every user-triggered mutation should handle:

- `onSuccess`: success feedback, navigation, or cache update.
- `onError`: user-visible error message.
- Loading state via `isPending`, form state, or button `disabled`.

## Loading, Empty, Error

- Use `Skeleton` for known page structure.
- Use `QueryErrorState` for retryable query failures when applicable.
- Pair retryable failures with an explicit retry action.
- Use empty states that explain the next useful action.

## Unauthorized

Handle 401 globally in the Axios client when configured. Avoid repeated manual 401 handling in feature mutations.
