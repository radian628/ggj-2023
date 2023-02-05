import { useState } from "react";
import { CodeEditor, Colorized } from "../lambda-calculus/CodeEditor";
import { getSExprTree } from "../lambda-calculus/debug-output";
import { betaReduce } from "../lambda-calculus/interpreter";
import { ASTNode, curry, lex, parse } from "../lambda-calculus/parser";

import "./Sandbox.css";

export function removeUndefinedProperties<T>(
  obj: T,
  recursive?: boolean
): { [K in keyof T]: Exclude<T[K], undefined> } {
  //@ts-ignore
  let newobj = {};
  for (let prop in obj) {
    //@ts-ignore
    if (obj[prop] != null) newobj[prop] = obj[prop];

    if (
      recursive &&
      typeof obj[prop] == "object" &&
      obj[prop]?.constructor.name == "Object"
    )
      //@ts-ignore
      obj[prop] = removeUndefinedProperties(obj[prop], recursive);

    //@ts-ignore
    if (newobj[prop] === undefined) delete newobj[prop];
  }
  //@ts-ignore
  return newobj;
}

export function Sandbox() {
  const [code, setCode] = useState("((\\ x y z (x (y z))) a b c)");

  const parsedCode = parse(lex(code));

  let codeSucceeded = false;
  let betaReductionSteps: ASTNode[] = [];

  if (parsedCode.success) {
    const curried = curry(parsedCode.data);
    if (curried.success) {
      codeSucceeded = true;
      let doneBetaReducing = false;
      let code = curried.data;
      while (!doneBetaReducing) {
        const betaReduceResult = betaReduce(code);
        code = betaReduceResult.node;
        betaReductionSteps.push(code);
        doneBetaReducing = betaReduceResult.done;
      }
    }
  }

  betaReductionSteps.pop();

  return (
    <div className="lc-sandbox">
      <div className="lc-sandbox-pull-up">^</div>
      <CodeEditor
        className="lc-input lc-sandbox-input"
        val={code}
        setVal={setCode}
      ></CodeEditor>
      <ul className="lc-sandbox-eval-list">
        {betaReductionSteps.map((brs, i) => (
          <li className="lc-sandbox-beta-reduction-line">
            = <Colorized key={i}>{getSExprTree(brs)}</Colorized>
          </li>
        ))}
      </ul>
    </div>
  );
}
