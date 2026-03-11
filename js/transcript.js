// Transcript tracking - all spoken text with coordinates and timestamps
export class Transcript {
  constructor() {
    this.entries = [];
  }

  addEntry(text, x, y, timestamp = Date.now()) {
    this.entries.push({
      id: `entry-${timestamp}`,
      text,
      position: { x, y },
      timestamp,
      isoTime: new Date(timestamp).toISOString(),
    });
  }

  getAll() {
    return this.entries;
  }

  exportJSON() {
    return JSON.stringify({
      session: {
        startTime: this.entries[0]?.isoTime || new Date().toISOString(),
        endTime: this.entries[this.entries.length - 1]?.isoTime || new Date().toISOString(),
        totalEntries: this.entries.length,
      },
      transcript: this.entries,
    }, null, 2);
  }

  exportMarkdown() {
    let md = '# Whiteboard Transcript\n\n';
    md += `**Session:** ${this.entries[0]?.isoTime || 'N/A'}\n\n`;
    md += `**Total Entries:** ${this.entries.length}\n\n`;
    md += '---\n\n';

    for (const entry of this.entries) {
      md += `**[${new Date(entry.timestamp).toLocaleTimeString()}]** (${Math.round(entry.position.x)}, ${Math.round(entry.position.y)})\n`;
      md += `> ${entry.text}\n\n`;
    }

    return md;
  }

  clear() {
    this.entries = [];
  }
}
