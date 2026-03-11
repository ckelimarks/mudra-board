// Landmark indices (MediaPipe Hands)
const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_TIP: 8,
  INDEX_PIP: 6,
  MIDDLE_TIP: 12,
  MIDDLE_PIP: 10,
};

export class InteractionEngine {
  constructor(svgRenderer) {
    this.svgRenderer = svgRenderer;
    this.state = 'IDLE';  // 'IDLE' | 'DRAWING' | 'DRAGGING' | 'TEXT_PLACING'
    this.positionBuffer = [];
    this.BUFFER_SIZE = 6;

    // Current interaction state
    this.currentPoints = [];
    this.grabbedElement = null;
    this.grabOffset = { x: 0, y: 0 };
    this.liveTextElement = null;
  }

  update(landmarks, canvasWidth, canvasHeight, speechActive) {
    if (!landmarks || landmarks.length === 0) {
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
    const isPinching = pinchDistance < 40; // threshold in pixels

    return {
      state: this.state,
      position: smoothedPos,
      isPinching,
      thumbPos,
      indexPos,
    };
  }

  handlePinchStart(pinchPoint, svgRenderer) {
    // Check if we're over a text element at the PINCH POINT (between thumb and index)
    const hoveredText = svgRenderer.getTextElementAt(pinchPoint.x, pinchPoint.y);

    if (hoveredText) {
      // Start dragging existing text
      this.state = 'DRAGGING';
      this.grabbedElement = hoveredText;
      this.grabOffset = {
        x: pinchPoint.x - parseFloat(hoveredText.getAttribute('x')),
        y: pinchPoint.y - parseFloat(hoveredText.getAttribute('y')),
      };
      hoveredText.setAttribute('cursor', 'grabbing');
      console.log('📌 Grabbed text:', hoveredText.textContent);
    } else {
      // Start drawing
      this.state = 'DRAWING';
      this.currentPoints = [pinchPoint];
    }
  }

  handlePinchMove(pinchPoint, svgRenderer) {
    if (this.state === 'DRAWING') {
      // Add point to current stroke
      const last = this.currentPoints[this.currentPoints.length - 1];
      const dist = Math.hypot(pinchPoint.x - last.x, pinchPoint.y - last.y);
      if (dist > 4) {
        this.currentPoints.push(pinchPoint);
      }
    } else if (this.state === 'DRAGGING' && this.grabbedElement) {
      // Update text position using pinch point
      const newX = pinchPoint.x - this.grabOffset.x;
      const newY = pinchPoint.y - this.grabOffset.y;
      svgRenderer.updateTextPosition(this.grabbedElement, newX, newY);
    }
  }

  handlePinchEnd(svgRenderer, color, width) {
    if (this.state === 'DRAWING' && this.currentPoints.length > 1) {
      // Finalize stroke as SVG path
      svgRenderer.createPath(this.currentPoints, color, width);
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
