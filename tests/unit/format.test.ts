import { describe, expect, it } from "vitest";

import { formatTotalDuration } from "../../src/lib/format";

describe("formatTotalDuration", () => {
  it("uses full singular and plural duration units", () => {
    expect(formatTotalDuration(0)).toBe("0 minutes");
    expect(formatTotalDuration(60)).toBe("1 minute");
    expect(formatTotalDuration(120)).toBe("2 minutes");
    expect(formatTotalDuration(19 * 60)).toBe("19 minutes");
    expect(formatTotalDuration(60 * 60)).toBe("1 hour");
    expect(formatTotalDuration(2 * 60 * 60)).toBe("2 hours");
    expect(formatTotalDuration(61 * 60)).toBe("1 hour 1 minute");
    expect(formatTotalDuration(79 * 60)).toBe("1 hour 19 minutes");
  });
});
