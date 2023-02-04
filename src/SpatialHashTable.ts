import { vec3 } from "gl-matrix";

type Bounded = {
  pos1: vec3;
  pos2: vec3;
};

export type SpatialHashTable<T extends Bounded> = {
  lookup: (position: vec3) => T[];
  lookupRegion: (pos1: vec3, pos2: vec3) => T[];
  insert: (t: T) => void;
  remove: (t: T) => void;
  [Symbol.iterator]: () => IterableIterator<T>;
};

export function createSpatialHashTable<T extends Bounded>(
  bucketSize: number
): SpatialHashTable<T> {
  function calcBucketFromIndex(bucket: vec3) {
    return (
      bucket[0] +
      2 ** 16 +
      (bucket[1] + 2 ** 16) * 2 ** 17 +
      (bucket[2] + 2 ** 16) * 2 ** 34
    );
  }

  function calcIndexFromPosition(position: vec3, offset: number): vec3 {
    return [
      Math.floor(position[0] / bucketSize) + 1,
      Math.floor(position[1] / bucketSize) + 1,
      Math.floor(position[2] / bucketSize) + 1,
    ];
  }

  const buckets = new Map<number, T[]>();

  function addToBucket(key: number, item: T) {
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      buckets.set(key, [item]);
    }
  }

  function removeFromBucket(key: number, item: T) {
    const bucket = buckets.get(key);
    if (bucket) {
      buckets.set(
        key,
        bucket.filter((e) => e !== item)
      );
      if (bucket.length == 0) buckets.delete(key);
    }
  }

  return {
    lookup(position) {
      return (
        buckets.get(calcBucketFromIndex(calcIndexFromPosition(position, 0))) ??
        []
      );
    },
    lookupRegion(pos1, pos2) {
      const result: T[] = [];
      const index1 = calcIndexFromPosition(pos1, 0);
      const index2 = calcIndexFromPosition(pos2, 1);
      for (let z = index1[2]; z < index2[2]; z++) {
        for (let y = index1[1]; y < index2[1]; y++) {
          for (let x = index1[0]; x < index2[0]; x++) {
            result.push(...(buckets.get(calcBucketFromIndex([x, y, z])) ?? []));
          }
        }
      }
      return result;
    },
    insert(item) {
      const index1 = calcIndexFromPosition(item.pos1, 0);
      const index2 = calcIndexFromPosition(item.pos2, 1);
      for (let z = index1[2]; z < index2[2]; z++) {
        for (let y = index1[1]; y < index2[1]; y++) {
          for (let x = index1[0]; x < index2[0]; x++) {
            addToBucket(calcBucketFromIndex([x, y, z]), item);
          }
        }
      }
    },
    remove(item) {
      const index1 = calcIndexFromPosition(item.pos1, 0);
      const index2 = calcIndexFromPosition(item.pos2, 1);
      for (let z = index1[2]; z < index2[2]; z++) {
        for (let y = index1[1]; y < index2[1]; y++) {
          for (let x = index1[0]; x < index2[0]; x++) {
            removeFromBucket(calcBucketFromIndex([x, y, z]), item);
          }
        }
      }
    },
    [Symbol.iterator]() {
      return Array.from(buckets.values()).flat()[Symbol.iterator]();
    },
  };
}
