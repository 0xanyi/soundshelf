import { Prisma, type PrismaClient } from "@prisma/client";

const maxAttempts = 3;

export type MembershipItem = {
  id: string;
  position: number;
};

export type AppendResult =
  | { status: "ok"; item: MembershipItem }
  | { status: "playlist-not-found" }
  | { status: "tune-not-found" }
  | { status: "already-member" }
  | { status: "conflict" };

export type MoveResult =
  | { status: "ok"; items: MembershipItem[] }
  | { status: "playlist-not-found" }
  | { status: "item-not-found" }
  | { status: "conflict" };

export type RemoveResult = MoveResult;

export type BulkAddResult =
  | { status: "ok"; added: number; skipped: number }
  | { status: "playlist-not-found" }
  | { status: "tune-not-found" }
  | { status: "conflict" };

export type SyncResult =
  | { status: "ok"; added: number; removed: number }
  | { status: "tune-not-found" }
  | { status: "playlist-not-found" }
  | { status: "conflict" };

type PositionedItem = {
  id: string;
  position: number;
};

export async function append(
  db: PrismaClient,
  playlistId: string,
  tuneId: string,
): Promise<AppendResult> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        const [playlist, tune] = await Promise.all([
          tx.playlist.findUnique({
            where: { id: playlistId },
            select: { id: true },
          }),
          tx.tune.findUnique({
            where: { id: tuneId },
            select: { id: true },
          }),
        ]);

        if (!playlist) {
          return { status: "playlist-not-found" } as const;
        }

        if (!tune) {
          return { status: "tune-not-found" } as const;
        }

        const existing = await tx.playlistItem.findFirst({
          where: { playlistId, tuneId },
          select: { id: true },
        });

        if (existing) {
          return { status: "already-member" } as const;
        }

        const lastItem = await tx.playlistItem.findFirst({
          where: { playlistId },
          orderBy: { position: "desc" },
          select: { position: true },
        });

        const item = await tx.playlistItem.create({
          data: {
            playlistId,
            tuneId,
            position: lastItem ? lastItem.position + 1 : 0,
          },
          select: { id: true, position: true },
        });

        return { status: "ok", item } as const;
      });
    } catch (error) {
      if (isAlreadyMemberConflict(error)) {
        return { status: "already-member" };
      }

      if (isRetryablePositionError(error) && attempt < maxAttempts) {
        continue;
      }

      if (isRetryablePositionError(error)) {
        return { status: "conflict" };
      }

      throw error;
    }
  }

  return { status: "conflict" };
}

export async function move(
  db: PrismaClient,
  playlistId: string,
  itemId: string,
  position: number,
): Promise<MoveResult> {
  return mutateOrderedItems(db, playlistId, itemId, (currentItems) =>
    moveItem(currentItems, itemId, position),
  );
}

export async function remove(
  db: PrismaClient,
  playlistId: string,
  itemId: string,
): Promise<RemoveResult> {
  return mutateOrderedItems(db, playlistId, itemId, async (currentItems, tx) => {
    await tx.playlistItem.delete({
      where: { id: itemId },
    });

    return normalizePositions(currentItems.filter((item) => item.id !== itemId));
  });
}

export async function bulkAdd(
  db: PrismaClient,
  playlistId: string,
  tuneIds: string[],
): Promise<BulkAddResult> {
  const uniqueTuneIds = uniqueIds(tuneIds);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        const playlist = await tx.playlist.findUnique({
          where: { id: playlistId },
          select: { id: true },
        });

        if (!playlist) {
          return { status: "playlist-not-found" } as const;
        }

        if (uniqueTuneIds.length === 0) {
          return { status: "ok", added: 0, skipped: 0 } as const;
        }

        const tunes = await tx.tune.findMany({
          where: { id: { in: uniqueTuneIds } },
          select: { id: true },
        });

        if (tunes.length !== uniqueTuneIds.length) {
          return { status: "tune-not-found" } as const;
        }

        const lastItem = await tx.playlistItem.findFirst({
          where: { playlistId },
          orderBy: { position: "desc" },
          select: { position: true },
        });

        const existing = await tx.playlistItem.findMany({
          where: { playlistId, tuneId: { in: uniqueTuneIds } },
          select: { tuneId: true },
        });
        const existingTuneIds = new Set(existing.map((item) => item.tuneId));
        const toAdd = uniqueTuneIds.filter((id) => !existingTuneIds.has(id));

        if (toAdd.length === 0) {
          return {
            status: "ok",
            added: 0,
            skipped: existingTuneIds.size,
          } as const;
        }

        const startPosition = lastItem ? lastItem.position + 1 : 0;

        await tx.playlistItem.createMany({
          data: toAdd.map((tuneId, index) => ({
            playlistId,
            tuneId,
            position: startPosition + index,
          })),
        });

        return {
          status: "ok",
          added: toAdd.length,
          skipped: existingTuneIds.size,
        } as const;
      });
    } catch (error) {
      if (shouldRetryMembershipWrite(error) && attempt < maxAttempts) {
        continue;
      }

      if (isRetryablePositionError(error)) {
        return { status: "conflict" };
      }

      throw error;
    }
  }

  return { status: "conflict" };
}

export async function sync(
  db: PrismaClient,
  tuneId: string,
  playlistIds: string[],
): Promise<SyncResult> {
  const desiredIds = uniqueIds(playlistIds);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        const tune = await tx.tune.findUnique({
          where: { id: tuneId },
          select: { id: true },
        });

        if (!tune) {
          return { status: "tune-not-found" } as const;
        }

        if (desiredIds.length > 0) {
          const playlists = await tx.playlist.findMany({
            where: { id: { in: desiredIds } },
            select: { id: true },
          });

          if (playlists.length !== desiredIds.length) {
            return { status: "playlist-not-found" } as const;
          }
        }

        const current = await tx.playlistItem.findMany({
          where: { tuneId },
          select: { playlistId: true },
        });
        const currentIds = new Set(current.map((item) => item.playlistId));
        const desired = new Set(desiredIds);

        const toRemove = [...currentIds].filter((id) => !desired.has(id));
        const toAdd = desiredIds.filter((id) => !currentIds.has(id));

        for (const playlistId of toRemove) {
          await tx.playlistItem.deleteMany({
            where: { tuneId, playlistId },
          });

          const remaining = await tx.playlistItem.findMany({
            where: { playlistId },
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
            select: { id: true, position: true },
          });

          await updatePlaylistItemPositions(tx, normalizePositions(remaining));
        }

        for (const playlistId of toAdd) {
          const lastItem = await tx.playlistItem.findFirst({
            where: { playlistId },
            orderBy: { position: "desc" },
            select: { position: true },
          });

          await tx.playlistItem.create({
            data: {
              playlistId,
              tuneId,
              position: lastItem ? lastItem.position + 1 : 0,
            },
          });
        }

        return {
          status: "ok",
          added: toAdd.length,
          removed: toRemove.length,
        } as const;
      });
    } catch (error) {
      if (shouldRetryMembershipWrite(error) && attempt < maxAttempts) {
        continue;
      }

      if (isRetryablePositionError(error)) {
        return { status: "conflict" };
      }

      throw error;
    }
  }

  return { status: "conflict" };
}

type TransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

async function mutateOrderedItems(
  db: PrismaClient,
  playlistId: string,
  itemId: string,
  nextItems: (
    currentItems: PositionedItem[],
    tx: TransactionClient,
  ) => PositionedItem[] | Promise<PositionedItem[]>,
): Promise<MoveResult> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          const playlist = await tx.playlist.findUnique({
            where: { id: playlistId },
            select: {
              id: true,
              items: {
                orderBy: [{ position: "asc" }, { createdAt: "asc" }],
                select: { id: true, position: true },
              },
            },
          });

          if (!playlist) {
            return { status: "playlist-not-found" } as const;
          }

          if (!playlist.items.some((item) => item.id === itemId)) {
            return { status: "item-not-found" } as const;
          }

          const items = await nextItems(playlist.items, tx);
          await updatePlaylistItemPositions(tx, items);

          return { status: "ok", items } as const;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isRetryablePositionError(error) && attempt < maxAttempts) {
        continue;
      }

      if (isRetryablePositionError(error)) {
        return { status: "conflict" };
      }

      throw error;
    }
  }

  return { status: "conflict" };
}

async function updatePlaylistItemPositions(
  client: Pick<TransactionClient, "playlistItem">,
  items: PositionedItem[],
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  await Promise.all(
    items.map((item, index) =>
      client.playlistItem.update({
        where: { id: item.id },
        data: { position: -(index + 1) },
      }),
    ),
  );

  await Promise.all(
    items.map((item) =>
      client.playlistItem.update({
        where: { id: item.id },
        data: { position: item.position },
      }),
    ),
  );
}

function normalizePositions<TItem extends PositionedItem>(
  items: readonly TItem[],
): TItem[] {
  return items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((left, right) => {
      const positionDifference = left.item.position - right.item.position;

      if (positionDifference !== 0) {
        return positionDifference;
      }

      return left.originalIndex - right.originalIndex;
    })
    .map(({ item }, position) => ({
      ...item,
      position,
    }));
}

function moveItem<TItem extends PositionedItem>(
  items: readonly TItem[],
  itemId: string,
  position: number,
): TItem[] {
  const normalizedItems = normalizePositions(items);
  const currentIndex = normalizedItems.findIndex((item) => item.id === itemId);

  if (currentIndex === -1) {
    return normalizedItems;
  }

  const nextItems = [...normalizedItems];
  const [movedItem] = nextItems.splice(currentIndex, 1);
  const boundedPosition = Math.min(Math.max(position, 0), nextItems.length);

  nextItems.splice(boundedPosition, 0, movedItem);

  return nextItems.map((item, nextPosition) => ({
    ...item,
    position: nextPosition,
  }));
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function shouldRetryMembershipWrite(error: unknown): boolean {
  return isRetryablePositionError(error) || isAlreadyMemberConflict(error);
}

function isAlreadyMemberConflict(error: unknown): boolean {
  if (!isPrismaKnownRequestError(error) || error.code !== "P2002") {
    return false;
  }

  const target = prismaErrorTarget(error);

  return targetIncludes(target, "playlistId") && targetIncludes(target, "tuneId");
}

function isRetryablePositionError(error: unknown): boolean {
  if (isPrismaKnownRequestError(error) && error.code === "P2034") {
    return true;
  }

  if (!isPrismaKnownRequestError(error) || error.code !== "P2002") {
    return false;
  }

  const target = prismaErrorTarget(error);

  return targetIncludes(target, "playlistId") && targetIncludes(target, "position");
}

function isPrismaKnownRequestError(
  error: unknown,
): error is { code: string; clientVersion: string; meta?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "clientVersion" in error &&
    typeof error.clientVersion === "string"
  );
}

function prismaErrorTarget(error: { meta?: unknown; message?: unknown }): string[] {
  const fromMeta = metaConstraintFields(error.meta);

  if (fromMeta.length > 0) {
    return fromMeta;
  }

  if (typeof error.message === "string") {
    return [...error.message.matchAll(/"([a-zA-Z]+Id|[a-zA-Z]+)"/g)].map(
      (match) => match[1],
    );
  }

  return [];
}

function metaConstraintFields(meta: unknown): string[] {
  if (!meta || typeof meta !== "object") {
    return [];
  }

  const record = meta as Record<string, unknown>;
  const fromTarget = stringValues(record.target);

  if (fromTarget.length > 0) {
    return fromTarget;
  }

  const driverError = record.driverAdapterError;

  if (!driverError || typeof driverError !== "object") {
    return [];
  }

  const cause = (driverError as Record<string, unknown>).cause;

  if (!cause || typeof cause !== "object") {
    return [];
  }

  const constraint = (cause as Record<string, unknown>).constraint;

  if (!constraint || typeof constraint !== "object") {
    return [];
  }

  const fields = stringValues((constraint as Record<string, unknown>).fields);

  if (fields.length > 0) {
    return fields;
  }

  return stringValues((constraint as Record<string, unknown>).index);
}

function stringValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  if (typeof value === "string") {
    return [value];
  }

  return [];
}

function targetIncludes(target: string[], fieldName: string): boolean {
  return target.some(
    (value) => value === fieldName || value.includes(fieldName),
  );
}
