/**
 * DrawingCanvas — the drawing engine.
 *
 * Owns an HTML5 canvas. Draws a background guide (the target glyph as an
 * outline/fill, or evenly spaced horizontal ruled lines, or nothing) and lets
 * the user draw strokes with the mouse on top.
 *
 * Knows nothing about scoring or Obsidian.
 */

export type GuideStyle = "outline" | "filled" | "lines" | "none";

export interface DrawingCanvasOptions {
	target: string;
	guide: GuideStyle;
	/** Convenience: square canvas of side `size`. Ignored if width/height given. */
	size?: number;
	width?: number;
	height?: number;
	/** CSS color for the user's strokes. */
	strokeColor?: string;
	strokeWidth?: number;
}

interface Point {
	x: number;
	y: number;
}

export class DrawingCanvas {
	readonly el: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private target: string;
	private guide: GuideStyle;
	private strokeColor: string;
	private strokeWidth: number;
	private width: number;
	private height: number;

	/** Completed strokes, plus the in-progress one. */
	private strokes: Point[][] = [];
	private current: Point[] | null = null;
	private drawing = false;

	constructor(parent: HTMLElement, options: DrawingCanvasOptions) {
		const side = options.size ?? 340;
		this.width = options.width ?? side;
		this.height = options.height ?? side;
		this.target = options.target;
		this.guide = options.guide;
		this.strokeColor = options.strokeColor ?? "#e63946";
		this.strokeWidth = options.strokeWidth ?? 6;

		const canvas = document.createElement("canvas");
		canvas.width = this.width;
		canvas.height = this.height;
		canvas.addClass("penmanship-canvas");
		parent.appendChild(canvas);
		this.el = canvas;

		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Could not get 2D canvas context.");
		this.ctx = ctx;

		this.registerEvents();
		this.redraw();
	}

	private registerEvents() {
		this.el.addEventListener("mousedown", (e) => this.onDown(e));
		this.el.addEventListener("mousemove", (e) => this.onMove(e));
		// End the stroke on mouseup anywhere, and if the mouse leaves the canvas.
		window.addEventListener("mouseup", () => this.onUp());
		this.el.addEventListener("mouseleave", () => this.onUp());
	}

	private toLocal(e: MouseEvent): Point {
		const rect = this.el.getBoundingClientRect();
		// Account for CSS scaling between the backing store and the displayed size.
		const scaleX = this.el.width / rect.width;
		const scaleY = this.el.height / rect.height;
		return {
			x: (e.clientX - rect.left) * scaleX,
			y: (e.clientY - rect.top) * scaleY,
		};
	}

	private onDown(e: MouseEvent) {
		e.preventDefault();
		this.drawing = true;
		this.current = [this.toLocal(e)];
	}

	private onMove(e: MouseEvent) {
		if (!this.drawing || !this.current) return;
		this.current.push(this.toLocal(e));
		this.redraw();
	}

	private onUp() {
		if (!this.drawing) return;
		this.drawing = false;
		if (this.current && this.current.length > 0) {
			this.strokes.push(this.current);
		}
		this.current = null;
		this.redraw();
	}

	clear() {
		this.strokes = [];
		this.current = null;
		this.redraw();
	}

	undo() {
		this.strokes.pop();
		this.redraw();
	}

	setGuide(guide: GuideStyle) {
		this.guide = guide;
		this.redraw();
	}

	isEmpty(): boolean {
		return this.strokes.length === 0 && !this.current;
	}

	/** Target text split into display lines (supports multi-line passages). */
	private lines(): string[] {
		return this.target.split("\n");
	}

	private cachedLayout: {
		text: string;
		fontSize: number;
		lineHeight: number;
	} | null = null;

	/**
	 * Fit the target (one or many lines) inside the canvas.
	 * Shrinks the font until every line fits the width AND all lines stacked
	 * fit the height (with margin), so nothing ever clips — whether it's a
	 * single glyph, a poem line, or a whole multi-line passage.
	 */
	private layout(): { fontSize: number; lineHeight: number } {
		if (this.cachedLayout && this.cachedLayout.text === this.target) {
			return this.cachedLayout;
		}
		const margin = 0.85;
		const maxWidth = this.width * margin;
		const maxHeight = this.height * margin;
		const lines = this.lines();
		const lineGap = 1.25; // line height as a multiple of font size

		let fontSize = Math.floor(this.height * 0.8);
		this.ctx.save();
		while (fontSize > 8) {
			this.ctx.font = `${fontSize}px sans-serif`;
			const widest = Math.max(
				...lines.map((l) => this.ctx.measureText(l).width)
			);
			const stackHeight = lines.length * fontSize * lineGap;
			if (widest <= maxWidth && stackHeight <= maxHeight) break;
			fontSize -= 2;
		}
		this.ctx.restore();
		const layout = { text: this.target, fontSize, lineHeight: fontSize * lineGap };
		this.cachedLayout = layout;
		return layout;
	}

	/** Draw the target text (all lines, centered) using the given paint fn. */
	private paintTarget(
		ctx: CanvasRenderingContext2D,
		paint: (line: string, x: number, y: number) => void
	) {
		const { fontSize, lineHeight } = this.layout();
		const lines = this.lines();
		ctx.font = `${fontSize}px sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		const cx = this.width / 2;
		const totalH = lines.length * lineHeight;
		const startY = this.height / 2 - totalH / 2 + lineHeight / 2;
		lines.forEach((line, i) => {
			paint(line, cx, startY + i * lineHeight);
		});
	}

	private drawGuide() {
		if (this.guide === "none") return;
		const { ctx } = this;
		ctx.save();
		if (this.guide === "lines") {
			this.drawRuledLines(ctx);
		} else if (this.target) {
			if (this.guide === "filled") {
				ctx.fillStyle = "rgba(120, 120, 120, 0.22)";
				this.paintTarget(ctx, (line, x, y) => ctx.fillText(line, x, y));
			} else {
				// outline
				ctx.lineWidth = 2;
				ctx.strokeStyle = "rgba(120, 120, 120, 0.55)";
				this.paintTarget(ctx, (line, x, y) => ctx.strokeText(line, x, y));
			}
		}
		ctx.restore();
	}

	/** Evenly spaced horizontal ruled lines, like writing paper. */
	private drawRuledLines(ctx: CanvasRenderingContext2D) {
		const gap = Math.max(28, Math.round(this.height / 6));
		ctx.strokeStyle = "rgba(120, 120, 120, 0.28)";
		ctx.lineWidth = 1;
		for (let y = gap; y < this.height; y += gap) {
			ctx.beginPath();
			ctx.moveTo(8, y + 0.5);
			ctx.lineTo(this.width - 8, y + 0.5);
			ctx.stroke();
		}
	}

	private drawStrokes(ctx: CanvasRenderingContext2D = this.ctx) {
		ctx.save();
		ctx.strokeStyle = this.strokeColor;
		ctx.lineWidth = this.strokeWidth;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		const all = this.current ? [...this.strokes, this.current] : this.strokes;
		for (const stroke of all) {
			if (stroke.length === 0) continue;
			ctx.beginPath();
			ctx.moveTo(stroke[0].x, stroke[0].y);
			if (stroke.length === 1) {
				// A single click => a dot.
				ctx.lineTo(stroke[0].x + 0.1, stroke[0].y + 0.1);
			} else {
				for (let i = 1; i < stroke.length; i++) {
					ctx.lineTo(stroke[i].x, stroke[i].y);
				}
			}
			ctx.stroke();
		}
		ctx.restore();
	}

	private redraw() {
		const { ctx } = this;
		ctx.clearRect(0, 0, this.width, this.height);
		// White background so exported PNGs are readable on any theme.
		ctx.save();
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, this.width, this.height);
		ctx.restore();
		this.drawGuide();
		this.drawStrokes();
	}

	/**
	 * A PNG data URL of just the user's strokes on a white background —
	 * no guide. Used for the "guide removed" preview on the completion screen.
	 */
	snapshotStrokes(): string {
		const off = document.createElement("canvas");
		off.width = this.width;
		off.height = this.height;
		const octx = off.getContext("2d");
		if (!octx) return "";
		octx.fillStyle = "#ffffff";
		octx.fillRect(0, 0, this.width, this.height);
		this.drawStrokes(octx);
		return off.toDataURL("image/png");
	}

}
