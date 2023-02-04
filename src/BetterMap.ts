export type BetterMap<K, V> = {
  get: (k: K) => V | undefined;
  set: (k: K, v: V) => void;
  delete: (k: K) => void;
};

export function createBetterMap<K, V>(
  hash: (k: K) => number,
  eq: (a: K, b: K) => boolean
) {
  const underlyingMap = new Map<number, [K, V][]>();

  return {
    get(k: K) {
      const bucket = underlyingMap.get(hash(k));
      return bucket?.find((e) => eq(e[0], k))?.[1] ?? undefined;
    },

    set(k: K, v: V) {
      const keyHash = hash(k);
      const bucket = underlyingMap.get(keyHash);
      const newEntry: [K, V] = [k, v];
      const index = bucket?.findIndex((e) => eq(e[0], k));
      if (index) {
        if (index != -1) {
          bucket?.splice(index, 1, newEntry);
        } else {
          bucket?.push(newEntry);
        }
      } else {
        underlyingMap.set(keyHash, [newEntry]);
      }
    },

    delete(k: K) {
      const keyHash = hash(k);
      const bucket = underlyingMap.get(keyHash);
      bucket?.filter((e) => !eq(e[0], k));
      if (bucket?.length === 0) underlyingMap.delete(keyHash);
    },
  };
}
