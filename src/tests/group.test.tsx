import ReactDOM from "react-dom";
import * as Renderer from "../renderer/renderScene";

import { render } from "./test-utils";
import ExcalidrawApp from "../excalidraw-app";
import { reseed } from "../random";
import { actionGroup } from "../actions";
import {
  ExcalidrawElement,
  ExcalidrawLinearElement,
  ExcalidrawTextElementWithContainer,
  FontString,
} from "../element/types";
import { API } from "./helpers/api";
import { Pointer, UI } from "./helpers/ui";
import { Point } from "../types";
import { getBoundTextMaxWidth, wrapText } from "../element/textElement";

// Unmount ReactDOM from root
ReactDOM.unmountComponentAtNode(document.getElementById("root")!);

const renderScene = jest.spyOn(Renderer, "renderScene");

const { h } = window;

const p1: Point = [20, 20];
const p2: Point = [60, 20];
const mouse = new Pointer("mouse");
const DEFAULT_TEXT = "Online whiteboard collaboration made easy";

const createTwoPointerLinearElement = (
  type: ExcalidrawLinearElement["type"],
  roundness: ExcalidrawElement["roundness"] = null,
  roughness: ExcalidrawLinearElement["roughness"] = 0,
) => {
  const line = API.createElement({
    x: p1[0],
    y: p1[1],
    width: p2[0] - p1[0],
    height: 0,
    type,
    roughness,
    points: [
      [0, 0],
      [p2[0] - p1[0], p2[1] - p1[1]],
    ],
    roundness,
  });
  h.elements = [line];

  mouse.clickAt(p1[0], p1[1]);
  return line;
};

const font = "20px Cascadia, width: Segoe UI Emoji" as FontString;

const createBoundTextElement = (text: string, container: ExcalidrawElement) => {
  const textElement = API.createElement({
    type: "text",
    x: 0,
    y: 0,
    text: wrapText(text, font, getBoundTextMaxWidth(container)),
    containerId: container.id,
    width: 30,
    height: 20,
  }) as ExcalidrawTextElementWithContainer;

  container = {
    ...container,
    boundElements: (container.boundElements || []).concat({
      type: "text",
      id: textElement.id,
    }),
  };
  const elements: ExcalidrawElement[] = [];
  h.elements.forEach((element) => {
    if (element.id === container.id) {
      elements.push(container);
    } else {
      elements.push(element);
    }
  });
  const updatedTextElement = { ...textElement, originalText: text };
  h.elements = [...elements, updatedTextElement];
  return { textElement: updatedTextElement, container };
};

beforeEach(() => {
  localStorage.clear();
  renderScene.mockClear();
  reseed(7);
});

describe("groups", () => {
  it("should not group labeled arrows to themselves", async () => {
    await render(<ExcalidrawApp />);

    const arrow = createTwoPointerLinearElement("arrow");
    const text = createBoundTextElement(DEFAULT_TEXT, arrow);

    API.setSelectedElements([arrow, text.textElement]);

    h.app.actionManager.executeAction(actionGroup);

    expect(h.elements.every((el) => el.groupIds.length === 0)).toBeTruthy();
  });

  it("should not group labeled containers to themselves", async () => {
    await render(<ExcalidrawApp />);

    const rectangle = UI.createElement("rectangle", {
      x: 10,
      y: 20,
      width: 90,
      height: 75,
    });
    const text = createBoundTextElement(DEFAULT_TEXT, rectangle);

    API.setSelectedElements([rectangle, text.textElement]);

    h.app.actionManager.executeAction(actionGroup);

    expect(h.elements.every((el) => el.groupIds.length === 0)).toBeTruthy();
  });
});
