import { vec3 } from "gl-matrix";
import { BoundedTriangle, TerrainPiece } from "./GameState";
import { OBJSingleObject, ParsedMultiOBJ } from "./ObjLoader";
import { createSpatialHashTable } from "./SpatialHashTable";
import * as twgl from "twgl.js";
import { createBetterMap } from "./BetterMap";

export function boundTriangle(
  pos1: vec3,
  pos2: vec3,
  pos3: vec3
): BoundedTriangle {
  const pts: [vec3, vec3, vec3] = [pos1, pos2, pos3];
  return {
    vertices: pts,
    pos1: minOfPointList(pts),
    pos2: maxOfPointList(pts),
  };
}

export function minOfPointList(pointList: vec3[]): vec3 {
  return [
    Math.min(...pointList.map((v) => v[0])),
    Math.min(...pointList.map((v) => v[1])),
    Math.min(...pointList.map((v) => v[2])),
  ];
}

export function maxOfPointList(pointList: vec3[]): vec3 {
  return [
    Math.max(...pointList.map((v) => v[0])),
    Math.max(...pointList.map((v) => v[1])),
    Math.max(...pointList.map((v) => v[2])),
  ];
}

export function formatMeshForRendering(
  gl: WebGL2RenderingContext,
  obj: OBJSingleObject
) {
  const unindexedPositions: vec3[] = [];
  const unindexedNormals: vec3[] = [];

  const leastVertexIndex = Math.min(...obj.vertexIndices);
  const leastNormalIndex = Math.min(...obj.normalIndices);

  for (let i = 0; i < obj.vertexIndices.length; i++) {
    unindexedPositions.push(
      obj.vertices[obj.vertexIndices[i] - leastVertexIndex]
    );
    unindexedNormals.push(obj.normals[obj.normalIndices[i] - leastNormalIndex]);
  }

  const vboData: number[] = [];
  const indices: number[] = [];

  type PosAndNormal = [number, number, number, number, number, number];

  const indexMap = createBetterMap<PosAndNormal, number>(
    (k: PosAndNormal) => {
      return (
        k[0] +
        10 * k[1] +
        100 * k[2] +
        1000 * k[3] +
        10000 * k[4] +
        100000 * k[5]
      );
    },
    (a: PosAndNormal, b: PosAndNormal) => {
      return (
        a[0] == b[0] &&
        a[1] == b[1] &&
        a[2] == b[2] &&
        a[3] == b[3] &&
        a[4] == b[4] &&
        a[5] == b[5]
      );
    }
  );

  for (let i = 0; i < unindexedNormals.length; i++) {
    const ipos = unindexedPositions[i];
    const inorm = unindexedNormals[i];

    const both = [...ipos, ...inorm] as PosAndNormal;

    const index = indexMap.get(both);

    if (index !== undefined) {
      indices.push(index);
    } else {
      const newIndex = vboData.length / 6;
      indexMap.set(both, newIndex);
      vboData.push(...both);
      indices.push(newIndex);
    }
  }
  console.log(indices, vboData);

  return { indices, vboData };
}

export function loadMesh(
  gl: WebGL2RenderingContext,
  program: twgl.ProgramInfo,
  obj: OBJSingleObject
): TerrainPiece | undefined {
  const pos1 = minOfPointList(obj.vertices);
  const pos2 = maxOfPointList(obj.vertices);

  const physicsTriangles = createSpatialHashTable<BoundedTriangle>(1);

  const meshForRendering = formatMeshForRendering(gl, obj);

  const vbo = gl.createBuffer();
  if (!vbo) return undefined;
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(meshForRendering.vboData),
    gl.STATIC_DRAW
  );

  const ibo = gl.createBuffer();
  if (!ibo) return undefined;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(meshForRendering.indices),
    gl.STATIC_DRAW
  );
  const vao = twgl.createVAOAndSetAttributes(
    gl,
    program.attribSetters,
    {
      model_position: {
        buffer: vbo,
        stride: 24,
        offset: 0,
        type: gl.FLOAT,
        numComponents: 3,
      },
      model_normal: {
        buffer: vbo,
        stride: 24,
        offset: 12,
        type: gl.FLOAT,
        numComponents: 3,
      },
    },
    ibo
  );
  if (!vao) return undefined;

  return {
    pos1,
    pos2,
    physicsTriangles,
    vbo,
    ibo,
    vao,
    vertexCount: meshForRendering.indices.length,
  };
}
