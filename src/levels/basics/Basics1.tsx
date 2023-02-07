import { useState } from "react";
import { getNum } from "../../lambda-calculus/church-numerals";
import { CodeEditor, Colorized } from "../../lambda-calculus/CodeEditor";
import { getSExprTree } from "../../lambda-calculus/debug-output";
import { alphaReduce, betaReduce } from "../../lambda-calculus/interpreter";
import { curry, lex, parse } from "../../lambda-calculus/parser";
import { ClickToShow } from "../../reusable-components/ClickToShow";

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
      {<Colorized>{props.children}</Colorized>} ={" "}
      {<Colorized>{lcUnsafeEval(props.children)}</Colorized>}
    </div>
  );
}

export function Basics1(props: { onComplete: () => void }) {
  const [code, setCode] = useState("?");

  const parsedCode = parse(lex(code));

  let q = `((\\ a (a (a a))) (x y))`;
  let a = lcUnsafeEval(q);

  let completed = a == lcUnsafeNormalize(code);

  if (completed) props.onComplete();

  return (
    <section
      className={completed ? "game-page completed-game-page" : "game-page"}
    >
      <div className="spacer"></div>
      <p className="note">Each line is entirely self-contained.</p>
      <LCIOPair>((\ a a) b)</LCIOPair>
      <LCIOPair>((\ a (a a)) b)</LCIOPair>
      <LCIOPair>((\ a (a a)) (p q))</LCIOPair>
      <ClickToShow text="See More Examples">
        <LCIOPair>((\ a ((a a) a)) x)</LCIOPair>
        <LCIOPair>((\ a ((a a) (a (a a)))) y)</LCIOPair>
      </ClickToShow>
      <div className="lc-example">
        <Colorized>{q}</Colorized> ={" "}
        <CodeEditor val={code} setVal={setCode}></CodeEditor>
      </div>
      <div className="show-on-continue">
        <p className="note">
          Expressions that begin with backslashes are known as{" "}
          <em>lambda expressions.</em>
        </p>
      </div>
      <div className="game-page-continue">▼</div>
    </section>
  );
}
