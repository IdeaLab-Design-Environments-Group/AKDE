import { createController } from "@kirigami/controller/kirigami-controller.js";
import { ChecklistView, InputsPanel, PatternCanvas } from "@kirigami/view/index.js";

const app = document.getElementById("app");
if (!app) throw new Error("Missing #app root");

const inputsMount = document.createElement("div");
inputsMount.className = "column inputs-column";
const checklistMount = document.createElement("div");
checklistMount.className = "column constraints-column";
const patternMount = document.createElement("div");
patternMount.className = "column pattern-column";

app.append(inputsMount, checklistMount, patternMount);

const inputsPanel = new InputsPanel(inputsMount);
const checklistView = new ChecklistView(checklistMount);
const patternCanvas = new PatternCanvas(patternMount);

createController({
  inputsPanel,
  checklistView,
  patternCanvas,
});
