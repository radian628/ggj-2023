import * as compiler from "./lambda-calculus-compiler.js";
import test from "ava";
import { betaReduceUntilDone } from "./lambda-calculus-compiler.js";

test("simple lambda calc parse", (t) => {
  const parseResult = compiler.parseLambdaCalculus("\\x. x");
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
  const parseResult = compiler.parseLambdaCalculus("\\f. \\x. f (f x)");
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
    "(\\n. \\f. \\x. f (n f x)) (\\f. \\x. x)"
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
    `
  );

  t.assert(parseResult.type === "success");
  if (parseResult.type === "success") {
    const runResult = compiler.betaReduceUntilDone(parseResult.term);
    t.deepEqual(compiler.parseChurchNumeral(runResult), 4);
  }
});

test("mul 3 3 = 9", (t) => {
  const parseResult = compiler.parseLambdaCalculus(
    // `
    //   (\\succ.
    //     (\\add.
    //       (\\mul.
    //         (\\three.
    //           mul three three
    //         )
    //         (\\f. \\x. f (f (f x)))
    //       )
    //       (\\m. \\n. \\f. \\x. (m f x) add (n f x))
    //     )
    //     (\\m. \\n. \\f. \\x. (m f x) succ (n f x))
    //   )
    //   (\\n. \\f. \\x. f (n f x))
    // `

    // okay, I've figured out what's going on here:
    // the LHS is being evaluated, decreasing the effective
    // di brujin index by 1, and yet I don't change the indices
    // `
    //   (\\succ.
    //     (
    //       (\\three.
    //         (succ three)
    //       )
    //       (\\f. \\x. f (f (f x)))
    //     )
    //   )
    //   (\\n. \\f. \\x. f (n f x))
    // `

    `
      (\\succ.
       \\three.
         succ three
      )
      (\\n. \\f. \\x. f (n f x))
      (\\f. \\x. f (f (f x)))
    `
  );

  t.assert(parseResult.type === "success");
  if (parseResult.type === "success") {
    const runResult = compiler.betaReduceUntilDone(parseResult.term);
    compiler.globalLog.push(compiler.printTerm(runResult));
    console.log(compiler.globalLog);
    t.deepEqual(compiler.parseChurchNumeral(runResult), 9);
  }
});
