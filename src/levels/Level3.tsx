import { useState } from "react";
import { CodeEditor, Colorized } from "../lambda-calculus/CodeEditor";
import { lex, parse } from "../lambda-calculus/parser";
import { LCIOPair, lcUnsafeEval, lcUnsafeNormalize } from "./Level2";

export function Level3(props: { onComplete: () => void }) {
  const [code, setCode] = useState("?");

  let q = `((\\ m n ((m m) n)) a (x y))`;
  let a = lcUnsafeEval(q);

  let completed = a == lcUnsafeNormalize(code);

  if (completed) props.onComplete();

  return (
    <section
      className={completed ? "game-page completed-game-page" : "game-page"}
    >
      <div className="spacer"></div>
      <LCIOPair>((\ p q (p q)) x y)</LCIOPair>
      <LCIOPair>((\ x y z (x (y z))) a b c)</LCIOPair>
      <div className="lc-example">
        <Colorized>{q}</Colorized> ={" "}
        <CodeEditor val={code} setVal={setCode}></CodeEditor>
      </div>
      <div className="game-page-continue">▼</div>
    </section>
  );
}
