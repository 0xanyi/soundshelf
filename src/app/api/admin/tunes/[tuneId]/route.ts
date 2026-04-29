import { db } from "@/lib/db";
import { jsonError, requireAdminSession } from "@/lib/http/errors";
import { deleteAudioObject } from "@/lib/r2";
import {
  getTuneDeletePrismaErrorResponse,
  getTuneDeleteStorageCleanupWarning,
  parseTuneUpdatePayload,
  serializeAdminTune,
} from "@/lib/tunes/admin";

export const runtime = "nodejs";

type TuneRouteContext = {
  params: Promise<{
    tuneId: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: TuneRouteContext,
): Promise<Response> {
  const session = await requireAdminSession();

  if (!session) {
    return jsonError("Authentication required.", 401);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError("JSON body is required.", 400);
  }

  const validation = parseTuneUpdatePayload(payload);

  if (!validation.valid) {
    return jsonError(validation.message, 400);
  }

  const { tuneId } = await context.params;
  const existingTune = await db.tune.findUnique({
    where: { id: tuneId },
    select: { id: true },
  });

  if (!existingTune) {
    return jsonError("Tune not found.", 404);
  }

  const tune = await db.tune.update({
    where: { id: tuneId },
    data: validation.data,
    include: {
      _count: {
        select: { playlistItems: true },
      },
    },
  });

  return Response.json(serializeAdminTune(tune));
}

export async function DELETE(
  _request: Request,
  context: TuneRouteContext,
): Promise<Response> {
  const session = await requireAdminSession();

  if (!session) {
    return jsonError("Authentication required.", 401);
  }

  const { tuneId } = await context.params;
  const tune = await db.tune.findUnique({
    where: { id: tuneId },
    include: {
      _count: {
        select: { playlistItems: true },
      },
    },
  });

  if (!tune) {
    return jsonError("Tune not found.", 404);
  }

  if (tune._count.playlistItems > 0) {
    return jsonError("Tune is used in a playlist and cannot be deleted.", 409);
  }

  try {
    await db.tune.delete({
      where: { id: tuneId },
    });
  } catch (error) {
    const deleteErrorResponse = getTuneDeletePrismaErrorResponse(error);

    if (deleteErrorResponse) {
      return jsonError(deleteErrorResponse.message, deleteErrorResponse.status);
    }

    throw error;
  }

  try {
    await deleteAudioObject(tune.r2ObjectKey);
  } catch (error) {
    console.error("Tune metadata deleted but R2 object cleanup failed.", {
      error,
      r2ObjectKey: tune.r2ObjectKey,
      tuneId,
    });

    return Response.json(getTuneDeleteStorageCleanupWarning(), { status: 202 });
  }

  return new Response(null, { status: 204 });
}
