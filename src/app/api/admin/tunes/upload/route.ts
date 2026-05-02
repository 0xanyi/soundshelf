import { db } from "@/lib/db";
import {
  enforceSameOrigin,
  jsonError,
  recordAudit,
  requireAdminSession,
} from "@/lib/http/errors";
import { buildTuneObjectKey, deleteAudioObject, putAudioObject } from "@/lib/r2";
import { serializeAdminTune } from "@/lib/tunes/admin";
import {
  validateAudioContentLength,
  validateAudioFileMetadata,
} from "@/lib/validation/audio";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const csrf = await enforceSameOrigin(request);
  if (csrf) return csrf;

  const session = await requireAdminSession();

  if (!session) {
    return jsonError("Authentication required.", 401);
  }

  const contentLengthValidation = validateAudioContentLength(
    request.headers.get("content-length"),
  );

  if (!contentLengthValidation.valid) {
    return jsonError(
      contentLengthValidation.message,
      getValidationStatus(contentLengthValidation.reason),
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("Multipart form data is required.", 400);
  }

  const uploadedFile = formData.get("file");

  if (!(uploadedFile instanceof File)) {
    return jsonError("A file field is required.", 400);
  }

  const validation = validateAudioFileMetadata({
    type: uploadedFile.type,
    size: uploadedFile.size,
    name: uploadedFile.name,
  });

  if (!validation.valid) {
    return jsonError(validation.message, getValidationStatus(validation.reason));
  }

  const durationSeconds = parseDurationField(formData.get("durationSeconds"));

  const objectKey = buildTuneObjectKey(uploadedFile.name);
  const body = Buffer.from(await uploadedFile.arrayBuffer());

  try {
    await putAudioObject({
      key: objectKey,
      body,
      contentType: uploadedFile.type,
    });
  } catch (error) {
    console.error("Failed to upload tune audio to R2", error);

    return jsonError("Audio upload failed.", 502);
  }

  try {
    const tune = await db.tune.create({
      data: {
        title: getInitialTitle(uploadedFile.name),
        durationSeconds,
        mimeType: uploadedFile.type,
        fileSizeBytes: BigInt(uploadedFile.size),
        r2ObjectKey: objectKey,
      },
      select: {
        id: true,
        title: true,
        durationSeconds: true,
        mimeType: true,
        fileSizeBytes: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { playlistItems: true },
        },
      },
    });

    await recordAudit({
      actorId: session.userId,
      action: "tune.upload",
      resource: "tune",
      resourceId: tune.id,
      metadata: {
        title: tune.title,
        mimeType: tune.mimeType,
        durationSeconds,
      },
    });

    return Response.json(serializeAdminTune(tune), { status: 201 });
  } catch (error) {
    console.error("Failed to create tune record", error);

    try {
      await deleteAudioObject(objectKey);
    } catch (cleanupError) {
      console.error("Failed to clean up tune audio after DB failure", {
        key: objectKey,
        error: cleanupError,
      });
    }

    return jsonError("Tune could not be saved.", 500);
  }
}

function getValidationStatus(
  reason:
    | "unsupported_type"
    | "file_too_large"
    | "invalid_size"
    | "missing_content_length",
) {
  if (reason === "missing_content_length") {
    return 411;
  }

  if (reason === "unsupported_type") {
    return 415;
  }

  if (reason === "file_too_large") {
    return 413;
  }

  return 400;
}

function getInitialTitle(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, "").trim();

  return withoutExtension || "Untitled tune";
}

// Cap a track at 24 hours so a malformed value can never poison the schema.
const MAX_DURATION_SECONDS = 24 * 60 * 60;

function parseDurationField(field: FormDataEntryValue | null): number {
  if (typeof field !== "string" || field.trim() === "") {
    return 0;
  }

  const value = Number(field);

  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.min(MAX_DURATION_SECONDS, Math.round(value));
}


