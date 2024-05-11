import {
  PartialParsedTerm,
  RunnableProgram,
  Term,
} from "./lambda-calculus-compiler.js";
import React, { FC } from "react";

export type DepsgraphNode = {
  name: string;
  key: string;
  prereqs: DepsgraphNode[];
  include: DepsgraphNode[];
  description: FC;
  defaultCode?: string;
} & (
  | {
      testProgram: (prog: RunnableProgram) => boolean;
      testExpression?: undefined;
      testExpressionPreSemanticAnalysis?: undefined;
    }
  | {
      testExpression: (expr: Term) => boolean;
      testProgram?: undefined;
      testExpressionPreSemanticAnalysis?: undefined;
    }
  | {
      testExpressionPreSemanticAnalysis: (term: PartialParsedTerm) => boolean;
      testExpression?: undefined;
      testProgram?: undefined;
    }
);
