import {
  TokenPosition,
  alt_sc,
  apply,
  buildLexer,
  kmid,
  rule,
  seq,
  tok,
} from "typescript-parsec";

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
      depthOffset: number;
      inner: Term;
      reducedForm: { ref?: Term };
    };

enum TokenKind {
  Lambda,
  Dot,
  VariableName,
  LParen,
  RParen,
}

const lexer = buildLexer([
  [true, /^(\\|λ)/g, TokenKind.Lambda],
  [true, /^\./g, TokenKind.Dot],
  [true, /\w+/g, TokenKind.VariableName],
  [true, /\(/g, TokenKind.LParen],
  [true, /\)/g, TokenKind.RParen],
]);

const PRIMARY_TERM = rule<TokenKind, PartialParsedTerm>();
const APPLICATION = rule<TokenKind, PartialParsedTerm>();
const TERM = rule<TokenKind, PartialParsedTerm>();

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
    apply(seq(PRIMARY_TERM, TERM), ([left, right]) => ({
      type: "application",
      left,
      right,
    })),
    PRIMARY_TERM
  )
);

TERM.setPattern(
  alt_sc(
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
    ),
    APPLICATION
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
        term: body.term,
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

export function betaReduce(body: Term, substitution: Term) {
  const callStack: { term: Term; index: number; step: 0 }[] = [
    {
      term: body,
      index: 0,
      step: 0,
    },
  ];
  const outputTermStack: Term[] = [];

  const reducedForm = {};

  while (callStack.length > 0) {
    const { term, index, step } = callStack[callStack.length - 1];

    switch (term.type) {
      case "variable":
        if (index == term.index) {
          outputTermStack.push({
            type: "thunk",
            depthOffset: index,
            reducedForm,
            inner: substitution,
          });
        } else {
          outputTermStack.push(term);
        }
        callStack.pop();
        break;
      case "application":
        if (step == 0) {
          callStack.push({
            term: term.left,
            index,
            step: 0,
          });
          callStack.push({
            term: term.right,
            index,
            step: 0,
          });
          callStack[callStack.length - 1].step++;
        } else {
          const right = outputTermStack.pop()!;
          const left = outputTermStack.pop()!;
          outputTermStack.push({
            type: "application",
            left,
            right,
          });
          callStack.pop();
        }
        break;
      case "abstraction":
        if (step == 0) {
          callStack.push({
            term: term.body,
            index: index + 1,
            step: 0,
          });
          callStack[callStack.length - 1].step++;
        } else {
          const body = outputTermStack.pop()!;
          outputTermStack.push({
            type: "abstraction",
            body,
            varName: term.varName,
          });
          callStack.pop();
        }
        break;
      case "thunk":
        if (term.reducedForm.ref) {
          outputTermStack.push(term.reducedForm.ref);
        } else {
          outputTermStack.push({
            type,
          });
        }
    }
  }
}
