import { useState } from "react";
import { getNum } from "../lambda-calculus/church-numerals";
import { CodeEditor } from "../lambda-calculus/CodeEditor";
import { getSExprTree } from "../lambda-calculus/debug-output";
import { alphaReduce, betaReduce } from "../lambda-calculus/interpreter";
import { curry, lex, parse } from "../lambda-calculus/parser";

export function lcUnsafeEval(str: string): string {
  const parsed = parse(lex(str));
  if (!parsed.success) return "";
  const curried = curry(parsed.data);
  if (!curried.success) return "";
  let done = false;
  let lc = alphaReduce(curried.data);
  while (!done) {
    const result = betaReduce(lc);
    lc = result.node;
    done = result.done;
  }
  return getSExprTree(lc);
}

export function lcUnsafeNormalize(str: string): string {
  const parsed = parse(lex(str));
  if (!parsed.success) return "";
  const curried = curry(parsed.data);
  if (!curried.success) return "";
  let lc = alphaReduce(curried.data);
  return getSExprTree(lc);
}

export function LCIOPair(props: { children: string }) {
  return (
    <div className="lc-example">
      {props.children} = {lcUnsafeEval(props.children)}
    </div>
  );
}

export function Level2() {
  const [code, setCode] = useState("?");

  const parsedCode = parse(lex(code));

  let q = `((\\ p q (p (q q))) x y)`;
  let a = lcUnsafeEval(q);
  console.log(a);

  let completed = a == lcUnsafeNormalize(code);

  return (
    <section
      className={completed ? "game-page completed-game-page" : "game-page"}
    >
      <div className="spacer"></div>
      <LCIOPair>((\ a a) b)</LCIOPair>
      <LCIOPair>((\ a (a a)) b)</LCIOPair>
      <LCIOPair>((\ a (a a)) (p q))</LCIOPair>
      <LCIOPair>((\ x y z (x (y z))) a b c)</LCIOPair>
      <div className="lc-example">
        {q} = <CodeEditor val={code} setVal={setCode}></CodeEditor>
      </div>
      <div className="game-page-continue">▼</div>
    </section>
  );
}
