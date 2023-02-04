import { vec3 } from "gl-matrix";

const epsilon = 0.00001;

export function rayTriangleIntersection(
  tri1: vec3,
  tri2: vec3,
  tri3: vec3,
  ray: vec3,
  dir: vec3
) {
  let edge1 = vec3.sub(vec3.create(), tri2, tri1);
  let edge2 = vec3.sub(vec3.create(), tri3, tri1);
  let normal = vec3.cross(vec3.create(), edge1, edge2);
  let det = -vec3.dot(dir, normal);
  let invdet = 1 / det;
  let ao = vec3.sub(vec3.create(), ray, tri1);
  let dao = vec3.cross(vec3.create(), ao, dir);
  let u = vec3.dot(edge2, dao) * invdet;
  let v = -vec3.dot(edge1, dao) * invdet;
  let t = vec3.dot(ao, normal) * invdet;
  if (det < epsilon) return -1;
  if (t < -epsilon) return -1;
  if (u < -epsilon) return -1;
  if (v < -epsilon) return -1;
  if (u + v > 1 + epsilon) return -1;
  return t;
}
