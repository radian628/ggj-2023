import { mat4, vec3, vec4 } from "gl-matrix";
import * as twgl from "twgl.js";
import { GameState } from "./GameState";
import { loadMesh } from "./MeshLoader";
import { OBJSingleObject, parseMultiObj } from "./ObjLoader";
import { render } from "./Render";
import { createSpatialHashTable } from "./SpatialHashTable";

import "./style.css";
import { VineType } from "./Vine";
import { createVineVAO } from "./VineGraphics";

console.log("got here");

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl = canvas?.getContext("webgl2");

if (!gl) {
  window.alert("Your browser does not support WebGL2!");
  throw "";
}

const resize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
};

resize();
window.addEventListener("resize", resize);

gl.clearColor(1.0, 1.0, 1.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

async function fetchStr(path: string) {
  return await (await fetch(path)).text();
}

const prog = twgl.createProgramInfo(gl, [
  await fetchStr("./terrain.vert"),
  await fetchStr("./terrain.frag"),
]);

const viewMatrix = mat4.identity(mat4.create());

const vineProgram = twgl.createProgramInfo(gl, [
  await fetchStr("./vine.vert"),
  await fetchStr("./vine.frag"),
]);

const model = await parseMultiObj(await fetchStr("./test.obj"), "/", (str) =>
  Promise.resolve("")
);

function enforceNoUndefined<T>(t: T | undefined, errmsg: string): T {
  if (t === undefined) {
    window.alert(errmsg);
    throw 0;
  }
  return t;
}

const { vineVAO, vinePerInstanceBuffer } = enforceNoUndefined(
  createVineVAO(gl, vineProgram, model.objects.get("Cube") as OBJSingleObject),
  "Failed to load vine VAO"
);

const world: GameState = {
  graphics: {
    terrainProgram: prog,
    v: mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -2)),
    p: mat4.perspective(mat4.create(), 2, 16 / 9, 0.1, 1000),
    vineProgram,
    vineVAO,
    vinePerInstanceBuffer,
  },
  vines: [],
  dt: 0.01,
  terrain: createSpatialHashTable(1),
  input: {
    isMouseDown: false,
    isRightMouseDown: false,
  },
};

const terrain = loadMesh(
  gl,
  world.graphics.terrainProgram,
  model.objects.get("Suzanne") as OBJSingleObject
);

if (!terrain) {
  window.alert("terrain didnt load lol");
  throw "";
}

world.terrain.insert(terrain);

document.addEventListener("mousedown", (e) => {
  if (e.button == 0) world.input.isMouseDown = true;
  if (e.button == 2) world.input.isRightMouseDown = true;
});

document.addEventListener("mouseup", (e) => {
  if (e.button == 0) world.input.isMouseDown = false;
  if (e.button == 2) world.input.isRightMouseDown = false;
});

document.addEventListener("mousemove", (e) => {
  if (world.input.isMouseDown) {
    const invView = mat4.invert(mat4.create(), world.graphics.v);
    const localXAxis = vec4.fromValues(1.0, 0.0, 0.0, 0.0);
    const localYAxis = vec4.fromValues(0.0, 1.0, 0.0, 0.0);
    vec4.transformMat4(localXAxis, localXAxis, invView);
    vec4.transformMat4(localYAxis, localYAxis, invView);
    mat4.rotate(
      world.graphics.v,
      world.graphics.v,
      e.movementX * 0.004,
      localYAxis.slice(0, 3) as vec3
    );
    mat4.rotate(
      world.graphics.v,
      world.graphics.v,
      e.movementY * 0.004,
      localXAxis.slice(0, 3) as vec3
    );
  }
});

for (let i = 0; i < 100; i++) {
  world.vines.push({
    position: vec3.fromValues(
      Math.random() * 8 - 4,
      Math.random() * 8 - 4,
      Math.random() * 8 - 4
    ),
    velocity: vec3.create(),
    mass: 1,
    type: VineType.BRANCH,
    connections: [],
  });
}

const loop = () => {
  render(gl, world);
  requestAnimationFrame(loop);
};

loop();
