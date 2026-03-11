// Gesture-based commands using second hand
const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_TIP: 8, INDEX_PIP: 6,
  MIDDLE_TIP: 12, MIDDLE_PIP: 10,
  RING_TIP: 16, RING_PIP: 14,
  PINKY_TIP: 20, PINKY_PIP: 18,
};

export class GestureCommands {
  constructor() {
    this.lastToggleTime = 0;
    this.TOGGLE_COOLDOWN = 1000; // ms - prevent rapid toggling
    this.lastGestureState = null;
  }

  // Detect open palm gesture on second hand
  detectOpenPalm(landmarks) {
    if (!landmarks || landmarks.length === 0) return false;

    const lm = landmarks;

    // Check if main 4 fingers are extended (ignore thumb - it's tricky)
    const indexExtended = lm[LM.INDEX_TIP].y < lm[LM.INDEX_PIP].y;
    const middleExtended = lm[LM.MIDDLE_TIP].y < lm[LM.MIDDLE_PIP].y;
    const ringExtended = lm[LM.RING_TIP].y < lm[LM.RING_PIP].y;
    const pinkyExtended = lm[LM.PINKY_TIP].y < lm[LM.PINKY_PIP].y;

    // At least 3 of 4 fingers must be extended (more forgiving)
    const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;
    const mostlyExtended = extendedCount >= 3;

    // Check that fingers are spread (not a fist with fingers pointing up)
    const indexX = lm[LM.INDEX_TIP].x;
    const pinkyX = lm[LM.PINKY_TIP].x;
    const spread = Math.abs(indexX - pinkyX);
    const isSpread = spread > 0.10; // Relaxed from 0.15

    const result = mostlyExtended && isSpread;

    // Debug logging (will show in browser console)
    if (mostlyExtended) {
      console.log('Open palm check:', {
        extendedCount,
        spread: spread.toFixed(3),
        isSpread,
        result
      });
    }

    return result;
  }

  // Check if hand is pinching (thumb + index close together)
  isPinching(landmarks) {
    if (!landmarks || landmarks.length === 0) return false;
    const thumbPos = landmarks[LM.THUMB_TIP];
    const indexPos = landmarks[LM.INDEX_TIP];
    const distance = Math.hypot(thumbPos.x - indexPos.x, thumbPos.y - indexPos.y);
    return distance < 0.05; // normalized distance threshold
  }

  // Process two-hand input and detect commands
  update(hands) {
    const now = Date.now();

    // Need exactly 2 hands for commands
    if (!hands || hands.length !== 2) {
      this.lastGestureState = null;
      return { command: null };
    }

    const [hand1, hand2] = hands;

    // Only check open palm on the hand that's NOT pinching
    const hand1Pinching = this.isPinching(hand1);
    const hand2Pinching = this.isPinching(hand2);

    let currentGesture = null;

    // Check non-pinching hand for open palm gesture
    if (!hand1Pinching && this.detectOpenPalm(hand1)) {
      currentGesture = 'OPEN_PALM';
    } else if (!hand2Pinching && this.detectOpenPalm(hand2)) {
      currentGesture = 'OPEN_PALM';
    }

    // Detect gesture transition (wasn't open palm, now is)
    if (currentGesture === 'OPEN_PALM' && this.lastGestureState !== 'OPEN_PALM') {
      // Check cooldown
      if (now - this.lastToggleTime > this.TOGGLE_COOLDOWN) {
        console.log('🎤 TOGGLE_SPEECH command triggered!');
        this.lastToggleTime = now;
        this.lastGestureState = currentGesture;
        return { command: 'TOGGLE_SPEECH' };
      } else {
        console.log('⏳ Cooldown active, ignoring gesture');
      }
    }

    this.lastGestureState = currentGesture;
    return { command: null };
  }

  reset() {
    this.lastGestureState = null;
  }
}
