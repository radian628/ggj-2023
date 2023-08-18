import { JSX } from "solid-js/jsx-runtime";
import { LambdaCalcEditor } from "../editor/lambda-calc-editor.jsx";
import { For, Show, createSignal, onCleanup } from "solid-js";

export function ScrollTriangle(props: {
  elem?: () => HTMLElement;
  style?: JSX.CSSProperties;
}) {
  return (
    <div
      style={props.style}
      class="triangle screen-scroller"
      onClick={(e) => {
        document.getElementsByClassName("level")[0].scrollBy({
          top: window.innerHeight,
          left: 0,
          behavior: "smooth",
        });
      }}
    ></div>
  );
}

export function StaticLC(props: {
  children: string;
  inline?: boolean;
  intext?: boolean;
}) {
  return (
    <div
      class={
        (props.intext
          ? "intext-expr"
          : `small-expr no-select ${props.inline ? "inline-expr" : ""}`) +
        " static-expr"
      }
    >
      <LambdaCalcEditor
        src={() => props.children}
        setSrc={() => {}}
        readonly={() => true}
      ></LambdaCalcEditor>
    </div>
  );
}

export type LevelScreenProps = {
  win: () => void;
};

export type LevelProps = {
  win: () => void;
  unlocked: number;
};

export type LevelScreen = (props: LevelScreenProps) => JSX.Element;

export function LevelExitScreen(props: { onEnter: () => void }) {
  return (
    <div
      class="screen"
      ref={(el) => {
        const observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.intersectionRatio > 0) props.onEnter();
            }
          },
          { threshold: 0.9 }
        );
        observer.observe(el);

        onCleanup(() => {
          observer.unobserve(el);
        });
      }}
    ></div>
  );
}

export function levelWith(...screens: LevelScreen[]) {
  return function (props: LevelProps) {
    console.log("got here");
    const [unlockedCount, setUnlockedCount] = createSignal(props.unlocked);

    console.log(screens);

    return (
      <div class="level">
        <For each={screens}>
          {(L, i) => {
            const showTriangle = () =>
              i() == screens.length - 1 || i() < unlockedCount();

            return (
              <div style={{ display: i() > unlockedCount() ? "none" : "" }}>
                <L
                  win={() => {
                    setUnlockedCount(Math.max(unlockedCount(), i() + 1));
                  }}
                ></L>
                <div
                  class="scroll-triangle-revealer"
                  style={{
                    transform: `translateY(-${showTriangle() ? 150 : 100}px)`,
                    opacity: showTriangle() ? 1 : 0,
                  }}
                  onClick={(e) => {
                    if (i() != screens.length - 1) return;
                    props.win();
                  }}
                >
                  <ScrollTriangle
                    style={{
                      "border-width": showTriangle() ? undefined : 0,
                      "margin-bottom": showTriangle() ? undefined : 0,
                    }}
                  ></ScrollTriangle>
                </div>
              </div>
            );
          }}
        </For>
        <Show when={unlockedCount() >= screens.length - 1}>
          <LevelExitScreen onEnter={props.win}></LevelExitScreen>
        </Show>
      </div>
    );
  };
}
