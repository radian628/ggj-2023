import {
  TokenPosition,
  alt_sc,
  apply,
  buildLexer,
  expectEOF,
  expectSingleResult,
  kmid,
  lrec,
  lrec_sc,
  rep_sc,
  rule,
  seq,
  tok,
} from "typescript-parsec";
import { fakeRecursiveFunction } from "./recursion.js";
import { CompilerResult, cerrMap2, map1, splitResultList } from "./result.js";
import { programToASTTraditional } from "./parsers/traditional.js";

export type Statement =
  | {
      type: "import";
      file: string;
      pos: TokenPosition;
    }
  | {
      type: "definition";
      name: string;
      value: Term;
    };

export type PartialParseProgram = (
  | {
      type: "import";
      import: string;
    }
  | {
      type: "definition";
      name: string;
      value: PartialParsedTerm;
    }
)[];

export type Program = Statement[];

export type RunnableProgram = Map<string, Term>;

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
  | {
      type: "unbound-variable";
      name: string;
      pos: TokenPosition;
    };

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
        type: "unbound-variable",
        name: term.name,
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
    case "unbound-variable":
      return {
        type: "failure",
        errors: [
          {
            type: "error",
            why: `Variable '${term.name}' not bound.`,
            pos: term.pos,
          },
        ],
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

export function parseLambdaCalculus(
  input: string,
  syntaxToAST: (input: string) => PartialParsedTerm
) {
  return separateOutErrors(addDiBrujinIndices(syntaxToAST(input)));
}

export function substituteVariables(
  term: ErrorableTerm,
  getSubstitution: (name: string) => CompilerResult<Term> | undefined,
  encounteredSoFar: Set<string>
): CompilerResult<Term> {
  switch (term.type) {
    case "variable":
      return {
        type: "success",
        value: term,
      };
    case "abstraction":
      const body = substituteVariables(
        term.body,
        getSubstitution,
        encounteredSoFar
      );
      return map1(body, (body) => ({
        ...term,
        body,
      }));
    case "application":
      const left = substituteVariables(
        term.left,
        getSubstitution,
        encounteredSoFar
      );
      const right = substituteVariables(
        term.right,
        getSubstitution,
        encounteredSoFar
      );
      return cerrMap2(left, right, (left, right) => ({
        type: "application",
        left,
        right,
      }));
    case "unbound-variable":
      const newEncounteredSoFar = new Set(encounteredSoFar);
      if (newEncounteredSoFar.has(term.name)) {
        return {
          type: "failure",
          error: [
            {
              why: `recursion found in definition '${term.name}'`,
              type: "error",
              pos: term.pos,
            },
          ],
        };
      }
      const sub = getSubstitution(term.name);
      if (sub) return sub;
      return {
        type: "failure",
        error: [
          {
            why: `variable '${term.name}' does not exist`,
            type: "error",
            pos: term.pos,
          },
        ],
      };
  }
}

export function parseProgram(
  input: string,
  syntaxToAST: (input: string) => PartialParseProgram
): CompilerResult<RunnableProgram> {
  // try to parse input
  const parsed = syntaxToAST(input);

  const boundVariablesMap = new Map(
    parsed
      .map((e) =>
        e.type == "definition"
          ? [[e.name, addDiBrujinIndices(e.value)] as const]
          : []
      )
      .flat(1)
  );
  const linkedBoundVariablesMap = new Map<string, CompilerResult<Term>>();

  function getSubstitution(name: string): CompilerResult<Term> | undefined {
    const linkedBoundVar = linkedBoundVariablesMap.get(name);
    if (linkedBoundVar) return linkedBoundVar;
    const boundVar = boundVariablesMap.get(name);
    if (!boundVar) return undefined;
    const sub = substituteVariables(boundVar, getSubstitution, new Set());
    linkedBoundVariablesMap.set(name, sub);
    return sub;
  }

  // create substitutions for all variables
  for (const [name, term] of boundVariablesMap) {
    if (linkedBoundVariablesMap.has(name)) continue;
    const substitution = substituteVariables(term, getSubstitution, new Set());
    linkedBoundVariablesMap.set(name, substitution);
  }

  const [statements, errors] = splitResultList(
    [...linkedBoundVariablesMap.entries()].map(
      ([name, result]): CompilerResult<{
        name: string;
        value: Term;
      }> => {
        if (result.type === "success") {
          return {
            type: "success",
            value: { name, value: result.value },
          };
        }
        return result;
      }
    )
  );

  if (errors.length > 0)
    return {
      type: "failure",
      error: [...new Set(errors.flat(1))],
    };

  return {
    type: "success",
    value: new Map(statements.map((stmt) => [stmt.name, stmt.value] as const)),
  };
}

export function mergeRunnablePrograms(...progs: RunnableProgram[]) {
  const newProg: RunnableProgram = new Map();
  for (const prog of progs) {
    for (const [k, v] of prog) {
      newProg.set(k, v);
    }
  }
  return newProg;
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
