export class SpeechController {
  constructor({ onInterim, onFinal, onCommand, onCommandFeedback }) {
    this.onInterim = onInterim;
    this.onFinal = onFinal;
    this.onCommand = onCommand;
    this.onCommandFeedback = onCommandFeedback;
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
          // Check for commands first
          let commandFound = false;
          for (const [key, cmd] of Object.entries(this.COMMANDS)) {
            if (transcriptLower === key || transcriptLower.includes(key)) {
              this.onCommand(cmd, key);
              if (this.onCommandFeedback) {
                this.onCommandFeedback(cmd);
              }
              commandFound = true;
              break;
            }
          }

          if (!commandFound) {
            // Regular text - pass through
            this.onFinal(transcript);
          }
        } else {
          interim += transcript;
        }
      }
      if (interim) this.onInterim(interim);
    };

    // Auto-restart if recognition stops
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
