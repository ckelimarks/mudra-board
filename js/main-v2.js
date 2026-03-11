import { SVGRenderer } from './svgRenderer.js';
import { InteractionEngine } from './interactionEngine.js';
import { Transcript } from './transcript.js';
import { SpeechController } from './speech-v2.js';
import { TapZones } from './tapZones.js';
import { RotationGesture } from './rotationGesture.js';
import { PanGesture } from './panGesture.js';
// TOOL SYSTEM - Commented out for now, can re-enable later
// import { ToolManager, createDefaultTools } from './tools.js';

// ── State ──────────────────────────────────────────────────────────────────
let currentColor = '#FF0000';
let currentSize = 5;
let allHandLandmarks = []; // Array of all detected hands
let wasPinching = false;
let speechAccumulator = ''; // Accumulate speech while pinching
let lastInteractionResult = null; // Cache interaction result to avoid double-computing
let pendingTextPosition = null; // Queue position when pinch starts, place text when speech arrives
let speechPinchActive = false; // Track if we're in a speech-pinch (marking location)
let speechPinchStartTime = 0; // When the speech pinch started
let ignoreNextSpeech = false; // Flag to ignore speech updates after placing text
let pencilMode = false; // Toggle for pencil tool

// ── Audio ──────────────────────────────────────────────────────────────────
const speechToggleSound = new Audio('audio/speech-togglefx.mp3');

// ── DOM ────────────────────────────────────────────────────────────────────
const videoEl = document.getElementById('inputVideo');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const svgOverlay = document.getElementById('svgOverlay');
const loadingOverlay = document.getElementById('loadingOverlay');
const speechPreview = document.getElementById('speechPreview');
const instructions = document.getElementById('instructions');
const gestureStatus = document.getElementById('gestureStatus');
const gestureStatusText = document.getElementById('gestureStatusText');

// ── Instances ──────────────────────────────────────────────────────────────
const svgRenderer = new SVGRenderer(svgOverlay);
const interactionEngine = new InteractionEngine(svgRenderer);
const transcript = new Transcript();
const tapZones = new TapZones(window.innerWidth, window.innerHeight);
const rotationGesture = new RotationGesture();
const panGesture = new PanGesture();
// TOOL SYSTEM - Commented out for now
// const toolManager = new ToolManager();

// ── Resize canvas and SVG to window ────────────────────────────────────────
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  svgOverlay.setAttribute('width', window.innerWidth);
  svgOverlay.setAttribute('height', window.innerHeight);
  svgOverlay.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
  tapZones.updateSize(window.innerWidth, window.innerHeight);

  // Initialize rotation center (important for coordinate transforms)
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  svgRenderer.setRotation(rotationGesture.currentRotation, centerX, centerY);

  // TOOL SYSTEM - Commented out for now
  // if (toolManager.tools.length === 0) {
  //   const defaultTools = createDefaultTools(window.innerWidth, window.innerHeight);
  //   defaultTools.forEach(tool => toolManager.addTool(tool));
  // }
}
resize();
window.addEventListener('resize', resize);

// ── Render Loop ────────────────────────────────────────────────────────────
function renderFrame() {
  // 1. Draw video frame (mirrored)
  if (videoEl.readyState >= 2) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // 2. Draw tap zones
  tapZones.render(ctx);

  // TOOL SYSTEM - Commented out for now
  // toolManager.render(ctx);

  // DEBUG - Commented out (green rectangles around text)
  // drawTextHitBoxes(ctx);

  // 3. Draw cursor and preview stroke (use cached result from handleGestures)
  if (lastInteractionResult && lastInteractionResult.position) {
    const result = lastInteractionResult;

    // Calculate pinch point for visual feedback
    let pinchPoint = result.position;
    if (result.thumbPos && result.isPinching) {
      pinchPoint = {
        x: (result.thumbPos.x + result.position.x) / 2,
        y: (result.thumbPos.y + result.position.y) / 2,
      };
    }

    // Draw cursor (different for pinch vs idle)
    drawCursor(ctx, result.position, result.thumbPos, result.isPinching, pinchPoint);

    // Preview current stroke if drawing
    if (interactionEngine.state === 'DRAWING') {
      drawPreviewStroke(ctx, interactionEngine.getCurrentPoints());
    }
  }

  requestAnimationFrame(renderFrame);
}

function drawTextHitBoxes(ctx) {
  // Draw debug rectangles around all text elements
  const textElements = svgRenderer.getAllTextElements();

  for (const text of textElements) {
    const textX = parseFloat(text.getAttribute('x'));
    const textY = parseFloat(text.getAttribute('y'));
    const bbox = text.getBBox();
    const hitMargin = 40;

    // Draw hit box
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      textX - hitMargin,
      textY - bbox.height - hitMargin,
      bbox.width + hitMargin * 2,
      bbox.height + hitMargin * 2
    );

    // Draw center point
    ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(textX, textY, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCursor(ctx, indexPos, thumbPos, isPinching, pinchPoint) {
  if (!indexPos) return;

  // Draw index finger cursor
  ctx.beginPath();
  ctx.arc(indexPos.x, indexPos.y, isPinching ? 8 : 12, 0, Math.PI * 2);
  ctx.fillStyle = isPinching ? 'rgba(255, 80, 80, 0.9)' : 'rgba(255, 255, 255, 0.6)';
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw thumb cursor
  if (thumbPos) {
    ctx.beginPath();
    ctx.arc(thumbPos.x, thumbPos.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
  }

  // Draw line between thumb and index when pinching
  if (isPinching && thumbPos) {
    ctx.beginPath();
    ctx.moveTo(thumbPos.x, thumbPos.y);
    ctx.lineTo(indexPos.x, indexPos.y);
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw pinch point (where we check for text grabs)
    if (pinchPoint) {
      ctx.beginPath();
      ctx.arc(pinchPoint.x, pinchPoint.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 200, 0, 0.7)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 200, 0, 1)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}

function drawSecondHandIndicator(ctx, landmarks, isOpenPalm) {
  if (!landmarks || landmarks.length === 0) return;

  // Draw wrist position as indicator
  const wrist = landmarks[0];
  const x = (1 - wrist.x) * canvas.width;
  const y = wrist.y * canvas.height;

  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fillStyle = isOpenPalm ? 'rgba(80, 255, 80, 0.5)' : 'rgba(255, 255, 255, 0.3)';
  ctx.fill();
  ctx.strokeStyle = isOpenPalm ? 'rgba(80, 255, 80, 0.9)' : 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw icon/text
  if (isOpenPalm) {
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('🎤', x, y + 8);
  }
}

function drawPreviewStroke(ctx, points) {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.strokeStyle = currentColor;
  ctx.lineWidth = currentSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.7;

  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.globalAlpha = 1.0;
}

// ── Pinch Gesture Handling ─────────────────────────────────────────────────
let lastPosition = null;

function handleGestures() {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Priority 1: Two-hand pan gesture (both hands pinching)
  const pan = panGesture.update(allHandLandmarks, canvas.width, canvas.height);
  if (pan.panning) {
    // Apply pan + current rotation
    svgRenderer.setTransform(
      pan.panX,
      pan.panY,
      rotationGesture.currentRotation,
      centerX,
      centerY
    );
    wasPinching = false; // Don't trigger single-hand gestures
    return;
  }

  // Always keep pan applied even when not actively panning
  svgRenderer.setPan(pan.panX, pan.panY);

  // Handle primary hand interactions
  const primaryHand = allHandLandmarks[0];
  if (!primaryHand) {
    wasPinching = false;
    lastInteractionResult = null;
    return;
  }

  // Priority 2: Rotation gesture (open palm rotates canvas)
  const rotation = rotationGesture.update(primaryHand);

  // Always apply rotation to SVG groups (persistent even when hand closes)
  svgRenderer.setRotation(rotation.angle, centerX, centerY);

  // If actively rotating, don't do other gestures
  if (rotation.rotating) {
    lastInteractionResult = null;
    return;
  }

  // Compute interaction state ONCE per cycle (cached for renderFrame to use)
  const result = interactionEngine.update(
    primaryHand,
    canvas.width,
    canvas.height,
    speech.active
  );
  lastInteractionResult = result;

  // Check for tap zone activation (using index finger position)
  if (result.position) {
    const tapResult = tapZones.checkTap(result.position);
    if (tapResult.command === 'TOGGLE_SPEECH') {
      toggleSpeech();
      showCommandFeedback('SPEECH ' + (speech.active ? 'ON' : 'OFF'));
    } else if (tapResult.command === 'TOGGLE_PENCIL') {
      togglePencil();
      showCommandFeedback('PENCIL ' + (pencilMode ? 'ON' : 'OFF'));
    }
  }

  if (!result.position) return;
  lastPosition = result.position;

  const isPinching = result.isPinching;

  // Calculate pinch point (midpoint between thumb and index)
  let pinchPoint = result.position; // Default to index position
  if (result.thumbPos && result.isPinching) {
    pinchPoint = {
      x: (result.thumbPos.x + result.position.x) / 2,
      y: (result.thumbPos.y + result.position.y) / 2,
    };
  }

  // SPEECH MODE: Pinch marks location, speech gets placed there on release
  // BUT: if pinching over existing text, drag it instead
  if (speech.active) {
    // Check if we're over existing text
    const hoveredText = svgRenderer.getTextElementAt(pinchPoint.x, pinchPoint.y);

    if (hoveredText && isPinching) {
      // Text dragging takes priority in speech mode too
      if (!wasPinching) {
        interactionEngine.handlePinchStart(pinchPoint, svgRenderer, false); // false = no new drawing
      } else {
        interactionEngine.handlePinchMove(pinchPoint, svgRenderer, currentColor, currentSize);
      }
      speechPinchActive = false; // Don't place speech when dragging text
    } else if (!hoveredText && isPinching && !wasPinching) {
      // Not over text - start speech placement
      pendingTextPosition = { x: pinchPoint.x, y: pinchPoint.y };
      speechPinchActive = true;
      speechPinchStartTime = Date.now();
    } else if (isPinching && wasPinching && speechPinchActive) {
      // While holding pinch - update position to current location
      pendingTextPosition = { x: pinchPoint.x, y: pinchPoint.y };
    } else if (!isPinching && wasPinching) {
      // Pinch released
      if (interactionEngine.state === 'DRAGGING') {
        // Was dragging text - end the drag
        interactionEngine.handlePinchEnd(svgRenderer, currentColor, currentSize);
      } else if (speechPinchActive) {
        // Was placing speech - place it
        if (speechAccumulator.length > 0 && pendingTextPosition) {
          svgRenderer.createText(speechAccumulator, pendingTextPosition.x, pendingTextPosition.y, currentColor, Math.max(currentSize * 4, 24));
          transcript.addEntry(speechAccumulator, pendingTextPosition.x, pendingTextPosition.y);
          speechAccumulator = ''; // Clear placed text
          ignoreNextSpeech = true; // Ignore stale speech updates
          setTimeout(() => { ignoreNextSpeech = false; }, 1000); // Reset after 1 second
        }
      }
      pendingTextPosition = null;
      speechPinchActive = false;
    }
  } else {
    // DRAW MODE: Always handle pinch (for text dragging), but only draw if pencil ON
    speechPinchActive = false;

    if (isPinching && !wasPinching) {
      interactionEngine.handlePinchStart(pinchPoint, svgRenderer, pencilMode);
    } else if (isPinching && wasPinching) {
      interactionEngine.handlePinchMove(pinchPoint, svgRenderer, currentColor, currentSize);
    } else if (!isPinching && wasPinching) {
      interactionEngine.handlePinchEnd(svgRenderer, currentColor, currentSize);
    }
  }

  /* TOOL SYSTEM - Commented out for now
    if (isPinching && !wasPinching) {
      const toolAtPoint = toolManager.getToolAt(pinchPoint.x, pinchPoint.y);
      if (toolAtPoint) {
        toolManager.grabTool(toolAtPoint, pinchPoint.x, pinchPoint.y);
      } else {
        interactionEngine.handlePinchStart(pinchPoint, svgRenderer);
      }
    } else if (isPinching && wasPinching) {
      if (toolManager.activeTool) {
        if (toolManager.activeTool.type === 'pencil') {
          toolManager.dragTool(pinchPoint.x, pinchPoint.y);
          if (interactionEngine.state !== 'DRAWING') {
            interactionEngine.state = 'DRAWING';
            interactionEngine.currentPoints = [pinchPoint];
          } else {
            interactionEngine.handlePinchMove(pinchPoint, svgRenderer);
          }
        }
      } else {
        interactionEngine.handlePinchMove(pinchPoint, svgRenderer);
      }
    } else if (!isPinching && wasPinching) {
      if (toolManager.activeTool) {
        if (toolManager.activeTool.type === 'pencil' && interactionEngine.state === 'DRAWING') {
          interactionEngine.handlePinchEnd(svgRenderer, currentColor, currentSize);
        }
        toolManager.releaseTool();
      } else {
        interactionEngine.handlePinchEnd(svgRenderer, currentColor, currentSize);
      }
    }
    */

  wasPinching = isPinching;
}

// Run gesture handling at 30fps
setInterval(handleGestures, 33);

// ── MediaPipe Hands Setup ──────────────────────────────────────────────────
function initHandTracking() {
  const hands = new Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 2,  // Support two hands for gesture commands
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  });

  hands.onResults((results) => {
    allHandLandmarks = results.multiHandLandmarks || [];
  });

  const mpCamera = new Camera(videoEl, {
    onFrame: async () => {
      await hands.send({ image: videoEl });
    },
    width: 1280,
    height: 720,
  });

  mpCamera.start().then(() => {
    loadingOverlay.style.display = 'none';
    renderFrame();
  });
}

// ── Speech Controller ──────────────────────────────────────────────────────
const speech = new SpeechController({
  onInterim: (text) => {
    // Always update with latest interim - this is the live recognition
    if (text && text.length > 0 && !ignoreNextSpeech) {
      speechAccumulator = text;
    }
  },
  onFinal: (text) => {
    // Final result is more accurate - prefer it over interim
    if (text && text.length > 0 && !ignoreNextSpeech) {
      speechAccumulator = text;
    }
  },
  onCommand: (cmd) => {
    speechPreview.classList.add('hidden');
    if (cmd === 'CLEAR') {
      svgRenderer.clear();
      transcript.clear();
    }
    if (cmd === 'UNDO') {
      const texts = svgRenderer.getAllTextElements();
      const strokes = svgRenderer.getAllStrokeElements();
      if (texts.length > 0) {
        svgRenderer.removeElement(texts[texts.length - 1]);
      } else if (strokes.length > 0) {
        svgRenderer.removeElement(strokes[strokes.length - 1]);
      }
    }
  },
  onCommandFeedback: (cmd) => {
    showCommandFeedback(cmd);
  },
});

function showCommandFeedback(cmd) {
  const toast = document.createElement('div');
  toast.className = 'command-toast';
  toast.textContent = `✓ ${cmd}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}

function updateGestureStatus() {
  if (allHandLandmarks.length === 0) {
    // No hands detected
    gestureStatus.classList.add('hidden');
  } else if (allHandLandmarks.length === 1) {
    // One hand - show hint to add second hand
    gestureStatus.classList.remove('hidden', 'active', 'waiting');
    gestureStatusText.textContent = '🖐️ Show other hand to toggle speech';
  } else if (allHandLandmarks.length === 2) {
    // Two hands - check if open palm on non-pinching hand
    const [hand1, hand2] = allHandLandmarks;
    const hand1Pinching = gestureCommands.isPinching(hand1);
    const hand2Pinching = gestureCommands.isPinching(hand2);

    let isOpenPalm = false;
    let checkingHand = null;
    if (!hand1Pinching) {
      isOpenPalm = gestureCommands.detectOpenPalm(hand1);
      checkingHand = 'hand1';
    } else if (!hand2Pinching) {
      isOpenPalm = gestureCommands.detectOpenPalm(hand2);
      checkingHand = 'hand2';
    }

    gestureStatus.classList.remove('hidden');

    if (isOpenPalm) {
      gestureStatus.classList.add('active');
      gestureStatus.classList.remove('waiting');
      gestureStatusText.textContent = `✓ Open palm detected! (${checkingHand})`;
    } else if (hand1Pinching || hand2Pinching) {
      gestureStatus.classList.remove('active', 'waiting');
      const pinchingHand = hand1Pinching ? 'hand1' : 'hand2';
      gestureStatusText.textContent = `🖐️ Open OTHER hand (${pinchingHand} pinching, checking ${checkingHand || 'none'})`;
    } else {
      gestureStatus.classList.remove('active');
      gestureStatus.classList.add('waiting');
      gestureStatusText.textContent = `🖐️ Spread fingers wide (checking ${checkingHand || 'none'})`;
    }
  }
}

// ── Toolbar Bindings ───────────────────────────────────────────────────────
document.getElementById('colorPicker')
  .addEventListener('input', (e) => { currentColor = e.target.value; });

document.getElementById('brushSize')
  .addEventListener('input', (e) => { currentSize = parseInt(e.target.value); });

document.getElementById('clearBtn')
  .addEventListener('click', () => {
    svgRenderer.clear();
    transcript.clear();
    // Note: Tools are NOT cleared - they persist!
  });

document.getElementById('undoBtn')
  .addEventListener('click', () => {
    const texts = svgRenderer.getAllTextElements();
    const strokes = svgRenderer.getAllStrokeElements();
    if (texts.length > 0) {
      svgRenderer.removeElement(texts[texts.length - 1]);
    } else if (strokes.length > 0) {
      svgRenderer.removeElement(strokes[strokes.length - 1]);
    }
  });

function toggleSpeech() {
  const isNowOn = speech.toggle();
  const speechToggleBtn = document.getElementById('speechToggle');
  const icon = speechToggleBtn.querySelector('i');

  // Update icon
  if (icon) {
    icon.setAttribute('data-lucide', isNowOn ? 'mic' : 'mic-off');
    lucide.createIcons({ icons: { 'mic': lucide.icons.mic, 'mic-off': lucide.icons['mic-off'] } });
  }

  // Toggle active state
  speechToggleBtn.classList.toggle('active', isNowOn);
  document.getElementById('speechIndicator').classList.toggle('hidden', !isNowOn);

  // Play toggle sound
  speechToggleSound.currentTime = 0;
  speechToggleSound.play().catch(() => {});

  // Update tap zone active state
  tapZones.setZoneActive('speech-toggle', isNowOn);

  if (!isNowOn) {
    speechAccumulator = '';
    pendingTextPosition = null;
    speechPinchActive = false;
    ignoreNextSpeech = false;
    interactionEngine.cancelLiveText(svgRenderer);
  }
}

function togglePencil() {
  pencilMode = !pencilMode;

  // Play toggle sound
  speechToggleSound.currentTime = 0;
  speechToggleSound.play().catch(() => {});

  // Update tap zone active state
  tapZones.setZoneActive('pencil-toggle', pencilMode);
}

const speechToggleBtn = document.getElementById('speechToggle');

// Add ripple effect to button clicks
function createRipple(e) {
  const button = e.currentTarget;
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;

  ripple.className = 'ripple';
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

speechToggleBtn.addEventListener('click', (e) => {
  createRipple(e);
  toggleSpeech();
});

// Export buttons
document.getElementById('exportSVG')?.addEventListener('click', () => {
  const svgData = svgRenderer.exportSVG();
  downloadFile('whiteboard.svg', svgData, 'image/svg+xml');
});

document.getElementById('exportTranscript')?.addEventListener('click', () => {
  const jsonData = transcript.exportJSON();
  downloadFile('transcript.json', jsonData, 'application/json');
});

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Instructions Toggle ────────────────────────────────────────────────────
document.getElementById('helpBtn')
  ?.addEventListener('click', () => {
    instructions.classList.toggle('hidden');
  });

document.getElementById('dismissInstructions')
  ?.addEventListener('click', () => {
    instructions.classList.add('hidden');
  });

// ── Keyboard Shortcuts ─────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'c' || e.key === 'C') {
    svgRenderer.clear();
    transcript.clear();
  }
  if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey) {
    const texts = svgRenderer.getAllTextElements();
    const strokes = svgRenderer.getAllStrokeElements();
    if (texts.length > 0) {
      svgRenderer.removeElement(texts[texts.length - 1]);
    } else if (strokes.length > 0) {
      svgRenderer.removeElement(strokes[strokes.length - 1]);
    }
  }
  if (e.key === 'Escape') instructions.classList.add('hidden');
});

// ── Boot ───────────────────────────────────────────────────────────────────
initHandTracking();
