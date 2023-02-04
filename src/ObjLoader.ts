export function rest2num(l: string[]) {
  return l.slice(1).map((n) => Number(n));
}

export function is3long<T>(l: T[]): [T, T, T] {
  if (l.length != 3) throw new Error("Malformed input: Expected 3 numbers.");
  //@ts-ignore
  return l;
}
export function is2long<T>(l: T[]): [T, T] {
  if (l.length != 2) throw new Error("Malformed input: Expected 2 numbers.");
  //@ts-ignore
  return l;
}

export function is1long<T>(l: T[]): T {
  if (l.length != 1) throw new Error("Malformed input: Expected 1 number.");
  //@ts-ignore
  return l;
}
export type MTLMaterial = {
  name: string;
  ambient?: [number, number, number];
  diffuse?: [number, number, number];
  specular?: [number, number, number];
  specularExponent?: number;
  dissolve?: number;
  illuminationModel?: number;
};

export type ParsedMTL = {
  materials: {
    [materialName: string]: MTLMaterial;
  };
};

export function parseMtl(src: string) {
  const output: ParsedMTL = {
    materials: {},
  };
  let currentMaterial: MTLMaterial | undefined;

  const splitSrc = src
    .replace(/\r/g, "")
    .split("\n")
    .map((s) => s.split(" "));
  for (let line of splitSrc) {
    switch (line[0]) {
      case "newmtl":
        currentMaterial = {
          name: line[1],
        };
        output.materials[line[1]] = currentMaterial;
        break;
    }

    if (!currentMaterial) continue;

    switch (line[0]) {
      case "Ns":
        currentMaterial.specularExponent = is1long(rest2num(line));
        break;
      case "d":
        currentMaterial.dissolve = is1long(rest2num(line));
        break;
      case "illum":
        currentMaterial.illuminationModel = is1long(rest2num(line));
        break;
      case "Ka":
        currentMaterial.ambient = is3long(rest2num(line));
        break;
      case "Kd":
        currentMaterial.diffuse = is3long(rest2num(line));
        break;
      case "Ks":
        currentMaterial.specular = is3long(rest2num(line));
        break;
    }
  }

  return output;
}

export type OBJSingleObject = {
  vertices: [number, number, number][];
  normals: [number, number, number][];
  texcoords: [number, number][];
  vertexIndices: number[];
  normalIndices: number[];
  texcoordIndices: number[];
  faceMaterials: number[];
  name: string;
};
export type ParsedMultiOBJ = {
  objects: Map<string, OBJSingleObject>;
  materials: MTLMaterial[];
  materialMap: {
    [str: string]: number;
  };
};

// parse an obj composed of multiple objects (i.e. with the "o" command)
export async function parseMultiObj(
  src: string,
  objdir: string,
  load: (path: string) => Promise<string>
) {
  const output: ParsedMultiOBJ = {
    objects: new Map(),
    materials: [],
    materialMap: {},
  };
  let currentObject: OBJSingleObject | undefined = undefined;
  let currentMaterial = -1;

  const splitSrc = src
    .replace(/\r/g, "")
    .split("\n")
    .map((s) => s.split(" "));

  // read file line by line
  for (let line of splitSrc) {
    switch (line[0]) {
      case "o":
        if (output.objects.get(line[1]) !== undefined) {
          currentObject = output.objects.get(line[1]);
          break;
        }
        const newObject: OBJSingleObject = {
          vertices: [],
          normals: [],
          texcoords: [],
          vertexIndices: [],
          normalIndices: [],
          texcoordIndices: [],
          faceMaterials: [],
          name: line[1],
        };
        output.objects.set(line[1], newObject);
        currentObject = newObject;
        break;
      case "v":
        currentObject?.vertices.push(is3long(rest2num(line)));
        break;
      case "vn":
        currentObject?.normals.push(is3long(rest2num(line)));
        break;
      case "vt":
        currentObject?.texcoords.push(is2long(rest2num(line)));
        break;
      case "f":
        const coords = line
          .slice(1)
          .map((s) => s.split("/").map((s) => Number(s)));
        currentObject?.vertexIndices.push(
          coords[0][0],
          coords[1][0],
          coords[2][0]
        );
        currentObject?.texcoordIndices.push(
          coords[0][1],
          coords[1][1],
          coords[2][1]
        );
        currentObject?.normalIndices.push(
          coords[0][2],
          coords[1][2],
          coords[2][2]
        );
        currentObject?.faceMaterials.push(currentMaterial);
        break;
      case "mtllib":
        let mtls = (
          await Promise.all(
            line.slice(1).map(async (l) => load(l.replace(/\r/g, "")))
          )
        )
          .map((mtl) => mtl.toString())
          .map((mtl) => parseMtl(mtl));
        for (let mtl of mtls) {
          for (let [mtlname, mtldata] of Object.entries(mtl.materials)) {
            output.materials.push(mtldata);
            output.materialMap[mtlname] = output.materials.length - 1;
          }
        }
        break;
      case "usemtl":
        currentMaterial = output.materialMap[line[1]] ?? -1;
        break;
    }
  }
  return output;
}
