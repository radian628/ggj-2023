import { useState } from "react";
import { getNum } from "../lambda-calculus/church-numerals";
import { CodeEditor, Colorized } from "../lambda-calculus/CodeEditor";
import { getSExprTree } from "../lambda-calculus/debug-output";
import { alphaReduce, betaReduce } from "../lambda-calculus/interpreter";
import { ASTNode, curry, lex, parse } from "../lambda-calculus/parser";
import { LCIOPair, lcUnsafeEval, lcUnsafeNormalize } from "./Level2";

export function tryEval(
  node: ASTNode
): { success: true; data: ASTNode } | { success: false } {
  const curried = curry(node);
  if (!curried.success) return { success: false };
  let node2 = alphaReduce(curried.data);
  console.log(getSExprTree(node2));
  let done = false;
  while (!done) {
    const betaResult = betaReduce(node2);
    console.log(getSExprTree(betaResult.node));
    node2 = betaResult.node;
    done = betaResult.done;
  }
  return { success: true, data: node2 };
}

export function createNumber(n: number): ASTNode {
  let lambdaBody: ASTNode = "x";
  for (let i = 0; i < n; i++) {
    lambdaBody = ["f", lambdaBody];
  }
  return ["\\", "f", ["\\", "x", lambdaBody]];
}

export function testSuccessor(successorCode: ASTNode) {
  for (let i = 0; i < 100; i++) {
    const num = createNumber(i);
    const expr = [successorCode, num];
    const evaluatedExpr = tryEval(expr);
    if (evaluatedExpr.success) {
      // console.log(
      //   getSExprTree(num),
      //   getSExprTree(expr),
      //   getSExprTree(evaluatedExpr.data)
      // );
      if (getNum(evaluatedExpr.data) != i + 1) return false;
    } else {
      return false;
    }
  }
  return true;
}

export function Level5(props: { onComplete: () => void }) {
  const [code, setCode] = useState("?");

  const parsed = parse(lex(code));

  let completed = false;

  if (parsed.success) {
    const curried = curry(parsed.data);
    if (curried.success) {
      completed = testSuccessor(curried.data);
    }
  }

  if (completed) props.onComplete();

  return (
    <section
      className={completed ? "game-page completed-game-page" : "game-page"}
    >
      <div className="spacer"></div>
      <div className="lc-example">SUCC n = n + 1</div>
      <p className="note">For example, SUCC 1 = 2. Or, in other words...</p>
      <div className="lc-example">
        <Colorized>(SUCC (\ f x (f x)))</Colorized> ={" "}
        <Colorized>(\ f x (f (f x)))</Colorized>
      </div>
      <div className="lc-example">
        SUCC = <CodeEditor val={code} setVal={setCode}></CodeEditor>
      </div>
      <p className="note">Hint:</p>
      <div className="lc-example">
        <Colorized>((\ a b c (a b c)) (\ f x (f (f x))))</Colorized> ={" "}
        <Colorized>(\ b c (b (b c)))</Colorized>
      </div>
      <div className="game-page-continue">▼</div>
    </section>
  );
}
