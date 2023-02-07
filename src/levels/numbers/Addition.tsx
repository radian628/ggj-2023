import { useState } from "react";
import { getNum } from "../../lambda-calculus/church-numerals";
import { CodeEditor, Colorized } from "../../lambda-calculus/CodeEditor";
import { getSExprTree } from "../../lambda-calculus/debug-output";
import { alphaReduce, betaReduce } from "../../lambda-calculus/interpreter";
import { ASTNode, curry, lex, parse } from "../../lambda-calculus/parser";
import { LCIOPair, lcUnsafeEval, lcUnsafeNormalize } from "../basics/Basics1";
import { createNumber, tryEval } from "./Successor";

export function testAdd(addCode: ASTNode) {
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const num1 = createNumber(i);
      const num2 = createNumber(j);
      const expr = [[addCode, num1], num2];
      const evaluatedExpr = tryEval(expr);
      if (evaluatedExpr.success) {
        // console.log(
        //   getSExprTree(num),
        //   getSExprTree(expr),
        //   getSExprTree(evaluatedExpr.data)
        // );
        if (getNum(evaluatedExpr.data) != i + j) return false;
      } else {
        return false;
      }
    }
  }
  return true;
}

export function Addition(props: { onComplete: () => void }) {
  const [code, setCode] = useState("?");

  const parsed = parse(lex(code));

  let completed = false;

  if (parsed.success) {
    const curried = curry(parsed.data);
    if (curried.success) {
      completed = testAdd(curried.data);
    }
  }

  if (completed) props.onComplete();

  return (
    <section
      className={completed ? "game-page completed-game-page" : "game-page"}
    >
      <div className="spacer"></div>
      <div className="lc-example">ADD m n = m + n</div>
      <p className="note">For example...</p>
      <div className="lc-example">
        <Colorized>(ADD (\ f x (f x)) (\ f x (f x)))</Colorized> ={" "}
        <Colorized>(\ f x (f (f x)))</Colorized>
      </div>
      <div className="lc-example">
        <Colorized>(ADD (\ a b (a (a b))) (\ a b (a (a (a b)))))</Colorized> ={" "}
        <Colorized>(\ a b (a (a (a (a (a b))))))</Colorized>
      </div>
      <div className="lc-example">
        ADD = <CodeEditor val={code} setVal={setCode}></CodeEditor>
      </div>
      <div className="game-page-continue">▼</div>
    </section>
  );
}
