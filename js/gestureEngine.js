// Landmark indices (MediaPipe Hands)
const LM = {
  WRIST: 0,
  THUMB_TIP: 4, THUMB_IP: 3,
  INDEX_TIP: 8, INDEX_PIP: 6,
  MIDDLE_TIP: 12, MIDDLE_PIP: 10,
  RING_TIP: 16, RING_PIP: 14,
  PINKY_TIP: 20, PINKY_PIP: 18,
};

export class GestureEngine {
  constructor() {
    this.state = 'IDLE';    // 'IDLE' | 'DRAWING'
    this.positionBuffer = []; // Smoothing buffer
    this.BUFFER_SIZE = 6;     // Increased for smoother tracking
  }

  // Returns { state, position: {x, y} | null }
  update(landmarks, canvasWidth, canvasHeight) {
    if (!landmarks || landmarks.length === 0) {
      this.state = 'IDLE';
      return { state: 'IDLE', position: null };
    }

    const lm = landmarks;

    // Map normalized → canvas coordinates (flip X for mirror)
    const toCanvas = (lm) => ({
      x: (1 - lm.x) * canvasWidth,
      y: lm.y * canvasHeight,
    });

    const fingerPos = toCanvas(lm[LM.INDEX_TIP]);

    // Smooth position
    this.positionBuffer.push(fingerPos);
    if (this.positionBuffer.length > this.BUFFER_SIZE) {
      this.positionBuffer.shift();
    }
    const smoothedPos = {
      x: this.positionBuffer.reduce((s, p) => s + p.x, 0) / this.positionBuffer.length,
      y: this.positionBuffer.reduce((s, p) => s + p.y, 0) / this.positionBuffer.length,
    };

    // Gesture classification
    const isPointing = this._isFingerExtended(lm, LM.INDEX_TIP, LM.INDEX_PIP) &&
                       !this._isFingerExtended(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP) &&
                       !this._isFingerExtended(lm, LM.RING_TIP, LM.RING_PIP);

    const isOpenPalm = this._isFingerExtended(lm, LM.INDEX_TIP, LM.INDEX_PIP) &&
                       this._isFingerExtended(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP) &&
                       this._isFingerExtended(lm, LM.RING_TIP, LM.RING_PIP) &&
                       this._isFingerExtended(lm, LM.PINKY_TIP, LM.PINKY_PIP);

    // State transitions
    if (isPointing) {
      this.state = 'DRAWING';
    } else if (isOpenPalm) {
      this.state = 'IDLE';
    } else {
      this.state = 'IDLE';
    }

    return { state: this.state, position: smoothedPos };
  }

  _isFingerExtended(lm, tipIdx, pipIdx) {
    // Tip is "above" (smaller y) than the pip joint = extended
    return lm[tipIdx].y < lm[pipIdx].y;
  }

  _distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
