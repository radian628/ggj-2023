import { GameState, TerrainPiece } from "./GameState";

import * as twgl from "twgl.js";
import { mat4 } from "gl-matrix";

export function renderTerrainPiece(
  gl: WebGL2RenderingContext,
  world: GameState,
  terrain: TerrainPiece
) {
  gl.bindVertexArray(terrain.vao);
  gl.drawElements(gl.TRIANGLES, terrain.vertexCount, gl.UNSIGNED_INT, 0);
}

export function renderVines(gl: WebGL2RenderingContext, world: GameState) {
  gl.bindVertexArray(world.graphics.vineVAO);
  const instances: number[] = [];
  for (const vine of world.vines) {
    instances.push(...vine.position, vine.type);
  }
  //gl.bindBuffer(gl.ARRAY_BUFFER, world.graphics.vinePerInstanceBuffer);
  //gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instances), gl.STATIC_DRAW);
  gl.drawElementsInstanced(
    gl.TRIANGLES,
    36,
    gl.UNSIGNED_INT,
    0,
    world.vines.length
  );
  //console.log();
  //console.log(gl.getError());
}

export function render(gl: WebGL2RenderingContext, world: GameState) {
  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(world.graphics.terrainProgram.program);
  twgl.setUniforms(world.graphics.terrainProgram, {
    mvp: mat4.multiply(mat4.create(), world.graphics.p, world.graphics.v),
  });
  for (const mesh of world.terrain) {
    renderTerrainPiece(gl, world, mesh);
  }
  gl.useProgram(world.graphics.vineProgram.program);
  twgl.setUniforms(world.graphics.vineProgram, {
    mvp: mat4.multiply(mat4.create(), world.graphics.p, world.graphics.v),
    color: [0.3, 0.7, 0.3],
  });
  renderVines(gl, world);
}
