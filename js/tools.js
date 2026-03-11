// Tool system - persistent draggable tools like pencil, eraser, etc.
export class ToolManager {
  constructor() {
    this.tools = [];
    this.activeTool = null;
    this.draggedTool = null;
    this.dragOffset = { x: 0, y: 0 };
  }

  addTool(tool) {
    this.tools.push(tool);
  }

  // Check if pinch point is over any tool
  getToolAt(x, y) {
    for (const tool of this.tools) {
      const dx = x - tool.x;
      const dy = y - tool.y;
      const distance = Math.hypot(dx, dy);

      if (distance <= tool.radius) {
        return tool;
      }
    }
    return null;
  }

  // Start using/dragging a tool
  grabTool(tool, x, y) {
    this.activeTool = tool;
    this.draggedTool = tool;
    this.dragOffset = {
      x: x - tool.x,
      y: y - tool.y
    };
    console.log('🖊️ Grabbed tool:', tool.name);
  }

  // Update tool position while dragging
  dragTool(x, y) {
    if (this.draggedTool) {
      this.draggedTool.x = x - this.dragOffset.x;
      this.draggedTool.y = y - this.dragOffset.y;
    }
  }

  // Check if hand is "touching paper" with the pencil
  // Returns true if hand (pinch point) is close to pencil position
  isPencilTouchingPaper(x, y) {
    if (!this.activeTool || this.activeTool.type !== 'pencil') return false;

    const dx = x - this.activeTool.x;
    const dy = y - this.activeTool.y;
    const distance = Math.hypot(dx, dy);

    // Only draw when hand is within "touch radius" of pencil
    return distance <= this.activeTool.touchRadius;
  }

  // Release tool
  releaseTool() {
    console.log('🖊️ Released tool:', this.draggedTool?.name);
    this.activeTool = null;
    this.draggedTool = null;
  }

  // Render all tools
  render(ctx) {
    for (const tool of this.tools) {
      const isActive = this.activeTool === tool;
      const isTouching = tool.isTouching;

      // Draw touch radius indicator when active
      if (isActive && tool.type === 'pencil') {
        ctx.beginPath();
        ctx.arc(tool.x, tool.y, tool.touchRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isTouching ? 'rgba(255, 100, 100, 0.5)' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw tool background
      ctx.beginPath();
      ctx.arc(tool.x, tool.y, tool.radius, 0, Math.PI * 2);

      if (isTouching) {
        ctx.fillStyle = 'rgba(255, 80, 80, 1)'; // Red when touching
      } else {
        ctx.fillStyle = isActive ? tool.activeColor : tool.color;
      }
      ctx.fill();

      // Draw border
      ctx.strokeStyle = isActive ? 'white' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = isActive ? 4 : 2;
      ctx.stroke();

      // Draw icon/emoji
      ctx.font = `${tool.iconSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'white';
      ctx.fillText(tool.icon, tool.x, tool.y);

      // Draw label below
      if (!isActive) {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(tool.name, tool.x, tool.y + tool.radius + 15);
      } else if (isTouching) {
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = 'rgba(255, 80, 80, 1)';
        ctx.fillText('DRAWING', tool.x, tool.y + tool.radius + 15);
      }
    }
  }
}

// Tool class
export class Tool {
  constructor({ name, icon, x, y, radius = 30, color, activeColor, iconSize = 24, type, touchRadius = 50 }) {
    this.name = name;
    this.icon = icon;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.activeColor = activeColor;
    this.iconSize = iconSize;
    this.type = type; // 'pencil', 'eraser', etc.
    this.touchRadius = touchRadius; // How close hand must be to "touch paper"
    this.isTouching = false; // Current touch state
  }
}

// Create default tools
export function createDefaultTools(canvasWidth, canvasHeight) {
  const tools = [];

  // Pencil tool - bottom left
  tools.push(new Tool({
    name: 'Pencil',
    icon: '✏️',
    x: 60,
    y: canvasHeight - 60,
    radius: 35,
    color: 'rgba(100, 100, 255, 0.7)',
    activeColor: 'rgba(100, 100, 255, 1)',
    iconSize: 28,
    type: 'pencil'
  }));

  return tools;
}
