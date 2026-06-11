import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { db, investorsTable, adminsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

export type Role = "admin" | "investor" | "pending";

/** Returns the investor row id linked to a Clerk user, or null. */
export async function getInvestorIdForUser(
  clerkUserId: string | null,
): Promise<number | null> {
  if (!clerkUserId) return null;
  const [inv] = await db
    .select({ id: investorsTable.id })
    .from(investorsTable)
    .where(eq(investorsTable.clerkUserId, clerkUserId))
    .limit(1);
  return inv?.id ?? null;
}

/** True if the Clerk user is in the admins allowlist. */
export async function isAdmin(clerkUserId: string | null): Promise<boolean> {
  if (!clerkUserId) return false;
  const [row] = await db
    .select({ id: adminsTable.id })
    .from(adminsTable)
    .where(eq(adminsTable.clerkUserId, clerkUserId))
    .limit(1);
  return !!row;
}

/**
 * Resolves the effective role for a signed-in user. Bootstraps the first
 * non-investor user as admin when the admins table is still empty, so a freshly
 * deployed instance gets an owner without manual seeding. Everyone else with no
 * admin entry and no investor link is "pending" (no access).
 */
export async function resolveRole(
  clerkUserId: string,
): Promise<{ role: Role; investorId: number | null }> {
  if (await isAdmin(clerkUserId)) return { role: "admin", investorId: null };

  const investorId = await getInvestorIdForUser(clerkUserId);
  if (investorId !== null) return { role: "investor", investorId };

  const [{ adminCount }] = await db
    .select({ adminCount: count(adminsTable.id) })
    .from(adminsTable);
  if (adminCount === 0) {
    await db
      .insert(adminsTable)
      .values({ clerkUserId })
      .onConflictDoNothing();
    return { role: "admin", investorId: null };
  }

  return { role: "pending", investorId: null };
}

/** Sends 401 and returns null when unauthenticated; otherwise returns the userId. */
export function requireAuth(req: Request, res: Response): string | null {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return userId;
}

/** Requires an admin caller. Sends 401/403 as needed; returns userId or null. */
export async function requireAdmin(
  req: Request,
  res: Response,
): Promise<string | null> {
  const userId = requireAuth(req, res);
  if (!userId) return null;
  if (!(await isAdmin(userId))) {
    res.status(403).json({ error: "Access denied" });
    return null;
  }
  return userId;
}

export interface MemberAccess {
  userId: string;
  admin: boolean;
  investorId: number | null;
}

/**
 * Requires a caller who is either an admin or a linked investor. "Pending"
 * users (no admin entry, no investor link) get 403. Use for endpoints that
 * both admins and investors may read, then scope by the returned access.
 */
export async function requireMember(
  req: Request,
  res: Response,
): Promise<MemberAccess | null> {
  const userId = requireAuth(req, res);
  if (!userId) return null;
  if (await isAdmin(userId)) return { userId, admin: true, investorId: null };
  const investorId = await getInvestorIdForUser(userId);
  if (investorId !== null) return { userId, admin: false, investorId };
  res.status(403).json({ error: "Access denied" });
  return null;
}
