/**
 * Speech Transcription Utility
 * Uses Web Speech API for real-time speech-to-text transcription
 * Compatible with iOS Safari and Chrome
 */

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  language: string;
  languageCode: string;
}

export interface TranscriptionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

// Language codes and names
export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'zh-HK', name: 'Chinese (Hong Kong / Cantonese)' },
  { code: 'yue-Hant-HK', name: 'Cantonese (Hong Kong)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'ar-SA', name: 'Arabic' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'th-TH', name: 'Thai' },
  { code: 'vi-VN', name: 'Vietnamese' },
  { code: 'nl-NL', name: 'Dutch' },
  { code: 'pl-PL', name: 'Polish' },
  { code: 'tr-TR', name: 'Turkish' },
];

export class SpeechTranscriber {
  private recognition: any;
  private isListening: boolean = false;
  private onTranscriptCallback?: (result: TranscriptionResult) => void;
  private onErrorCallback?: (error: string) => void;
  private onEndCallback?: () => void;
  private finalTranscript: string = '';
  private detectedLanguage: string = 'en-US';

  constructor() {
    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
  }

  /**
   * Check if speech recognition is supported
   */
  static isSupported(): boolean {
    return !!(
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition
    );
  }

  /**
   * Start transcription
   */
  start(options: TranscriptionOptions = {}) {
    if (!this.recognition) {
      this.onErrorCallback?.('Speech recognition not supported');
      return;
    }

    if (this.isListening) {
      console.warn('Already listening');
      return;
    }

    // Configure recognition
    this.recognition.continuous = options.continuous ?? true;
    this.recognition.interimResults = options.interimResults ?? true;
    this.recognition.maxAlternatives = options.maxAlternatives ?? 1;
    this.recognition.lang = options.language || 'en-US';
    this.detectedLanguage = options.language || 'en-US';

    this.finalTranscript = '';

    // Set up event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('Speech recognition started');
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        
        if (event.results[i].isFinal) {
          this.finalTranscript += transcript + ' ';
          
          this.onTranscriptCallback?.({
            transcript: this.finalTranscript.trim(),
            confidence: confidence || 0.9,
            isFinal: true,
            language: this.getLanguageName(this.detectedLanguage),
            languageCode: this.detectedLanguage
          });
        } else {
          interimTranscript += transcript;
          
          this.onTranscriptCallback?.({
            transcript: (this.finalTranscript + interimTranscript).trim(),
            confidence: confidence || 0.5,
            isFinal: false,
            language: this.getLanguageName(this.detectedLanguage),
            languageCode: this.detectedLanguage
          });
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      
      let errorMessage = 'Speech recognition error';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your device.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please enable it in settings.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'aborted':
          errorMessage = 'Speech recognition aborted.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      this.onErrorCallback?.(errorMessage);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log('Speech recognition ended');
      this.onEndCallback?.();
    };

    // Start recognition
    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.onErrorCallback?.('Failed to start speech recognition');
      this.isListening = false;
    }
  }

  /**
   * Stop transcription
   */
  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Abort transcription
   */
  abort() {
    if (this.recognition && this.isListening) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  /**
   * Get final transcript
   */
  getFinalTranscript(): string {
    return this.finalTranscript.trim();
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Set callback for transcript updates
   */
  onTranscript(callback: (result: TranscriptionResult) => void) {
    this.onTranscriptCallback = callback;
  }

  /**
   * Set callback for errors
   */
  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  /**
   * Set callback for end event
   */
  onEnd(callback: () => void) {
    this.onEndCallback = callback;
  }

  /**
   * Get language name from code
   */
  private getLanguageName(code: string): string {
    const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
    return language?.name || 'English (US)';
  }

  /**
   * Reset transcript
   */
  reset() {
    this.finalTranscript = '';
  }
}

/**
 * Detect language from transcript text
 * This is a simple heuristic - in production, use a proper language detection API
 */
export function detectLanguageFromText(text: string): { code: string; name: string; confidence: number } {
  if (!text || text.length < 10) {
    return { code: 'en-US', name: 'English (US)', confidence: 0.5 };
  }

  // Simple character-based detection
  const hasChineseChars = /[\u4e00-\u9fa5]/.test(text);
  const hasJapaneseChars = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
  const hasKoreanChars = /[\uac00-\ud7af]/.test(text);
  const hasArabicChars = /[\u0600-\u06ff]/.test(text);
  const hasThaiChars = /[\u0e00-\u0e7f]/.test(text);
  const hasCyrillicChars = /[\u0400-\u04ff]/.test(text);

  if (hasChineseChars) {
    return { code: 'zh-CN', name: 'Chinese (Simplified)', confidence: 0.9 };
  }
  if (hasJapaneseChars) {
    return { code: 'ja-JP', name: 'Japanese', confidence: 0.9 };
  }
  if (hasKoreanChars) {
    return { code: 'ko-KR', name: 'Korean', confidence: 0.9 };
  }
  if (hasArabicChars) {
    return { code: 'ar-SA', name: 'Arabic', confidence: 0.9 };
  }
  if (hasThaiChars) {
    return { code: 'th-TH', name: 'Thai', confidence: 0.9 };
  }
  if (hasCyrillicChars) {
    return { code: 'ru-RU', name: 'Russian', confidence: 0.8 };
  }

  // Default to English
  return { code: 'en-US', name: 'English (US)', confidence: 0.7 };
}

/**
 * Simple auto-translation placeholder
 * In production, integrate with translation API (Google Translate, DeepL, etc.)
 */
export async function translateToEnglish(text: string, sourceLanguage: string): Promise<string> {
  // This is a placeholder - in production, call a translation API
  // For now, return a message indicating translation would happen
  if (sourceLanguage.startsWith('en')) {
    return text; // Already English
  }
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return placeholder text indicating where translation would appear
  return `[Translation of: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"]`;
}