/*
Parser for traditional lambda calculus syntax.
*/

import {
  alt_sc,
  apply,
  buildLexer,
  expectEOF,
  expectSingleResult,
  kmid,
  lrec,
  rep_sc,
  rule,
  seq,
  tok,
} from "typescript-parsec";
import { PartialParsedTerm } from "../lambda-calculus-compiler.js";

enum TokenKind {
  Import,
  String,
  Lambda,
  Dot,
  VariableName,
  LParen,
  RParen,
  Space,
  Equals,
}

const lexer = buildLexer([
  [true, /^import/g, TokenKind.Import],
  [true, /^"[^"]*"/g, TokenKind.String],
  [true, /^(\\|λ)/g, TokenKind.Lambda],
  [true, /^\./g, TokenKind.Dot],
  [true, /^\w+/g, TokenKind.VariableName],
  [true, /^\(/g, TokenKind.LParen],
  [true, /^\)/g, TokenKind.RParen],
  [false, /^\s+/g, TokenKind.Space],
  [true, /^=/g, TokenKind.Equals],
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
    lrec(PRIMARY_TERM, PRIMARY_TERM, (left, right) => ({
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

const STATEMENT = alt_sc(
  apply(
    seq(tok(TokenKind.VariableName), tok(TokenKind.Equals), TERM),
    ([varName, _, term]) => ({
      type: "definition" as const,
      name: varName.text,
      value: term,
    })
  ),
  apply(
    seq(tok(TokenKind.Import), tok(TokenKind.String)),
    ([_, importFile]) => ({
      type: "import" as const,
      import: importFile.text.slice(1, -1),
    })
  )
);

const PROGRAM = rep_sc(STATEMENT);

export function termToASTTraditional(input: string) {
  const parse = expectSingleResult(expectEOF(TERM.parse(lexer.parse(input))));
  return parse;
}

export function programToASTTraditional(input: string) {
  const parse = expectSingleResult(
    expectEOF(PROGRAM.parse(lexer.parse(input)))
  );
  return parse;
}
