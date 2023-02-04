import { vec3 } from "gl-matrix";
import { GameState } from "./GameState";

export enum VineType {
  ROOT = 0,
  BRANCH = 1,
  LEAF = 2,
}

export type VineConnection = {
  vine: Vine;
  targetDistance: number;
  forcefulness: number;
};

export type Vine = {
  position: vec3;
  velocity: vec3;
  mass: number;
  connections: VineConnection[];
  type: VineType;
};

export function doVineVelocityCalc(world: GameState, vine: Vine) {
  for (const conn of vine.connections) {
    const offset = vec3.sub(vec3.create(), vine.position, conn.vine.position);
    const magnitude = vec3.len(offset);
    const forceVector = vec3.scale(
      offset,
      offset,
      (1 / magnitude) *
        (magnitude - conn.targetDistance) *
        conn.forcefulness *
        world.dt
    );
    const accelVector1 = vec3.scale(vec3.create(), forceVector, 1 / vine.mass);
    vec3.sub(vine.velocity, vine.velocity, accelVector1);

    const accelVector2 = vec3.scale(
      forceVector,
      forceVector,
      -1 / conn.vine.mass
    );
    vec3.sub(conn.vine.velocity, conn.vine.velocity, accelVector2);
  }

  const velMag = vec3.len(vine.velocity);

  const meshLookupPos1 = vec3.sub(vec3.create(), vine.position, [
    velMag,
    velMag,
    velMag,
  ]);
  const meshLookupPos2 = vec3.add(vec3.create(), vine.position, [
    velMag,
    velMag,
    velMag,
  ]);

  const meshes = world.terrain.lookupRegion(meshLookupPos1, meshLookupPos2);

  const candidateCollisionTriangles: [vec3, vec3, vec3][] = [];

  for (const mesh of meshes) {
    candidateCollisionTriangles.push(
      ...mesh.physicsTriangles
        .lookupRegion(meshLookupPos1, meshLookupPos2)
        .map((bt) => bt.vertices)
    );
  }
}
