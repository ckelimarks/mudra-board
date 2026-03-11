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
    this.currentRotation = 0; // Track rotation angle
  }

  // Set rotation for the SVG groups
  setRotation(angle, centerX, centerY) {
    this.currentRotation = angle;
    const transform = `rotate(${angle} ${centerX} ${centerY})`;
    this.strokesGroup.setAttribute('transform', transform);
    this.textsGroup.setAttribute('transform', transform);
  }

  createPath(points, color, width) {
    if (points.length < 2) return null;

    // Convert points to SVG path data with quadratic smoothing
    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      d += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
    }

    if (points.length > 1) {
      const last = points[points.length - 1];
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

    text.setAttribute('id', id);
    text.setAttribute('x', x);
    text.setAttribute('y', y);
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

    this.textsGroup.appendChild(text);

    console.log('📝 Created text element:', {
      id,
      content,
      position: { x, y },
      parent: this.textsGroup,
      totalTexts: this.textsGroup.children.length
    });

    return text;
  }

  updateTextPosition(textElement, x, y) {
    textElement.setAttribute('x', x);
    textElement.setAttribute('y', y);
  }

  updateTextContent(textElement, content) {
    textElement.textContent = content;
  }

  removeElement(element) {
    element.remove();
  }

  getTextElementAt(x, y) {
    // Check if point is inside any text element's bounding box
    const textElements = this.getAllTextElements();

    console.log('🎯 HIT CHECK at:', { x: x.toFixed(1), y: y.toFixed(1) }, 'against', textElements.length, 'text elements');

    for (const text of textElements) {
      const textX = parseFloat(text.getAttribute('x'));
      const textY = parseFloat(text.getAttribute('y'));
      const bbox = text.getBBox();

      // Expand hit area for easier grabbing
      const hitMargin = 60; // Very generous for debugging

      // Use text attributes for position, bbox for size
      const hitBox = {
        left: textX - hitMargin,
        right: textX + bbox.width + hitMargin,
        top: textY - bbox.height - hitMargin,
        bottom: textY + hitMargin
      };

      const xInRange = x >= hitBox.left && x <= hitBox.right;
      const yInRange = y >= hitBox.top && y <= hitBox.bottom;
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
        pointX: x.toFixed(1),
        pointY: y.toFixed(1),
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
