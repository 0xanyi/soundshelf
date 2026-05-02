import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export type AdminSession = {
  userId: string;
  email: string;
  role: "user" | "admin";
};

/**
 * Ensures the request comes from an authenticated admin user. Returns null on
 * any failure (no session, missing role, or non-admin role) so callers must
 * respond with a 401.
 *
 * Note: this verifies the role against the database row, not the session
 * payload, so a privilege change is honored on the next request.
 */
export async function requireAdminSession(): Promise<AdminSession | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, role: true },
  });

  if (!user || user.role !== "admin") {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
}

/**
 * Reject cross-origin state-changing requests on admin routes. Allows GET/HEAD
 * for read endpoints. Same-origin requests (where Origin or Referer matches the
 * request URL) are accepted; everything else is rejected. This is a CSRF
 * defense-in-depth check on top of cookie SameSite enforcement.
 */
export async function enforceSameOrigin(request: Request): Promise<Response | null> {
  if (safeMethods.has(request.method.toUpperCase())) {
    return null;
  }

  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin) {
    try {
      if (new URL(origin).host === requestUrl.host) {
        return null;
      }
    } catch {
      return jsonError("Invalid origin.", 403);
    }
  } else if (referer) {
    try {
      if (new URL(referer).host === requestUrl.host) {
        return null;
      }
    } catch {
      return jsonError("Invalid referer.", 403);
    }
  } else {
    // Fetch from same-origin script in modern browsers always sends Origin or
    // Referer for non-safe methods. Reject when both are missing.
    return jsonError("Cross-origin request blocked.", 403);
  }

  return jsonError("Cross-origin request blocked.", 403);
}

export type AuditAction =
  | "tune.upload"
  | "tune.update"
  | "tune.delete"
  | "tune.playlists.sync"
  | "tune.playlists.bulk_add"
  | "playlist.create"
  | "playlist.update"
  | "playlist.delete"
  | "playlist.visibility.update"
  | "playlist.item.create"
  | "playlist.item.delete"
  | "playlist.item.reorder";

type AuditEntry = {
  actorId: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        metadata: (entry.metadata ?? null) as never,
      },
    });
  } catch (error) {
    // Audit failures must never block the primary action, but they must be
    // observable. Logging keeps the noise out of the API response while
    // making the gap visible to operators.
    console.error("Failed to write audit log entry", { error, entry });
  }
}

/** Loose cuid validation. Prevents very long path inputs from reaching Prisma. */
export function isValidCuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 21 &&
    value.length <= 64 &&
    /^c[a-z0-9]+$/.test(value)
  );
}
