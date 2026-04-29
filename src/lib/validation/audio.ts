export const MAX_AUDIO_UPLOAD_BYTES = 50 * 1024 * 1024;
const MULTIPART_UPLOAD_OVERHEAD_BYTES = 1024 * 1024;

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
      reason:
        | "unsupported_type"
        | "file_too_large"
        | "invalid_size"
        | "missing_content_length";
      message: string;
    };

export function getMaxAudioUploadBytes(): number {
  const configuredMaxBytes = process.env.MAX_AUDIO_UPLOAD_BYTES;

  if (configuredMaxBytes === undefined) {
    return MAX_AUDIO_UPLOAD_BYTES;
  }

  const maxBytes = Number(configuredMaxBytes);

  if (
    configuredMaxBytes.trim() === "" ||
    !Number.isSafeInteger(maxBytes) ||
    maxBytes <= 0
  ) {
    return MAX_AUDIO_UPLOAD_BYTES;
  }

  return maxBytes;
}

export function getMaxAudioUploadRequestBytes(): number {
  // Content-Length includes multipart boundaries and field headers, so the
  // pre-parse request cap allows 1 MiB over the exact audio file-size limit.
  return getMaxAudioUploadBytes() + MULTIPART_UPLOAD_OVERHEAD_BYTES;
}

export function validateAudioContentLength(
  contentLength: string | null,
): AudioValidationResult {
  if (contentLength === null) {
    return {
      valid: false,
      reason: "missing_content_length",
      message: "Content-Length is required for audio uploads.",
    };
  }

  const size = Number(contentLength);

  if (
    contentLength.trim() === "" ||
    !Number.isSafeInteger(size) ||
    size < 0
  ) {
    return {
      valid: false,
      reason: "invalid_size",
      message: "Content-Length must be a finite non-negative integer.",
    };
  }

  const maxAudioUploadRequestBytes = getMaxAudioUploadRequestBytes();

  if (size > maxAudioUploadRequestBytes) {
    return {
      valid: false,
      reason: "file_too_large",
      message: `Audio upload requests must be ${maxAudioUploadRequestBytes} bytes or smaller.`,
    };
  }

  return { valid: true };
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

  const maxAudioUploadBytes = getMaxAudioUploadBytes();

  if (file.size > maxAudioUploadBytes) {
    return {
      valid: false,
      reason: "file_too_large",
      message: `Audio files must be ${maxAudioUploadBytes} bytes or smaller.`,
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
