import * as twgl from "twgl.js";
import { GameState } from "./GameState";
import { formatMeshForRendering } from "./MeshLoader";
import { OBJSingleObject } from "./ObjLoader";

export function createVineVAO(
  gl: WebGL2RenderingContext,
  program: twgl.ProgramInfo,
  primitive: OBJSingleObject
) {
  const buffers = formatMeshForRendering(gl, primitive);

  const vbo = gl.createBuffer();
  if (!vbo) return undefined;
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(buffers.vboData),
    gl.STATIC_DRAW
  );

  const ibo = gl.createBuffer();
  if (!ibo) return undefined;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Float32Array(buffers.vboData),
    gl.STATIC_DRAW
  );

  const instanceBuffer = gl.createBuffer();
  if (!instanceBuffer) return undefined;
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([3, 3, 3, 1]),
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
      instance_position: {
        buffer: instanceBuffer,
        stride: 16,
        offset: 0,
        type: gl.FLOAT,
        numComponents: 3,
      },
      instance_type: {
        buffer: instanceBuffer,
        stride: 16,
        offset: 12,
        type: gl.FLOAT,
        numComponents: 1,
      },
    },
    ibo
  );

  if (!vao) return undefined;

  return {
    vineVAO: vao,
    vinePerInstanceBuffer: instanceBuffer,
  };
}
