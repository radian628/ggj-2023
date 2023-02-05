import { getSExprTree } from "./debug-output";
import { ASTNode } from "./parser";

export function alphaReduce(node: ASTNode): ASTNode {
  const takenIdentifiers = new Set<string>();
  let output: ASTNode = [];
  const stack = [
    {
      node,
      output: output as ASTNode,
      index: 0,
      substitutions: {} as { [k: string]: ASTNode },
      onPop: ((a: ASTNode) => {}) as (a: ASTNode) => void,
    },
  ];

  while (stack.length != 0) {
    const top = stack[stack.length - 1];
    const pop = () => stack.pop()?.onPop(top.output);

    const pushStack = (
      node: ASTNode,
      substitutions: { [k: string]: ASTNode },
      onPop: (a: ASTNode) => void
    ) => {
      stack.push({
        node,
        onPop,
        output: Array.isArray(node) ? ([] as ASTNode[]) : node,
        index: 0,
        substitutions,
      });
    };

    if (Array.isArray(top.node)) {
      // rename lambda expression if necessary
      if (top.node[0] == "\\") {
        if (top.index == 0) {
          const varName = top.node[1] as string;
          let newVarName = varName;
          let uniquifier = 0;
          while (takenIdentifiers.has(newVarName)) {
            uniquifier++;
            newVarName = varName + uniquifier;
          }
          takenIdentifiers.add(newVarName);
          top.output = ["\\", newVarName];
          pushStack(
            top.node[2],
            { ...top.substitutions, [varName]: newVarName },
            (a) => {
              (top.output as ASTNode[]).push(a);
            }
          );
          top.index++;
        } else {
          pop();
        }

        // fix array
      } else {
        if (top.index < top.node.length) {
          pushStack(top.node[top.index], top.substitutions, (a) => {
            (top.output as ASTNode[]).push(a);
          });
          top.index++;
        } else {
          pop();
        }
      }
    } else {
      top.output = top.substitutions[top.node] ?? top.node;
      pop();
    }
  }

  return output;
}

export function betaReduce(node: ASTNode): { node: ASTNode; done: boolean } {
  let output: ASTNode = Array.isArray(node) ? [] : node;
  const stack = [
    {
      node,
      index: 0,
      output: output as ASTNode,
      onPop: ((a: ASTNode) => {}) as (a: ASTNode) => void,
      substitutions: {} as { [k: string]: ASTNode },
      evaluatedSubstitution: undefined as ASTNode | undefined,
    },
  ];

  let done = true;

  while (stack.length != 0) {
    const top = stack[stack.length - 1];
    const pop = () => stack.pop()?.onPop(top.output);

    const pushStack = (
      node: ASTNode,
      substitutions: { [k: string]: ASTNode },
      onPop: (a: ASTNode) => void
    ) => {
      stack.push({
        node,
        onPop,
        output: Array.isArray(node) ? ([] as ASTNode[]) : node,
        index: 0,
        substitutions,
        evaluatedSubstitution: undefined,
      });
    };

    // array case
    if (Array.isArray(top.node)) {
      // begins with lambda expression
      const fnName = top.node[0];
      if (Array.isArray(fnName) && fnName[0] == "\\" && top.node.length == 2) {
        done = false;
        //console.log(getSExprTree(top.node));
        //console.log("pushing lambda body", getSExprTree(fnName?.[2]));
        // TODO: run substitution on substitution before substituting it
        if (top.index == 0) {
          pushStack(top.node[1], top.substitutions, (a) => {
            top.evaluatedSubstitution = a;
          });
          top.index = 1;
        } else if (top.index == 1) {
          pushStack(
            fnName?.[2],
            {
              ...top.substitutions,
              [fnName?.[1] as string]: top.evaluatedSubstitution as ASTNode,
            },
            (a) => {
              //   console.log(
              //     "popping lambda expr",
              //     getSExprTree(a),
              //     top.output === output,
              //     top.substitutions
              //   );
              if (Array.isArray(a)) {
                //@ts-ignore
                top.output.push(...a);
              } else {
                top.output = a;
              }
            }
          );
          top.index = 2;
        } else {
          pop();
        }

        // does not begin with lambda expression
      } else {
        if (top.index < top.node.length) {
          const node = top.node[top.index];

          pushStack(node, top.substitutions, (a) => {
            if (Array.isArray(top.output)) {
              //@ts-ignore
              top.output.push(a);
            } else {
              top.output = a;
            }
          });

          top.index++;
        } else {
          pop();
        }
      }
    } else {
      //console.log(top.output, top.substitutions);
      top.output = top.substitutions[top.node] ?? top.node;
      pop();
    }
  }

  while (Array.isArray(output) && output.length == 1) {
    output = output[0];
  }

  return { node: output, done };
}
