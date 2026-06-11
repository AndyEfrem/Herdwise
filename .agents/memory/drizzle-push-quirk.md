---
name: Drizzle-kit push interactive prompt
description: Why schema changes here are applied via raw SQL instead of drizzle-kit push
---

`pnpm --filter @workspace/db run push` (drizzle-kit push) drops into an
interactive "data loss / truncate?" prompt for some column changes, and the
`--force` flag does NOT suppress it in this environment — the command then
hangs or fails non-interactively.

**Why:** the agent shell has no TTY, so the interactive prompt cannot be
answered, blocking the push.

**How to apply:** for additive, non-destructive schema changes (new nullable
column, new unique constraint), apply them with raw SQL via the executeSql
sandbox, e.g. `ALTER TABLE x ADD COLUMN IF NOT EXISTS ...` plus the matching
constraint, then keep the Drizzle schema file in sync so types/codegen stay
correct. Verify the column exists afterward.
