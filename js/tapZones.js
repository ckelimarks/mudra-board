// Screen tap zones for gesture-free commands
export class TapZones {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    // Define tap zones (x, y, width, height, command)
    this.zones = [
      {
        id: 'speech-toggle',
        x: canvasWidth - 100,
        y: 20,
        width: 80,
        height: 80,
        command: 'TOGGLE_SPEECH',
        icon: 'mouth',
        color: 'slate',
        hoverColor: 'blue',
      },
      {
        id: 'pencil-toggle',
        x: canvasWidth - 100,
        y: canvasHeight - 100,
        width: 80,
        height: 80,
        command: 'TOGGLE_PENCIL',
        icon: 'pencil',
        color: 'slate',
        hoverColor: 'blue',
      }
    ];

    this.hoveredZone = null;
    this.lastTapTime = 0;
    this.TAP_COOLDOWN = 500; // ms
  }

  updateSize(width, height) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    // Update zone positions
    this.zones[0].x = width - 100; // Speech zone (top right)
    if (this.zones[1]) {
      this.zones[1].x = width - 100; // Pencil zone (bottom right)
      this.zones[1].y = height - 100;
    }
  }

  // Update zone active state (for toggle zones)
  setZoneActive(zoneId, isActive) {
    const zone = this.zones.find(z => z.id === zoneId);
    if (zone) {
      zone.isActive = isActive;
    }
  }

  // Check if finger tip is in any zone
  checkTap(fingerPos) {
    if (!fingerPos) {
      this.hoveredZone = null;
      return { command: null, zone: null };
    }

    const now = Date.now();

    for (const zone of this.zones) {
      const inZone = (
        fingerPos.x >= zone.x &&
        fingerPos.x <= zone.x + zone.width &&
        fingerPos.y >= zone.y &&
        fingerPos.y <= zone.y + zone.height
      );

      if (inZone) {
        // Finger entered zone
        if (this.hoveredZone !== zone.id) {
          // Just entered - check cooldown and trigger
          if (now - this.lastTapTime > this.TAP_COOLDOWN) {
            this.lastTapTime = now;
            this.hoveredZone = zone.id;
            console.log('🎯 Tap detected:', zone.command);
            return { command: zone.command, zone };
          }
        }
        this.hoveredZone = zone.id;
        return { command: null, zone }; // Still hovering
      }
    }

    this.hoveredZone = null;
    return { command: null, zone: null };
  }

  // Draw all zones on canvas
  render(ctx) {
    for (const zone of this.zones) {
      const isHovered = this.hoveredZone === zone.id;
      const isActive = zone.isActive || false;
      const centerX = zone.x + zone.width / 2;
      const centerY = zone.y + zone.height / 2;

      // Draw shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = isHovered ? 20 : 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      // Draw zone background (rounded rect with gradient)
      const radius = 16;
      ctx.beginPath();
      ctx.roundRect(zone.x, zone.y, zone.width, zone.height, radius);

      // Gradient background - green if active, blue if hovered, slate otherwise
      const gradient = ctx.createLinearGradient(zone.x, zone.y, zone.x, zone.y + zone.height);
      if (isActive) {
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.95)');  // green-500
        gradient.addColorStop(1, 'rgba(22, 163, 74, 0.95)');  // green-600
      } else if (isHovered) {
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.95)'); // blue-500
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.95)');  // blue-600
      } else {
        gradient.addColorStop(0, 'rgba(71, 85, 105, 0.9)');   // slate-600
        gradient.addColorStop(1, 'rgba(51, 65, 85, 0.9)');    // slate-700
      }
      ctx.fillStyle = gradient;
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Draw border
      const borderColor = isActive ? 'rgba(134, 239, 172, 0.5)' :
                         isHovered ? 'rgba(147, 197, 253, 0.5)' :
                         'rgba(255, 255, 255, 0.2)';
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw icon based on zone type
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.strokeStyle = 'white';
      ctx.fillStyle = 'white';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (zone.icon === 'mouth') {
        // Simple mouth icon
        ctx.lineWidth = 4;

        // Open mouth (smile/talking)
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // Upper lip curve
        ctx.beginPath();
        ctx.arc(0, -3, 12, 0.2, Math.PI - 0.2, true);
        ctx.stroke();

      } else if (zone.icon === 'pencil') {
        // Simple pencil icon
        ctx.lineWidth = 3;

        // Pencil body (diagonal line)
        ctx.beginPath();
        ctx.moveTo(-10, 10);
        ctx.lineTo(10, -10);
        ctx.stroke();

        // Pencil tip (small triangle)
        ctx.beginPath();
        ctx.moveTo(10, -10);
        ctx.lineTo(14, -14);
        ctx.lineTo(8, -12);
        ctx.closePath();
        ctx.fill();

        // Eraser (small rectangle at the back)
        ctx.fillRect(-13, 7, 6, 6);
      }

      ctx.restore();

      // Draw helper text
      if (isHovered) {
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'white';
        ctx.fillText('TAP TO TOGGLE', centerX, zone.y + zone.height + 8);
      }
    }
  }

  getZoneAtPosition(x, y) {
    return this.zones.find(zone =>
      x >= zone.x && x <= zone.x + zone.width &&
      y >= zone.y && y <= zone.y + zone.height
    );
  }
}
