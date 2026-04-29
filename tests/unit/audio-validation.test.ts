import { describe, expect, it } from "vitest";

import {
  ALLOWED_AUDIO_TYPES,
  getMaxAudioUploadBytes,
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
});
