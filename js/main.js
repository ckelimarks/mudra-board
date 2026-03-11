import { AnnotationStore } from './annotationStore.js';
import { GestureEngine } from './gestureEngine.js';
import { renderAnnotations, renderCursor } from './drawing.js';
import { SpeechController } from './speech.js';

// ── State ──────────────────────────────────────────────────────────────────
const store = new AnnotationStore();
const gestureEngine = new GestureEngine();

let currentColor = '#FF0000';
let currentSize = 5;
let lastFingerPosition = null;
let currentHandLandmarks = null;
let wasDrawing = false;

// ── DOM ────────────────────────────────────────────────────────────────────
const videoEl = document.getElementById('inputVideo');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const loadingOverlay = document.getElementById('loadingOverlay');
const speechPreview = document.getElementById('speechPreview');
const instructions = document.getElementById('instructions');

// ── Resize canvas to window ────────────────────────────────────────────────
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ── Render Loop ────────────────────────────────────────────────────────────
function renderFrame() {
  if (videoEl.readyState >= 2) {
    // 1. Draw video frame (mirrored)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // 2. Process current landmarks
  if (currentHandLandmarks) {
    const { state, position } = gestureEngine.update(
      currentHandLandmarks, canvas.width, canvas.height
    );

    if (position) lastFingerPosition = position;
    const isDrawing = (state === 'DRAWING');

    if (isDrawing && position) {
      if (!wasDrawing) {
        store.beginStroke(position.x, position.y, currentColor, currentSize);
      } else {
        store.addPoint(position.x, position.y);
      }
    } else if (wasDrawing) {
      store.endStroke();
    }
    wasDrawing = isDrawing;

    // 3. Render annotations
    renderAnnotations(ctx, store);

    // 4. Render cursor
    renderCursor(ctx, position, isDrawing);
  } else {
    renderAnnotations(ctx, store);
    wasDrawing = false;
  }

  requestAnimationFrame(renderFrame);
}

// ── MediaPipe Hands Setup ──────────────────────────────────────────────────
function initHandTracking() {
  const hands = new Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,      // 0=fast, 1=accurate
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  });

  hands.onResults((results) => {
    currentHandLandmarks = results.multiHandLandmarks?.[0] ?? null;
  });

  // MediaPipe Camera utility manages the frame-send loop
  const mpCamera = new Camera(videoEl, {
    onFrame: async () => {
      await hands.send({ image: videoEl });
    },
    width: 1280,
    height: 720,
  });

  mpCamera.start().then(() => {
    loadingOverlay.style.display = 'none';
    renderFrame(); // Start render loop once camera is running
  });
}

// ── Command Feedback Toast ────────────────────────────────────────────────
function showCommandFeedback(cmd) {
  const toast = document.createElement('div');
  toast.className = 'command-toast';
  toast.textContent = `✓ ${cmd}`;
  document.body.appendChild(toast);

  // Fade in
  setTimeout(() => toast.classList.add('show'), 10);

  // Fade out and remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}

// ── Speech Controller ──────────────────────────────────────────────────────
const speech = new SpeechController({
  onInterim: (text) => {
    speechPreview.textContent = text;
    speechPreview.classList.remove('hidden');
    if (lastFingerPosition) {
      speechPreview.style.left = `${lastFingerPosition.x}px`;
      speechPreview.style.top = `${lastFingerPosition.y - 40}px`;
    }
  },
  onFinal: (text) => {
    speechPreview.classList.add('hidden');
    if (lastFingerPosition) {
      store.addText(text, lastFingerPosition.x, lastFingerPosition.y, currentColor, currentSize);
    }
  },
  onCommand: (cmd, spokenCommand) => {
    speechPreview.classList.add('hidden');
    if (cmd === 'CLEAR') store.clear();
    if (cmd === 'UNDO') store.undo();
  },
  onCommandFeedback: (cmd) => {
    showCommandFeedback(cmd);
  },
});

// ── Toolbar Bindings ───────────────────────────────────────────────────────
document.getElementById('colorPicker')
  .addEventListener('input', (e) => { currentColor = e.target.value; });

document.getElementById('brushSize')
  .addEventListener('input', (e) => { currentSize = parseInt(e.target.value); });

document.getElementById('clearBtn')
  .addEventListener('click', () => store.clear());

document.getElementById('undoBtn')
  .addEventListener('click', () => store.undo());

const speechToggleBtn = document.getElementById('speechToggle');
speechToggleBtn.addEventListener('click', () => {
  const isNowOn = speech.toggle();
  speechToggleBtn.textContent = `🎤 Speech: ${isNowOn ? 'ON' : 'OFF'}`;
  document.getElementById('speechIndicator').classList.toggle('hidden', !isNowOn);
});

// ── Instructions Dismiss ───────────────────────────────────────────────────
document.getElementById('dismissInstructions')
  .addEventListener('click', () => {
    instructions.style.display = 'none';
  });

// ── Keyboard Shortcuts ─────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'c' || e.key === 'C') store.clear();
  if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey) store.undo();
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') store.undo();
  if (e.key === 'Escape') instructions.style.display = 'none';
});

// ── Boot ───────────────────────────────────────────────────────────────────
initHandTracking();
