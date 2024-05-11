import * as compiler from "./lambda-calculus-compiler.js";
import test from "ava";
import { betaReduceUntilDone } from "./lambda-calculus-compiler.js";
import {
  programToASTTraditional,
  termToASTTraditional,
} from "./parsers/traditional.js";

test("simple lambda calc parse", (t) => {
  const parseResult = compiler.parseLambdaCalculus(
    "\\x. x",
    termToASTTraditional
  );
  t.deepEqual(parseResult, {
    type: "success",
    term: {
      type: "abstraction",
      varName: "x",
      body: {
        type: "variable",
        name: "x",
        index: 0,
      },
    },
  });
});

test("two as church numeral", (t) => {
  const parseResult = compiler.parseLambdaCalculus(
    "\\f. \\x. f (f x)",
    termToASTTraditional
  );
  t.deepEqual(parseResult, {
    type: "success",
    term: {
      type: "abstraction",
      varName: "f",
      body: {
        type: "abstraction",
        varName: "x",
        body: {
          type: "application",
          left: {
            type: "variable",
            name: "f",
            index: 1,
          },
          right: {
            type: "application",
            left: {
              type: "variable",
              name: "f",
              index: 1,
            },
            right: {
              type: "variable",
              name: "x",
              index: 0,
            },
          },
        },
      },
    },
  });
});

test("succ 0 = 1", (t) => {
  const parseResult = compiler.parseLambdaCalculus(
    "(\\n. \\f. \\x. f (n f x)) (\\f. \\x. x)",
    termToASTTraditional
  );

  t.assert(parseResult.type === "success");
  if (parseResult.type === "success") {
    const runResult = compiler.resolveAllThunks(
      betaReduceUntilDone(parseResult.term)
    );
    t.deepEqual(compiler.parseChurchNumeral(runResult), 1);
  }
});

test("add 2 2 = 4", (t) => {
  const parseResult = compiler.parseLambdaCalculus(
    `
      (\\m. \\n. \\f1. \\x1. m f1 (n f1 x1))
      (\\f2. \\x2. f2 (f2 x2))
      (\\f3. \\x3. f3 (f3 x3))
    `,
    termToASTTraditional
  );

  t.assert(parseResult.type === "success");
  if (parseResult.type === "success") {
    const runResult = compiler.betaReduceUntilDone(parseResult.term);
    t.deepEqual(compiler.parseChurchNumeral(runResult), 4);
  }
});

test("mul 3 3 = 9", (t) => {
  const parseResult = compiler.parseLambdaCalculus(
    `
(\\succ.
 \\three.
  (\\add.
    (\\mul.
      (mul three three)
    )
    (\\a. \\b. \\f2. \\x2. a (add b) (\\f3. \\x3. x3) f2 x2) 
  )
  (\\m1. \\n1. \\f1. \\x1. m1 f1 (n1 f1 x1)) 
)
(\\n. \\f. \\x. f (n f x))
(\\f. \\x. f (f (f x)))
    `,
    termToASTTraditional
  );

  t.assert(parseResult.type === "success");
  if (parseResult.type === "success") {
    const runResult = compiler.betaReduceUntilDone(parseResult.term);
    t.deepEqual(compiler.parseChurchNumeral(runResult), 9);
  }
});

test("parse program", (t) => {
  const result = compiler.parseProgram(
    `
0 = \\f. \\x. x
succ = \\n. \\f. \\x. f (n f x)

1 = succ 0
2 = succ 1
  `,
    programToASTTraditional
  );

  t.assert(result.type === "success");

  if (result.type === "success") {
    // console.log(
    //   compiler.printTerm(compiler.betaReduceUntilDone(result.value.get("2")!))
    // );
    t.deepEqual(
      compiler.parseChurchNumeral(
        compiler.betaReduceUntilDone(result.value.get("2")!)
      ),
      2
    );
  }
});

test("mul 3 3 = 9 but with separate statements", (t) => {
  const result = compiler.parseProgram(
    `
0 = \\f. \\x. x
succ = \\n. \\f. \\x. f (n f x)

1 = succ 0
2 = succ 1
3 = succ 2

add = \\m. \\n. \\f. \\x. m f (n f x)

mul = \\m. \\n. \\f. \\x. m (add n) 0 f x

main = mul 3 3
  `,
    programToASTTraditional
  );

  t.assert(result.type === "success");

  if (result.type === "success") {
    t.deepEqual(
      compiler.parseChurchNumeral(
        compiler.betaReduceUntilDone(result.value.get("main")!)
      ),
      9
    );
  }
});
// test("recursion", t => {
//   const parseResult = compiler.parseLambdaCalculus(
//     `
// (\\Y.
//  \\succ.

// )
// (\\f. (\\x. f (x x)) (\\x. f (x x)))
// (\\n. \\f. \\x. f (n f x))
//     `
//   )
// })
