import { describe, expect, it } from "vitest";

import {
  ALLOWED_AUDIO_TYPES,
  getMaxAudioUploadBytes,
  validateAudioContentLength,
  validateAudioFileMetadata,
} from "../../src/lib/validation/audio";

describe("validateAudioFileMetadata", () => {
  it("accepts MP3 files", () => {
    expect(
      validateAudioFileMetadata({
        type: "audio/mpeg",
        size: 1_024,
        name: "chant.mp3",
      }),
    ).toEqual({ valid: true });
    expect(ALLOWED_AUDIO_TYPES).toContain("audio/mpeg");
  });

  it("rejects PDF files", () => {
    expect(
      validateAudioFileMetadata({
        type: "application/pdf",
        size: 1_024,
        name: "notes.pdf",
      }),
    ).toEqual({
      valid: false,
      reason: "unsupported_type",
      message: "PDF files are not supported audio uploads.",
    });
  });

  it("rejects files above the maximum upload size", () => {
    expect(
      validateAudioFileMetadata({
        type: "audio/mpeg",
        size: getMaxAudioUploadBytes() + 1,
        name: "large.mp3",
      }),
    ).toEqual({
      valid: false,
      reason: "file_too_large",
      message: `Audio files must be ${getMaxAudioUploadBytes()} bytes or smaller.`,
    });
  });

  it("rejects negative file sizes", () => {
    expect(
      validateAudioFileMetadata({
        type: "audio/mpeg",
        size: -1,
        name: "invalid.mp3",
      }),
    ).toEqual({
      valid: false,
      reason: "invalid_size",
      message: "Audio file size must be a finite non-negative number.",
    });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-finite file sizes: %s",
    (size) => {
      expect(
        validateAudioFileMetadata({
          type: "audio/mpeg",
          size,
          name: "invalid.mp3",
        }),
      ).toEqual({
        valid: false,
        reason: "invalid_size",
        message: "Audio file size must be a finite non-negative number.",
      });
    },
  );
});

describe("validateAudioContentLength", () => {
  it("rejects missing content length", () => {
    expect(validateAudioContentLength(null)).toEqual({
      valid: false,
      reason: "missing_content_length",
      message: "Content-Length is required for audio uploads.",
    });
  });

  it("accepts content length at the maximum upload size", () => {
    expect(validateAudioContentLength(String(getMaxAudioUploadBytes()))).toEqual({
      valid: true,
    });
  });

  it("rejects invalid content length values", () => {
    expect(validateAudioContentLength("not-a-number")).toEqual({
      valid: false,
      reason: "invalid_size",
      message: "Content-Length must be a finite non-negative integer.",
    });
  });

  it("rejects content length above the maximum upload size", () => {
    expect(validateAudioContentLength(String(getMaxAudioUploadBytes() + 1))).toEqual(
      {
        valid: false,
        reason: "file_too_large",
        message: `Audio uploads must be ${getMaxAudioUploadBytes()} bytes or smaller.`,
      },
    );
  });
});
