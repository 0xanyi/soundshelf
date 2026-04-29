export type PositionedItem = {
  id: string;
  position: number;
};

export function normalizePositions<TItem extends PositionedItem>(
  items: readonly TItem[],
): TItem[] {
  return items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((left, right) => {
      const positionDifference = left.item.position - right.item.position;

      if (positionDifference !== 0) {
        return positionDifference;
      }

      return originalIndexSort(left.originalIndex, right.originalIndex);
    })
    .map(({ item }, position) => ({
      ...item,
      position,
    }));
}

export function moveItem<TItem extends PositionedItem>(
  items: readonly TItem[],
  itemId: string,
  targetIndex: number,
): TItem[] {
  const normalizedItems = normalizePositions(items);
  const currentIndex = normalizedItems.findIndex((item) => item.id === itemId);

  if (currentIndex === -1) {
    return normalizedItems;
  }

  const nextItems = [...normalizedItems];
  const [movedItem] = nextItems.splice(currentIndex, 1);
  const boundedTargetIndex = Math.min(Math.max(targetIndex, 0), nextItems.length);

  nextItems.splice(boundedTargetIndex, 0, movedItem);

  return nextItems.map((item, position) => ({
    ...item,
    position,
  }));
}

function originalIndexSort(leftIndex: number, rightIndex: number): number {
  return leftIndex - rightIndex;
}
