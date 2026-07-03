/**
 * DrawingCanvas — the drawing engine.
 *
 * Owns an HTML5 canvas. Draws a faint target-glyph guide in the background,
 * lets the user draw strokes with the mouse on top, and can export either a
 * flat PNG (guide + strokes) or the raw target/user coverage for scoring.
 *
 * Knows nothing about scoring or Obsidian.
 */

export type GuideStyle = "outline" | "filled" | "none";

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

	private cachedFont: { text: string; font: string } | null = null;

	/**
	 * Font used for both the guide and the target scoring mask.
	 * Shrinks from a target height until the text fits within BOTH the canvas
	 * width and height (with margin), so no target ever clips — whether it's a
	 * single glyph on a square canvas or a full line of a poem on a wide one.
	 */
	private glyphFont(): string {
		const text = this.target;
		if (this.cachedFont && this.cachedFont.text === text) {
			return this.cachedFont.font;
		}
		const margin = 0.85; // keep 15% padding inside the canvas
		const maxWidth = this.width * margin;
		const maxHeight = this.height * margin;
		// Start from the vertical budget, shrink until width also fits.
		let fontSize = Math.floor(maxHeight);
		this.ctx.save();
		while (fontSize > 8) {
			this.ctx.font = `${fontSize}px sans-serif`;
			if (this.ctx.measureText(text).width <= maxWidth) break;
			fontSize -= 2;
		}
		this.ctx.restore();
		const font = `${fontSize}px sans-serif`;
		this.cachedFont = { text, font };
		return font;
	}

	private drawGuide() {
		if (this.guide === "none" || !this.target) return;
		const { ctx } = this;
		const cx = this.width / 2;
		const cy = this.height / 2;

		ctx.save();
		ctx.font = this.glyphFont();
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		if (this.guide === "filled") {
			ctx.fillStyle = "rgba(120, 120, 120, 0.22)";
			ctx.fillText(this.target, cx, cy);
		} else {
			// outline
			ctx.lineWidth = 2;
			ctx.strokeStyle = "rgba(120, 120, 120, 0.55)";
			ctx.strokeText(this.target, cx, cy);
		}
		ctx.restore();
	}

	private drawStrokes() {
		const { ctx } = this;
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

	/** Coverage mask of the target glyph, thickened for scoring tolerance. */
	targetMaskPixels(): { pixels: Uint8ClampedArray; width: number; height: number } {
		const w = this.width;
		const h = this.height;
		const off = document.createElement("canvas");
		off.width = w;
		off.height = h;
		const octx = off.getContext("2d");
		if (!octx) throw new Error("Could not get offscreen context.");

		octx.font = this.glyphFont();
		octx.textAlign = "center";
		octx.textBaseline = "middle";
		octx.fillStyle = "#000000";
		// Thicken the glyph with a stroke halo so small mouse wobble is forgiven.
		octx.lineWidth = Math.max(4, Math.floor(this.strokeWidth * 1.2));
		octx.strokeStyle = "#000000";
		octx.lineJoin = "round";
		const cx = w / 2;
		const cy = h / 2;
		octx.strokeText(this.target, cx, cy);
		octx.fillText(this.target, cx, cy);

		const img = octx.getImageData(0, 0, w, h);
		return { pixels: img.data, width: w, height: h };
	}

	/** Coverage mask of just the user's strokes (no guide, no background). */
	userMaskPixels(): { pixels: Uint8ClampedArray; width: number; height: number } {
		const w = this.width;
		const h = this.height;
		const off = document.createElement("canvas");
		off.width = w;
		off.height = h;
		const octx = off.getContext("2d");
		if (!octx) throw new Error("Could not get offscreen context.");

		octx.strokeStyle = "#000000";
		octx.lineWidth = this.strokeWidth;
		octx.lineCap = "round";
		octx.lineJoin = "round";
		const all = this.current ? [...this.strokes, this.current] : this.strokes;
		for (const stroke of all) {
			if (stroke.length === 0) continue;
			octx.beginPath();
			octx.moveTo(stroke[0].x, stroke[0].y);
			if (stroke.length === 1) {
				octx.lineTo(stroke[0].x + 0.1, stroke[0].y + 0.1);
			} else {
				for (let i = 1; i < stroke.length; i++) {
					octx.lineTo(stroke[i].x, stroke[i].y);
				}
			}
			octx.stroke();
		}

		const img = octx.getImageData(0, 0, w, h);
		return { pixels: img.data, width: w, height: h };
	}

	/** Export the visible canvas (background + guide + strokes) as a PNG blob. */
	async toPngBlob(): Promise<Blob> {
		return await new Promise((resolve, reject) => {
			this.el.toBlob((blob) => {
				if (blob) resolve(blob);
				else reject(new Error("Canvas export failed."));
			}, "image/png");
		});
	}
}
