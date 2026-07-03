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
	size: number;
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
	private opts: Required<DrawingCanvasOptions>;

	/** Completed strokes, plus the in-progress one. */
	private strokes: Point[][] = [];
	private current: Point[] | null = null;
	private drawing = false;

	constructor(parent: HTMLElement, options: DrawingCanvasOptions) {
		this.opts = {
			strokeColor: "#e63946",
			strokeWidth: 6,
			...options,
		};

		const canvas = document.createElement("canvas");
		canvas.width = this.opts.size;
		canvas.height = this.opts.size;
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
		this.opts.guide = guide;
		this.redraw();
	}

	isEmpty(): boolean {
		return this.strokes.length === 0 && !this.current;
	}

	/** The font used for both the guide and the target scoring mask. */
	private glyphFont(): string {
		// Leave headroom so descenders/tall glyphs fit.
		const fontSize = Math.floor(this.opts.size * 0.7);
		return `${fontSize}px sans-serif`;
	}

	private drawGuide() {
		if (this.opts.guide === "none" || !this.opts.target) return;
		const { ctx } = this;
		const cx = this.opts.size / 2;
		const cy = this.opts.size / 2;

		ctx.save();
		ctx.font = this.glyphFont();
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		if (this.opts.guide === "filled") {
			ctx.fillStyle = "rgba(120, 120, 120, 0.22)";
			ctx.fillText(this.opts.target, cx, cy);
		} else {
			// outline
			ctx.lineWidth = 2;
			ctx.strokeStyle = "rgba(120, 120, 120, 0.55)";
			ctx.strokeText(this.opts.target, cx, cy);
		}
		ctx.restore();
	}

	private drawStrokes() {
		const { ctx } = this;
		ctx.save();
		ctx.strokeStyle = this.opts.strokeColor;
		ctx.lineWidth = this.opts.strokeWidth;
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
		ctx.clearRect(0, 0, this.opts.size, this.opts.size);
		// White background so exported PNGs are readable on any theme.
		ctx.save();
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, this.opts.size, this.opts.size);
		ctx.restore();
		this.drawGuide();
		this.drawStrokes();
	}

	/** Coverage mask of the target glyph, thickened for scoring tolerance. */
	targetMaskPixels(): { pixels: Uint8ClampedArray; width: number; height: number } {
		const size = this.opts.size;
		const off = document.createElement("canvas");
		off.width = size;
		off.height = size;
		const octx = off.getContext("2d");
		if (!octx) throw new Error("Could not get offscreen context.");

		octx.font = this.glyphFont();
		octx.textAlign = "center";
		octx.textBaseline = "middle";
		octx.fillStyle = "#000000";
		// Thicken the glyph with a stroke halo so small mouse wobble is forgiven.
		octx.lineWidth = Math.max(4, Math.floor(this.opts.strokeWidth * 1.2));
		octx.strokeStyle = "#000000";
		octx.lineJoin = "round";
		const cx = size / 2;
		const cy = size / 2;
		octx.strokeText(this.opts.target, cx, cy);
		octx.fillText(this.opts.target, cx, cy);

		const img = octx.getImageData(0, 0, size, size);
		return { pixels: img.data, width: size, height: size };
	}

	/** Coverage mask of just the user's strokes (no guide, no background). */
	userMaskPixels(): { pixels: Uint8ClampedArray; width: number; height: number } {
		const size = this.opts.size;
		const off = document.createElement("canvas");
		off.width = size;
		off.height = size;
		const octx = off.getContext("2d");
		if (!octx) throw new Error("Could not get offscreen context.");

		octx.strokeStyle = "#000000";
		octx.lineWidth = this.opts.strokeWidth;
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

		const img = octx.getImageData(0, 0, size, size);
		return { pixels: img.data, width: size, height: size };
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
