# Changelog

## v0.2.1 - Activation Word Fix (2026-03-10)

### Speech Recognition Fix
- **Changed activation word from "write" to "text"**:
  - "write" has homophone issues (sounds like "right")
  - Now say "text [your text]" to place text
  - Example: "text hello" → places "hello" at finger position
  - Much more reliable recognition

## v0.2.0 - Fine-Tuned (2026-03-10)

### Speech Recognition Improvements
- **Added activation keyword**: Now you must say the activation word + text to place text on canvas
  - Prevents accidental text placement from ambient conversation
  - If you just say words without activation keyword, you'll see a hint

- **Better command detection**: Commands now work more reliably
  - Fuzzy matching: "clear" command works even if embedded in longer phrases
  - More command aliases: "clear all", "clear canvas", "undo that"
  - Visual feedback: Green toast notification when command is recognized

- **Command feedback toast**: Visual confirmation when voice commands execute
  - Shows "✓ CLEAR" or "✓ UNDO" for 1.5 seconds

### Drawing Quality Improvements
- **Smoother tracking**: Increased position buffer from 4 to 6 frames
  - Reduces hand jitter and cursor jumpiness
  - More natural, fluid drawing experience

- **Cleaner strokes**: Increased point distance threshold from 3px to 4px
  - Reduces noise in drawn lines
  - Results in smoother, less jagged strokes

### UX Polish
- Updated instructions overlay to reflect "write [text]" pattern
- Better interim text hints when speech is active

---

## v0.1.0 - MVP (2026-03-10)

### Initial Release
- Camera feed with mirrored selfview
- Hand tracking via MediaPipe Hands
- Index finger drawing (point to draw, open palm to stop)
- Speech-to-text placement
- Basic voice commands (clear, undo)
- Color picker and brush size controls
- Zoom screen-share ready
- Keyboard shortcuts (C=clear, Z=undo)

---

## Roadmap / Future Ideas

### Smart Shapes (Planned)
- Draw a circle gesture → perfect circle
- Draw a rectangle gesture → perfect rectangle
- Draw a line gesture → straight line
- Requires gesture classifier (ML model or heuristic shape detection)

### Other Future Enhancements
- Virtual webcam output (canvas.captureStream() → OBS)
- Shape recognition library (e.g., dollar recognizer)
- Mermaid/Excalidraw integration
- Multi-user collaboration
- Recording/export features
- Persistent sessions
- More colors and brush presets
- Eraser mode
