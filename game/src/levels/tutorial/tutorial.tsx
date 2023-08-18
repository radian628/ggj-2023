import { createEffect, createSignal } from "solid-js";
import { LambdaCalcEditor } from "../../editor/lambda-calc-editor.jsx";
import "../levels.css";
import {
  LevelProps,
  LevelScreenProps,
  levelWith,
  StaticLC,
} from "../common.jsx";
import { TitleScreen } from "./title-screen/title-screen.jsx";
import { compileExpr } from "../../lambda-calculus/parse.jsx";
import { eq } from "../../lambda-calculus/data-conversions.jsx";
import { ASTNode, evalLC } from "../../lambda-calculus/lambda-calculus.jsx";

// export function Tutorial(props: LevelProps) {
//   return (
//     <div class="level">
//       <TitleScreen win={() => {}}></TitleScreen>
//       <Screen1 win={() => {}}></Screen1>
//       <Screen2 win={() => {}}></Screen2>
//       <Screen3 win={() => {}}></Screen3>
//       <Screen4 win={() => {}}></Screen4>
//     </div>
//   );
// }

function Screen1(props: LevelScreenProps) {
  const [src, setSrc] = createSignal("");

  createEffect(() => {
    try {
      const compiled = compileExpr(src());
      if (compiled instanceof Map) return;
      if (eq(compiled, compileExpr("\\f x. f (f x)") as ASTNode)) props.win();
    } catch {
      return;
    }
  });

  return (
    <div class="screen">
      <div class="approximately-centered">
        <p class="important-desc">This is a lambda expression.</p>
        <StaticLC>\f x. f (f x)</StaticLC>
        <div class="big-break"></div>
        <p class="important-desc">Copy it here to continue.</p>
        <div class="small-expr">
          <LambdaCalcEditor src={src} setSrc={setSrc}></LambdaCalcEditor>
        </div>
      </div>
    </div>
  );
}

function areExprsEqual(src1: string, src2: string) {
  try {
    const compiled = compileExpr(src1);
    if (compiled instanceof Map) return false;
    const ran = evalLC(compiled);
    if (eq(ran, compileExpr(src2) as ASTNode)) return true;
  } catch {
    return false;
  }
}

function Screen2(props: LevelScreenProps) {
  const [src, setSrc] = createSignal("");

  createEffect(() => {
    if (areExprsEqual(`\\y.(${src()})`, "\\y. y y")) props.win();
  });

  return (
    <div class="screen">
      <div class="approximately-centered">
        <p class="important-desc">
          When a lambda expression (in this case{" "}
          <StaticLC intext>(\a. a a a)</StaticLC>) is followed by something (
          <StaticLC intext>b</StaticLC>), the first variable between the{" "}
          <StaticLC intext>\</StaticLC> and the <StaticLC intext>.</StaticLC>
          (in this case <StaticLC intext>a</StaticLC>) is replaced by the thing
          afterwards.
        </p>
        <div class="small-expr">
          <StaticLC inline>(\a. a a a) b</StaticLC> ={" "}
          <StaticLC inline>b b b</StaticLC>
        </div>
        <div class="big-break"></div>
        <p class="important-desc">Evaluate the expression to continue.</p>
        <div class="small-expr">
          <StaticLC inline>(\x. x x) y</StaticLC> ={" "}
          <div class="inline-expr">
            <LambdaCalcEditor src={src} setSrc={setSrc}></LambdaCalcEditor>
          </div>
        </div>
      </div>
    </div>
  );
}

function Screen3(props: LevelScreenProps) {
  const [src, setSrc] = createSignal("");

  createEffect(() => {
    if (areExprsEqual(`\\x y. (${src()})`, "\\x y. (x y y x)")) props.win();
  });

  return (
    <div class="screen">
      <div class="approximately-centered">
        <p class="important-desc">
          Lambda expressions can define multiple variables. Variables are
          replaced left-to-right. <StaticLC intext>f</StaticLC> is replaced with{" "}
          <StaticLC intext>b</StaticLC> in this case, leaving{" "}
          <StaticLC intext>x</StaticLC>.
        </p>
        <div class="small-expr">
          <StaticLC inline>(\f x. f (f x)) b</StaticLC> ={" "}
          <StaticLC inline>\x. b (b x)</StaticLC>
        </div>
        <p class="important-desc">Both variables can be replaced too.</p>
        <div class="small-expr">
          <StaticLC inline>(\f x. f (f x)) a b</StaticLC> ={" "}
          <StaticLC inline>a (a b)</StaticLC>
        </div>
        <div class="big-break"></div>
        <p class="important-desc">Evaluate the expression to continue.</p>
        <div class="small-expr">
          <StaticLC inline>(\a b. (b a) (a b)) y x</StaticLC> ={" "}
          <div class="inline-expr">
            <LambdaCalcEditor src={src} setSrc={setSrc}></LambdaCalcEditor>
          </div>
        </div>
      </div>
    </div>
  );
}

function Screen4(props: LevelScreenProps) {
  const [src, setSrc] = createSignal("");

  createEffect(() => {
    if (areExprsEqual(src(), "\\b. ((b b) (b b))")) props.win();
  });

  return (
    <div class="screen">
      <div class="approximately-centered">
        <p class="important-desc">
          Interesting things happen when we put one lambda expression inside
          another.
        </p>
        <div class="small-expr">
          <StaticLC inline>(\f x. (f x)) (\m. m m m)</StaticLC>
          <br></br> = <StaticLC inline>\x. ((\m. m m m) x)</StaticLC>
          <br></br> = <StaticLC inline>\x. x x x</StaticLC>
        </div>
        <div class="big-break"></div>
        <p class="important-desc">
          Evaluate the expression to continue. Be sure that your solution is
          fully evaluated.
        </p>
        <div class="small-expr">
          <StaticLC inline>(\a b. (a b) (a b)) (\m. m m)</StaticLC> ={" "}
          <div class="inline-expr">
            <LambdaCalcEditor src={src} setSrc={setSrc}></LambdaCalcEditor>
          </div>
        </div>
      </div>
    </div>
  );
}

function Screen5(props: LevelScreenProps) {
  return (
    <div class="screen">
      <div class="approximately-centered">
        <p class="important-desc">
          This simple system may seem like a trivial novelty. A little tool that
          can do little more than replace <em>things</em> with other{" "}
          <em>things</em>.
        </p>
        <div class="big-break"></div>
        <p class="important-desc">
          But in fact, this simple system&mdash; known as Lambda Calculus&mdash;
          can compute <em>everything</em> that can be computed.
        </p>
        <div class="big-break"></div>
        <p class="important-desc">So where shall we begin computing?</p>
      </div>
    </div>
  );
}

export const Tutorial = levelWith(
  TitleScreen,
  Screen1,
  Screen2,
  Screen3,
  Screen4,
  Screen5
);
