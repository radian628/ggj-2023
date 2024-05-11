/*
Parser for "arrow function" lambda calculus syntax that uses arrow function
syntax like from JavaScript.
*/
import {
  alt_sc,
  apply,
  buildLexer,
  expectEOF,
  expectSingleResult,
  kmid,
  rep_sc,
  rule,
  seq,
  str,
  tok,
} from "typescript-parsec";
import { PartialParsedTerm } from "../lambda-calculus-compiler.js";

enum TokenKind {
  LParen,
  RParen,
  VariableName,
  Arrow,
  Space,
  Equals,
  Import,
  String,
}

const lexer = buildLexer([
  [true, /^import/g, TokenKind.Import],
  [true, /^"[^"]*"/g, TokenKind.String],
  [true, /^\w+/g, TokenKind.VariableName],
  [true, /^\(/g, TokenKind.LParen],
  [true, /^\)/g, TokenKind.RParen],
  [false, /^\s+/g, TokenKind.Space],
  [true, /^=/g, TokenKind.Equals],
  [true, /\=\>/g, TokenKind.Arrow],
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
    apply(
      seq(PRIMARY_TERM, str("("), TERM, str(")")),
      ([left, _, right, __]) => ({
        type: "application",
        left,
        right,
      })
    ),
    PRIMARY_TERM
  )
);

TERM.setPattern(
  alt_sc(
    apply(
      seq(tok(TokenKind.VariableName), str("=>"), TERM),
      ([varName, _, body]) => ({
        type: "abstraction",
        varName: varName.text,
        body,
      })
    ),
    APPLICATION
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
