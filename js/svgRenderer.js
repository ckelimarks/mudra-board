// SVG element creation and manipulation
export class SVGRenderer {
  constructor(svgElement) {
    this.svg = svgElement;
    this.strokesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.strokesGroup.id = 'strokes';
    this.textsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.textsGroup.id = 'texts';

    this.svg.appendChild(this.strokesGroup);
    this.svg.appendChild(this.textsGroup);

    this.elementIndex = 0;
    this.currentRotation = 0; // Track rotation angle in degrees
    this.rotationCenterX = 0;
    this.rotationCenterY = 0;
    this.panX = 0; // Pan offset X
    this.panY = 0; // Pan offset Y

    // Cache last applied values to avoid redundant updates
    this._lastTransform = '';
    this._lastRotationForText = null;
  }

  // Apply current transform (pan + rotation) to SVG groups
  applyTransform() {
    // Transform order: translate (pan), then rotate around screen center
    const transform = `translate(${this.panX.toFixed(2)} ${this.panY.toFixed(2)}) rotate(${this.currentRotation.toFixed(2)} ${this.rotationCenterX} ${this.rotationCenterY})`;

    // Only update DOM if transform actually changed
    if (transform !== this._lastTransform) {
      this._lastTransform = transform;
      this.strokesGroup.setAttribute('transform', transform);
      this.textsGroup.setAttribute('transform', transform);
    }

    // Only counter-rotate text when rotation changes significantly
    const rotationRounded = Math.round(this.currentRotation * 10) / 10;
    if (rotationRounded !== this._lastRotationForText) {
      this._lastRotationForText = rotationRounded;
      this.updateTextCounterRotation();
    }
  }

  // Apply counter-rotation to all text elements so they stay horizontal
  updateTextCounterRotation() {
    const textElements = Array.from(this.textsGroup.children);
    const counterRot = -this.currentRotation;
    for (const text of textElements) {
      const x = parseFloat(text.getAttribute('x'));
      const y = parseFloat(text.getAttribute('y'));
      if (Number.isFinite(x) && Number.isFinite(y)) {
        text.setAttribute('transform', `rotate(${counterRot.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`);
      }
    }
  }

  // Set rotation for the SVG groups
  setRotation(angle, centerX, centerY) {
    this.currentRotation = angle;
    this.rotationCenterX = centerX;
    this.rotationCenterY = centerY;
    this.applyTransform();
  }

  // Set pan offset
  setPan(panX, panY) {
    this.panX = panX;
    this.panY = panY;
    this.applyTransform();
  }

  // Set both pan and rotation at once
  setTransform(panX, panY, angle, centerX, centerY) {
    this.panX = panX;
    this.panY = panY;
    this.currentRotation = angle;
    this.rotationCenterX = centerX;
    this.rotationCenterY = centerY;
    this.applyTransform();
  }

  // Convert screen coordinates to world coordinates (inverse pan + inverse rotation)
  // Use this before creating/placing elements
  screenToWorld(x, y) {
    // Validate input
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return { x: 0, y: 0 };
    }

    // First, undo the pan (translate)
    let wx = x - (this.panX || 0);
    let wy = y - (this.panY || 0);

    // Then, undo the rotation
    if (this.currentRotation && this.currentRotation !== 0) {
      const cx = this.rotationCenterX || 0;
      const cy = this.rotationCenterY || 0;
      const angleRad = -this.currentRotation * (Math.PI / 180);

      const dx = wx - cx;
      const dy = wy - cy;

      wx = Math.cos(angleRad) * dx - Math.sin(angleRad) * dy + cx;
      wy = Math.sin(angleRad) * dx + Math.cos(angleRad) * dy + cy;
    }

    // Validate output
    if (!Number.isFinite(wx)) wx = x;
    if (!Number.isFinite(wy)) wy = y;

    return { x: wx, y: wy };
  }

  // Convert world coordinates to screen coordinates (rotation + pan)
  // Use this for hit detection visualization
  worldToScreen(x, y) {
    let sx = x;
    let sy = y;

    // First apply rotation
    if (this.currentRotation !== 0) {
      const cx = this.rotationCenterX;
      const cy = this.rotationCenterY;
      const angleRad = this.currentRotation * (Math.PI / 180);

      const dx = sx - cx;
      const dy = sy - cy;

      sx = Math.cos(angleRad) * dx - Math.sin(angleRad) * dy + cx;
      sy = Math.sin(angleRad) * dx + Math.cos(angleRad) * dy + cy;
    }

    // Then apply pan
    sx += this.panX;
    sy += this.panY;

    return { x: sx, y: sy };
  }

  createPath(points, color, width) {
    if (points.length < 2) return null;

    // Convert screen coordinates to world coordinates
    const worldPoints = points.map(p => this.screenToWorld(p.x, p.y));

    // Validate coordinates - skip if any are invalid
    const validPoints = worldPoints.filter(p =>
      Number.isFinite(p.x) && Number.isFinite(p.y)
    );
    if (validPoints.length < 2) return null;

    // Convert points to SVG path data with quadratic smoothing
    let d = `M ${validPoints[0].x} ${validPoints[0].y}`;

    for (let i = 1; i < validPoints.length - 1; i++) {
      const midX = (validPoints[i].x + validPoints[i + 1].x) / 2;
      const midY = (validPoints[i].y + validPoints[i + 1].y) / 2;
      d += ` Q ${validPoints[i].x} ${validPoints[i].y} ${midX} ${midY}`;
    }

    if (validPoints.length > 1) {
      const last = validPoints[validPoints.length - 1];
      d += ` L ${last.x} ${last.y}`;
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', width);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('fill', 'none');
    path.setAttribute('data-id', `stroke-${this.elementIndex++}`);

    this.strokesGroup.appendChild(path);
    return path;
  }

  createText(content, x, y, color, size) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    const id = `text-${this.elementIndex++}`;

    // Convert screen coordinates to world coordinates
    const worldPos = this.screenToWorld(x, y);

    text.setAttribute('id', id);
    text.setAttribute('x', worldPos.x);
    text.setAttribute('y', worldPos.y);
    text.setAttribute('fill', color);
    text.setAttribute('font-size', size);
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('font-family', 'sans-serif');
    text.setAttribute('data-draggable', 'true');
    text.setAttribute('cursor', 'grab');
    text.textContent = content;

    // Add shadow for readability
    text.style.paintOrder = 'stroke fill';
    text.setAttribute('stroke', 'rgba(0,0,0,0.5)');
    text.setAttribute('stroke-width', '2');

    // Apply counter-rotation so text stays horizontal
    text.setAttribute('transform', `rotate(${-this.currentRotation} ${worldPos.x} ${worldPos.y})`);

    this.textsGroup.appendChild(text);

    console.log('📝 Created text element:', {
      id,
      content,
      screenPos: { x, y },
      worldPos: { x: worldPos.x.toFixed(1), y: worldPos.y.toFixed(1) },
      rotation: this.currentRotation.toFixed(1),
      counterRotation: -this.currentRotation,
      parent: this.textsGroup,
      totalTexts: this.textsGroup.children.length
    });

    return text;
  }

  updateTextPosition(textElement, x, y) {
    // Convert screen coordinates to world coordinates
    const worldPos = this.screenToWorld(x, y);
    textElement.setAttribute('x', worldPos.x);
    textElement.setAttribute('y', worldPos.y);
    // Update counter-rotation for new position
    textElement.setAttribute('transform', `rotate(${-this.currentRotation} ${worldPos.x} ${worldPos.y})`);
  }

  // Update text position using world coordinates directly (for dragging)
  updateTextPositionWorld(textElement, worldX, worldY) {
    textElement.setAttribute('x', worldX);
    textElement.setAttribute('y', worldY);
    // Update counter-rotation for new position
    textElement.setAttribute('transform', `rotate(${-this.currentRotation} ${worldX} ${worldY})`);
  }

  updateTextContent(textElement, content) {
    textElement.textContent = content;
  }

  removeElement(element) {
    element.remove();
  }

  getTextElementAt(x, y) {
    // Convert screen coordinates to world coordinates for comparison
    const worldPos = this.screenToWorld(x, y);

    // Check if point is inside any text element's bounding box
    const textElements = this.getAllTextElements();

    console.log('🎯 HIT CHECK at screen:', { x: x.toFixed(1), y: y.toFixed(1) },
                'world:', { x: worldPos.x.toFixed(1), y: worldPos.y.toFixed(1) },
                'rotation:', this.currentRotation.toFixed(1),
                'against', textElements.length, 'text elements');

    for (const text of textElements) {
      const textX = parseFloat(text.getAttribute('x'));
      const textY = parseFloat(text.getAttribute('y'));
      const bbox = text.getBBox();

      // Expand hit area for easier grabbing
      const hitMargin = 60; // Very generous for debugging

      // Use text attributes for position, bbox for size
      // Elements store world coordinates, so compare with world coordinates
      const hitBox = {
        left: textX - hitMargin,
        right: textX + bbox.width + hitMargin,
        top: textY - bbox.height - hitMargin,
        bottom: textY + hitMargin
      };

      const xInRange = worldPos.x >= hitBox.left && worldPos.x <= hitBox.right;
      const yInRange = worldPos.y >= hitBox.top && worldPos.y <= hitBox.bottom;
      const inBounds = xInRange && yInRange;

      console.log(`  📄 "${text.textContent.substring(0, 30)}"`, {
        textX: textX.toFixed(1),
        textY: textY.toFixed(1),
        bboxW: bbox.width.toFixed(1),
        bboxH: bbox.height.toFixed(1),
        hitBox: {
          left: hitBox.left.toFixed(1),
          right: hitBox.right.toFixed(1),
          top: hitBox.top.toFixed(1),
          bottom: hitBox.bottom.toFixed(1)
        },
        worldX: worldPos.x.toFixed(1),
        worldY: worldPos.y.toFixed(1),
        xInRange,
        yInRange,
        inBounds
      });

      if (inBounds) {
        console.log('✅ HIT DETECTED!', text.textContent);
        return text;
      }
    }

    console.log('❌ No hit detected');
    return null;
  }

  clear() {
    this.strokesGroup.innerHTML = '';
    this.textsGroup.innerHTML = '';
  }

  exportSVG() {
    return this.svg.outerHTML;
  }

  getAllTextElements() {
    const elements = Array.from(this.textsGroup.children);
    console.log('getAllTextElements called:', {
      count: elements.length,
      textsGroup: this.textsGroup,
      children: elements.map(el => ({ id: el.id, text: el.textContent }))
    });
    return elements;
  }

  getAllStrokeElements() {
    return Array.from(this.strokesGroup.children);
  }
}
