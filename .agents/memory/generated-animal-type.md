---
name: Generated Animal type optionality
description: Why local hand-written Animal types break against the codegen Animal type in Herdwise
---

# Generated `Animal` type optionality (Herdwise / Orval codegen)

Orval generates non-`required` OpenAPI fields as `T | null | undefined` (optional). Any field NOT in the schema's `required` array (e.g. `investorId`) is optional in the generated `Animal`.

**Why it bites:** A hand-written local `Animal` type that declares such a field as `T | null` (no `undefined`) is NOT assignable from the generated type, producing `TS2322` when you pass a list-row `animal` into a component/prop typed with the local type.

**How to apply:** When a component only needs a subset of fields, type its prop with `Pick<Animal, ...>` (or import the generated type) instead of duplicating the full shape. Avoid maintaining a parallel local `Animal` interface that diverges from codegen optionality. Add a field to the spec's `required` array if you truly need it non-optional everywhere.
