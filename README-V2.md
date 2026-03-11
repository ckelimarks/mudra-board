# Invisible Whiteboard v2 - SVG Interactive Edition

**Major architecture change:** Canvas painting → SVG scene graph with interactive elements

## What's New in v2

### SVG-Based Architecture
- All strokes are SVG `<path>` elements (not rasterized pixels)
- All text is SVG `<text>` elements (selectable, moveable)
- Export clean SVG files for editing in Illustrator, Figma, etc.

### Pinch Gestures
- **Thumb + Index pinch** = draw or grab
- Draw in air by pinching and moving hand
- Grab text by pinching over it, move, release
- Much more precise than pointing gestures

### Continuous Speech Mode
- Turn Speech ON → everything you say appears and follows your finger
- Text accumulates as you speak
- **Pinch** to place the text at current position
- No "text" activation word needed - just speak naturally

### Transcript Export
- Maintains log of all spoken text with coordinates and timestamps
- Export as JSON for analysis
- Export as Markdown for readable log

## Quick Start

```bash
cd invisible-whiteboard
npx serve .
```

Open `http://localhost:3000/index-v2.html` in Chrome/Edge

## Usage

### Drawing
1. Make a pinch gesture (thumb + index fingertips together)
2. Move your hand while pinching
3. Release to finish the stroke
4. Stroke becomes permanent SVG path

### Text Placement
1. Click "Speech: ON"
2. Start speaking - words appear and follow your finger
3. Keep speaking to add more words to the same text block
4. **Pinch** to place the text at that position
5. Text stays there until you grab it to move it

### Moving Text
1. Make pinch gesture over existing text
2. Move hand while pinching
3. Text follows your hand
4. Release to drop text at new position

### Export
- **💾 SVG** - Download clean SVG file (open in Illustrator, Figma, etc.)
- **📄 Transcript** - Download JSON log of all speech with coordinates

## Gestures Reference

| Gesture | Action |
|---------|--------|
| Thumb + Index pinch (in air) | Draw stroke |
| Thumb + Index pinch (over text) | Grab and move text |
| Pinch while Speech ON | Place accumulated text |
| Voice: "clear" | Wipe canvas |
| Voice: "undo" | Remove last element |

## Technical Details

### Why SVG?
- **Scalable**: No pixelation, works at any resolution
- **Editable**: Export to design tools, continue editing
- **Interactive**: Text elements are DOM nodes, can be styled/moved
- **Clean**: Perfect curves, no canvas artifacts

### Pinch Detection
- Calculates distance between thumb tip (landmark 4) and index tip (landmark 8)
- Pinch triggered when distance < 40 pixels
- Smoothed over 6 frames to reduce jitter

### Speech + Pinch Workflow
1. Speech recognition runs continuously when ON
2. Interim results accumulate in `speechAccumulator`
3. Live text element created and follows finger
4. On pinch, text finalizes at current position
5. Transcript logs the text with coordinates

### Files Changed from v1

**New:**
- `js/svgRenderer.js` - SVG element creation and manipulation
- `js/interactionEngine.js` - Pinch detection, drag handling
- `js/transcript.js` - Speech logging with metadata
- `js/speech-v2.js` - Simplified speech (no activation word)
- `index-v2.html` - SVG overlay architecture

**Removed/Replaced:**
- `js/annotationStore.js` - Replaced by SVGRenderer
- `js/gestureEngine.js` - Replaced by InteractionEngine
- `js/drawing.js` - Rendering now handled by SVG DOM

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Camera works, speech recognition limited
- **Safari**: Camera works, no speech recognition

## Known Limitations

- Pinch gesture requires clear hand visibility (good lighting)
- Speech recognition stops after ~60s silence (auto-restarts)
- SVG text can't wrap (long text stays on one line)

## Future Enhancements

- Multi-line text wrapping
- Text editing (double-pinch to edit?)
- Shape recognition (pinch-draw circle → perfect circle)
- Eraser mode (pinch + voice "erase")
- Collaboration mode (sync SVG via WebSocket)

---

## v1 vs v2 Comparison

| Feature | v1 (Canvas) | v2 (SVG) |
|---------|-------------|----------|
| **Rendering** | Rasterized pixels | Vector graphics |
| **Drawing gesture** | Index finger pointing | Thumb + index pinch |
| **Text placement** | Say "text [words]" | Speech ON → pinch to place |
| **Text movement** | Not possible | Pinch to drag |
| **Export format** | PNG screenshot | Clean SVG file |
| **Transcript** | No | Yes (JSON + coordinates) |
| **Editability** | None | Full (Illustrator, Figma) |

## Migration from v1

v1 and v2 are separate implementations. To use v2:
- Open `index-v2.html` instead of `index.html`
- Old canvas version still available at `index.html`

**Which to use?**
- **v1**: Quick whiteboard, painting-style drawing
- **v2**: Professional annotations, need to move text, want clean exports
