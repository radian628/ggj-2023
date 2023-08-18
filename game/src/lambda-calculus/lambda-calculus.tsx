import { fakeRecursiveFunction } from "../recursion.jsx";

export type LambdaNode = {
  type: "lambda";
  body: ASTNode;
  debugName: string;
};

export function lambda(body: ASTNode, debugName: string): LambdaNode {
  return { type: "lambda", body, debugName };
}

export type PairNode = {
  type: "pair";
  left: ASTNode;
  right: ASTNode;
};

export function pair(left: ASTNode, right: ASTNode): PairNode {
  return { type: "pair", left, right };
}

export type VarNode = {
  type: "var";
  index: number;
};

export function variable(index: number): VarNode {
  return { type: "var", index };
}

export type ThunkNode = {
  type: "thunk";
  shiftOnEval: number;
  inner: ASTNode;
  shared: {
    asNormal?: ASTNode;
    asCbn?: ASTNode;
  };
};

export function thunk(
  inner: ASTNode,
  shared: { asNormal?: ASTNode; asCbn?: ASTNode }
): ThunkNode {
  return { type: "thunk", inner, shared, shiftOnEval: 1 };
}

export type ASTNode = LambdaNode | PairNode | VarNode | ThunkNode;

const shift = fakeRecursiveFunction<
  {
    expr: ASTNode;
    depth: number;
    shiftAmount: number;
  },
  ASTNode
>(function* ({ expr, depth, shiftAmount }) {
  switch (expr.type) {
    case "thunk":
      expr.shiftOnEval += shiftAmount;
      return expr;
    case "lambda":
      return lambda(
        yield { expr: expr.body, depth: depth + 1, shiftAmount },
        expr.debugName
      );
    case "pair":
      return pair(
        yield { expr: expr.left, depth, shiftAmount },
        yield { expr: expr.right, depth, shiftAmount }
      );
    case "var":
      return expr.index >= depth ? variable(expr.index + shiftAmount) : expr;
  }
});

const subst = fakeRecursiveFunction<
  {
    expr: ASTNode;
    depth: number;
    replacement: () => ASTNode;
  },
  ASTNode
>(function* ({ expr, depth, replacement }) {
  switch (expr.type) {
    case "thunk":
      return expr;
    case "lambda":
      return lambda(
        yield { expr: expr.body, depth: depth + 1, replacement },
        expr.debugName
      );
    case "pair":
      return pair(
        yield { expr: expr.left, depth, replacement },
        yield { expr: expr.right, depth, replacement }
      );
    case "var":
      return depth == expr.index
        ? shift({ expr: replacement(), depth, shiftAmount: depth })
        : expr;
  }
});

function substituteExpr(lambda: LambdaNode, replacement: ASTNode) {
  let thunkShared = {};
  return shift({
    expr: subst({
      expr: lambda.body,
      depth: 0,
      replacement: () => {
        return thunk(replacement, thunkShared);
      },
    }),
    depth: 0,
    shiftAmount: -1,
  });
}

export const normalEval = fakeRecursiveFunction<ASTNode, ASTNode>(function* (
  e
) {
  switch (e.type) {
    case "lambda":
      return lambda(yield e.body, e.debugName);
    case "pair":
      let leftEval = callByNameEval(e.left);
      switch (leftEval.type) {
        case "lambda":
          return yield substituteExpr(leftEval, e.right);
        default:
          return pair(leftEval, yield e.right);
      }
    case "var":
      return e;
    case "thunk":
      if (!e.shared.asNormal) {
        e.shared.asNormal = yield e.inner;
      }
      return shift({
        expr: e.shared.asNormal,
        depth: 0,
        shiftAmount: e.shiftOnEval,
      });
  }
});

export const callByNameEval = fakeRecursiveFunction<ASTNode, ASTNode>(
  function* (e) {
    switch (e.type) {
      case "lambda":
        return e;
      case "pair":
        let leftEval = yield e.left;
        switch (leftEval.type) {
          case "lambda":
            return yield substituteExpr(leftEval, e.right);
          default:
            return pair(leftEval, e.right);
        }
      case "var":
        return e;
      case "thunk":
        if (!e.shared.asCbn) {
          e.shared.asCbn = yield e.inner;
        }
        return shift({
          expr: e.shared.asCbn,
          depth: 0,
          shiftAmount: e.shiftOnEval,
        });
    }
  }
);

export const expandRemainingThunks = fakeRecursiveFunction<ASTNode, ASTNode>(
  function* (e) {
    if (e.type == "lambda") return lambda(yield e.body, e.debugName);
    if (e.type == "pair") return pair(yield e.left, yield e.right);
    if (e.type == "var") return e;
    return e.inner;
  }
);

export function evalLC(ast: ASTNode): ASTNode {
  return expandRemainingThunks(normalEval(ast));
}

export function printAST(node: ASTNode, numbers?: boolean) {
  return fakeRecursiveFunction<[ASTNode, string[]], string>(function* ([
    e,
    stack,
  ]) {
    switch (e.type) {
      case "lambda":
        return `\\${e.debugName}. ${yield [e.body, [e.debugName, ...stack]]}`;
      case "pair":
        return `(${yield [e.left, stack]} ${yield [e.right, stack]})`;
      case "var":
        return numbers ? e.index.toString() : stack[e.index];
      case "thunk":
        return `[thunk]`;
    }
  })([node, [] as string[]]);
}

export function betterPrintAST(node: ASTNode) {
  return fakeRecursiveFunction<[ASTNode, string[], boolean], string>(
    function* ([e, stack, parens]) {
      switch (e.type) {
        case "lambda":
          let body: ASTNode = e;
          let varlist: string[] = [];
          while (body.type == "lambda") {
            varlist.push(body.debugName);
            body = body.body;
          }

          return `\\${varlist.join(" ")}. ${yield [
            body,
            [...varlist.slice().reverse(), ...stack],
            true,
          ]}`;
        case "pair":
          let terms: PairNode[] = [];
          let left: ASTNode = e;
          while (left.type == "pair") {
            terms.push(left);
            left = left.left;
          }
          let evaluatedTerms: string[] = [];
          for (const t of terms) {
            evaluatedTerms.push(yield [t.right, stack, true]);
          }
          evaluatedTerms.push(yield [left, stack, true]);
          return `${parens ? "(" : ""}${evaluatedTerms.reverse().join(" ")}${
            parens ? ")" : ""
          }`;
        case "var":
          return stack[e.index];
        case "thunk":
          return `[thunk]`;
      }
    }
  )([node, [] as string[], false]);
}
