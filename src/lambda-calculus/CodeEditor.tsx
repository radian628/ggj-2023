import { useEffect, useRef } from "react";
import { useEditable } from "use-editable";

export function CodeEditor(props: {
  val: string;
  setVal: (s: string) => void;
}) {
  const editorRef = useRef<HTMLSpanElement>(null);
  useEditable(editorRef, (val) => {
    props.setVal(val);
    // stupid first focus bug
    setTimeout(() => editorRef.current?.focus(), 50);
  });

  return (
    <span ref={editorRef} className="lc-input">
      {colorizeBracketPairs(props.val)}
    </span>
  );
}

export function colorizeBracketPairs(str: string): (JSX.Element | string)[] {
  const strs = [""];
  for (const char of str) {
    if (char == "(" || char == ")") {
      strs.push(char, "");
    } else {
      strs[strs.length - 1] += char;
    }
  }

  let nestingLevel = 0;

  return strs.map((s, key) => {
    if (s == "(") nestingLevel++;
    if (s == ")") nestingLevel--;
    if (s == "(" || s == ")") {
      return (
        <span
          key={key}
          className={`bracket${
            nestingLevel >= 0
              ? (nestingLevel + (s == ")" ? 1 : 0)) % 4
              : "-invalid"
          }`}
        >
          {s}
        </span>
      );
    }
    return s;
  });
}
