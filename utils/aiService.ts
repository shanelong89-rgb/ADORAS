/**
 * AI Service - Phase 4a, 4b, 4c
 * Handles all AI-powered features:
 * - Photo tagging (Phase 4a) using Groq AI Vision
 * - Audio transcription (Phase 4b) - NOT SUPPORTED by Groq
 * - Chat assistant (Phase 4c)
 * - Document text extraction using Groq AI Vision
 */

import { projectId, publicAnonKey } from './supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb`;

export interface AIServiceStatus {
  configured: boolean;
  services: {
    imageAnalysis: boolean;
    tagSuggestions: boolean;
    audioTranscription?: boolean;
  };
  message: string;
}

export interface PhotoAnalysisResult {
  tags: string[];
  category: string;
  description: string;
}

export interface AudioTranscriptionResult {
  transcript: string;
  language: string;
  duration?: number;
}

export interface BatchTranscriptionResult {
  id: string;
  success: boolean;
  transcription?: AudioTranscriptionResult;
  error?: string;
}

/**
 * Check if AI service is configured
 */
export async function isAIConfigured(): Promise<boolean> {
  try {
    const status = await checkAIStatus();
    return status.configured;
  } catch (error) {
    console.error('Failed to check AI status:', error);
    return false;
  }
}

/**
 * Check AI service status
 */
export async function checkAIStatus(): Promise<AIServiceStatus> {
  try {
    const response = await fetch(`${API_BASE}/ai/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check AI status: ${response.status}`);
    }

    const status = await response.json();
    return status;
  } catch (error) {
    console.error('AI status check error:', error);
    throw error;
  }
}

/**
 * Analyze photo and generate tags using AI (Phase 4a)
 */
export async function analyzePhoto(imageUrl: string): Promise<PhotoAnalysisResult> {
  try {
    console.log('Calling AI photo analysis for:', imageUrl.substring(0, 100) + '...');
    
    const response = await fetch(`${API_BASE}/ai/analyze-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      // Clone the response so we can read it multiple times if needed
      const responseClone = response.clone();
      
      try {
        const error = await response.json();
        
        // Check for invalid API key error (Groq-specific)
        if (error.details && (
          error.details.includes('api-key') || 
          error.details.includes('authentication') ||
          error.details.includes('401') ||
          error.details.includes('API key') ||
          error.details.includes('Invalid API Key') ||
          error.details.includes('Groq')
        )) {
          console.error('❌ GROQ API KEY ERROR: Invalid or missing Groq API key');
          console.log('📖 Please update your GROQ_API_KEY in the Supabase environment');
          console.log('🔗 Get a free key from: https://console.groq.com/keys');
          throw new Error('GROQ_API_KEY_INVALID');
        }
        
        // Check if AI service needs setup
        if (error.needsSetup) {
          console.log('ℹ️ AI features not available: Groq API key not configured');
          throw new Error('AI_NOT_CONFIGURED');
        }
        
        console.error('AI photo analysis API error:', error);
        throw new Error(error.error || error.details || `Failed to analyze photo: ${response.status}`);
      } catch (jsonError) {
        // If JSON parsing fails, get text from the clone
        try {
          const errorText = await responseClone.text();
          
          // Check for API key error in text response
          if (errorText.includes('api-key') || 
              errorText.includes('authentication') || 
              errorText.includes('401') ||
              errorText.includes('Invalid API Key') ||
              errorText.includes('Groq')) {
            console.error('❌ GROQ API KEY ERROR: Invalid or missing Groq API key');
            console.log('📖 Please update your GROQ_API_KEY in the Supabase environment');
            console.log('🔗 Get a free key from: https://console.groq.com/keys');
            throw new Error('GROQ_API_KEY_INVALID');
          }
          
          console.error('AI photo analysis error (non-JSON):', response.status, errorText);
          throw new Error(`Failed to analyze photo: ${response.status} - ${errorText.substring(0, 200)}`);
        } catch (textError) {
          // If both fail, just throw the status
          throw new Error(`Failed to analyze photo: ${response.status}`);
        }
      }
    }

    const result = await response.json();
    console.log('✅ AI photo analysis complete:', result);
    
    return result;
  } catch (error) {
    // Don't log errors for expected configuration issues
    if (error instanceof Error && (error.message === 'AI_NOT_CONFIGURED' || error.message === 'GROQ_API_KEY_INVALID')) {
      throw error;
    }
    console.error('AI photo analysis error:', error);
    throw error;
  }
}

/**
 * Auto-tag a photo on upload (Phase 4a)
 * Returns tags or empty array if AI is not configured
 */
export async function autoTagPhoto(
  imageUrl: string
): Promise<{
  tags: string[];
  category: string;
  description: string;
  aiGenerated: boolean;
}> {
  try {
    // Check if AI is configured
    const configured = await isAIConfigured();
    
    if (!configured) {
      console.log('AI not configured, skipping auto-tagging');
      return {
        tags: [],
        category: 'Uncategorized',
        description: '',
        aiGenerated: false,
      };
    }

    // Wait for image to be fully loaded before analysis
    await waitForImageLoad(imageUrl);

    // Analyze the photo
    const result = await analyzePhoto(imageUrl);
    
    return {
      tags: result.tags || [],
      category: result.category || 'Uncategorized',
      description: result.description || '',
      aiGenerated: true,
    };
  } catch (error) {
    // If AI fails, return empty tags (don't block upload)
    console.error('Auto-tagging failed, continuing without tags:', error);
    return {
      tags: [],
      category: 'Uncategorized',
      description: '',
      aiGenerated: false,
    };
  }
}

/**
 * Wait for image to be fully loaded
 * Ensures the image URL is accessible before sending to AI
 */
function waitForImageLoad(imageUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Set timeout to avoid hanging - reduce from 10s to 3s
    const timeout = setTimeout(() => {
      console.warn('⚠️ Image load timeout, skipping AI analysis');
      reject(new Error('Image load timeout'));
    }, 3000); // Reduced timeout
    
    img.onload = () => {
      clearTimeout(timeout);
      resolve();
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      console.warn('⚠️ Image load error, skipping AI analysis');
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Extract text from document using AI OCR (Groq AI Vision)
 * Useful for extracting text from scanned documents, PDFs converted to images, etc.
 */
export async function extractDocumentText(imageUrl: string): Promise<{
  text: string;
  language: string;
}> {
  try {
    console.log('Calling AI document text extraction for:', imageUrl.substring(0, 100) + '...');
    
    const response = await fetch(`${API_BASE}/ai/extract-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      const responseClone = response.clone();
      
      try {
        const error = await response.json();
        
        // Check for unsupported format error - this is expected, no need for verbose logging
        if (error.unsupportedFormat || error.error === 'UNSUPPORTED_FORMAT') {
          // Silent handling - this is an expected user scenario, not a system error
          throw new Error(
            error.message || 'This document format is not supported for AI text extraction. Only PNG, JPEG, GIF, and WebP images are supported.'
          );
        }
        
        // Check for quota exceeded error
        if (error.quotaError || error.error === 'OPENAI_QUOTA_EXCEEDED') {
          console.warn('⚠️ OpenAI quota exceeded - document extraction unavailable');
          
          // Return user-friendly error with fallback message
          throw new Error(
            error.message || 'OpenAI API quota exceeded. Please add credits at platform.openai.com/account/billing to enable document text extraction.'
          );
        }
        
        // Check for invalid API key error (Groq-specific)
        if (error.details && (
          error.details.includes('api-key') || 
          error.details.includes('authentication') ||
          error.details.includes('401') ||
          error.details.includes('API key') ||
          error.details.includes('Invalid API Key') ||
          error.details.includes('Groq')
        )) {
          console.error('❌ GROQ API KEY ERROR: Invalid or missing Groq API key');
          console.log('📖 Please update your GROQ_API_KEY in the Supabase environment');
          console.log('🔗 Get a free key from: https://console.groq.com/keys');
          throw new Error('GROQ_API_KEY_INVALID');
        }
        
        if (error.needsSetup) {
          console.log('ℹ️ AI features not available: Groq API key not configured');
          throw new Error('AI_NOT_CONFIGURED');
        }
        
        // Only log unexpected errors
        console.error('AI document extraction API error:', error);
        throw new Error(error.error || error.details || `Failed to extract document text: ${response.status}`);
      } catch (jsonError) {
        // If this is a rethrown error from above, don't log again
        if (jsonError instanceof Error && (
          jsonError.message.includes('not supported for AI text extraction') ||
          jsonError.message.includes('GROQ_API_KEY_INVALID') ||
          jsonError.message.includes('AI_NOT_CONFIGURED')
        )) {
          throw jsonError;
        }
        
        try {
          const errorText = await responseClone.text();
          
          if (errorText.includes('api-key') || 
              errorText.includes('authentication') || 
              errorText.includes('401') ||
              errorText.includes('Invalid API Key') ||
              errorText.includes('Groq')) {
            console.error('❌ GROQ API KEY ERROR: Invalid or missing Groq API key');
            console.log('📖 Please update your GROQ_API_KEY in the Supabase environment');
            console.log('🔗 Get a free key from: https://console.groq.com/keys');
            throw new Error('GROQ_API_KEY_INVALID');
          }
          
          // Don't log if it's the expected unsupported format error
          if (!errorText.includes('UNSUPPORTED_FORMAT')) {
            console.error('AI document extraction error (non-JSON):', response.status, errorText);
          }
          throw new Error(`Failed to extract document text: ${response.status}`);
        } catch (textError) {
          throw new Error(`Failed to extract document text: ${response.status}`);
        }
      }
    }

    const result = await response.json();
    console.log('✅ AI document text extraction complete:', { length: result.text?.length });
    
    return {
      text: result.text || '',
      language: result.language || 'unknown'
    };
  } catch (error) {
    if (error instanceof Error && (error.message === 'AI_NOT_CONFIGURED' || error.message === 'GROQ_API_KEY_INVALID')) {
      throw error;
    }
    console.error('AI document extraction error:', error);
    throw error;
  }
}

/**
 * Transcribe audio using AI (Phase 4b)
 * Uses OpenAI Whisper API for accurate transcription
 */
export async function transcribeAudio(
  audioUrl: string,
  language?: string
): Promise<AudioTranscriptionResult> {
  try {
    console.log('Calling AI audio transcription for:', audioUrl.substring(0, 50) + '...');
    
    const response = await fetch(`${API_BASE}/ai/transcribe-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ audioUrl, language }),
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Check for invalid API key error
        if (error.details && (
          error.details.includes('api-key') || 
          error.details.includes('authentication') ||
          error.details.includes('401') ||
          error.details.includes('API key') ||
          error.details.includes('Invalid API Key') ||
          error.details.includes('Groq') ||
          error.details.includes('OpenAI')
        )) {
          console.error('❌ AI API KEY ERROR: Invalid or missing API key');
          console.log('📖 Please update your OPENAI_API_KEY in the Supabase environment');
          console.log('🔗 Get a free key from: https://platform.openai.com/api-keys');
          throw new Error('OPENAI_API_KEY_INVALID');
        }
      
      // Check if AI service needs setup
      if (error.needsSetup) {
        throw new Error('AI_NOT_CONFIGURED');
      }
      
      throw new Error(error.error || `Failed to transcribe audio: ${response.status}`);
    }

    const result = await response.json();
    
    // Check if manual transcription is needed (Groq Whisper requires file upload)
    if (result.needsManualTranscription) {
      console.log('ℹ️ Audio transcription requires manual entry');
      throw new Error('MANUAL_TRANSCRIPTION_NEEDED');
    }
    
    console.log('AI transcription complete:', {
      length: result.transcript?.length,
      language: result.language,
    });
    
    return result;
  } catch (error) {
    console.error('AI audio transcription error:', error);
    throw error;
  }
}

/**
 * Batch transcribe multiple audio files
 */
export async function transcribeAudioBatch(
  audioFiles: Array<{ id: string; audioUrl: string; language?: string }>
): Promise<{
  results: BatchTranscriptionResult[];
  summary: { total: number; successful: number; failed: number };
}> {
  try {
    console.log(`Batch transcribing ${audioFiles.length} audio files...`);
    
    const response = await fetch(`${API_BASE}/ai/transcribe-audio-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ audioFiles }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to batch transcribe audio');
    }

    const result = await response.json();
    console.log('Batch transcription complete:', result.summary);
    
    return result;
  } catch (error) {
    console.error('Batch transcription error:', error);
    throw error;
  }
}

/**
 * Auto-transcribe a voice note on upload (Phase 4b)
 * Returns transcript or empty string if transcription fails
 */
export async function autoTranscribeVoiceNote(
  audioUrl: string,
  language?: string
): Promise<{
  transcript: string;
  language: string;
  aiGenerated: boolean;
}> {
  try {
    // Check if AI is configured
    const configured = await isAIConfigured();
    
    if (!configured) {
      console.log('AI not configured, skipping auto-transcription');
      return {
        transcript: '',
        language: language || 'unknown',
        aiGenerated: false,
      };
    }

    // Transcribe the audio
    const result = await transcribeAudio(audioUrl, language);
    
    return {
      transcript: result.transcript || '',
      language: result.language || language || 'unknown',
      aiGenerated: true,
    };
  } catch (error) {
    // If AI fails or manual transcription needed, return empty transcript (don't block upload)
    if (error instanceof Error && error.message === 'MANUAL_TRANSCRIPTION_NEEDED') {
      console.log('Manual transcription needed for voice note');
    } else {
      console.error('Auto-transcription failed, continuing without transcript:', error);
    }
    return {
      transcript: '',
      language: language || 'unknown',
      aiGenerated: false,
    };
  }
}

/**
 * Language code mapping for Whisper API
 * Converts common language names to ISO 639-1 codes
 */
export function getLanguageCode(languageName: string): string {
  const languageMap: Record<string, string> = {
    'english': 'en',
    'spanish': 'es',
    'french': 'fr',
    'german': 'de',
    'italian': 'it',
    'portuguese': 'pt',
    'russian': 'ru',
    'chinese': 'zh',
    'japanese': 'ja',
    'korean': 'ko',
    'arabic': 'ar',
    'hindi': 'hi',
    'turkish': 'tr',
    'dutch': 'nl',
    'polish': 'pl',
    'swedish': 'sv',
    'danish': 'da',
    'norwegian': 'no',
    'finnish': 'fi',
  };

  const normalized = languageName.toLowerCase();
  return languageMap[normalized] || 'en';
}

/**
 * Translate text using Groq AI
 */
export async function translateText(params: {
  text: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}): Promise<{
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}> {
  try {
    console.log('Translating text...', { 
      from: params.sourceLanguage || 'auto-detect', 
      to: params.targetLanguage || 'English' 
    });
    
    const response = await fetch(`${API_BASE}/ai/translate-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      
      if (error.needsSetup) {
        throw new Error('AI_NOT_CONFIGURED');
      }
      
      throw new Error(error.error || 'Failed to translate text');
    }

    const result = await response.json();
    console.log('Translation complete');
    
    return result;
  } catch (error) {
    console.error('AI translation error:', error);
    throw error;
  }
}

/**
 * AI Chat Assistant (Phase 4c)
 * Send a message to the AI assistant
 */
export async function chatWithAI(
  message: string,
  context?: {
    memories?: Array<{ type: string; content: string; timestamp: string }>;
    userType?: 'keeper' | 'teller';
    partnerName?: string;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }
): Promise<{ response: string; usage?: { totalTokens: number } }> {
  try {
    console.log('Calling AI chat assistant...');
    
    const response = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ message, context }),
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Check if AI service needs setup
      if (error.needsSetup) {
        throw new Error('AI_NOT_CONFIGURED');
      }
      
      throw new Error(error.error || `Failed to get AI response: ${response.status}`);
    }

    const result = await response.json();
    console.log('AI chat response received:', {
      length: result.response?.length,
      tokens: result.usage?.totalTokens,
    });
    
    return result;
  } catch (error) {
    console.error('AI chat error:', error);
    throw error;
  }
}

/**
 * Generate memory prompts using AI (Phase 4c)
 */
export async function generateAIPrompts(params: {
  count?: number;
  category?: string;
  context?: {
    memories?: Array<any>;
    partnerName?: string;
    relationship?: string;
  };
}): Promise<string[]> {
  try {
    console.log('Generating AI prompts...', params);
    
    const response = await fetch(`${API_BASE}/ai/generate-prompts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Check if AI service needs setup
      if (error.needsSetup) {
        throw new Error('AI_NOT_CONFIGURED');
      }
      
      throw new Error(error.error || 'Failed to generate prompts');
    }

    const result = await response.json();
    console.log('AI prompts generated:', result.prompts?.length);
    
    return result.prompts || [];
  } catch (error) {
    console.error('AI prompt generation error:', error);
    throw error;
  }
}

/**
 * Get AI-powered memory recommendations (Phase 4c)
 */
export async function getMemoryRecommendations(params: {
  memories: Array<any>;
  query?: string;
  limit?: number;
}): Promise<string[]> {
  try {
    console.log('Getting AI memory recommendations...');
    
    const response = await fetch(`${API_BASE}/ai/recommend-memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Check if AI service needs setup
      if (error.needsSetup) {
        throw new Error('AI_NOT_CONFIGURED');
      }
      
      throw new Error(error.error || 'Failed to get recommendations');
    }

    const result = await response.json();
    console.log('AI recommendations received:', result.recommendedIds?.length);
    
    return result.recommendedIds || [];
  } catch (error) {
    console.error('AI recommendations error:', error);
    throw error;
  }
}

/**
 * PHASE 4F: ADVANCED AI FEATURES
 * ============================================================================
 */

/**
 * Generate memory summary
 */
export async function summarizeMemories(params: {
  memories: Array<any>;
  summaryType?: 'brief' | 'detailed' | 'narrative';
  timeframe?: string;
  focus?: string;
}): Promise<{
  summary: string;
  memoryCount: number;
  summaryType: string;
}> {
  try {
    console.log('Generating memory summary...', params);
    
    const response = await fetch(`${API_BASE}/ai/summarize-memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      
      if (error.needsSetup) {
        throw new Error('AI_NOT_CONFIGURED');
      }
      
      throw new Error(error.error || 'Failed to generate summary');
    }

    const result = await response.json();
    console.log('Memory summary generated:', result.summary?.length);
    
    return result;
  } catch (error) {
    console.error('AI summary error:', error);
    throw error;
  }
}

/**
 * Semantic search across memories
 */
export async function semanticSearch(params: {
  query: string;
  memories: Array<any>;
  limit?: number;
}): Promise<{
  results: string[];
  query: string;
}> {
  try {
    console.log('Performing semantic search...', params.query);
    
    const response = await fetch(`${API_BASE}/ai/search-semantic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      
      if (error.needsSetup) {
        throw new Error('AI_NOT_CONFIGURED');
      }
      
      throw new Error(error.error || 'Failed to perform search');
    }

    const result = await response.json();
    console.log('Semantic search results:', result.results?.length);
    
    return result;
  } catch (error) {
    console.error('AI search error:', error);
    throw error;
  }
}

/**
 * Generate memory insights
 */
export async function generateInsights(params: {
  memories: Array<any>;
  insightType?: 'patterns' | 'themes' | 'timeline' | 'relationships';
}): Promise<{
  insights: {
    mainInsight: string;
    details: string[];
    suggestions: string[];
  };
  insightType: string;
  memoryCount: number;
}> {
  try {
    console.log('Generating insights...', params.insightType);
    
    const response = await fetch(`${API_BASE}/ai/generate-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      
      if (error.needsSetup) {
        throw new Error('AI_NOT_CONFIGURED');
      }
      
      throw new Error(error.error || 'Failed to generate insights');
    }

    const result = await response.json();
    console.log('Insights generated:', result.insights?.mainInsight);
    
    return result;
  } catch (error) {
    console.error('AI insights error:', error);
    throw error;
  }
}

/**
 * Find connected/related memories
 */
export async function findConnectedMemories(params: {
  memoryId: string;
  memories: Array<any>;
  limit?: number;
}): Promise<{
  connectedMemories: string[];
  memoryId: string;
}> {
  try {
    console.log('Finding connected memories for:', params.memoryId);
    
    const response = await fetch(`${API_BASE}/ai/find-connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      
      if (error.needsSetup) {
        throw new Error('AI_NOT_CONFIGURED');
      }
      
      throw new Error(error.error || 'Failed to find connections');
    }

    const result = await response.json();
    console.log('Connected memories found:', result.connectedMemories?.length);
    
    return result;
  } catch (error) {
    console.error('AI connections error:', error);
    throw error;
  }
}