import "./index.css";
import { render } from "solid-js/web";
import { fakeRecursiveFunction } from "./recursion.jsx";
import {
  ASTNode,
  betterPrintAST,
  evalLC,
  lambda,
  normalEval,
  pair,
  printAST,
  variable,
} from "./lambda-calculus/lambda-calculus.jsx";
import { compile, compileExpr, lex } from "./lambda-calculus/parse.jsx";
import { numberArrayToLambdaExpr } from "./lambda-calculus/data-conversions.jsx";
import { LambdaCalcEditor } from "./editor/lambda-calc-editor.jsx";
import { createEffect, createSignal } from "solid-js";
import { Logo } from "./levels/tutorial/title-screen/logo.jsx";
import { TitleScreen } from "./levels/tutorial/title-screen/title-screen.jsx";
import { Tutorial } from "./levels/tutorial/tutorial.jsx";

function num(x: number): string {
  const helper = fakeRecursiveFunction<number, string>(function* (x: number) {
    if (x == 0) return "x";
    if (x == 1) return "f x";
    return `f (${yield x - 1})`;
  });

  return `(\\f x.${helper(x)})`;
}

const oldCode = `

true := \\ t f. t
false := \\ t f. f

and := \\ p q. p q p
or := \\ p q. p p q
not := \\p.p false true
if_else := \\p a b.p a b

succ := \\ m f x . f (m f x)
add := \\ m n f x . n f (m f x)
pred := \\ n f x.n (\\ g h. h (g f)) (\\u.x) (\\u.u)
sub := \\ m n. n pred m

is_zero := \\n.n (\\x. false) true

eq := \\a b. and (is_zero (sub a b)) (is_zero (sub b a))

0 := \\f x. x
1 := succ 0
2 := succ 1
3 := succ 2

some := \\x s n. s x
none := \\s n. n

unwrap_or := \\x y. (x (\\z. z) y)

nil := \\n c. n
cons := \\h t n c. c h t
head := \\l. l none (\\x y. some x)

is64 := \\x. (if_else (eq ${num(
  64
)} (unwrap_or (head x) 0)) (\\a b c. c) (\\a b c. a))


out_old := unwrap_or (head (cons 3 2)) 0

~readerDELIM
  is64
DELIM
  \\x. 3
DELIM

out := (add @) @

`;

const fastSubTest = `
  true := \\ t f. t
  false := \\ t f. f
  
  and := \\ p q. p q p
  or := \\ p q. p p q
  not := \\p.p false true
  if_else := \\p a b.p a b

  0 := \\f x. x
  fix := \\f. (\\x. x x) (\\x. f (x x))
  pair := \\x y p. p x y
  zeros := fix (pair 0)
  succ := \\n f x. f (n f x)
  add := \\m n f x. m f (n f x)

  head := \\h t. h
  tail := \\h t. t

  sub := \\n m. m (\\s. s tail) (n (\\s. pair (succ (s head)) s) zeros) head
  
  is_zero := \\n.n (\\x. false) true

  eq := \\a b. (and (is_zero (sub a b)) (is_zero (sub b a)))
  
  some := \\x s n. s x
  none := \\s n. n

  unwrap_or := \\x y. (x (\\z. z) y)

  nil := \\n c. n
  cons := \\h t n c. c h t
  list_head := \\l. l none (\\x y. some x)

  is64 := \\x. (if_else (eq ${num(
    64
  )} (unwrap_or (list_head x) 0)) (\\a b c. c) (\\a b c. a))



  out := sub ${num(3)} ${num(2)}
`;

// init().then(() => {
//   init_elc();
//   test_compile_lc(fastSubTest);
// });

render(() => {
  const [src, setSrc] = createSignal("out := \\f x. f (f (f x))");

  createEffect(() => {
    console.log(src());
  });

  return (
    <>
      <Tutorial
        unlocked={1}
        win={() => {
          console.log("level win");
        }}
      ></Tutorial>
    </>
  );
}, document.body);

//Reader code:
/*

  ~readerDELIM
    is64
  DELIM
    \\x. ${num(3)}
  DELIM

*/

/*

single element list: \\n c. c head tail

true := \ t f. t
false := \ t f. f

and := \ p q. p q p

and true true
= \ p q. p q p \t f. t \t f. t
= ((\t f. t \t f. t) \t f. t)
= ((\ f. \t f. t) \t f. t)
= (\t f. t)

and true true
= \p q. p q p \t f. t \t f. t
= \q.  \t f. t  q  \t f. t  \t f. t
= \q.  \f. q \t f. t \t f. t
= \q. q  \t f. t
= \t f. t

and true true
= \p q. p q p \t f. t \t f. t
= \q.  ((\t f. t  q)  \t f. t)  \t f. t
= \q.  ((\f. q) \t f. t) \t f. t
= (\f. \t2 f2. t2)  \t f. t 
= \t2 f2. t2

*/

const add = lambda(
  lambda(
    lambda(
      lambda(
        pair(
          pair(variable(3), variable(1)),
          pair(pair(variable(2), variable(1)), variable(0))
        ),
        "x"
      ),
      "f"
    ),
    "n"
  ),
  "m"
);

const lambdaCalcNumber = function (x: number) {
  const n = (i: number): ASTNode =>
    i == x ? variable(0) : pair(variable(1), n(i + 1));

  return lambda(lambda(n(0), "x"), "f");
};

const expr = pair(pair(add, lambdaCalcNumber(1)), lambdaCalcNumber(2));

console.log("before:", printAST(expr));

console.log("after:", printAST(normalEval(expr)));

const simpleAddTest = `
1 := \\f x. (f x)
2 := \\f x. (f (f x))        

out := (\\m n f x. (m f (n f x))) 1 2
`;

const simpleSubTest = `

0 := \\f x. x
fix := \\f. (\\x. x x) (\\x. f (x x))
pair := \\x y p. p x y
zeros := fix (pair 0)
succ := \\n f x. f (n f x)
add := \\m n f x. m f (n f x)

head := \\h t. h
tail := \\h t. t

sub := \\n m. m (\\s. s tail) (n (\\s. pair (succ (s head)) s) zeros) head


true := \\ t f. t
false := \\ t f. f

and := \\ p q. p q p
or := \\ p q. p p q
not := \\p.p false true
if_else := \\p a b.p a b


is_zero := \\n.n (\\x. false) true

eq := \\a b. (and (is_zero (sub a b)) (is_zero (sub b a)))

some := \\x s n. s x
none := \\s n. n

unwrap_or := \\x y. (x (\\z. z) y)

nil := \\n c. n
cons := \\h t n c. c h t
list_head := \\l. l none (\\x y. some x)

is64 := \\x. (if_else (eq ${num(
  64
)} (unwrap_or (list_head x) 0)) (\\a b c. c) (\\a b c. a))

~READER delim
  is64
delim
  \\a. (${num(3)})
delim

out := add @ @
`;

const test2 = `out := (\\m n f x. m f (n f x)) (\\f x. f (f (f x))) \\f x. f (f (f x))`;

let time = Date.now();
const testAST = (
  compile(simpleSubTest, {
    assignments: new Map(),
    readers: [],
  }) as Map<string, ASTNode>
).get("out") as ASTNode;

console.log("before eval:", betterPrintAST(testAST));

console.log("after eval: ", betterPrintAST(normalEval(testAST)));

/*

~READER delim
  is64
delim
  \\a. (${num(3)})
delim

*/
