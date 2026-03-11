# Invisible Whiteboard

Draw and write on your webcam feed using hand gestures and speech recognition. Perfect for Zoom presentations and remote teaching.

## Quick Start

1. **Start a local server** (required for camera access):
   ```bash
   npx serve .
   # or
   python3 -m http.server 8080
   ```

2. **Open in Chrome/Edge**: `http://localhost:8080` (or your server's port)

3. **Allow camera and microphone permissions**

4. **Start drawing**:
   - Point your index finger (other fingers curled) to draw
   - Open your palm to stop drawing
   - Click "Speech: ON" and speak to place text

## Gestures

- **Index finger pointing** → Draw mode (cursor turns red)
- **Open palm** → Stop drawing (cursor turns white)

## Voice Commands

- **"text [your text]"** → Places text at finger position (e.g., "text hello world")
- **"clear"** or **"clear all"** → Wipes the canvas
- **"undo"** → Removes last stroke/text

## Controls

- **Color picker** → Change drawing color
- **Brush size slider** → Adjust line thickness
- **Undo button** → Remove last stroke/text
- **Clear button** → Erase everything
- **Speech toggle** → Enable/disable speech-to-text

## Keyboard Shortcuts

- `C` → Clear canvas
- `Z` → Undo
- `Esc` → Dismiss instructions

## For Zoom/Meet

1. Open the app in your browser
2. In Zoom: **Share Screen** → **Browser Tab** → Select the Invisible Whiteboard tab
3. Participants will see your camera feed with annotations

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox/Safari**: Camera works, but speech recognition not supported

## Troubleshooting

**Camera not working?**
- Must serve over `localhost` or `https://` (not `file://`)
- Check camera permissions in browser settings

**Hand tracking laggy?**
- First load downloads MediaPipe WASM files (~2-5s)
- Ensure good lighting for best tracking

**Drawing fires accidentally?**
- Increase `minDetectionConfidence` in `js/main.js` line 84

**Speech not working?**
- Use Chrome or Edge (required for Web Speech API)
- Check microphone permissions

## Technical Stack

- **Hand Tracking**: MediaPipe Hands (WebAssembly)
- **Speech Recognition**: Web Speech API (Chrome/Edge only)
- **Drawing**: HTML5 Canvas with composited video
- **No build step**: Vanilla JS modules via CDN

## Future Enhancements

- Virtual webcam output (OBS integration)
- Shape recognition (circles, rectangles)
- Mermaid/Excalidraw integration
- Multi-user collaboration
- Recording/export features

---

Built for demos, teaching, and remote presentations. No account needed, no backend, fully client-side.
