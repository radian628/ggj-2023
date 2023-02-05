import { ASTNode } from "./parser";

export function getSExprTree(node: ASTNode) {
  const stack = [
    {
      node,
      index: 0,
    },
  ];

  let str = "";

  while (stack.length != 0) {
    const pop = () => {
      stack.pop();
    };
    const push = (node: ASTNode) => {
      stack.push({
        node,
        index: 0,
      });
    };

    const top = stack[stack.length - 1];

    if (Array.isArray(top.node)) {
      if (top.index == 0 && str[str.length - 1] != "(") str += " ";
      if (top.index == 0) str += "(";
      if (top.index < top.node.length) {
        push(top.node[top.index]);
        top.index++;
      } else {
        str += ")";
        pop();
      }
    } else {
      if (str[str.length - 1] != "(") str += " ";
      str += top.node;
      pop();
    }
  }

  return str;
}
