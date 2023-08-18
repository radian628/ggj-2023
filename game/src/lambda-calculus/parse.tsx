import { fakeRecursiveFunction } from "../recursion.jsx";
import {
  lambdaExprToEnumVariant,
  numberArrayToLambdaExpr,
} from "./data-conversions.jsx";
import {
  ASTNode,
  evalLC,
  lambda,
  normalEval,
  pair,
  printAST,
  variable,
} from "./lambda-calculus.jsx";

export type TokenInfo = {
  start: number;
  end: number;
  str: string;
};

export type NormalToken = TokenInfo & {
  type: "normal";
  category: "\\" | "." | "paren" | "var" | ":=" | "whitespace";
};

export type ReaderToken = TokenInfo & {
  type: "reader";
  category: "reader";
  reader: Reader;
};

export type Reader = {
  matcher: ASTNode;
  compiler: ASTNode;
  cache: Map<string, number | undefined>;
};

export type Token = NormalToken | ReaderToken;

let tokenMatchers: [RegExp, NormalToken["category"]][] = [
  [/^\./g, "."],
  [/^(\(|\))/g, "paren"],
  [/^\\/g, "\\"],
  [/^\s+/g, "whitespace"],
  [/^\w+\W*:=/g, ":="],
  [/^\w+/g, "var"],
];

const readerRegex = /^\~READER/g;
const delimRegex = /^\S+/g;

type CompileContext = {
  readers: Reader[];
  assignments: Map<string, ASTNode>;
};

export function compile(
  input: string,
  context: CompileContext
): ASTNode | Map<string, ASTNode> {
  const splitInput = input.split("~READER");

  const splitInput2 = [
    splitInput[0],
    ...splitInput.slice(1).map((s) => "~READER" + s),
  ];

  for (const str of splitInput2) {
    const tokens = lex(str, context);
    parse(
      {
        peek: () => tokens[0],
        consume: () => tokens.shift(),
      },
      context
    );
  }
  return context.assignments;
}

export function compileExpr(
  input: string,
  context?: CompileContext
): ASTNode | Map<string, ASTNode> {
  if (!context) context = { assignments: new Map(), readers: [] };

  const tokens = lex(input, context);
  return parse(
    { peek: () => tokens[0], consume: () => tokens.shift() },
    context
  );
}

function filterOutMap<T>(input: T, err: string): Exclude<T, Map<any, any>> {
  if (input instanceof Map) throw new Error(err);
  //@ts-ignore
  return input;
}

export function lex(input: string, context: CompileContext) {
  let str = input;
  let tokens: Token[] = [];
  let offset = 0;

  while (str.length > 0) {
    const oldOffset = offset;

    const readerMatch = str.match(readerRegex)?.[0];
    if (readerMatch) {
      offset += 7;
      str = input.slice(offset);
      const trimmedStr = str.trimStart();
      offset += str.length - trimmedStr.length;
      str = input.slice(offset);
      const delim = str.match(delimRegex)?.[0];
      if (!delim)
        throw new Error(`Failed to supply a proper reader delimiter.`);
      offset += delim.length;
      str = input.slice(offset);
      let nextDelimRegex = new RegExp(`^[\\w\\W]+?(?=${delim})`, "g");
      const matcherBody = str.match(nextDelimRegex)?.[0];
      if (!matcherBody)
        throw new Error("Failed to supply a proper reader matcher.");
      offset += matcherBody.length + delim.length;
      str = input.slice(offset);
      const compilerBody = str.match(nextDelimRegex)?.[0];
      if (!compilerBody)
        throw new Error("Failed to supply a proper reader compiler.");
      offset += compilerBody.length + delim.length;
      str = input.slice(offset);
      context.readers.push({
        matcher: filterOutMap(
          compileExpr(matcherBody, context),
          "No assignments in reader matchers!"
        ),
        compiler: filterOutMap(
          compileExpr(compilerBody, context),
          "No assignments in reader compilers!"
        ),
        cache: new Map(),
      });
    }

    let matched = false;
    for (const reader of context.readers) {
      let i = 0;
      while (true) {
        i++;
        const candidateToken = str.slice(0, i);

        const cacheEntry = reader.cache.get(candidateToken);

        let variant: number | undefined;

        if (cacheEntry === undefined) {
          const evalExpr = evalLC(
            pair(
              reader.matcher,
              numberArrayToLambdaExpr(
                candidateToken.split("").map((s) => s.charCodeAt(0))
              )
            )
          );
          variant = lambdaExprToEnumVariant(evalExpr);
          reader.cache.set(candidateToken, variant);
        } else {
          variant = cacheEntry;
        }

        if (variant === undefined)
          throw new Error("Reader returned a non-enum value.");

        if (variant > 2)
          throw new Error(
            "Reader returned an enum variant which is too large."
          );

        if (variant == 0) {
          break;
        } else if (variant == 2) {
          matched = true;
          break;
        }
      }

      if (matched) {
        tokens.push({
          start: offset,
          end: offset + i,
          str: input.slice(0, i),
          type: "reader",
          category: "reader",
          reader: reader,
        });
        offset += i;
        str = input.slice(offset);
        break;
      }
    }

    if (matched) continue;

    for (const [regex, cat] of tokenMatchers) {
      const match = str.match(regex)?.[0];

      if (match) {
        tokens.push({
          start: offset,
          end: offset + match.length,
          str: match,
          type: "normal",
          category: cat,
        });
        offset += match.length;
        break;
      }
    }

    str = input.slice(offset);

    if (offset == oldOffset)
      throw new Error(`Failed to match input at position ${offset}.`);
  }

  return tokens.filter((t) => t.category != "whitespace");
}

//https://stackoverflow.com/questions/52489261/typescript-can-i-define-an-n-length-tuple-type
type Tuple<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : _TupleOf<T, N, []>
  : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N
  ? R
  : _TupleOf<T, N, [T, ...R]>;

interface TokenStream {
  peek: () => Token | undefined;
  consume: () => Token | undefined;
}

function parse(
  tokens: TokenStream,
  ctx: CompileContext
): ASTNode | Map<string, ASTNode> {
  function parseError(token: Token, str: string): never {
    throw new Error(
      `Parse Error at position ${token.start}-${token.end}: ${str}`
    );
  }

  const parseInner = fakeRecursiveFunction<
    { bindingPower: number; vars: string[] },
    ASTNode | Map<string, ASTNode>
  >(function* ({ bindingPower, vars }) {
    type Args = { bindingPower: number; vars: string[] };

    function args(bindingPower: number, vars: string[]) {
      return { bindingPower, vars };
    }

    function compileReader(token: ReaderToken) {
      return normalEval(
        pair(
          token.reader.compiler,
          numberArrayToLambdaExpr(
            token.str.split("").map((e) => e.charCodeAt(0))
          )
        )
      );
    }

    function* parseLambda(): Generator<Args, ASTNode, ASTNode> {
      const newVars: string[] = [];
      while (true) {
        if (tokens.peek()?.category == "var") {
          newVars.push((tokens.consume() as Token).str);
        } else {
          break;
        }
      }
      const dot = tokens.consume();
      if (!dot) throw new Error("Unexpected end of input. Expected '.'");
      if (dot.category != ".") parseError(dot, "Expected '.'");
      const body = yield args(0, [...vars, ...newVars]);
      function helper(vars: string[]): ASTNode {
        if (vars.length == 0) return body;
        return lambda(helper(vars.slice(1)), vars[0]);
      }
      return helper(newVars);
    }

    function* parseParen(): Generator<Args, ASTNode, ASTNode> {
      const body = yield args(0, vars);
      const closeParen = tokens.consume();
      if (!closeParen) throw new Error("Unexpected end of input. Expected ')'");
      if (closeParen.str != ")") parseError(closeParen, "Expected ')'.");
      return body;
    }

    function* parseVariable(token: Token): Generator<Args, ASTNode, ASTNode> {
      const assignment = ctx.assignments.get(token.str);
      if (assignment) return assignment;

      let index = vars
        .slice()
        .reverse()
        .findIndex((x) => x == token.str);

      if (index == -1)
        parseError(token, `Variable '${token.str}' does not exist.`);
      return variable(index);
    }

    function* parseAssignment(
      prev: ASTNode | Map<string, ASTNode>,
      token: Token
    ) {
      if (!(prev instanceof Map))
        throw new Error("Cannot assign a variable here!");

      prev.set(token.str.match(/^\w+/g)?.[0] as string, yield args(0, vars));

      return prev;
    }

    function* initParselet(token: Token) {
      if (token.type == "reader") return compileReader(token);
      switch (token.category) {
        case "\\":
          return yield* parseLambda();
        case "paren":
          if (token.str == ")") parseError(token, "Unexpected ')'.");
          return yield* parseParen();
        case "var":
          return yield* parseVariable(token);
        case ":=":
          return yield* parseAssignment(ctx.assignments, token);
        default:
          parseError(token, `Unexpected token '${token.str}'`);
      }
    }

    function* consequentParselet(
      prev: ASTNode | Map<string, ASTNode>,
      token: Token
    ) {
      if (token.type == "reader") {
        if (prev instanceof Map)
          throw new Error(`Unexpected token '${token.str}'`);
        return pair(prev, compileReader(token));
      }

      if (prev instanceof Map) {
        if (token.category != ":=")
          parseError(token, "Expected a variable assignment.");
        return yield* parseAssignment(prev, token);
      } else {
        let newNode: ASTNode;
        switch (token.category) {
          case "\\":
            newNode = yield* parseLambda();
            break;
          case "paren":
            if (token.str == ")") parseError(token, "Unexpected ')'.");
            newNode = yield* parseParen();
            break;
          case "var":
            newNode = yield* parseVariable(token);
            break;
          default:
            parseError(token, `Unexpected token '${token.str}'`);
        }
        return pair(prev, newNode);
      }
    }

    function getBindingPower(token: Token) {
      if (token.category == ":=") return -1;
      if (token.str == ")") return 0;
      return 1;
    }

    const initToken = tokens.consume();
    if (!initToken) throw new Error("Unexpected end of input.");

    let leftNode = yield* initParselet(initToken);

    while (true) {
      const nextToken = tokens.peek();

      if (!nextToken) return leftNode;

      if (getBindingPower(nextToken) <= bindingPower) break;

      tokens.consume();

      leftNode = yield* consequentParselet(leftNode, nextToken);
    }

    return leftNode;
  });

  return parseInner({ bindingPower: -2, vars: [] });
}
