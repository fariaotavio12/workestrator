---
name: validation
description: Form and validation rules for this React Vite web app. Use when creating, reviewing, or debugging forms, Zod schemas, React Hook Form hooks, field errors, submit loading states, validation messages, or form folder structure.
---

# Validation

Use `react-hook-form` with `zod` and `@hookform/resolvers/zod`. Do not introduce TanStack Form unless the project explicitly migrates to it.

## Location

For simple pages:

```txt
src/features/<feature>/<screen>/
  page-<screen>.tsx
  schema/
    index.ts
```

For complex forms:

```txt
src/features/<feature>/<screen>/form/
  schema.ts
  use-<screen>-form.ts
  components/
```

## Pattern

Validation messages are i18n keys — build the schema **inside the component** with `useMemo(t)` so messages are translated (never hardcode strings). Type the form manually.

```tsx
import { useMemo } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useT } from "@/app/i18n";

type LoginFormValues = { email: string; password: string };

const PageLogin = () => {
	const { t } = useT();
	const loginSchema = useMemo(
		() =>
			z.object({
				email: z
					.string()
					.trim()
					.min(1, t("auth.login.errors.emailRequired"))
					.email(t("auth.login.errors.emailInvalid")),
				password: z.string().min(6, t("auth.login.errors.passwordMin")),
			}),
		[t],
	);

	const form = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: { email: "", password: "" },
	});
	// ...
};
```

## Rules

- Keep schemas out of large page files when the form is non-trivial.
- Pass field errors into UI inputs through their `error` prop.
- Disable/mark submitting actions with mutation `isPending` or form state.
- Do not manually validate fields with `useEffect`.
- Use Zod for parsing and validation.
- Keep API field errors inline when they map cleanly to a field; otherwise show a toast.
