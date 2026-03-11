// Hand rotation gesture for rotating the canvas
const LM = {
  WRIST: 0,
  INDEX_TIP: 8, INDEX_PIP: 6,
  MIDDLE_TIP: 12, MIDDLE_PIP: 10,
  RING_TIP: 16, RING_PIP: 14,
  PINKY_TIP: 20, PINKY_PIP: 18,
};

export class RotationGesture {
  constructor() {
    this.isRotating = false;
    this.currentRotation = 0; // degrees - persistent rotation
    this.baseAngle = null; // Hand angle when palm first opened
    this.rotationAtGrab = 0; // Canvas rotation when palm opened
    this.smoothingBuffer = [];
    this.SMOOTHING_SIZE = 5;
  }

  // Detect if hand is showing open palm
  isOpenPalm(landmarks) {
    if (!landmarks || landmarks.length === 0) return false;

    const lm = landmarks;

    // Check if main 4 fingers are extended
    const indexExtended = lm[LM.INDEX_TIP].y < lm[LM.INDEX_PIP].y;
    const middleExtended = lm[LM.MIDDLE_TIP].y < lm[LM.MIDDLE_PIP].y;
    const ringExtended = lm[LM.RING_TIP].y < lm[LM.RING_PIP].y;
    const pinkyExtended = lm[LM.PINKY_TIP].y < lm[LM.PINKY_PIP].y;

    const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

    // Check fingers are spread
    const indexX = lm[LM.INDEX_TIP].x;
    const pinkyX = lm[LM.PINKY_TIP].x;
    const spread = Math.abs(indexX - pinkyX);

    return extendedCount >= 3 && spread > 0.10;
  }

  // Calculate hand rotation angle in degrees
  getHandAngle(landmarks) {
    if (!landmarks || landmarks.length === 0) return 0;

    const wrist = landmarks[LM.WRIST];
    const middleFinger = landmarks[LM.MIDDLE_TIP];

    // Vector from wrist to middle finger tip
    const dx = middleFinger.x - wrist.x;
    const dy = middleFinger.y - wrist.y;

    // Calculate angle in degrees (0 = pointing up, clockwise positive)
    let angle = Math.atan2(dx, -dy) * (180 / Math.PI);

    return angle;
  }

  update(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      // No hand - keep current rotation, stop rotating
      if (this.isRotating) {
        this.isRotating = false;
        this.baseAngle = null;
        this.smoothingBuffer = [];
      }
      return { rotating: false, angle: this.currentRotation };
    }

    const isOpen = this.isOpenPalm(landmarks);
    const handAngle = this.getHandAngle(landmarks);

    if (isOpen) {
      // Palm is open - rotate
      if (!this.isRotating) {
        // Just started rotating - set base angle
        this.isRotating = true;
        this.baseAngle = handAngle;
        this.rotationAtGrab = this.currentRotation;
        this.smoothingBuffer = [];
        console.log('🔄 Started rotating, base angle:', this.baseAngle.toFixed(1));
      }

      // Calculate rotation relative to base angle
      let deltaAngle = handAngle - this.baseAngle;

      // Handle angle wrapping (crossing 180/-180 boundary)
      if (deltaAngle > 180) deltaAngle -= 360;
      if (deltaAngle < -180) deltaAngle += 360;

      // Mirror the rotation (negate delta) to match hand movement
      deltaAngle = -deltaAngle;

      // New rotation = rotation when grabbed + delta
      const newRotation = this.rotationAtGrab + deltaAngle;

      // Smooth the rotation
      this.smoothingBuffer.push(newRotation);
      if (this.smoothingBuffer.length > this.SMOOTHING_SIZE) {
        this.smoothingBuffer.shift();
      }

      this.currentRotation = this.smoothingBuffer.reduce((a, b) => a + b, 0) / this.smoothingBuffer.length;

      return { rotating: true, angle: this.currentRotation };
    } else {
      // Closed hand - stop rotating but keep current rotation
      if (this.isRotating) {
        this.isRotating = false;
        this.baseAngle = null;
        this.smoothingBuffer = [];
        console.log('🔄 Stopped rotating at:', this.currentRotation.toFixed(1));
      }
      return { rotating: false, angle: this.currentRotation };
    }
  }

  reset() {
    this.currentRotation = 0;
    this.isRotating = false;
  }
}
