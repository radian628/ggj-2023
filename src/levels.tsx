import React from "react";
import { DepsgraphNode } from "./dependency-graph.js";

const tutorial: DepsgraphNode = {
  name: "Tutorial",
  key: "tutorial",
  testProgram: (prog) => {
    // TODO: finish test
    return true;
  },
  prereqs: [],
  include: [],
  description: () => (
    <>
      <p>Welcome to the Roots of Computation!</p>
      <p>
        The definitions for <code>0</code>, <code>1</code>, <code>2</code>, and{" "}
        <code>3</code> are provided.
      </p>
      <p>
        Add definitions for <code>4</code> and <code>5</code> to continue.
      </p>
    </>
  ),
  defaultCode: `0 = \\f. \\x. x
1 = \\f. \\x. f x
2 = \\f. \\x. f (f x)
3 = \\f. \\x. f (f (f x))`,
};

const lambdaCalculus1: DepsgraphNode = {
  name: "Lambda Calculus",
  key: "lambda-calculus-1",
  testExpression: () => true,
  prereqs: [tutorial],
  include: [],
  description: () => (
    <>
      {/* <p>Lambda calculus has three basic types of expressions:</p>
      <ul>
        <li>
          <dfn>Variables</dfn> &mdash; For example <code>x</code>
        </li>
        <li>
          <dfn>Abstraction</dfn>, or function definition, or simply lambdas
          &mdash; for example <code>\f. f</code>
          <ul>
            <li>
              The thing between the <code>\</code> and the <code>.</code> is the{" "}
              <dfn>parameter</dfn> of the abstraction.
            </li>
            <li>
              The thing afterwards is the <dfn>body</dfn> of the abstraction.
            </li>
          </ul>
        </li>
        <li>
          <dfn>Application</dfn>, or a function call &mdash; for example{" "}
          <code>f x</code>
          <ul>
            <li>
              Applications have a <dfn>left</dfn> and a <dfn>right</dfn> side.
            </li>
            <li>
              In the example above, <code>f</code> is the left and{" "}
              <code>x</code> is the right.
            </li>
          </ul>
        </li>
      </ul>
      <p>
        There is only <em>one</em> rule to evaluating a lambda calculus
        expression: If an abstraction appears on the left-hand side of an
        application, replace the entire expression with the body of the
        abstraction. Then, replace all instances of the abstraction's variable
        with whatever was on the right hand side of the application.
      </p>
      <p>Sound like a mouthful? Here's a few examples.</p> */}
      <ul>
        <li>
          <code>(\f. f) abc</code> evaluates to <code>abc</code>
        </li>
        <li>
          <code>(\g. (g g)) xyz</code> evaluates to <code>(xyz xyz)</code>
        </li>
        <li>
          <code>(\h. (h (h h))) q</code> evaluates to <code>(q (q q))</code>
        </li>
      </ul>
      <p>
        What does <code>\f. ((f f) (f f)) n</code> evaluate to?
      </p>
    </>
  ),
};

const nestedLambdas: DepsgraphNode = {
  name: "Nested Lambdas",
  key: "nested-lambdas",
  testExpression: () => true,
  prereqs: [lambdaCalculus1],
  include: [],
  description: () => (
    <>
      <p>
        You can nest expressions in lambda calculus to allow abstractions to
        take multiple parameters. For instance, to evaluate{" "}
        <code>((\f. (\x. f (f x))) a) b</code>:
      </p>
      <ol>
        <li>
          <code>((\f. (\x. f (f x))) a) b</code> reduces to
        </li>
        <li>
          <code>(\x. a (a x)) b</code> which reduces to
        </li>
        <li>
          <code>a (a b)</code>
        </li>
      </ol>
      <p>
        Note that because <code>a b c</code> can be rewritten as{" "}
        <code>(a b) c</code> and because nested abstractions don't need
        parentheses, this example could be rewritten{" "}
        <aside>
          <code>(\f. \x. f (f x)) a b</code>
        </aside>
      </p>
    </>
  ),
};

const lambdasIntoLambdas: DepsgraphNode = {
  name: "Lambdas into Lambdas",
  key: "lambdas-into-lambdas",
  testExpression: () => true,
  prereqs: [nestedLambdas],
  include: [],
  description: () => (
    <>
      <p>
        The same rule as before applies when you pass a lambda into another
        lambda.
      </p>
      <p>
        What does <code>(\f. \g. (f g)) (\x. x) a</code> evaluate to?
      </p>
    </>
  ),
};
