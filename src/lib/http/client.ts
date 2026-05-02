/**
 * Read a structured error message from a fetch Response.
 *
 * Admin routes always respond with `{ error: string }` for 4xx/5xx, but a
 * malformed body or a network-level failure can leave us without JSON. The
 * fallback string is intentionally generic so we never surface a stray HTML
 * fragment to the user.
 */
export async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };

    return body.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}
