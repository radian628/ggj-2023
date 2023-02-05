import { ASTNode } from "./parser";

export function getNum(node: ASTNode) {
  if (typeof node == "string") return undefined;
  if (node[0] != "\\") return undefined;
  const var1 = node[1];
  const lambda2 = node[2];
  if (lambda2[0] != "\\") return undefined;
  const var2 = lambda2[1];

  let numExpr = lambda2[2];
  let num = 0;

  while (Array.isArray(numExpr)) {
    if (numExpr[0] != var1) return undefined;
    numExpr = numExpr[1];
    num++;
  }
  if (numExpr != var2) return undefined;
  return num;
}
