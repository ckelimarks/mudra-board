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
        label: '🎤',
        color: 'rgba(100, 100, 255, 0.7)',
        hoverColor: 'rgba(100, 100, 255, 0.9)',
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
    this.zones[0].x = width - 100;
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

      // Draw zone background
      ctx.fillStyle = isHovered ? zone.hoverColor : zone.color;
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);

      // Draw border
      ctx.strokeStyle = isHovered ? 'white' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = isHovered ? 4 : 2;
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);

      // Draw label
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'white';
      ctx.fillText(zone.label, zone.x + zone.width / 2, zone.y + zone.height / 2);

      // Draw helper text below
      if (isHovered) {
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = 'white';
        ctx.fillText('TAP!', zone.x + zone.width / 2, zone.y + zone.height + 15);
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
