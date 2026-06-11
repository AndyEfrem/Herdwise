---
name: Herdwise auth & role scoping model
description: How investor-vs-admin access is enforced and the trap when adding new endpoints
---

# Herdwise auth & role scoping

Role is derived, not stored: a Clerk user with a matching `investors.clerk_user_id` row is an **investor**; any other authenticated user is an **admin** (see `me.ts`). There is no global auth middleware enforcing scoping.

**Trap:** access control is enforced *per route handler*, not centrally. Each endpoint must call `getAuth(req)` and decide for itself whether to scope to the caller's investor id or block non-admins. A new endpoint with no checks silently leaks farm-wide data to any signed-in investor.

**Rules when adding endpoints:**
- Farm-wide aggregate/admin endpoints (e.g. `/reports/summary`, dashboard-style rollups): require admin — return 401 if no `userId`, 403 if the user resolves to an investor record.
- Per-resource endpoints that investors may use: scope queries to the caller's investor id (pattern in `cattle.ts` via `getInvestorIdForUser`).
- Frontend nav hiding is **not** authorization — it only prevents accidental navigation. Always enforce on the backend; optionally add a frontend `<Redirect>` guard so investors hitting an admin route directly don't get stuck on a perpetual loading skeleton from a 403.
