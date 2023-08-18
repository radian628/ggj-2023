import { LevelScreenProps, ScrollTriangle } from "../../common.jsx";
import { Logo } from "./logo.jsx";
import "./title-screen.css";

export function TitleScreen(props: LevelScreenProps) {
  setTimeout(props.win, 2500);

  return (
    <div class="screen title-screen">
      <Logo></Logo>
      <div class="header">
        <h1>The Roots of Computation</h1>
        <p>A Game about Lambda Calculus</p>
      </div>
    </div>
  );
}
