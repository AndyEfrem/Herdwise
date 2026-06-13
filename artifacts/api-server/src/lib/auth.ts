import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { createClerkClient } from "@clerk/backend";
import { db, investorsTable, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

export function requireAuth(req: Request, res: Response): string | null {
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  return userId;
}

export async function resolveRole(userId: string) {
  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.clerkUserId, userId))
    .limit(1);

  if (admin) {
    return {
      role: "admin",
      investorId: null,
    };
  }

  const [linkedInvestor] = await db
    .select()
    .from(investorsTable)
    .where(eq(investorsTable.clerkUserId, userId))
    .limit(1);

  if (linkedInvestor) {
    return {
      role: "investor",
      investorId: linkedInvestor.id,
    };
  }

  try {
    const clerkUser = await clerkClient.users.getUser(userId);

    const primaryEmail =
      clerkUser.emailAddresses.find(
        (email) => email.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress;

    if (primaryEmail) {
      const [investorByEmail] = await db
        .select()
        .from(investorsTable)
        .where(eq(investorsTable.email, primaryEmail))
        .limit(1);

      if (investorByEmail && !investorByEmail.clerkUserId) {
        await db
          .update(investorsTable)
          .set({
            clerkUserId: userId,
          })
          .where(eq(investorsTable.id, investorByEmail.id));

        return {
          role: "investor",
          investorId: investorByEmail.id,
        };
      }

      if (investorByEmail) {
        return {
          role: "investor",
          investorId: investorByEmail.id,
        };
      }
    }
  } catch (error) {
    console.error("Failed to auto-link investor:", error);
  }

  return {
    role: "unknown",
    investorId: null,
  };
}

export async function requireAdmin(
  req: Request,
  res: Response,
): Promise<boolean> {
  const userId = requireAuth(req, res);

  if (!userId) {
    return false;
  }

  const { role } = await resolveRole(userId);

  if (role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }

  return true;
}

export async function requireMember(
  req: Request,
  res: Response,
): Promise<{ admin: boolean; investorId: number | null } | null> {
  const userId = requireAuth(req, res);

  if (!userId) {
    return null;
  }

  const { role, investorId } = await resolveRole(userId);

  if (role === "admin") {
    return {
      admin: true,
      investorId: null,
    };
  }

  if (role === "investor") {
    return {
      admin: false,
      investorId,
    };
  }

  res.status(403).json({ error: "Access denied" });
  return null;
}