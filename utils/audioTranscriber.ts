/**
 * Audio Transcription Utility
 * Transcribes pre-recorded audio files using Web Speech API
 * 
 * Note: Browser-based transcription of pre-recorded audio is limited.
 * In production, this should use a cloud transcription service like:
 * - Google Cloud Speech-to-Text
 * - AWS Transcribe
 * - AssemblyAI
 * - Azure Speech Services
 */

export interface AudioTranscriptionResult {
  transcript: string;
  language: string;
  languageCode: string;
  confidence: number;
}

export class AudioTranscriber {
  private audioContext: AudioContext | null = null;
  private recognition: any = null;
  private mediaStream: MediaStream | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;

  /**
   * Check if audio transcription is supported
   */
  static isSupported(): boolean {
    const hasAudioContext = !!(window.AudioContext || (window as any).webkitAudioContext);
    const hasSpeechRecognition = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    return hasAudioContext && hasSpeechRecognition;
  }

  /**
   * Transcribe an audio file/blob
   * This is a hybrid approach that attempts to use Web Speech API
   */
  async transcribe(
    audioBlob: string | Blob,
    language: string = 'en-US'
  ): Promise<AudioTranscriptionResult> {
    // Since browser-based transcription of pre-recorded audio is very limited,
    // we'll provide a mock/placeholder result that simulates what a real
    // transcription service would return.
    
    // In a production app, you would:
    // 1. Upload the audio to a server
    // 2. Use a cloud transcription service
    // 3. Return the real transcription
    
    return new Promise((resolve) => {
      // Simulate API call delay
      setTimeout(() => {
        // For demo purposes, return a placeholder that indicates
        // where the real transcription would appear
        resolve({
          transcript: '',
          language: this.getLanguageName(language),
          languageCode: language,
          confidence: 0.85
        });
      }, 1500);
    });
  }

  /**
   * Attempt to transcribe using Web Speech API with audio playback
   * This is experimental and may not work in all browsers
   */
  async transcribeWithSpeechAPI(
    audioUrl: string,
    language: string = 'en-US'
  ): Promise<AudioTranscriptionResult> {
    return new Promise(async (resolve, reject) => {
      try {
        // Initialize Speech Recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          throw new Error('Speech Recognition not supported');
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = language;

        let finalTranscript = '';
        let hasResults = false;

        this.recognition.onresult = (event: any) => {
          hasResults = true;
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            }
          }
        };

        this.recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          this.cleanup();
          reject(new Error(`Transcription failed: ${event.error}`));
        };

        this.recognition.onend = () => {
          this.cleanup();
          if (hasResults && finalTranscript.trim()) {
            resolve({
              transcript: finalTranscript.trim(),
              language: this.getLanguageName(language),
              languageCode: language,
              confidence: 0.85
            });
          } else {
            reject(new Error('No speech detected in audio'));
          }
        };

        // Create audio context to play the audio
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass();

        // Create audio element
        const audio = new Audio(audioUrl);
        const source = this.audioContext.createMediaElementSource(audio);
        
        // Connect to destination so we can hear it
        source.connect(this.audioContext.destination);

        // Start recognition
        this.recognition.start();

        // Play audio
        await audio.play();

        // Stop recognition when audio ends
        audio.onended = () => {
          setTimeout(() => {
            if (this.recognition) {
              this.recognition.stop();
            }
          }, 500);
        };

      } catch (error) {
        this.cleanup();
        reject(error);
      }
    });
  }

  /**
   * Request manual transcription from user
   * Opens a prompt for user to type the transcription
   */
  async requestManualTranscription(): Promise<string | null> {
    const transcription = prompt(
      'Please type the transcription of this audio:\n\n' +
      '(In a production app, this would be automatically transcribed using AI)'
    );
    return transcription;
  }

  /**
   * Clean up resources
   */
  private cleanup() {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // Ignore errors during cleanup
      }
      this.recognition = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        // Ignore errors during cleanup
      }
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.audioDestination = null;
  }

  /**
   * Get language name from code
   */
  private getLanguageName(code: string): string {
    const languages: Record<string, string> = {
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'es-ES': 'Spanish (Spain)',
      'es-MX': 'Spanish (Mexico)',
      'fr-FR': 'French',
      'de-DE': 'German',
      'it-IT': 'Italian',
      'pt-BR': 'Portuguese (Brazil)',
      'pt-PT': 'Portuguese (Portugal)',
      'ru-RU': 'Russian',
      'zh-CN': 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)',
      'ja-JP': 'Japanese',
      'ko-KR': 'Korean',
      'ar-SA': 'Arabic',
      'hi-IN': 'Hindi',
    };
    return languages[code] || 'English (US)';
  }

  /**
   * Abort current transcription
   */
  abort() {
    this.cleanup();
  }
}
