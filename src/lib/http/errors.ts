import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function requireAdminSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
