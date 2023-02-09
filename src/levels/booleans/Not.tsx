import { useState } from "react";
import { getNum } from "../../lambda-calculus/church-numerals";
import { CodeEditor, Colorized } from "../../lambda-calculus/CodeEditor";
import { getSExprTree } from "../../lambda-calculus/debug-output";
import { alphaReduce, betaReduce } from "../../lambda-calculus/interpreter";
import { ASTNode, curry, lex, parse } from "../../lambda-calculus/parser";
import { LCIOPair, lcUnsafeEval, lcUnsafeNormalize } from "../basics/Basics1";
import { tryEval } from "../numbers/Successor";

export function evalBoolean(node: ASTNode) {
  if (typeof node == "string") return undefined;
  if (node[0] != "\\") return undefined;
  const var1 = node[1];
  const lambda2 = node[2];
  if (lambda2[0] != "\\") return undefined;
  const var2 = lambda2[1];

  const choice = lambda2[2];
  if (choice == var1) return true;
  if (choice == var2) return false;
  return undefined;
}

function testNot(notCode: ASTNode) {
  const exprs = [
    { expr: [notCode, ["\\", "t", ["\\", "f", "t"]]], intendedResult: false },
    { expr: [notCode, ["\\", "t", ["\\", "f", "f"]]], intendedResult: true },
  ];
  for (const { expr, intendedResult } of exprs) {
    const evaluatedExpr = tryEval(expr);
    if (!evaluatedExpr.success) return false;
    if (evalBoolean(evaluatedExpr.data) !== intendedResult) return false;
  }
  return true;
}

export function Not(props: { onComplete: () => void }) {
  const [code, setCode] = useState("?");

  const parsed = parse(lex(code));

  let completed = false;

  if (parsed.success) {
    const curried = curry(parsed.data);
    if (curried.success) {
      completed = testNot(curried.data);
    }
  }

  if (completed) props.onComplete();

  return (
    <section
      className={completed ? "game-page completed-game-page" : "game-page"}
    >
      <div className="spacer"></div>
      <div className="lc-example">
        <Colorized>TRUE = (\ t f t)</Colorized>
      </div>
      <div className="lc-example">
        <Colorized>FALSE = (\ t f f)</Colorized>
      </div>
      <div className="lc-example">
        <Colorized>(NOT FALSE) = (NOT (\ t f f)) = (\ t f t) = TRUE</Colorized>
      </div>
      <div className="lc-example">
        <Colorized>(NOT TRUE) = (NOT (\ t f t)) = (\ t f f) = FALSE</Colorized>
      </div>
      <div className="lc-example">
        NOT = <CodeEditor val={code} setVal={setCode}></CodeEditor>
      </div>
    </section>
  );
}
