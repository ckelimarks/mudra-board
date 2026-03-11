// Pure data store — no canvas/DOM knowledge
export class AnnotationStore {
  constructor() {
    this.strokes = [];       // [{ points: [{x,y}], color, size }]
    this.textItems = [];     // [{ text, x, y, color, size, id }]
    this.currentStroke = null;
    this.history = [];       // For undo: snapshots of [strokes, textItems]
  }

  beginStroke(x, y, color, size) {
    this._saveHistory();
    this.currentStroke = { points: [{ x, y }], color, size };
  }

  addPoint(x, y) {
    if (!this.currentStroke) return;
    // Only add point if moved enough (reduces noise)
    const last = this.currentStroke.points.at(-1);
    const dist = Math.hypot(x - last.x, y - last.y);
    if (dist > 4) {  // Increased threshold for smoother strokes
      this.currentStroke.points.push({ x, y });
    }
  }

  endStroke() {
    if (this.currentStroke && this.currentStroke.points.length > 1) {
      this.strokes.push(this.currentStroke);
    }
    this.currentStroke = null;
  }

  addText(text, x, y, color, size) {
    this._saveHistory();
    this.textItems.push({
      text, x, y, color,
      size: Math.max(size * 3, 18), // Scale up so text is readable
      id: Date.now()
    });
  }

  undo() {
    if (this.history.length === 0) return;
    const prev = this.history.pop();
    this.strokes = prev.strokes;
    this.textItems = prev.textItems;
    this.currentStroke = null;
  }

  clear() {
    this._saveHistory();
    this.strokes = [];
    this.textItems = [];
    this.currentStroke = null;
  }

  _saveHistory() {
    // Deep copy current state
    this.history.push({
      strokes: JSON.parse(JSON.stringify(this.strokes)),
      textItems: JSON.parse(JSON.stringify(this.textItems))
    });
    // Cap history at 20 states
    if (this.history.length > 20) this.history.shift();
  }
}
