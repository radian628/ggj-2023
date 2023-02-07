import { useState } from "react";
import { getNum } from "../../lambda-calculus/church-numerals";
import { CodeEditor, Colorized } from "../../lambda-calculus/CodeEditor";
import { curry, lex, parse } from "../../lambda-calculus/parser";

export function Numbers(props: { onComplete: () => void }) {
  const [code, setCode] = useState("?");

  const parsedCode = parse(lex(code));

  let completed = false;

  if (parsedCode.success) {
    const curried = curry(parsedCode.data);
    if (curried.success) {
      completed = getNum(curried.data) == 3;
    }
  }

  if (completed) {
    props.onComplete();
  }

  return (
    <section
      className={completed ? "game-page completed-game-page" : "game-page"}
    >
      <div className="spacer"></div>
      <div className="lc-example">
        <Colorized>(\ f x x) = 0</Colorized>
      </div>
      <div className="lc-example">
        <Colorized>(\ f x (f x)) = 1</Colorized>
      </div>
      <div className="lc-example">
        <Colorized>(\ f x (f (f x))) = 2</Colorized>
      </div>
      {/* <p className="note">Note: Variable names are arbitrary.</p>
      <div className="lc-example">
        <Colorized>(\ f x (f x)) = (\ a b (a b)) = (\ m n (m n)) = 1</Colorized>
      </div> */}
      <div className="lc-example">
        <CodeEditor val={code} setVal={setCode}></CodeEditor> = 3
      </div>
      <div className="show-on-continue">
        <p className="note">
          Tip: Variable names are arbitrary. Structure is all that matters.
        </p>
        <div className="lc-example">
          <Colorized>
            (\ f x (f (f x))) = (\ a b (a (a b))) = (\ m n (m (m n))) = 2
          </Colorized>
        </div>
      </div>
      <div className="game-page-continue">▼</div>
    </section>
  );
}
