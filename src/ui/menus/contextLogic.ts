export function findItemByUid<T extends { uid: string }>(
    inventory: readonly (T | null)[],
    equipment: readonly (T | null)[],
    uid: string,
): T | null {
    for (const item of inventory) if (item?.uid === uid) return item;
    for (const item of equipment) if (item?.uid === uid) return item;
    return null;
}