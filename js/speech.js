export class SpeechController {
  constructor({ onInterim, onFinal, onCommand, onCommandFeedback }) {
    this.onInterim = onInterim;
    this.onFinal = onFinal;
    this.onCommand = onCommand;
    this.onCommandFeedback = onCommandFeedback; // Visual feedback when command detected
    this.active = false;
    this.recognition = null;

    // Commands that trigger actions (not text placement)
    this.COMMANDS = {
      'clear': 'CLEAR',
      'clear all': 'CLEAR',
      'clear canvas': 'CLEAR',
      'undo': 'UNDO',
      'erase': 'UNDO',
      'undo that': 'UNDO',
    };

    // Activation word for text placement
    this.WRITE_KEYWORD = 'text';
  }

  start() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported. Use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();
        const transcriptLower = transcript.toLowerCase();

        if (event.results[i].isFinal) {
          // 1. Check for direct commands first (exact match)
          if (this.COMMANDS[transcriptLower]) {
            this.onCommand(this.COMMANDS[transcriptLower], transcriptLower);
            if (this.onCommandFeedback) {
              this.onCommandFeedback(this.COMMANDS[transcriptLower]);
            }
            continue;
          }

          // 2. Check if command is contained in the transcript (fuzzy match)
          let commandFound = false;
          for (const [key, cmd] of Object.entries(this.COMMANDS)) {
            if (transcriptLower.includes(key)) {
              this.onCommand(cmd, key);
              if (this.onCommandFeedback) {
                this.onCommandFeedback(cmd);
              }
              commandFound = true;
              break;
            }
          }
          if (commandFound) continue;

          // 3. Check for "write [text]" pattern
          if (transcriptLower.startsWith(this.WRITE_KEYWORD + ' ')) {
            const textToWrite = transcript.substring(this.WRITE_KEYWORD.length + 1).trim();
            if (textToWrite) {
              this.onFinal(textToWrite);
            }
          } else if (transcriptLower === this.WRITE_KEYWORD) {
            // Just activation word alone - show hint in interim
            this.onInterim(`Say "${this.WRITE_KEYWORD} [your text]"`);
          } else {
            // No activation keyword - show hint
            this.onInterim(`Say "${this.WRITE_KEYWORD} ${transcript}" to place text`);
          }
        } else {
          interim += transcript;
        }
      }
      if (interim) this.onInterim(interim);
    };

    // Auto-restart if recognition stops (Chrome stops after ~60s silence)
    this.recognition.onend = () => {
      if (this.active) {
        setTimeout(() => this.recognition.start(), 500);
      }
    };

    this.recognition.onerror = (e) => {
      if (e.error !== 'no-speech') console.warn('Speech error:', e.error);
    };

    this.active = true;
    this.recognition.start();
  }

  stop() {
    this.active = false;
    this.recognition?.stop();
  }

  toggle() {
    this.active ? this.stop() : this.start();
    return this.active;
  }
}
