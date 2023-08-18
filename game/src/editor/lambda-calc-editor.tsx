import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap } from "@codemirror/commands";
import { batch, createEffect, createSignal, untrack } from "solid-js";
import { parser } from "./parser/parser.js";
import { styleTags, tags as t } from "@lezer/highlight";
import {
  indentNodeProp,
  LRLanguage,
  LanguageSupport,
} from "@codemirror/language";
import { completeFromList, CompletionContext } from "@codemirror/autocomplete";
import { basicSetup } from "codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { SyntaxNodeRef } from "@lezer/common";
import { html } from "@codemirror/lang-html";

const parserWithMetadata = parser.configure({
  props: [
    styleTags({
      "( )": t.paren,
      "\\ | .": t.keyword,
      Variable: t.variableName,
      VariableDef: t.className,
      AssignmentDef: t.macroName,
    }),
  ],
});

const lambdaCalculusLanguage = LRLanguage.define({
  name: "lambda-calculus",
  parser: parserWithMetadata,
  languageData: {},
});

function lambdaCalculusAutocomplete(context: CompletionContext) {
  const word = context.matchBefore(/\\/g);
  if (!word || (word.from == word.to && !context.explicit)) return null;
  return {
    from: word.from,
    options: [
      {
        label: "\\.",
        type: "keyword",
      },
    ],
  };
}

const lambdaCalculusAutocompleteExtension = lambdaCalculusLanguage.data.of({
  // autocomplete: lambdaCalculusAutocomplete,
  closeBrackets: {
    brackets: ["("],
  },
});

const getLambdaCalcExtensions = () => [
  keymap.of(defaultKeymap),
  new LanguageSupport(lambdaCalculusLanguage, [
    lambdaCalculusAutocompleteExtension,
    EditorView.inputHandler.of((view, from, to, text) => {
      const newPosition = view.state.selection.ranges[0].from + 1;
      if (text == "\\") {
        view.dispatch({
          changes: { from: from, to: to, insert: "\\." },
          selection: { anchor: newPosition, head: newPosition },
        });

        return true;
      } else if (text == "(") {
        view.dispatch({
          changes: { from: from, to: to, insert: "()" },
          selection: { anchor: newPosition, head: newPosition },
        });

        return true;
      }
      return false;
    }),
  ]),
  oneDark,
];

export function LambdaCalcEditor(props: {
  src: () => string;
  setSrc: (s: string) => void;
  readonly?: () => boolean;
}) {
  const [localSrc, setLocalSrc] = createSignal(props.src());

  return (
    <div
      ref={(el) => {
        const extensions = () => [
          ...getLambdaCalcExtensions(),

          props?.readonly?.() ?? false
            ? EditorView.editable.of(false)
            : EditorView.updateListener.of(function (e) {
                batch(() => {
                  const content = e.state.doc.toString();
                  props.setSrc(content);
                  setLocalSrc(content);
                });
              }),
        ];

        const view = new EditorView({
          state: EditorState.create({
            doc: props.src(),
            extensions: extensions(),
          }),
          parent: el,
        });

        createEffect(() => {
          untrack(() => {
            view.setState(
              EditorState.create({
                doc: props.src(),
                extensions: extensions(),
              })
            );
          });
        });

        createEffect(() => {
          if (localSrc() == props.src()) return;
          view.dispatch({
            changes: {
              from: 0,
              to: view.state.doc.length,
              insert: props.src(),
            },
          });
        });
      }}
    ></div>
  );
}
