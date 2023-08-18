import { ASTNode, lambda, pair, variable } from "./lambda-calculus.jsx";

export function numberToLambdaExpr(num: number) {
  function helper(num: number): ASTNode {
    if (num == 0) return variable(0);
    return pair(variable(1), helper(num - 1));
  }
  return lambda(lambda(helper(num), "x"), "f");
}

export function numberArrayToLambdaExpr(numArr: number[]): ASTNode {
  if (numArr.length == 0) return lambda(lambda(variable(1), "c"), "n");
  return lambda(
    lambda(
      pair(
        pair(variable(0), numberToLambdaExpr(numArr[0])),
        numberArrayToLambdaExpr(numArr.slice(1))
      ),
      "c"
    ),
    "n"
  );
}

export function lambdaExprToEnumVariant(e: ASTNode): number | undefined {
  let expr = e;
  let variants = 0;
  while (expr.type == "lambda") {
    expr = expr.body;
    variants++;
  }

  if (expr.type != "var") return undefined;

  return variants - expr.index - 1;
}

export function eq(a: ASTNode, b: ASTNode): boolean {
  switch (a.type) {
    case "lambda":
      if (a.type != b.type) return false;
      return eq(a.body, b.body);
    case "pair":
      if (a.type != b.type) return false;
      return eq(a.left, b.left) && eq(a.right, b.right);
    case "var":
      if (a.type != b.type) return false;
      return a.index == b.index;
    case "thunk":
      return false;
  }
}
