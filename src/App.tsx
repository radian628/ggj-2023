import { useState } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";
import { ASTNode, curry, lex, parse } from "./lambda-calculus/parser";
import { alphaReduce, betaReduce } from "./lambda-calculus/interpreter";
import { getSExprTree } from "./lambda-calculus/debug-output";
import { getNum } from "./lambda-calculus/church-numerals";
import { CodeEditor } from "./lambda-calculus/CodeEditor";
import { Numbers } from "./levels/numbers/Numbers";
import { lcUnsafeEval } from "./levels/basics/Basics1";
import { Basics2 } from "./levels/basics/Basics2";
import { Basics3 } from "./levels/basics/Basics3";
import { Successor } from "./levels/numbers/Successor";
import { Addition } from "./levels/numbers/Addition";
import { Sandbox } from "./sandbox/Sandbox";
import { Multiplication } from "./levels/numbers/Multiplication";
import { levelsOrder } from "./levels/LevelsOrder";

const TEST1 = `(\\ f x (f (f (\\ a b c (f x)))))`;
const TEST2 = `(a b c d)`;

const TEST3 = `((\\ n f x (f (n f x))) (\\ f x (f (f x))))`;
// should resolve to:
// (\ f x (f (f (f x))))

const ADDFN = `(\\ m n f x (m f (n f x)))`;

const MULFN = `(\\ m n f x (m (n f) x))`;

const EXPFN = `(\\ m n (n m))`;

const TESTADD = `(${EXPFN} (\\ a b (a (a b))) (\\ a b (a (a (a b)))))`;

const ANOTHERTEST = `((\\ a b (a b)) (\\ x (x x)) (y y))`;

let parsedResult = parse(lex(ANOTHERTEST));

// if (parsedResult.success) {
//   console.log("sexpr test: ", getSExprTree(parsedResult.data));
//   let p = alphaReduce(curry(parsedResult.data));
//   console.log("curried output", getSExprTree(p));
//   let done = false;
//   let i = 0;
//   while (!done) {
//     i++;
//     let betaReduceResult = betaReduce(p);
//     p = betaReduceResult.node;
//     done = betaReduceResult.done;
//     console.log(`beta reduction ${i}:`, getSExprTree(p));
//   }

//   console.log("calcualted number: ", getNum(p));
// }

function App() {
  const [unlocked, setUnlocked] = useState(1);

  const advance = (thisLevel: number) => () =>
    setUnlocked(Math.max(unlocked, thisLevel + 1));

  //@ts-ignore
  window.forceAdvance = (n: number) => setUnlocked(n);

  return (
    <div className="App">
      <section className="title-page">
        <h1>λ</h1>
        <span className="subtitle">The Roots of Computation</span>
        <span className="subsubtitle">A game about Lambda Calculus</span>
      </section>
      {levelsOrder.map((Lv, i) =>
        unlocked >= i + 1 ? (
          <Lv key={i} onComplete={advance(i + 1)}></Lv>
        ) : undefined
      )}
      {/* <Level1 onComplete={advance(1)}></Level1>
      {unlocked >= 2 && <Level2 onComplete={advance(2)}></Level2>}
      {unlocked >= 3 && <Level3 onComplete={advance(3)}></Level3>}
      {unlocked >= 4 && <Level4 onComplete={advance(4)}></Level4>}
      {unlocked >= 5 && <Level5 onComplete={advance(5)}></Level5>}
      {unlocked >= 6 && <Level6 onComplete={advance(6)}></Level6>}
      {unlocked >= 7 && <Level7 onComplete={advance(7)}></Level7>}

       */}
      {unlocked >= 5 && <Sandbox></Sandbox>}
    </div>
  );
}

export default App;
