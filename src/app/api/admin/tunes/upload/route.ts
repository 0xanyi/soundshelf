import { db } from "@/lib/db";
import { jsonError, requireAdminSession } from "@/lib/http/errors";
import { buildTuneObjectKey, deleteAudioObject, putAudioObject } from "@/lib/r2";
import {
  validateAudioContentLength,
  validateAudioFileMetadata,
} from "@/lib/validation/audio";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
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
        description: null,
        durationSeconds: 0,
        mimeType: uploadedFile.type,
        fileSizeBytes: BigInt(uploadedFile.size),
        r2ObjectKey: objectKey,
        status: "draft",
      },
    });

    return Response.json(serializeTune(tune), { status: 201 });
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

function serializeTune<Tune extends { fileSizeBytes: bigint }>(tune: Tune) {
  return {
    ...tune,
    fileSizeBytes: tune.fileSizeBytes.toString(),
  };
}
