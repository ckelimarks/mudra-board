// Shape detection for converting rough sketches to clean geometric shapes

export class ShapeDetector {
  constructor() {
    this.CIRCLE_CLOSURE_THRESHOLD = 50; // pixels
    this.CIRCLE_VARIANCE_THRESHOLD = 0.15; // 15% radius variance allowed
  }

  /**
   * Detect if a stroke is a circle
   * @param {Array} points - Array of {x, y} points
   * @returns {Object|null} - {center: {x, y}, radius: number} or null
   */
  detectCircle(points) {
    console.log('🔍 Checking if stroke is a circle...', {
      numPoints: points.length,
      firstPoint: points[0],
      lastPoint: points[points.length - 1]
    });

    if (points.length < 10) {
      console.log('❌ Too few points:', points.length);
      return null;
    }

    // 1. Check if shape is closed (start and end points close together)
    const start = points[0];
    const end = points[points.length - 1];
    const closureDistance = this.distance(start, end);

    console.log('📏 Closure distance:', closureDistance, '(threshold:', this.CIRCLE_CLOSURE_THRESHOLD + ')');

    if (closureDistance > this.CIRCLE_CLOSURE_THRESHOLD) {
      console.log('❌ Not closed - distance too large');
      return null; // Not a closed shape
    }

    // 2. Find center point (average of all points)
    const center = {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
    };

    // 3. Calculate radii from all points to center
    const radii = points.map(p => this.distance(p, center));
    const avgRadius = radii.reduce((sum, r) => sum + r, 0) / radii.length;

    // 4. Calculate variance (how much radii differ from average)
    const variance = Math.sqrt(
      radii.reduce((sum, r) => sum + Math.pow(r - avgRadius, 2), 0) / radii.length
    );

    const normalizedVariance = variance / avgRadius;

    console.log('📊 Circle metrics:', {
      avgRadius: avgRadius.toFixed(2),
      variance: variance.toFixed(2),
      normalizedVariance: normalizedVariance.toFixed(3),
      threshold: this.CIRCLE_VARIANCE_THRESHOLD,
      isCircle: normalizedVariance < this.CIRCLE_VARIANCE_THRESHOLD
    });

    // 5. If variance is low enough, it's a circle!
    if (normalizedVariance < this.CIRCLE_VARIANCE_THRESHOLD) {
      const result = {
        type: 'circle',
        center,
        radius: avgRadius,
        confidence: 1 - normalizedVariance, // Higher confidence = lower variance
      };
      console.log('✅ CIRCLE DETECTED!', result);
      return result;
    }

    console.log('❌ Not circular enough - variance too high');
    return null;
  }

  /**
   * Detect any shape from a stroke
   * @param {Array} points - Array of {x, y} points
   * @returns {Object|null} - Shape descriptor or null
   */
  detectShape(points) {
    // Try circle detection first
    const circle = this.detectCircle(points);
    if (circle && circle.confidence > 0.85) {
      return circle;
    }

    // Future: Add rectangle, line, arrow detection here

    return null; // No shape detected
  }

  /**
   * Calculate Euclidean distance between two points
   */
  distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }
}
