import { ShapeDetector } from './shapeDetector.js';

// Landmark indices (MediaPipe Hands)
const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  THUMB_IP: 3,
  INDEX_TIP: 8,
  INDEX_PIP: 6,
  INDEX_MCP: 5,
  MIDDLE_TIP: 12,
  MIDDLE_PIP: 10,
  RING_TIP: 16,
  RING_PIP: 14,
  PINKY_TIP: 20,
  PINKY_PIP: 18,
};

export class InteractionEngine {
  constructor(svgRenderer) {
    this.svgRenderer = svgRenderer;
    this.state = 'IDLE';  // 'IDLE' | 'DRAWING' | 'DRAGGING' | 'TEXT_PLACING'
    this.shapeDetector = new ShapeDetector();
    this.positionBuffer = [];
    this.BUFFER_SIZE = 3; // Reduced for faster tracking response

    // Current interaction state
    this.currentPoints = [];
    this.grabbedElement = null;
    this.grabOffset = { x: 0, y: 0 };
    this.liveTextElement = null;

    // Stroke segmentation settings
    this.MAX_POINTS_PER_SEGMENT = 80; // Commit stroke segment after this many points
    this.currentColor = '#FF0000';
    this.currentWidth = 5;

    // Pinch hysteresis - prevent false releases during occlusion
    this.pinchGraceFrames = 0;
    this.PINCH_GRACE_PERIOD = 5; // Frames to wait before considering pinch released (~165ms)
    this.lastValidPinchPoint = null;
    this.wasPinchingInternal = false;

    // Gun gesture state (for placing text)
    this.wasGunPointing = false;
  }

  // Detect "finger gun" gesture - index pointing, thumb up, other fingers curled
  isGunGesture(landmarks) {
    if (!landmarks || landmarks.length === 0) return false;

    const lm = landmarks;

    // Index finger must be extended (tip above PIP)
    const indexExtended = lm[LM.INDEX_TIP].y < lm[LM.INDEX_PIP].y;

    // Thumb should be extended (tip away from index MCP)
    const thumbExtended = lm[LM.THUMB_TIP].y < lm[LM.THUMB_IP].y;

    // Middle, ring, pinky should be curled (tips below PIPs)
    const middleCurled = lm[LM.MIDDLE_TIP].y > lm[LM.MIDDLE_PIP].y;
    const ringCurled = lm[LM.RING_TIP].y > lm[LM.RING_PIP].y;
    const pinkyCurled = lm[LM.PINKY_TIP].y > lm[LM.PINKY_PIP].y;

    // Thumb and index should NOT be close together (not pinching)
    const thumbX = lm[LM.THUMB_TIP].x;
    const thumbY = lm[LM.THUMB_TIP].y;
    const indexX = lm[LM.INDEX_TIP].x;
    const indexY = lm[LM.INDEX_TIP].y;
    const distance = Math.hypot(thumbX - indexX, thumbY - indexY);
    const notPinching = distance > 0.08; // Normalized distance

    return indexExtended && thumbExtended && middleCurled && ringCurled && pinkyCurled && notPinching;
  }

  update(landmarks, canvasWidth, canvasHeight, speechActive) {
    // Determine grace period based on mode - shorter for speech (more responsive)
    const effectiveGracePeriod = speechActive ? 2 : this.PINCH_GRACE_PERIOD;

    if (!landmarks || landmarks.length === 0) {
      // No hand detected - use grace period if was pinching
      if (this.wasPinchingInternal && this.pinchGraceFrames < effectiveGracePeriod) {
        this.pinchGraceFrames++;
        return {
          state: this.state,
          position: this.lastValidPinchPoint,
          isPinching: true, // Maintain pinch during grace period
          thumbPos: null,
          indexPos: null,
        };
      }
      this.wasPinchingInternal = false;
      this.pinchGraceFrames = 0;
      return { state: 'IDLE', position: null, isPinching: false };
    }

    const lm = landmarks;

    // Map normalized → canvas coordinates (flip X for mirror)
    const toCanvas = (lm) => ({
      x: (1 - lm.x) * canvasWidth,
      y: lm.y * canvasHeight,
    });

    const thumbPos = toCanvas(lm[LM.THUMB_TIP]);
    const indexPos = toCanvas(lm[LM.INDEX_TIP]);
    const fingerPos = indexPos;

    // Smooth position
    this.positionBuffer.push(fingerPos);
    if (this.positionBuffer.length > this.BUFFER_SIZE) {
      this.positionBuffer.shift();
    }
    const smoothedPos = {
      x: this.positionBuffer.reduce((s, p) => s + p.x, 0) / this.positionBuffer.length,
      y: this.positionBuffer.reduce((s, p) => s + p.y, 0) / this.positionBuffer.length,
    };

    // Detect pinch gesture (thumb + index close together)
    const pinchDistance = Math.hypot(thumbPos.x - indexPos.x, thumbPos.y - indexPos.y);
    const rawPinching = pinchDistance < 40; // threshold in pixels

    // Apply pinch hysteresis
    let isPinching = rawPinching;

    if (rawPinching) {
      // Currently pinching - reset grace period
      this.pinchGraceFrames = 0;
      this.wasPinchingInternal = true;
      this.lastValidPinchPoint = smoothedPos;
    } else if (this.wasPinchingInternal) {
      // Was pinching but now not detected - use grace period
      // Use shorter grace period during speech for faster response
      const effectiveGrace = speechActive ? 2 : this.PINCH_GRACE_PERIOD;
      if (this.pinchGraceFrames < effectiveGrace) {
        this.pinchGraceFrames++;
        isPinching = true; // Maintain pinch during grace period
      } else {
        // Grace period expired - actually release
        this.wasPinchingInternal = false;
        this.pinchGraceFrames = 0;
      }
    }

    // Detect gun gesture (for placing text)
    const isGunPointing = this.isGunGesture(landmarks);
    const gunJustFired = isGunPointing && !this.wasGunPointing;
    this.wasGunPointing = isGunPointing;

    return {
      state: this.state,
      position: smoothedPos,
      isPinching,
      isGunPointing,
      gunJustFired, // True only on the frame the gun gesture is first detected
      thumbPos,
      indexPos,
    };
  }

  handlePinchStart(pinchPoint, svgRenderer, pencilMode = true) {
    // Check if we're over a text element at the PINCH POINT (between thumb and index)
    const hoveredText = svgRenderer.getTextElementAt(pinchPoint.x, pinchPoint.y);

    if (hoveredText) {
      // Start dragging existing text (always allowed)
      this.state = 'DRAGGING';
      this.grabbedElement = hoveredText;

      // Calculate grab offset in WORLD coordinates
      const worldPinch = svgRenderer.screenToWorld(pinchPoint.x, pinchPoint.y);
      this.grabOffset = {
        x: worldPinch.x - parseFloat(hoveredText.getAttribute('x')),
        y: worldPinch.y - parseFloat(hoveredText.getAttribute('y')),
      };
      hoveredText.setAttribute('cursor', 'grabbing');
      console.log('📌 Grabbed text:', hoveredText.textContent, 'offset:', this.grabOffset);
    } else if (pencilMode) {
      // Start drawing (only if pencil mode enabled)
      this.state = 'DRAWING';
      this.currentPoints = [pinchPoint];
    }
  }

  handlePinchMove(pinchPoint, svgRenderer, color, width) {
    if (this.state === 'DRAWING') {
      // Store current style for segmentation
      if (color) this.currentColor = color;
      if (width) this.currentWidth = width;

      // Add point to current stroke
      const last = this.currentPoints[this.currentPoints.length - 1];
      const dist = Math.hypot(pinchPoint.x - last.x, pinchPoint.y - last.y);
      if (dist > 4) {
        this.currentPoints.push(pinchPoint);

        // Segment long strokes to prevent glitches
        if (this.currentPoints.length >= this.MAX_POINTS_PER_SEGMENT) {
          // Commit current segment
          svgRenderer.createPath(this.currentPoints, this.currentColor, this.currentWidth);
          // Start new segment from last point (for continuity)
          this.currentPoints = [pinchPoint];
        }
      }
    } else if (this.state === 'DRAGGING' && this.grabbedElement) {
      // Convert screen pinch point to world coordinates
      const worldPinch = svgRenderer.screenToWorld(pinchPoint.x, pinchPoint.y);
      // Calculate new world position
      const newX = worldPinch.x - this.grabOffset.x;
      const newY = worldPinch.y - this.grabOffset.y;
      // Update directly in world coordinates
      svgRenderer.updateTextPositionWorld(this.grabbedElement, newX, newY);
    }
  }

  handlePinchEnd(svgRenderer, color, width) {
    if (this.state === 'DRAWING' && this.currentPoints.length > 1) {
      // Try to detect shape
      const shape = this.shapeDetector.detectShape(this.currentPoints);

      if (shape && shape.type === 'circle') {
        // Create perfect circle with smooth animation
        console.log('✨ Circle detected! Confidence:', shape.confidence.toFixed(2));

        // Create the rough stroke first (briefly visible)
        const roughStroke = svgRenderer.createPath(this.currentPoints, color, width);

        // After a brief delay, replace with perfect circle
        setTimeout(() => {
          if (roughStroke) {
            // Fade out rough stroke
            roughStroke.style.transition = 'opacity 0.3s ease-out';
            roughStroke.style.opacity = '0';

            setTimeout(() => {
              svgRenderer.removeElement(roughStroke);
            }, 300);
          }

          // Create perfect circle
          const circle = svgRenderer.createCircle(
            shape.center.x,
            shape.center.y,
            shape.radius,
            color,
            width
          );

          // Animate circle appearance
          if (circle) {
            circle.style.opacity = '0';
            circle.style.transition = 'opacity 0.3s ease-in';
            setTimeout(() => {
              circle.style.opacity = '1';
            }, 50);
          }
        }, 100); // Brief delay to show the rough stroke

      } else {
        // Not a shape, just create normal stroke
        svgRenderer.createPath(this.currentPoints, color, width);
      }

      this.currentPoints = [];
    } else if (this.state === 'DRAGGING' && this.grabbedElement) {
      // Release grabbed element
      this.grabbedElement.setAttribute('cursor', 'grab');
      this.grabbedElement = null;
    }

    this.state = 'IDLE';
  }

  // For real-time stroke preview
  getCurrentPoints() {
    return this.currentPoints;
  }

  // Text placement mode (speech active)
  startLiveText(position, svgRenderer, color, size) {
    if (!this.liveTextElement) {
      this.liveTextElement = svgRenderer.createText('', position.x, position.y, color, size);
      this.state = 'TEXT_PLACING';
    }
  }

  updateLiveText(content, position, svgRenderer) {
    if (this.liveTextElement) {
      svgRenderer.updateTextContent(this.liveTextElement, content);
      svgRenderer.updateTextPosition(this.liveTextElement, position.x, position.y);
    }
  }

  finalizeLiveText() {
    if (this.liveTextElement) {
      // Text stays where it is
      this.liveTextElement.setAttribute('cursor', 'grab');
      console.log('✅ Finalized text:', {
        id: this.liveTextElement.id,
        content: this.liveTextElement.textContent,
        position: {
          x: this.liveTextElement.getAttribute('x'),
          y: this.liveTextElement.getAttribute('y')
        },
        parent: this.liveTextElement.parentElement
      });
      this.liveTextElement = null;
      this.state = 'IDLE';
    }
  }

  cancelLiveText(svgRenderer) {
    if (this.liveTextElement) {
      svgRenderer.removeElement(this.liveTextElement);
      this.liveTextElement = null;
      this.state = 'IDLE';
    }
  }
}
