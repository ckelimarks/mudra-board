# Smart Shape Recognition - Future Feature

## Goal
Allow users to draw rough shapes (circles, rectangles, lines, arrows) and have them automatically converted to clean, geometric versions.

## Approaches

### Option 1: $1 Unistroke Recognizer
- **Library**: [$1 Gesture Recognizer](http://depts.washington.edu/acelab/proj/dollar/index.html)
- **How it works**: Matches drawn strokes against template shapes
- **Pros**: Lightweight (~100 lines), fast, no ML model needed
- **Cons**: Limited to closed shapes, needs training templates
- **Best for**: Basic shapes (circle, square, triangle, star)

### Option 2: Heuristic Shape Detection
Custom logic based on stroke characteristics:
- **Circle**: Start and end points close together, consistent radius from center
- **Rectangle**: 4 corners with ~90° angles, opposite sides parallel
- **Line**: High aspect ratio, low curve variance
- **Arrow**: Line + triangle at end

**Implementation sketch:**
```javascript
function detectShape(stroke) {
  if (isClosed(stroke)) {
    if (isCircular(stroke)) return { type: 'circle', ...fitCircle(stroke) };
    if (hasCorners(stroke, 4)) return { type: 'rectangle', ...fitRectangle(stroke) };
  }
  if (isStraight(stroke)) return { type: 'line', ...fitLine(stroke) };
  return null; // No shape detected
}
```

### Option 3: ML-Based (Google's Quick, Draw! Dataset)
- **Model**: CNN trained on Quick, Draw! sketches
- **How it works**: Classifies stroke sequences into 345 categories
- **Pros**: Recognizes many complex shapes
- **Cons**: Heavy model, requires TensorFlow.js, higher latency
- **Best for**: Post-MVP if you want complex objects (cars, houses, etc.)

## Recommended MVP Approach

**Start with heuristic circle detection:**
1. After user finishes a stroke (transitions from DRAWING → IDLE)
2. Check if stroke is circular (start/end close, consistent radius)
3. If yes, replace stroke with perfect circle
4. Show a brief animation (rough → smooth)

**Code changes needed:**
- `annotationStore.js`: Add `replaceStroke(index, newStroke)` method
- `gestureEngine.js`: Detect stroke end
- `shapeDetector.js`: New module with `detectCircle(stroke)` function
- `main.js`: Call shape detector on stroke end, replace if detected

**Effort estimate**: ~2 hours for circle detection only

## UI/UX Considerations

### Auto-detect vs Gesture Mode
**Option A**: Always auto-detect
- Pros: Seamless, no mode switching
- Cons: Might replace strokes user wanted to keep rough

**Option B**: Hold a gesture (e.g., fist) while drawing to trigger shape mode
- Pros: Explicit intent, no accidents
- Cons: More complex gesture vocabulary

**Option C**: Voice command "make it a circle"
- Pros: Clear intent, works retroactively
- Cons: Requires speech to be on

**Recommendation**: Start with Option A (auto-detect) with a confidence threshold. Only replace if confidence > 85%.

### Visual Feedback
- Show the detected shape as a ghost overlay before finalizing
- User can shake their hand (open palm quickly) to reject the shape replacement
- 1-second window to reject before it commits

## Example Library: Perfect Freehand
For smoother stroke rendering (separate from shape detection):
- **Library**: [perfect-freehand](https://github.com/steveruizok/perfect-freehand)
- **Used by**: Excalidraw, tldraw
- **What it does**: Converts point arrays into smooth, pressure-sensitive strokes
- **Integration**: Drop-in replacement for `drawStroke()` in `drawing.js`

## Next Steps (When Ready)
1. Implement circle detection heuristic
2. Test with various drawing styles
3. Add rectangle detection
4. Add line straightening
5. Consider $1 recognizer for more shapes
6. Add UI toggle: "Smart Shapes: ON/OFF"

---

**Priority**: Medium (nice-to-have, not critical for core demo)
**Complexity**: Medium (2-4 hours for basic circle/rectangle)
**Impact**: High (very impressive demo feature, differentiates from basic drawing tools)
