# V2 Architecture Changes

## Core Philosophy Shift

**V1:** Drawing/painting app - rasterized strokes on canvas
**V2:** Interactive whiteboard - vector graphics with moveable elements

---

## Key Changes

### 1. Rendering: Canvas → SVG

**V1 (Canvas):**
```javascript
ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.stroke();
// Result: Pixels burned into canvas
```

**V2 (SVG):**
```javascript
<path d="M x1 y1 L x2 y2" stroke="#ff0000" />
// Result: DOM element, editable, scalable
```

**Benefits:**
- Export clean SVG (import to Figma, Illustrator)
- Elements are addressable (can be selected, moved, deleted)
- Infinite scaling (no pixelation)
- Browser handles rendering optimization

---

### 2. Gestures: Pointing → Pinching

**V1:** Index finger pointing (other fingers curled)
- Simple to detect
- Hard to control precisely
- Accidental marks common

**V2:** Thumb + index pinch
- Much more precise
- Natural "grab" metaphor
- Clear intent (pinch = action)
- Distinguishes between "hovering" and "acting"

**Implementation:**
```javascript
const thumbPos = landmarks[4];  // Thumb tip
const indexPos = landmarks[8];  // Index tip
const distance = Math.hypot(thumbPos.x - indexPos.x, thumbPos.y - indexPos.y);
const isPinching = distance < 40;  // pixels (normalized space)
```

---

### 3. Speech: Activation Word → Continuous Flow

**V1:** Say "text [your words]"
- Prevents accidental text placement
- Requires rigid syntax
- Breaks flow of thought

**V2:** Speech ON = everything you say appears
- Natural dictation
- Words accumulate and follow finger
- **Pinch to place** text at position
- Command words still work: "clear", "undo"

**Workflow:**
1. Turn Speech ON
2. Say: "This is my idea for the product"
3. Text appears and follows finger
4. Move finger to desired position
5. **Pinch** → text placed there permanently
6. Text can be grabbed and moved later

---

### 4. Text Interaction: Static → Draggable

**V1:** Text placed, can't be moved
**V2:** All text is draggable

**How it works:**
1. Pinch over existing text → grab mode
2. Move hand → text follows
3. Release pinch → text drops at new position

**Hit detection:**
```javascript
// Check if pinch is over a text element
const textElement = svgRenderer.getTextElementAt(x, y);
if (textElement) {
  // Enter drag mode
  interactionEngine.grabbedElement = textElement;
}
```

---

### 5. Data Model: Point Arrays → Scene Graph

**V1 (AnnotationStore):**
```javascript
{
  strokes: [
    { points: [{x,y}, {x,y}, ...], color, size }
  ],
  textItems: [
    { text: "hello", x: 100, y: 200, color, size }
  ]
}
```
- Just data
- No reference to rendered output
- Can't interact with elements after creation

**V2 (SVGRenderer + DOM):**
```javascript
<svg>
  <g id="strokes">
    <path id="stroke-1" d="..." stroke="#ff0000" />
  </g>
  <g id="texts">
    <text id="text-1" x="100" y="200" data-draggable="true">hello</text>
  </g>
</svg>
```
- Elements in DOM
- Can query, modify, remove at any time
- Browser handles z-ordering, transforms

---

### 6. Export: Screenshot → SVG + Transcript

**V1:**
- No export (would need canvas.toDataURL() for PNG)
- No text log

**V2:**
- **SVG export**: Clean vector file → import to design tools
- **Transcript export**: JSON log of all speech with coordinates & timestamps

**Transcript format:**
```json
{
  "session": {
    "startTime": "2026-03-10T14:00:00.000Z",
    "endTime": "2026-03-10T14:05:00.000Z",
    "totalEntries": 15
  },
  "transcript": [
    {
      "id": "entry-1710082800000",
      "text": "This is the main idea",
      "position": { "x": 450, "y": 320 },
      "timestamp": 1710082800000,
      "isoTime": "2026-03-10T14:00:00.000Z"
    }
  ]
}
```

---

## Architecture Comparison

### V1 File Structure
```
js/
├── main.js               # App entry point
├── camera.js             # (not created, inlined)
├── annotationStore.js    # Data store for strokes/text
├── gestureEngine.js      # Pointing gesture detection
├── drawing.js            # Canvas rendering functions
├── speech.js             # "text [words]" activation pattern
```

### V2 File Structure
```
js/
├── main-v2.js            # App entry point (SVG-based)
├── svgRenderer.js        # SVG element creation/manipulation
├── interactionEngine.js  # Pinch detection, drag handling
├── transcript.js         # Speech logging with metadata
├── speech-v2.js          # Continuous speech (no activation word)
```

---

## State Machine Comparison

### V1 States
```
IDLE     → pointing detected → DRAWING
DRAWING  → not pointing      → IDLE (end stroke)
```

### V2 States
```
IDLE          → pinch over empty space  → DRAWING
IDLE          → pinch over text         → DRAGGING
DRAWING       → pinch released          → IDLE (finalize stroke)
DRAGGING      → pinch released          → IDLE (drop text)
TEXT_PLACING  → pinch while speech ON   → IDLE (place text)
```

---

## Performance Considerations

### V1 (Canvas)
- **Pro:** Rasterization is fast, no DOM overhead
- **Con:** Full repaint every frame (video + annotations)
- **Render loop:** ~60fps for video + canvas redraw

### V2 (Canvas + SVG)
- **Pro:** SVG elements only render when changed
- **Con:** Many SVG elements = more DOM nodes
- **Render loop:** Canvas renders video at 60fps, SVG is static

**Optimization:**
- Preview strokes drawn on canvas (temporary)
- Finalized strokes become SVG (permanent)
- Best of both worlds

---

## When to Use Each Version

### Use V1 if:
- Quick sketching, painting style
- Don't need to move elements after creation
- Prefer simple "point and draw" gesture
- Want activation word for text ("text [words]")

### Use V2 if:
- Need clean, editable output (SVG for design tools)
- Want to rearrange text after placement
- Prefer precise pinch gestures
- Need transcript log of session
- Want continuous speech dictation
- Creating diagrams, structured annotations

---

## Migration Path

**V1 and V2 are separate implementations:**
- `index.html` → V1 (original canvas version)
- `index-v2.html` → V2 (new SVG version)

Both versions co-exist. No migration needed - just choose the right tool for the job.
