import React, { useState } from "react";

export function ClickToShow(props: {
  children: string | JSX.Element | JSX.Element[];
  text: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return <React.Fragment>{props.children}</React.Fragment>;
  } else {
    return (
      <button className="click-to-show" onClick={() => setIsOpen(true)}>
        {props.text}
      </button>
    );
  }
}
