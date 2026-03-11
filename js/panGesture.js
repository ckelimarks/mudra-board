// Two-hand pan gesture for infinite canvas scrolling
const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_TIP: 8,
};

export class PanGesture {
  constructor() {
    this.isPanning = false;
    this.panX = 0;
    this.panY = 0;
    this.lastMidpoint = null;
    this.smoothingBuffer = [];
    this.SMOOTHING_SIZE = 3;
  }

  // Detect if hand is pinching
  isPinching(landmarks, canvasWidth, canvasHeight) {
    if (!landmarks || landmarks.length === 0) return false;

    const thumb = landmarks[LM.THUMB_TIP];
    const index = landmarks[LM.INDEX_TIP];

    // Convert to canvas coords for distance calculation
    const thumbX = (1 - thumb.x) * canvasWidth;
    const thumbY = thumb.y * canvasHeight;
    const indexX = (1 - index.x) * canvasWidth;
    const indexY = index.y * canvasHeight;

    const distance = Math.hypot(thumbX - indexX, thumbY - indexY);
    return distance < 50; // Slightly larger threshold for two-hand gesture
  }

  // Get midpoint between thumb and index (pinch point)
  getPinchPoint(landmarks, canvasWidth, canvasHeight) {
    const thumb = landmarks[LM.THUMB_TIP];
    const index = landmarks[LM.INDEX_TIP];

    return {
      x: (1 - (thumb.x + index.x) / 2) * canvasWidth,
      y: ((thumb.y + index.y) / 2) * canvasHeight
    };
  }

  // Get midpoint between two hands
  getMidpoint(hand1, hand2, canvasWidth, canvasHeight) {
    const p1 = this.getPinchPoint(hand1, canvasWidth, canvasHeight);
    const p2 = this.getPinchPoint(hand2, canvasWidth, canvasHeight);

    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };
  }

  update(allHandLandmarks, canvasWidth, canvasHeight) {
    // Need exactly two hands for pan gesture
    if (!allHandLandmarks || allHandLandmarks.length < 2) {
      if (this.isPanning) {
        this.isPanning = false;
        this.lastMidpoint = null;
        this.smoothingBuffer = [];
        console.log('🖐️ Pan gesture ended (lost hands)');
      }
      return { panning: false, panX: this.panX, panY: this.panY };
    }

    const hand1 = allHandLandmarks[0];
    const hand2 = allHandLandmarks[1];

    const hand1Pinching = this.isPinching(hand1, canvasWidth, canvasHeight);
    const hand2Pinching = this.isPinching(hand2, canvasWidth, canvasHeight);

    // Both hands must be pinching to pan
    if (hand1Pinching && hand2Pinching) {
      const midpoint = this.getMidpoint(hand1, hand2, canvasWidth, canvasHeight);

      if (!this.isPanning) {
        // Just started panning
        this.isPanning = true;
        this.lastMidpoint = midpoint;
        this.smoothingBuffer = [];
        console.log('🖐️ Pan gesture started at:', midpoint);
      } else if (this.lastMidpoint) {
        // Continue panning - calculate delta
        const deltaX = midpoint.x - this.lastMidpoint.x;
        const deltaY = midpoint.y - this.lastMidpoint.y;

        // Smooth the delta
        this.smoothingBuffer.push({ x: deltaX, y: deltaY });
        if (this.smoothingBuffer.length > this.SMOOTHING_SIZE) {
          this.smoothingBuffer.shift();
        }

        const smoothedDelta = {
          x: this.smoothingBuffer.reduce((s, d) => s + d.x, 0) / this.smoothingBuffer.length,
          y: this.smoothingBuffer.reduce((s, d) => s + d.y, 0) / this.smoothingBuffer.length
        };

        this.panX += smoothedDelta.x;
        this.panY += smoothedDelta.y;
        this.lastMidpoint = midpoint;
      }

      return { panning: true, panX: this.panX, panY: this.panY };
    } else {
      // Not both pinching - stop panning
      if (this.isPanning) {
        this.isPanning = false;
        this.lastMidpoint = null;
        this.smoothingBuffer = [];
        console.log('🖐️ Pan gesture ended at pan:', { x: this.panX, y: this.panY });
      }
      return { panning: false, panX: this.panX, panY: this.panY };
    }
  }

  reset() {
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.lastMidpoint = null;
    this.smoothingBuffer = [];
  }
}
