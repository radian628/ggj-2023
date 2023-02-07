import { Basics1 } from "./basics/Basics1";
import { Basics2 } from "./basics/Basics2";
import { Basics3 } from "./basics/Basics3";
import { And } from "./booleans/And";
import { Not } from "./booleans/Not";
import { Or } from "./booleans/Or";
import { Xor } from "./booleans/Xor";
import { Addition } from "./numbers/Addition";
import { Multiplication } from "./numbers/Multiplication";
import { Numbers } from "./numbers/Numbers";
import { Successor } from "./numbers/Successor";

export const levelsOrder = [
  Numbers,
  Basics1,
  Basics2,
  Basics3,
  Not,
  And,
  Or,
  Xor,
  Successor,
  Addition,
  Multiplication,
];
