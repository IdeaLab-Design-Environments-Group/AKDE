import { computeState, defaultInputs } from "../model/geometry.js";
import { evaluateConstraints } from "../model/constraints.js";
import { buildPatternNet } from "../model/pattern.js";
import {
  APEX_HEIGHT_ERROR,
  MATERIAL_THICKNESS_ERROR,
  validateInputs,
} from "../model/validation.js";
import type { ConstraintState, KirigamiInputs, KirigamiState } from "../model/types.js";
import { formatAngleDeg, formatMm } from "./formatters.js";
import type {
  InputsPanel,
  InputsPanelDerivedField,
  InputsPanelRenderModel,
} from "../view/inputs-panel.js";
import type { ChecklistView } from "../view/checklist-view.js";
import type { PatternCanvas } from "../view/pattern-canvas.js";

export interface KirigamiControllerOptions {
  inputsPanel: InputsPanel;
  checklistView: ChecklistView;
  patternCanvas: PatternCanvas;
  debounceMs?: number;
}

export class KirigamiController {
  private state: KirigamiState | null = null;
  private constraints: ConstraintState[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;

  constructor(private readonly options: KirigamiControllerOptions) {
    this.debounceMs = options.debounceMs ?? 80;
    options.inputsPanel.setInputs(defaultInputs());
    options.inputsPanel.onChange(() => this.scheduleRecompute());
    this.recompute();
  }

  getState(): KirigamiState | null {
    return this.state;
  }

  getConstraints(): ConstraintState[] {
    return this.constraints;
  }

  recompute(): void {
    const { inputsPanel } = this.options;
    const inputs = inputsPanel.getInputs();
    if (validateInputs(inputs) !== null) {
      this.state = null;
      this.constraints = [];
      this.pushToViews(inputs);
      return;
    }

    this.state = computeState(inputs);
    this.constraints = evaluateConstraints(this.state);
    this.pushToViews(inputs);
  }

  private scheduleRecompute(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.recompute();
    }, this.debounceMs);
  }

  private pushToViews(inputs: KirigamiInputs): void {
    const { inputsPanel, checklistView, patternCanvas } = this.options;
    inputsPanel.render(this.buildInputsPanelModel(inputs));
    checklistView.render(this.constraints);
    patternCanvas.render(
      this.state,
      this.state ? buildPatternNet(this.state) : null,
    );
  }

  private buildInputsPanelModel(inputs: KirigamiInputs): InputsPanelRenderModel {
    return {
      derived: this.state ? this.buildDerivedFields(this.state) : [],
      apexHeightError: inputs.totalCurvature > 0 ? null : APEX_HEIGHT_ERROR,
      materialThicknessError:
        inputs.materialThickness > 0 ? null : MATERIAL_THICKNESS_ERROR,
    };
  }

  private buildDerivedFields(state: KirigamiState): InputsPanelDerivedField[] {
    return [
      { termHtml: "R", valueText: formatMm(state.R) },
      { termHtml: "s (slant)", valueText: formatMm(state.s) },
      { termHtml: "ψ", valueText: formatAngleDeg(state.psi) },
      { termHtml: "κ", valueText: state.kappa.toFixed(4) },
      { termHtml: "η", valueText: formatAngleDeg(state.eta) },
      { termHtml: "δ<sub>apex</sub>", valueText: formatAngleDeg(state.deltaApex) },
      { termHtml: "θ", valueText: formatAngleDeg(state.theta) },
      { termHtml: "w", valueText: formatMm(state.w) },
      { termHtml: "τ", valueText: formatAngleDeg(state.tau) },
      {
        termHtml: "r<sub>apex</sub> (major cut)",
        valueText: formatMm(state.rApex),
      },
      { termHtml: "minor cut", valueText: formatMm(state.minorCutLength) },
    ];
  }
}

export function createController(
  options: KirigamiControllerOptions,
): KirigamiController {
  return new KirigamiController(options);
}

export type { KirigamiInputs, KirigamiState, ConstraintState };
