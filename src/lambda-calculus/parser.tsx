/*

backslash function for lambda
application by just putting a lambda as first argument

((\ x y) a)

*/

export type ASTNode = ASTNode[] | string;

export function lex(src: string) {
  const splitStr: string[] = [];
  for (const char of src) {
    if (char == " " || char == "\n" || char == "\r") {
      if (splitStr[splitStr.length - 1] != "") {
        splitStr.push("");
      }
    } else {
      if (char == "(") {
        splitStr.push("(", "");
      } else if (char == ")") {
        splitStr.push(")", "");
      } else {
        splitStr[splitStr.length - 1] += char;
      }
    }
  }
  return splitStr.filter((x) => x.length != 0);
}

export function parse(src: string[]):
  | {
      success: true;
      data: ASTNode;
    }
  | {
      success: false;
      error: string;
    } {
  let root: ASTNode = [];
  const stack: ASTNode[][] = [root];

  for (const item of src) {
    if (item == "(") {
      const newItem: ASTNode[] = [];
      stack[stack.length - 1].push(newItem);
      stack.push(newItem);
    } else if (item == ")") {
      stack.pop();
      if (stack.length == 0) {
        return { success: false, error: "Too many ')'s!" };
      }
    } else {
      stack[stack.length - 1].push(item);
    }
  }

  if (stack.length != 1) {
    return { success: false, error: "Too many '('s!" };
  }

  while (Array.isArray(root) && root.length == 1) {
    root = root[0];
  }

  return {
    success: true,
    data: root,
  };
}

export function curry(src: ASTNode):
  | {
      success: true;
      data: ASTNode;
    }
  | {
      success: false;
      error: string;
    } {
  let output: ASTNode = [];
  const contextStack: {
    src: ASTNode;
    itemIndex: number;
    output: ASTNode;
    onPop: (a: ASTNode) => void;
  }[] = [
    {
      src,
      itemIndex: 0,
      output,
      onPop: () => {},
    },
  ];

  while (contextStack.length != 0) {
    const top = contextStack[contextStack.length - 1];
    const pop = () => contextStack.pop()?.onPop(top.output);
    if (Array.isArray(top.src)) {
      if (top.src.length < 2)
        return {
          success: false,
          error:
            "Function calls require a function name and at least one parameter.",
        };

      // lambda expression
      if (top.src[0] && top.src[0] == "\\") {
        if (top.src.length < 3)
          return {
            success: false,
            error: "Lambda expressions require a parameter and a body.",
          };

        // curry lambda body
        if (top.itemIndex == 0) {
          const src = top.src[top.src.length - 1];
          contextStack.push({
            src,
            itemIndex: 0,
            output: Array.isArray(src) ? [] : src,
            onPop: (a) => {
              if (Array.isArray(a)) {
                (top.output as ASTNode[]).push(...a);
              } else {
                top.output = a;
              }
            },
          });
          top.itemIndex = 1;

          // curry lambda itself
        } else {
          const args = top.src.slice(1, -1).reverse();
          let outputExpr: ASTNode = Array.isArray(top.output)
            ? [...top.output]
            : top.output;

          for (const arg of args) {
            outputExpr = ["\\", arg, outputExpr];
          }

          if (Array.isArray(top.output)) {
            top.output.splice(0, top.output.length, ...outputExpr);
          } else {
            top.output = outputExpr;
          }
          pop();
        }

        // other function expression
      } else {
        if (top.itemIndex < top.src.length) {
          const src = top.src[top.itemIndex];
          contextStack.push({
            src,
            itemIndex: 0,
            output: Array.isArray(src) ? [] : src,
            onPop: (a) => {
              //@ts-ignore
              top.output.push(a);
            },
          });
          top.itemIndex++;
        } else {
          let outputExpr = top.output[0];
          for (const arg of top.output.slice(1)) {
            outputExpr = [outputExpr, arg];
          }

          if (Array.isArray(top.output)) {
            top.output.splice(0, top.output.length, ...outputExpr);
          } else {
            top.output = outputExpr;
          }

          pop();
        }
      }
    } else {
      pop();
    }
  }

  return { success: true, data: output };
}
