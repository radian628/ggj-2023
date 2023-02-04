import { mat4, vec3 } from "gl-matrix";
import { SpatialHashTable } from "./SpatialHashTable";
import { Vine } from "./Vine";
import * as twgl from "twgl.js";

export type BoundedTriangle = {
  pos1: vec3;
  pos2: vec3;
  vertices: [vec3, vec3, vec3];
};

export type TerrainPiece = {
  pos1: vec3;
  pos2: vec3;
  physicsTriangles: SpatialHashTable<BoundedTriangle>;
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  ibo: WebGLBuffer;
  vertexCount: number;
};

export type GameState = {
  terrain: SpatialHashTable<TerrainPiece>;
  vines: Vine[];
  dt: number;
  graphics: {
    terrainProgram: twgl.ProgramInfo;
    vineProgram: twgl.ProgramInfo;
    v: mat4;
    p: mat4;
    vineVAO: WebGLVertexArrayObject;
    vinePerInstanceBuffer: WebGLBuffer;
  };
  input: {
    isMouseDown: boolean;
    isRightMouseDown: boolean;
  };
};
