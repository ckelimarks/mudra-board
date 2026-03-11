// Renders AnnotationStore contents onto a canvas context
export function renderAnnotations(ctx, store) {
  const { strokes, textItems, currentStroke } = store;

  // Render completed strokes
  for (const stroke of strokes) {
    drawStroke(ctx, stroke);
  }

  // Render active (in-progress) stroke
  if (currentStroke && currentStroke.points.length > 0) {
    drawStroke(ctx, currentStroke);
  }

  // Render text items
  for (const item of textItems) {
    ctx.font = `bold ${item.size}px sans-serif`;
    ctx.fillStyle = item.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeText(item.text, item.x, item.y);  // Shadow for readability
    ctx.fillText(item.text, item.x, item.y);
  }
}

function drawStroke(ctx, stroke) {
  if (stroke.points.length < 2) return;

  ctx.beginPath();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Smooth curve through points using quadratic bezier
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

  for (let i = 1; i < stroke.points.length - 1; i++) {
    const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
    const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
    ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
  }

  const last = stroke.points.at(-1);
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

export function renderCursor(ctx, position, isDrawing) {
  if (!position) return;

  ctx.beginPath();
  ctx.arc(position.x, position.y, isDrawing ? 8 : 12, 0, Math.PI * 2);
  ctx.fillStyle = isDrawing ? 'rgba(255, 80, 80, 0.8)' : 'rgba(255, 255, 255, 0.6)';
  ctx.fill();
  ctx.strokeStyle = isDrawing ? 'white' : 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
}
