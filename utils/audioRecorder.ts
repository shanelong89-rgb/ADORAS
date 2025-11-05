/**
 * Audio Recorder Utility with iOS Safari Compatibility
 * Handles audio recording with proper iOS Safari support
 */

export interface AudioRecorderOptions {
  onDataAvailable?: (blob: Blob) => void;
  onError?: (error: string) => void;
  mimeType?: string;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private isRecording: boolean = false;
  private options: AudioRecorderOptions;

  constructor(options: AudioRecorderOptions = {}) {
    this.options = options;
  }

  /**
   * Start recording audio
   */
  async start(): Promise<void> {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    try {
      console.log('🎤 Requesting microphone access...');
      
      // Request microphone permission with optimized settings
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      console.log('✅ Microphone access granted');

      // Determine the best supported MIME type for this device
      const mimeType = this.getBestMimeType();
      console.log('📼 Using MIME type:', mimeType);

      // Create MediaRecorder
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
      this.audioChunks = [];

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        console.log('📦 Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        console.log('🛑 MediaRecorder stopped, processing audio...');
        this.handleStop();
      };

      this.mediaRecorder.onerror = (event: any) => {
        console.error('❌ MediaRecorder error:', event.error);
        this.options.onError?.('Recording error: ' + event.error);
      };

      this.mediaRecorder.onstart = () => {
        console.log('🎙️ MediaRecorder started');
      };

      // Start recording with timeslice for iOS compatibility
      // iOS Safari works better with timeslice
      this.mediaRecorder.start(100); // Request data every 100ms
      this.isRecording = true;
      console.log('✅ Recording started');

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      
      let errorMessage = 'Failed to start recording';
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone permission denied';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone found';
        } else {
          errorMessage = error.message;
        }
      }
      
      this.options.onError?.(errorMessage);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Stop recording and return the audio blob
   */
  async stop(): Promise<Blob | null> {
    if (!this.isRecording || !this.mediaRecorder) {
      console.warn('Not recording');
      return null;
    }

    console.log('🛑 Stopping recording...');
    
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not available'));
        return;
      }

      // Store the resolve function to call when onstop fires
      const originalOnStop = this.mediaRecorder.onstop;
      this.mediaRecorder.onstop = (event) => {
        originalOnStop?.call(this.mediaRecorder, event);
        
        // Create blob from chunks
        const blob = this.createAudioBlob();
        resolve(blob);
      };

      try {
        // Request any remaining data
        if (this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.requestData();
        }
        
        // Stop the recorder
        this.mediaRecorder.stop();
        this.isRecording = false;
      } catch (error) {
        console.error('Error stopping recorder:', error);
        // Still try to create blob from what we have
        const blob = this.createAudioBlob();
        resolve(blob);
      }
    });
  }

  /**
   * Handle stop event
   */
  private handleStop(): void {
    const blob = this.createAudioBlob();
    
    if (blob && blob.size > 0) {
      console.log('✅ Audio blob created:', blob.size, 'bytes');
      this.options.onDataAvailable?.(blob);
    } else {
      console.warn('⚠️ Empty audio blob');
      this.options.onError?.('No audio data recorded');
    }
    
    this.cleanup();
  }

  /**
   * Create audio blob from chunks
   */
  private createAudioBlob(): Blob | null {
    if (this.audioChunks.length === 0) {
      console.warn('⚠️ No audio chunks to create blob');
      return null;
    }

    const mimeType = this.mediaRecorder?.mimeType || this.getBestMimeType() || 'audio/webm';
    const blob = new Blob(this.audioChunks, { type: mimeType });
    console.log('📦 Created blob:', blob.size, 'bytes, type:', blob.type);
    
    return blob;
  }

  /**
   * Get the best supported MIME type for this device
   */
  private getBestMimeType(): string | null {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    console.warn('No specific MIME type supported, using default');
    return null;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    // Stop all media tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        console.log('🛑 Stopping track:', track.kind);
        track.stop();
      });
      this.mediaStream = null;
    }

    // Clear chunks
    this.audioChunks = [];
    this.isRecording = false;
  }

  /**
   * Get recording state
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get current audio chunks count
   */
  getChunksCount(): number {
    return this.audioChunks.length;
  }

  /**
   * Abort recording without saving
   */
  abort(): void {
    if (this.mediaRecorder && this.isRecording) {
      try {
        this.mediaRecorder.stop();
      } catch (error) {
        console.error('Error aborting recording:', error);
      }
    }
    this.cleanup();
  }
}
