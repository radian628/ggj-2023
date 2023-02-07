import { useState } from "react";
import { getNum } from "../../lambda-calculus/church-numerals";
import { CodeEditor, Colorized } from "../../lambda-calculus/CodeEditor";
import { getSExprTree } from "../../lambda-calculus/debug-output";
import { alphaReduce, betaReduce } from "../../lambda-calculus/interpreter";
import { ASTNode, curry, lex, parse } from "../../lambda-calculus/parser";
import { LCIOPair, lcUnsafeEval, lcUnsafeNormalize } from "../basics/Basics1";
import { tryEval } from "../numbers/Successor";
import { evalBoolean } from "./Not";

const TRUE = ["\\", "t", ["\\", "f", "t"]];
const FALSE = ["\\", "t", ["\\", "f", "f"]];

function testXor(andCode: ASTNode) {
  const exprs = [
    { expr: [andCode, FALSE, FALSE], intendedResult: false },
    { expr: [andCode, TRUE, FALSE], intendedResult: true },
    { expr: [andCode, FALSE, TRUE], intendedResult: true },
    { expr: [andCode, TRUE, TRUE], intendedResult: false },
  ];
  for (const { expr, intendedResult } of exprs) {
    const evaluatedExpr = tryEval(expr);
    if (!evaluatedExpr.success) return false;
    if (evalBoolean(evaluatedExpr.data) !== intendedResult) return false;
  }
  return true;
}

export function Xor(props: { onComplete: () => void }) {
  const [code, setCode] = useState("?");

  const parsed = parse(lex(code));

  let completed = false;

  if (parsed.success) {
    const curried = curry(parsed.data);
    if (curried.success) {
      completed = testXor(curried.data);
    }
  }

  if (completed) props.onComplete();

  return (
    <section
      className={completed ? "game-page completed-game-page" : "game-page"}
    >
      <div className="spacer"></div>
      <div className="lc-example">XOR FALSE FALSE = FALSE</div>
      <div className="lc-example">XOR FALSE TRUE = TRUE</div>
      <div className="lc-example">XOR TRUE FALSE = TRUE</div>
      <div className="lc-example">XOR TRUE TRUE = FALSE</div>
      <div className="lc-example">
        XOR = <CodeEditor val={code} setVal={setCode}></CodeEditor>
      </div>
    </section>
  );
}
