import { useState } from "react";
import { CodeEditor, Colorized } from "../../lambda-calculus/CodeEditor";
import { lex, parse } from "../../lambda-calculus/parser";
import { LCIOPair, lcUnsafeEval, lcUnsafeNormalize } from "./Basics1";

export function Basics3(props: { onComplete: () => void }) {
  const [code, setCode] = useState("?");

  let q = `((\\ m n ((m n) n)) (\\ a b (a b)) (x y))`;
  let a = lcUnsafeEval(q);

  let completed = a == lcUnsafeNormalize(code);

  if (completed) props.onComplete();

  return (
    <section
      className={completed ? "game-page completed-game-page" : "game-page"}
    >
      <div className="spacer"></div>
      <p className="note">
        Note: You may want a sheet of paper or a text editor.
      </p>
      <LCIOPair>((\ a (a b)) (\ x (x x)))</LCIOPair>
      <LCIOPair>((\ a b (a b)) (\ x (x x)) (y y))</LCIOPair>
      <div className="lc-example">
        <Colorized>{q}</Colorized> ={" "}
        <CodeEditor val={code} setVal={setCode}></CodeEditor>
      </div>
      <div className="show-on-continue">
        <p className="note">
          Sandbox unlocked! Check the bottom of your screen.
        </p>
      </div>
      <div className="game-page-continue">▼</div>
    </section>
  );
}
