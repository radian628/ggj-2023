import { CompilerError } from "./lambda-calculus-compiler.js";

export type Result<Ok, Err> =
  | {
      type: "success";
      value: Ok;
    }
  | {
      type: "failure";
      error: Err;
    };

export type CompilerResult<T> = Result<T, CompilerError[]>;

export function map1<Ok, Err, Ok2>(
  r: Result<Ok, Err>,
  f: (ok: Ok) => Ok2
): Result<Ok2, Err> {
  if (r.type === "success") {
    return {
      type: "success",
      value: f(r.value),
    };
  }
  return r;
}

export function cerrMap2<T, U>(
  a: CompilerResult<T>,
  b: CompilerResult<T>,
  f: (a: T, b: T) => U
): CompilerResult<U> {
  if (a.type === "success" && b.type === "success") {
    return {
      type: "success",
      value: f(a.value, b.value),
    };
  }

  return {
    type: "failure",
    error: (a.type == "failure" ? a.error : []).concat(
      b.type === "failure" ? b.error : []
    ),
  };
}

export function splitResultList<Ok, Err>(rl: Result<Ok, Err>[]): [Ok[], Err[]] {
  return [
    rl.flatMap((r) => (r.type === "success" ? [r.value] : [])),
    rl.flatMap((r) => (r.type === "failure" ? [r.error] : [])),
  ];
}
