import { describe, expect, it } from "vitest";

import { enforceSameOrigin, isValidCuid } from "../../src/lib/http/errors";

describe("isValidCuid", () => {
  it("accepts plausible cuid values", () => {
    expect(isValidCuid("cl9ebqhxk00003b6oa6sc11r1")).toBe(true);
  });

  it("rejects empty strings, wrong prefixes, and very long inputs", () => {
    expect(isValidCuid("")).toBe(false);
    expect(isValidCuid("abc")).toBe(false);
    expect(isValidCuid("xxxxxxxxxxxxxxxxxxxxx")).toBe(false);
    expect(isValidCuid("c" + "a".repeat(80))).toBe(false);
    expect(isValidCuid(123 as unknown)).toBe(false);
  });
});

describe("enforceSameOrigin", () => {
  it("allows safe methods without checking headers", async () => {
    const request = new Request("https://app.example.com/api/admin/tunes");
    expect(await enforceSameOrigin(request)).toBeNull();
  });

  it("allows non-safe methods when Origin matches the request host", async () => {
    const request = new Request("https://app.example.com/api/admin/tunes", {
      method: "POST",
      headers: { origin: "https://app.example.com" },
    });
    expect(await enforceSameOrigin(request)).toBeNull();
  });

  it("falls back to Referer when Origin is absent", async () => {
    const request = new Request("https://app.example.com/api/admin/tunes", {
      method: "POST",
      headers: { referer: "https://app.example.com/admin/tunes" },
    });
    expect(await enforceSameOrigin(request)).toBeNull();
  });

  it("rejects cross-origin requests", async () => {
    const request = new Request("https://app.example.com/api/admin/tunes", {
      method: "POST",
      headers: { origin: "https://evil.example.com" },
    });
    const response = await enforceSameOrigin(request);

    expect(response?.status).toBe(403);
  });

  it("rejects non-safe requests with neither Origin nor Referer", async () => {
    const request = new Request("https://app.example.com/api/admin/tunes", {
      method: "POST",
    });
    const response = await enforceSameOrigin(request);

    expect(response?.status).toBe(403);
  });
});
