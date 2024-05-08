import {
  TokenPosition,
  alt_sc,
  apply,
  buildLexer,
  expectEOF,
  expectSingleResult,
  kmid,
  lrec_sc,
  rule,
  seq,
  tok,
} from "typescript-parsec";
import { fakeRecursiveFunction } from "./recursion.js";

export type TextRange = {
  start: number;
  end: number;
};

export type PartialParsedTerm =
  | {
      type: "variable";
      name: string;
      pos: TokenPosition;
    }
  | {
      type: "abstraction";
      varName: string;
      body: PartialParsedTerm;
    }
  | {
      type: "application";
      left: PartialParsedTerm;
      right: PartialParsedTerm;
    };

export type ErrorableTerm =
  | {
      type: "variable";
      name: string;
      index: number;
    }
  | {
      type: "abstraction";
      varName: string;
      body: ErrorableTerm;
    }
  | {
      type: "application";
      left: ErrorableTerm;
      right: ErrorableTerm;
    }
  | CompilerError;

export type CompilerError = {
  type: "error";
  why: string;
  pos: TokenPosition;
};

// lambda calculus terms
export type Term =
  | {
      type: "variable";
      name: string;
      index: number;
    }
  | {
      type: "abstraction";
      varName: string;
      body: Term;
    }
  | {
      type: "application";
      left: Term;
      right: Term;
    }
  | {
      type: "thunk";
      inner: Term;
      reducedForm: { ref?: Term };
    };

enum TokenKind {
  Lambda,
  Dot,
  VariableName,
  LParen,
  RParen,
  Space,
}

const lexer = buildLexer([
  [true, /^(\\|λ)/g, TokenKind.Lambda],
  [true, /^\./g, TokenKind.Dot],
  [true, /^\w+/g, TokenKind.VariableName],
  [true, /^\(/g, TokenKind.LParen],
  [true, /^\)/g, TokenKind.RParen],
  [false, /^\s+/g, TokenKind.Space],
]);

const PRIMARY_TERM = rule<TokenKind, PartialParsedTerm>();
const APPLICATION = rule<TokenKind, PartialParsedTerm>();
const TERM = rule<TokenKind, PartialParsedTerm>();
const ONLY_ABSTRACTION = rule<TokenKind, PartialParsedTerm>();

PRIMARY_TERM.setPattern(
  alt_sc(
    kmid(tok(TokenKind.LParen), TERM, tok(TokenKind.RParen)),
    apply(tok(TokenKind.VariableName), (t) => ({
      name: t.text,
      type: "variable",
      pos: t.pos,
    }))
  )
);

APPLICATION.setPattern(
  alt_sc(
    lrec_sc(PRIMARY_TERM, PRIMARY_TERM, (left, right) => ({
      type: "application",
      left,
      right,
    })),
    PRIMARY_TERM
  )
);

TERM.setPattern(alt_sc(ONLY_ABSTRACTION, APPLICATION));

ONLY_ABSTRACTION.setPattern(
  apply(
    seq(
      tok(TokenKind.Lambda),
      tok(TokenKind.VariableName),
      tok(TokenKind.Dot),
      TERM
    ),
    ([_, varName, __, term]) => ({
      type: "abstraction",
      varName: varName.text,
      body: term,
    })
  )
);

export function addDiBrujinIndices(
  term: PartialParsedTerm,
  varStack: string[] = []
): ErrorableTerm {
  switch (term.type) {
    case "abstraction":
      return {
        type: "abstraction",
        varName: term.varName,
        body: addDiBrujinIndices(term.body, varStack.concat(term.varName)),
      };
    case "application":
      return {
        type: "application",
        left: addDiBrujinIndices(term.left, varStack),
        right: addDiBrujinIndices(term.right, varStack),
      };
    case "variable":
      for (let i = 0; i < varStack.length; i++) {
        const arrayIndex = varStack.length - i - 1;
        if (term.name == varStack[arrayIndex]) {
          return {
            type: "variable",
            name: term.name,
            index: i,
          };
        }
      }
      return {
        type: "error",
        why: `variable '${term.name}' not bound`,
        pos: term.pos,
      };
  }
}

export function parseChurchNumeral(term: Term) {
  if (term.type !== "abstraction") return;

  term = term.body;

  if (term.type !== "abstraction") return;

  term = term.body;

  let counter = 0;
  while (true) {
    if (term.type === "variable") {
      if (term.index === 0) {
        return counter;
      } else {
        return undefined;
      }
    } else if (term.type === "application") {
      if (term.left.type !== "variable" || term.left.index !== 1)
        return undefined;
      counter++;
      term = term.right;
    } else {
      return undefined;
    }
  }
}

export function separateOutErrors(term: ErrorableTerm):
  | {
      type: "success";
      term: Term;
    }
  | {
      type: "failure";
      errors: CompilerError[];
    } {
  switch (term.type) {
    case "error":
      return {
        type: "failure",
        errors: [term],
      };
    case "variable":
      return {
        type: "success",
        term,
      };
    case "abstraction":
      const body = separateOutErrors(term.body);

      if (body.type === "failure") return body;

      return {
        type: "success",
        term: {
          type: "abstraction",
          body: body.term,
          varName: term.varName,
        },
      };
    case "application":
      const left = separateOutErrors(term.left);
      const right = separateOutErrors(term.right);
      const errors = [
        ...(left.type === "failure" ? left.errors : []),
        ...(right.type === "failure" ? right.errors : []),
      ];

      if (left.type === "failure" || right.type === "failure")
        return {
          type: "failure",
          errors,
        };

      return {
        type: "success",
        term: {
          type: "application",
          left: left.term,
          right: right.term,
        },
      };
  }
}

export function parseLambdaCalculus(input: string) {
  const parsed = expectSingleResult(expectEOF(TERM.parse(lexer.parse(input))));
  return separateOutErrors(addDiBrujinIndices(parsed));
}

export function printTerm(term: Term): string {
  switch (term.type) {
    case "variable":
      return term.name;
    case "abstraction":
      return `(\\${term.varName}. ${printTerm(term.body)})`;
    case "application":
      return `(${printTerm(term.left)} ${printTerm(term.right)})`;
    case "thunk":
      return `(#THUNK: ${printTerm(term.inner)})`;
  }
}

export function resolveAllThunks(term: Term): Term {
  switch (term.type) {
    case "variable":
      return term;
    case "abstraction":
      return {
        ...term,
        body: resolveAllThunks(term.body),
      };
    case "application":
      return {
        ...term,
        left: resolveAllThunks(term.left),
        right: resolveAllThunks(term.right),
      };
    case "thunk":
      return resolveAllThunks(term.inner);
  }
}

export function betaReduceUntilDone(body: Term) {
  let done = false;
  while (!done) {
    const result = betaReduce(body);
    done = result.done;
    body = result.term;
  }
  return body;
}

export function betaReduceUntilDoneShowAllSteps(body: Term) {
  let done = false;
  const steps = [body];
  while (!done) {
    const result = betaReduce(body);
    done = result.done;
    body = result.term;
    steps.push(body);
  }
  return steps;
}

export let globalLog: any[] = [];

type BetaReduceInnerProps =
  | {
      type: "reduce";
      term: Term;
      isOutermost?: true;
    }
  | {
      type: "substitute";
      term: Term;
      index: number;
      substitution: Term;
    }
  | {
      type: "evaluate-thunk";
      term: Term;
    };

let betaReductionDone = true;
function betaReduce(term: Term) {
  betaReductionDone = true;
  const result = betaReduceInner({
    type: "reduce",
    term,
    isOutermost: true,
  });
  return {
    done: betaReductionDone,
    term: result,
  };
}

// horrible janky mess to avoid needing to use recursion
export const betaReduceInner = fakeRecursiveFunction<
  BetaReduceInnerProps,
  Term
>(function* (props): Generator<BetaReduceInnerProps, Term, Term> {
  // beta-reduce (outermost leftmost)
  if (props.type === "reduce") {
    const { term } = props;
    switch (term.type) {
      case "variable":
        return term;
      case "application":
        const left = yield { type: "evaluate-thunk", term: term.left };
        if (left.type === "abstraction") {
          betaReductionDone = false;
          return yield {
            type: "substitute",
            term: left.body,
            index: 0,
            substitution: {
              type: "thunk",
              reducedForm: {},
              inner: term.right,
            },
          };
        } else {
          return {
            type: "application",
            left: yield { type: "reduce", term: term.left },
            right: yield { type: "reduce", term: term.right },
          };
        }
      case "abstraction":
        if (!props.isOutermost) {
          return term;
        }
        return {
          type: "abstraction",
          body: yield { type: "reduce", term: term.body, isOutermost: true },
          varName: term.varName,
        };
      case "thunk":
        return yield { type: "evaluate-thunk", term };
    }

    // variable substitution
  } else if (props.type === "substitute") {
    const { term, index, substitution } = props;
    switch (term.type) {
      case "variable":
        if (term.index === index) {
          return substitution;
        }
        return term;
      case "application":
        return {
          type: "application",
          left: yield {
            type: "substitute",
            term: term.left,
            index,
            substitution,
          },
          right: yield {
            type: "substitute",
            term: term.right,
            index,
            substitution,
          },
        };
      case "abstraction":
        return {
          type: "abstraction",
          body: yield {
            type: "substitute",
            term: term.body,
            index: index + 1,
            substitution,
          },
          varName: term.varName,
        };
      case "thunk":
        return yield {
          type: "substitute",
          term: yield { type: "evaluate-thunk", term },
          index,
          substitution,
        };
    }

    // evaluate thunks
  } else {
    const { term } = props;
    if (term.type === "thunk") {
      if (!term.reducedForm.ref) {
        term.reducedForm.ref = yield { type: "reduce", term: term.inner };
      }
      return yield { type: "evaluate-thunk", term: term.reducedForm.ref };
    }
    return term;
  }
});

// export const substitute = fakeRecursiveFunction<[Term, number, Term], Term>(
//   function* ([term, index, substitution]) {
//     switch (term.type) {
//       case "variable":
//         if (term.index === index) {
//           return substitution;
//         }
//         return term;
//       case "application":
//         return {
//           type: "application",
//           left: yield [term.left, index, substitution],
//           right: yield [term.right, index, substitution],
//         };
//       case "abstraction":
//         return {
//           type: "abstraction",
//           body: yield [term.body, index + 1, substitution],
//         };
//       case "thunk":
//     }
//   }
// );

// export function betaReduce(body: Term): {
//   term: Term;
//   done: boolean;
// } {
//   globalLog.push(printTerm(body));
//   const callStack: {
//     term: Term;
//     substitutions: Map<
//       number,
//       {
//         term: Term;
//         reducedForm: { ref?: Term };
//       }
//     >;
//     step: 0;
//     evaluateApplications: boolean;
//     evaluateThunk?: true;
//   }[] = [
//     {
//       term: body,
//       substitutions: new Map(),
//       step: 0,
//       evaluateApplications: true,
//     },
//   ];
//   const outputTermStack: Term[] = [];
//   let i = 0;
//   let done = true;
//   while (callStack.length > 0) {
//     i++;
//     const { term, step, substitutions, evaluateThunk, evaluateApplications } =
//       callStack[callStack.length - 1];

//     switch (term.type) {
//       case "variable":
//         if (term.name === "succ") {
//           globalLog.push(
//             "succ",
//             term,
//             step,
//             callStack.map((cs) => cs.substitutions)
//           );
//         }
//         const sub = substitutions.get(term.index);
//         if (sub) {
//           outputTermStack.push({
//             type: "thunk",
//             reducedForm: sub.reducedForm,
//             inner: sub.term,
//           });
//         } else {
//           outputTermStack.push(term);
//         }
//         callStack.pop();
//         break;
//       case "application":
//         if (step == 0) {
//           callStack[callStack.length - 1].step++;
//           callStack.push({
//             term: term.left,
//             substitutions,
//             step: 0,
//             evaluateThunk: true,
//             evaluateApplications,
//           });
//           callStack.push({
//             term: term.right,
//             substitutions,
//             step: 0,
//             evaluateApplications,
//           });
//         } else if (step == 1) {
//           const left = outputTermStack.pop()!;
//           const right = outputTermStack.pop()!;
//           if (evaluateApplications && left.type === "abstraction") {
//             globalLog.push("applying abstraction", left.varName);
//             // this is something we can beta reduce
//             done = false;
//             callStack.pop();
//             callStack.push({
//               term: left.body,
//               substitutions: new Map([
//                 ...[...substitutions].map(
//                   ([k, v]) =>
//                     [k + 1, v] as [
//                       number,
//                       {
//                         term: Term;
//                         reducedForm: { ref?: Term };
//                       }
//                     ]
//                 ),
//                 [
//                   0,
//                   {
//                     term: right,
//                     reducedForm: {},
//                   },
//                 ],
//               ]),
//               step: 0,
//               evaluateApplications,
//             });
//           } else {
//             outputTermStack.push({
//               type: "application",
//               left,
//               right,
//             });
//             callStack.pop();
//           }
//         }
//         break;
//       case "abstraction":
//         if (step == 0) {
//           callStack[callStack.length - 1].step++;
//           callStack.push({
//             term: term.body,
//             substitutions: new Map(
//               [...substitutions].map(([k, v]) => [k + 1, v])
//             ),
//             step: 0,
//             evaluateApplications,
//           });
//         } else {
//           const body = outputTermStack.pop()!;
//           outputTermStack.push({
//             type: "abstraction",
//             body,
//             varName: term.varName,
//           });
//           callStack.pop();
//         }
//         break;
//       case "thunk":
//         if (term.reducedForm.ref) {
//           outputTermStack.push(term.reducedForm.ref);
//           callStack.pop();
//         } else {
//           if (step == 0) {
//             callStack[callStack.length - 1].step++;
//             callStack.push({
//               term: term.inner,
//               substitutions,
//               step: 0,
//               evaluateApplications,
//             });
//           } else {
//             term.reducedForm.ref = outputTermStack.pop();
//           }
//         }
//     }
//   }

//   const term = outputTermStack.pop();

//   if (!term) {
//     throw new Error("output term stack should not be empty");
//   }

//   return {
//     term,
//     done,
//   };
// }
