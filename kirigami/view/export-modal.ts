import type { ExportArchive, ExportPayload } from "../model/svg-export.js";

/** Returns the current export payload (previews + archive) when the modal opens. */
export type ExportProvider = () => ExportPayload | null;

/**
 * Export submenu: an "Export" trigger button plus a modal overlay (header / body / footer)
 * styled after the app's dialogs. The body shows three previews — cut, score, and both
 * overlaid — and the single action "Export as SVG" downloads a zip containing the separate
 * cut and score SVGs in one folder.
 */
export class ExportModal {
  private readonly overlay: HTMLElement;
  private readonly trigger: HTMLButtonElement;
  private provider: ExportProvider | null = null;
  private archive: ExportArchive | null = null;

  constructor() {
    this.trigger = document.createElement("button");
    this.trigger.type = "button";
    this.trigger.className = "export-trigger";
    this.trigger.textContent = "Export";
    this.trigger.addEventListener("click", () => this.open());

    this.overlay = document.createElement("div");
    this.overlay.className = "export-overlay";
    this.overlay.hidden = true;
    this.overlay.innerHTML = `
      <div class="export-modal" role="dialog" aria-modal="true" aria-label="Export">
        <header class="export-modal-header">
          <span class="export-modal-title">Export</span>
          <button type="button" class="export-modal-close" aria-label="Close">×</button>
        </header>
        <div class="export-modal-body">
          <div class="export-squares">
            <figure class="export-preview">
              <div class="export-square" data-preview="cut"></div>
              <figcaption>Cut</figcaption>
            </figure>
            <figure class="export-preview">
              <div class="export-square" data-preview="score"></div>
              <figcaption>Score</figcaption>
            </figure>
            <figure class="export-preview">
              <div class="export-square" data-preview="both"></div>
              <figcaption>Both</figcaption>
            </figure>
          </div>
        </div>
        <footer class="export-modal-footer">
          <button type="button" class="export-svg-btn">Export as SVG</button>
        </footer>
      </div>
    `;
    document.body.appendChild(this.overlay);

    this.overlay
      .querySelector(".export-modal-close")!
      .addEventListener("click", () => this.close());
    this.overlay
      .querySelector(".export-svg-btn")!
      .addEventListener("click", () => this.exportSvg());
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });
    document.addEventListener("keydown", (e) => {
      if (!this.overlay.hidden && e.key === "Escape") this.close();
    });
  }

  /** Mount the "Export" trigger button into a container. */
  mountTrigger(container: HTMLElement): void {
    container.appendChild(this.trigger);
  }

  /** Supply the current export payload; called each time the modal opens. */
  setProvider(provider: ExportProvider): void {
    this.provider = provider;
  }

  open(): void {
    this.renderPreviews(this.provider?.() ?? null);
    this.overlay.hidden = false;
  }

  close(): void {
    this.overlay.hidden = true;
  }

  private renderPreviews(payload: ExportPayload | null): void {
    const set = (key: string, svg: string): void => {
      const el = this.overlay.querySelector(`[data-preview="${key}"]`);
      if (el) el.innerHTML = svg;
    };
    set("cut", payload?.previews.cut ?? "");
    set("score", payload?.previews.score ?? "");
    set("both", payload?.previews.both ?? "");
    this.archive = payload?.archive ?? null;

    const btn = this.overlay.querySelector(
      ".export-svg-btn",
    ) as HTMLButtonElement | null;
    if (btn) btn.disabled = this.archive === null;
  }

  private exportSvg(): void {
    if (!this.archive) return;
    downloadBlob(this.archive.filename, this.archive.bytes, "application/zip");
    this.close();
  }
}

function downloadBlob(filename: string, data: BlobPart, mime: string): void {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
