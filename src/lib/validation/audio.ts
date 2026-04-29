export const MAX_AUDIO_UPLOAD_BYTES = 50 * 1024 * 1024;

export const ALLOWED_AUDIO_TYPES = [
  "audio/aac",
  "audio/flac",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-wav",
] as const;

export type AllowedAudioType = (typeof ALLOWED_AUDIO_TYPES)[number];

export type AudioFileMetadata = {
  type: string;
  size: number;
  name?: string;
};

export type AudioValidationResult =
  | {
      valid: true;
    }
  | {
      valid: false;
      reason: "unsupported_type" | "file_too_large" | "invalid_size";
      message: string;
    };

export function getMaxAudioUploadBytes(): number {
  return MAX_AUDIO_UPLOAD_BYTES;
}

export function validateAudioFileMetadata(
  file: AudioFileMetadata,
): AudioValidationResult {
  if (!isAllowedAudioType(file.type)) {
    return {
      valid: false,
      reason: "unsupported_type",
      message: getUnsupportedTypeMessage(file.type),
    };
  }

  if (!Number.isFinite(file.size) || file.size < 0) {
    return {
      valid: false,
      reason: "invalid_size",
      message: "Audio file size must be a finite non-negative number.",
    };
  }

  if (file.size > getMaxAudioUploadBytes()) {
    return {
      valid: false,
      reason: "file_too_large",
      message: `Audio files must be ${getMaxAudioUploadBytes()} bytes or smaller.`,
    };
  }

  return { valid: true };
}

function isAllowedAudioType(type: string): type is AllowedAudioType {
  return ALLOWED_AUDIO_TYPES.includes(type as AllowedAudioType);
}

function getUnsupportedTypeMessage(type: string): string {
  if (type === "application/pdf") {
    return "PDF files are not supported audio uploads.";
  }

  if (type.trim() === "") {
    return "Files without an audio type are not supported audio uploads.";
  }

  return `Files of type "${type}" are not supported audio uploads.`;
}
