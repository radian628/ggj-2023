import { useState } from "react";
import { getNum } from "../lambda-calculus/church-numerals";
import { CodeEditor } from "../lambda-calculus/CodeEditor";
import { curry, lex, parse } from "../lambda-calculus/parser";

export function Level1() {
  const [code, setCode] = useState("?");

  const parsedCode = parse(lex(code));

  let completed = false;

  if (parsedCode.success) {
    const curried = curry(parsedCode.data);
    if (curried.success) {
      completed = getNum(curried.data) == 3;
      console.log(parsedCode.data, curried);
    }
  }

  return (
    <section
      className={completed ? "game-page completed-game-page" : "game-page"}
    >
      <div className="spacer"></div>
      <div className="lc-example">(\ f x x) = 0</div>
      <div className="lc-example">(\ f x (f x)) = 1</div>
      <div className="lc-example">(\ f x (f (f x))) = 2</div>
      <div className="lc-example">
        <CodeEditor val={code} setVal={setCode}></CodeEditor> = 3
      </div>
      <div className="game-page-continue">▼</div>
    </section>
  );
}
