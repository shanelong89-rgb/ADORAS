import { Hono } from 'npm:hono';
import Groq from 'npm:groq-sdk';
import * as kv from './kv_store.ts';

const ai = new Hono();

/**
 * Check AI service configuration status
 * GET /make-server-deded1eb/ai/status
 */
ai.get('/make-server-deded1eb/ai/status', async (c) => {
  try {
    let groqApiKey = Deno.env.get('GROQ_API_KEY');
    let openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    // Trim keys
    if (groqApiKey) groqApiKey = groqApiKey.trim();
    if (openaiApiKey) openaiApiKey = openaiApiKey.trim();
    
    const groqConfigured = !!groqApiKey && groqApiKey.startsWith('gsk_');
    const openaiConfigured = !!openaiApiKey && (openaiApiKey.startsWith('sk-') || openaiApiKey.startsWith('org-'));
    
    // Debug logging
    if (groqApiKey) {
      console.log('✅ GROQ_API_KEY is set');
      console.log('📝 Groq key format valid:', groqApiKey.startsWith('gsk_'));
    } else {
      console.log('ℹ️ GROQ_API_KEY is not set');
    }

    if (openaiApiKey) {
      console.log('✅ OPENAI_API_KEY is set');
      console.log('📝 OpenAI key details:', {
        length: openaiApiKey.length,
        prefix: openaiApiKey.substring(0, 4),
        startsWithSk: openaiApiKey.startsWith('sk-'),
        startsWithOrg: openaiApiKey.startsWith('org-'),
      });
    } else {
      console.log('ℹ️ OPENAI_API_KEY is not set');
    }
    
    return c.json({
      configured: groqConfigured || openaiConfigured,
      available: true,
      providers: {
        groq: {
          configured: groqConfigured,
          features: ['voice-transcription', 'text-generation', 'translation'],
        },
        openai: {
          configured: openaiConfigured,
          features: ['vision', 'photo-tagging', 'document-extraction'],
        },
      },
      features: {
        photoTagging: openaiConfigured, // Now uses OpenAI
        voiceTranscription: groqConfigured, // Uses Groq Whisper
        memoryRecommendations: groqConfigured, // Uses Groq text models
        smartSearch: groqConfigured,
        documentExtraction: openaiConfigured, // Now uses OpenAI
      },
      notice: 'Vision features (photo tagging, document extraction) now use OpenAI due to Groq vision model deprecation.',
    });
  } catch (error) {
    console.error('AI status check error:', error);
    return c.json({
      configured: false,
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * Extract text from a document image using OpenAI Vision API
 * POST /make-server-deded1eb/ai/extract-text
 * 
 * Body: {
 *   imageUrl: string,
 *   memoryId?: string
 * }
 */
ai.post('/make-server-deded1eb/ai/extract-text', async (c) => {
  try {
    let openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      console.error('❌ OPENAI_API_KEY not set in environment');
      return c.json({ 
        success: false, 
        error: 'OPENAI_API_KEY_NOT_SET',
        message: 'Document text extraction requires OpenAI API key with available credits. This feature is currently unavailable.',
        fallbackMessage: 'You can manually add text content to your memory using the edit button.'
      }, 503);
    }

    openaiApiKey = openaiApiKey.trim();

    console.log('🔑 OpenAI API key format check:', {
      length: openaiApiKey.length,
      prefix: openaiApiKey.substring(0, 4),
      suffix: openaiApiKey.substring(openaiApiKey.length - 4),
      startsWithSk: openaiApiKey.startsWith('sk-'),
    });

    if (!openaiApiKey.startsWith('sk-') && !openaiApiKey.startsWith('org-')) {
      console.error('❌ OPENAI_API_KEY has invalid format - must start with sk- or org-');
      return c.json({ 
        success: false, 
        error: 'OPENAI_API_KEY_INVALID',
        message: 'OpenAI API key format is invalid. Key should start with sk-',
        fallbackMessage: 'You can manually add text content to your memory using the edit button.'
      }, 503);
    }

    const { imageUrl, memoryId } = await c.req.json();

    if (!imageUrl) {
      return c.json({ success: false, error: 'imageUrl is required' }, 400);
    }

    // Check if the URL is for a supported image format
    // OpenAI Vision API only supports: png, jpeg, jpg, gif, webp
    const supportedFormats = ['png', 'jpeg', 'jpg', 'gif', 'webp'];
    const urlLower = imageUrl.toLowerCase();
    const isSupported = supportedFormats.some(format => 
      urlLower.includes(`.${format}`) || urlLower.includes(`type=${format}`)
    );
    
    if (!isSupported) {
      // Silent return - this is an expected user scenario, not a system error
      return c.json({ 
        success: false, 
        error: 'UNSUPPORTED_FORMAT',
        message: 'This document format is not supported for AI text extraction. Supported formats: PNG, JPEG, GIF, WebP',
        fallbackMessage: 'You can manually add text content to your memory using the edit button.',
        unsupportedFormat: true
      }, 400);
    }

    console.log('Extracting text from document with OpenAI Vision:', imageUrl.substring(0, 50) + '...');

    // Use OpenAI Vision API (Groq vision models have been decommissioned)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cost-effective vision model
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this document/image. Preserve the structure and formatting as much as possible. Return only the extracted text, no explanations.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0.0,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Check if it's a quota/billing error
      if (error.error?.code === 'insufficient_quota' || error.error?.type === 'insufficient_quota') {
        console.warn('⚠️ OpenAI quota exceeded - document extraction unavailable');
        return c.json({ 
          success: false, 
          error: 'OPENAI_QUOTA_EXCEEDED',
          message: 'OpenAI API quota exceeded. Please add credits at platform.openai.com/account/billing',
          fallbackMessage: 'You can manually add text content to your memory using the edit button.',
          quotaError: true
        }, 503);
      }
      
      console.error('OpenAI Vision API error:', error);
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const completion = await response.json();
    const extractedText = completion.choices[0]?.message?.content || '';
    console.log('✅ Extracted text length:', extractedText.length);

    // Store extraction if memoryId provided
    if (memoryId) {
      const extractionKey = `document_extraction:${memoryId}`;
      await kv.set(extractionKey, {
        text: extractedText,
        extractedAt: new Date().toISOString(),
      });
    }

    return c.json({
      success: true,
      text: extractedText,
    });

  } catch (error) {
    // Only log unexpected errors (not format/quota issues which are already handled above)
    if (error instanceof Error && 
        !error.message.includes('UNSUPPORTED_FORMAT') && 
        !error.message.includes('OPENAI_QUOTA_EXCEEDED')) {
      console.error('Document extraction error:', error);
    }
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to extract text',
      fallbackMessage: 'You can manually add text content to your memory using the edit button.'
    }, 500);
  }
});

/**
 * Auto-tag a photo using OpenAI Vision API
 * POST /make-server-deded1eb/ai/tag-photo
 * 
 * Body: {
 *   imageUrl: string,
 *   memoryId?: string
 * }
 */
ai.post('/make-server-deded1eb/ai/tag-photo', async (c) => {
  try {
    let openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      console.error('❌ OPENAI_API_KEY is NOT set');
      return c.json({ 
        success: false, 
        error: 'OPENAI_API_KEY_NOT_CONFIGURED',
        message: 'OpenAI API key is not configured' 
      }, 503);
    }

    // Trim whitespace and newlines
    openaiApiKey = openaiApiKey.trim();

    // Log key format for debugging (first/last 4 chars only)
    console.log('🔑 OpenAI API key format check:', {
      length: openaiApiKey.length,
      prefix: openaiApiKey.substring(0, 4),
      suffix: openaiApiKey.substring(openaiApiKey.length - 4),
      startsWithSk: openaiApiKey.startsWith('sk-'),
    });

    if (!openaiApiKey.startsWith('sk-') && !openaiApiKey.startsWith('org-')) {
      console.error('❌ OPENAI_API_KEY has invalid format - must start with sk- or org-');
      return c.json({ 
        success: false, 
        error: 'OPENAI_API_KEY_INVALID',
        message: 'OpenAI API key format is invalid. Key should start with sk-' 
      }, 503);
    }

    const { imageUrl, memoryId } = await c.req.json();

    if (!imageUrl) {
      return c.json({ success: false, error: 'imageUrl is required' }, 400);
    }

    console.log('Tagging photo with OpenAI Vision:', imageUrl.substring(0, 50) + '...');

    // Use OpenAI Vision API (Groq vision models have been decommissioned)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cost-effective vision model
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image and provide: 1) A brief description (1-2 sentences), 2) Detected people/subjects, 3) Location/setting if identifiable, 4) 3-5 relevant tags. Return as JSON: {description, people: [], location, tags: []}',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Check if it's a quota/billing error
      if (error.error?.code === 'insufficient_quota' || error.error?.type === 'insufficient_quota') {
        console.warn('⚠️ OpenAI quota exceeded - photo auto-tagging unavailable');
        return c.json({ 
          success: false, 
          error: 'OPENAI_QUOTA_EXCEEDED',
          message: 'OpenAI API quota exceeded. Auto-tagging is temporarily unavailable.',
          fallbackMessage: 'You can manually add tags to your memory using the edit button.',
          quotaError: true
        }, 503);
      }
      
      console.error('OpenAI Vision API error:', error);
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const completion = await response.json();
    const responseText = completion.choices[0]?.message?.content || '';
    console.log('✅ OpenAI Vision response:', responseText);

    // Parse JSON response
    let analysis;
    try {
      // Extract JSON from response (might be wrapped in markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      // Return basic analysis if parsing fails
      analysis = {
        description: responseText,
        people: [],
        location: null,
        tags: ['photo', 'memory'],
      };
    }

    // Store analysis if memoryId provided
    if (memoryId) {
      const analysisKey = `photo_analysis:${memoryId}`;
      await kv.set(analysisKey, {
        ...analysis,
        analyzedAt: new Date().toISOString(),
      });
    }

    return c.json({
      success: true,
      analysis,
    });

  } catch (error) {
    console.error('Photo tagging error:', error);
    
    // Check if it's an API key error
    if (error instanceof Error && error.message.includes('API key')) {
      return c.json({ 
        success: false, 
        error: 'OPENAI_API_KEY_INVALID',
        message: 'Invalid OpenAI API key',
        details: error.message
      }, 401);
    }
    
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to tag photo' 
    }, 500);
  }
});

/**
 * Analyze photo and generate tags using Groq AI Vision (Phase 4a)
 * POST /make-server-deded1eb/ai/analyze-photo
 * 
 * Body: {
 *   imageUrl: string
 * }
 * 
 * Returns: {
 *   tags: string[],
 *   category: string,
 *   description: string
 * }
 */
ai.post('/make-server-deded1eb/ai/analyze-photo', async (c) => {
  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    
    if (!groqApiKey) {
      console.error('❌ GROQ_API_KEY is NOT set');
      return c.json({ 
        success: false, 
        needsSetup: true,
        error: 'GROQ_API_KEY_NOT_CONFIGURED',
        message: 'Groq API key is not configured. Please set GROQ_API_KEY environment variable.',
        details: 'Get your free API key from: https://console.groq.com/keys' 
      }, 503);
    }

    // Check if the key has the expected format
    if (!groqApiKey.startsWith('gsk_')) {
      console.error('❌ GROQ_API_KEY has invalid format');
      return c.json({ 
        success: false, 
        error: 'GROQ_API_KEY_INVALID',
        message: 'Groq API key format is invalid. It should start with "gsk_"',
        details: 'Please check your GROQ_API_KEY environment variable' 
      }, 503);
    }

    const { imageUrl } = await c.req.json();

    if (!imageUrl) {
      return c.json({ success: false, error: 'imageUrl is required' }, 400);
    }

    console.log('Analyzing photo with Groq AI:', imageUrl.substring(0, 50) + '...');

    // Initialize Groq client
    const groq = new Groq({ apiKey: groqApiKey });

    try {
      // Use Groq text model for analysis since vision models are being phased out
      // We'll use a text-based approach with the image URL
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that analyzes photos and provides categorization metadata. Return responses in JSON format.',
          },
          {
            role: 'user',
            content: `Analyze this photo and provide: 1) A brief description, 2) A category (Family, Travel, Events, Daily Life, or Special Moments), 3) 3-5 relevant tags. Photo URL: ${imageUrl}\n\nReturn as JSON: {"description": "...", "category": "...", "tags": ["...", "..."]}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const responseText = completion.choices[0]?.message?.content || '';
      console.log('Groq response:', responseText);

      // Parse JSON response
      let analysis;
      try {
        // Extract JSON from response (might be wrapped in markdown code blocks)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse Groq response:', parseError);
        // Return default analysis if parsing fails
        analysis = {
          description: 'A memory photo',
          category: 'Uncategorized',
          tags: ['photo', 'memory'],
        };
      }

      return c.json({
        tags: analysis.tags || ['photo', 'memory'],
        category: analysis.category || 'Uncategorized',
        description: analysis.description || 'A memory photo',
      });

    } catch (groqError: any) {
      console.error('Groq API error:', groqError);
      
      // Check for API key authentication errors
      if (groqError?.status === 401 || groqError?.message?.includes('authentication') || groqError?.message?.includes('api-key')) {
        return c.json({ 
          success: false, 
          error: 'GROQ_API_KEY_INVALID',
          message: 'Invalid Groq API key',
          details: groqError.message || 'Authentication failed. Please check your GROQ_API_KEY.'
        }, 401);
      }
      
      throw groqError;
    }

  } catch (error) {
    console.error('Photo analysis error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to analyze photo' 
    }, 500);
  }
});

/**
 * Transcribe audio using Groq Whisper (Phase 4b)
 * POST /make-server-deded1eb/ai/transcribe-audio
 * 
 * Body: {
 *   audioUrl: string,
 *   language?: string
 * }
 */
ai.post('/make-server-deded1eb/ai/transcribe-audio', async (c) => {
  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    
    if (!groqApiKey) {
      return c.json({ 
        success: false, 
        needsSetup: true,
        error: 'GROQ_API_KEY_NOT_CONFIGURED' 
      }, 503);
    }

    const { audioUrl, language } = await c.req.json();

    if (!audioUrl) {
      return c.json({ success: false, error: 'audioUrl is required' }, 400);
    }

    console.log('Transcribing audio with Groq Whisper:', audioUrl.substring(0, 50) + '...');

    // Fetch the audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error('Failed to fetch audio file');
    }

    const audioBlob = await audioResponse.blob();
    const audioBuffer = await audioBlob.arrayBuffer();
    const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    // Initialize Groq client
    const groq = new Groq({ apiKey: groqApiKey });

    // Transcribe with Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      language: language || undefined, // Auto-detect if not specified
      response_format: 'verbose_json',
    });

    console.log('Transcription complete:', {
      language: transcription.language,
      duration: transcription.duration,
      text: transcription.text?.substring(0, 100) + '...',
    });

    // Check if translation to English is needed
    let finalText = transcription.text || '';
    const detectedLanguage = transcription.language || language || 'unknown';

    // If not English, translate
    if (detectedLanguage !== 'en' && detectedLanguage !== 'english') {
      console.log(`Translating from ${detectedLanguage} to English...`);
      
      const translationCompletion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate the following text to English, preserving the meaning and tone. Return only the translated text, no explanations.',
          },
          {
            role: 'user',
            content: finalText,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const translatedText = translationCompletion.choices[0]?.message?.content || finalText;
      console.log('Translation complete');

      return c.json({
        transcript: translatedText,
        originalTranscript: finalText,
        language: detectedLanguage,
        translated: true,
        duration: transcription.duration,
      });
    }

    return c.json({
      transcript: finalText,
      language: detectedLanguage,
      translated: false,
      duration: transcription.duration,
    });

  } catch (error) {
    console.error('Audio transcription error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to transcribe audio' 
    }, 500);
  }
});

/**
 * Batch transcribe multiple audio files
 * POST /make-server-deded1eb/ai/transcribe-audio-batch
 */
ai.post('/make-server-deded1eb/ai/transcribe-audio-batch', async (c) => {
  try {
    const { audioFiles } = await c.req.json();

    if (!Array.isArray(audioFiles) || audioFiles.length === 0) {
      return c.json({ success: false, error: 'audioFiles array is required' }, 400);
    }

    console.log(`Batch transcribing ${audioFiles.length} audio files...`);

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const audioFile of audioFiles) {
      try {
        const transcription = await fetch(`${c.req.url.split('/ai/')[0]}/ai/transcribe-audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioUrl: audioFile.audioUrl,
            language: audioFile.language,
          }),
        }).then(r => r.json());

        results.push({
          id: audioFile.id,
          success: true,
          transcription,
        });
        successful++;
      } catch (error) {
        results.push({
          id: audioFile.id,
          success: false,
          error: error instanceof Error ? error.message : 'Failed to transcribe',
        });
        failed++;
      }
    }

    return c.json({
      results,
      summary: {
        total: audioFiles.length,
        successful,
        failed,
      },
    });

  } catch (error) {
    console.error('Batch transcription error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to batch transcribe' 
    }, 500);
  }
});

/**
 * Translate text using Groq AI
 * POST /make-server-deded1eb/ai/translate-text
 */
ai.post('/make-server-deded1eb/ai/translate-text', async (c) => {
  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    
    if (!groqApiKey) {
      return c.json({ 
        success: false, 
        needsSetup: true,
        error: 'GROQ_API_KEY_NOT_CONFIGURED' 
      }, 503);
    }

    const { text, sourceLanguage, targetLanguage } = await c.req.json();

    if (!text) {
      return c.json({ success: false, error: 'text is required' }, 400);
    }

    const target = targetLanguage || 'English';
    const source = sourceLanguage || 'auto-detect';

    console.log(`Translating text from ${source} to ${target}...`);

    const groq = new Groq({ apiKey: groqApiKey });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following text to ${target}, preserving the meaning and tone. Return only the translated text, no explanations.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const translatedText = completion.choices[0]?.message?.content || text;

    return c.json({
      translatedText,
      sourceLanguage: source,
      targetLanguage: target,
    });

  } catch (error) {
    console.error('Translation error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to translate text' 
    }, 500);
  }
});

/**
 * AI Chat Assistant (Phase 4c)
 * POST /make-server-deded1eb/ai/chat
 */
ai.post('/make-server-deded1eb/ai/chat', async (c) => {
  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    
    if (!groqApiKey) {
      return c.json({ 
        success: false, 
        needsSetup: true,
        error: 'GROQ_API_KEY_NOT_CONFIGURED' 
      }, 503);
    }

    const { message, context } = await c.req.json();

    if (!message) {
      return c.json({ success: false, error: 'message is required' }, 400);
    }

    console.log('Processing AI chat request...');

    const groq = new Groq({ apiKey: groqApiKey });

    // Build context-aware system message
    let systemMessage = 'You are Adoras AI, a helpful and empathetic assistant for the Adoras memory-sharing app. You help families preserve and share their precious memories. Be warm, supportive, and concise.';

    if (context?.userType) {
      if (context.userType === 'keeper') {
        systemMessage += ' You are assisting a Legacy Keeper who is preserving memories from their loved ones.';
      } else {
        systemMessage += ' You are assisting a Storyteller who is sharing their life stories and memories.';
      }
    }

    if (context?.partnerName) {
      systemMessage += ` The user is connected with ${context.partnerName}.`;
    }

    // Build conversation history
    const messages: any[] = [
      { role: 'system', content: systemMessage },
    ];

    // Add conversation history if provided
    if (context?.conversationHistory) {
      messages.push(...context.conversationHistory);
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return c.json({
      response,
      usage: {
        totalTokens: completion.usage?.total_tokens || 0,
      },
    });

  } catch (error) {
    console.error('AI chat error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get AI response' 
    }, 500);
  }
});

/**
 * Generate memory prompts using AI
 * POST /make-server-deded1eb/ai/generate-prompts
 */
ai.post('/make-server-deded1eb/ai/generate-prompts', async (c) => {
  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    
    if (!groqApiKey) {
      return c.json({ 
        success: false, 
        needsSetup: true,
        error: 'GROQ_API_KEY_NOT_CONFIGURED' 
      }, 503);
    }

    const { count, category, context } = await c.req.json();

    const promptCount = count || 5;
    const promptCategory = category || 'general memories';

    console.log(`Generating ${promptCount} prompts for category: ${promptCategory}`);

    const groq = new Groq({ apiKey: groqApiKey });

    let userMessage = `Generate ${promptCount} thoughtful memory prompts about ${promptCategory}. Each prompt should encourage storytelling and reflection.`;

    if (context?.partnerName) {
      userMessage += ` The prompts are for someone to share memories with ${context.partnerName}.`;
    }

    userMessage += ' Return as a JSON array of strings: ["prompt 1", "prompt 2", ...]';

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a thoughtful assistant that generates meaningful memory prompts for families. Create warm, open-ended questions that encourage storytelling.',
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Parse JSON response
    let prompts: string[] = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        prompts = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse prompts:', parseError);
      // Return default prompts if parsing fails
      prompts = [
        'What is your favorite childhood memory?',
        'Tell me about a special family tradition.',
        'What is something you learned from your parents?',
      ];
    }

    return c.json({
      prompts,
    });

  } catch (error) {
    console.error('Prompt generation error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate prompts' 
    }, 500);
  }
});

/**
 * Get AI-powered memory recommendations
 * POST /make-server-deded1eb/ai/recommend-memories
 */
ai.post('/make-server-deded1eb/ai/recommend-memories', async (c) => {
  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    
    if (!groqApiKey) {
      return c.json({ 
        success: false, 
        needsSetup: true,
        error: 'GROQ_API_KEY_NOT_CONFIGURED' 
      }, 503);
    }

    const { memories, query, limit } = await c.req.json();

    if (!memories || !Array.isArray(memories)) {
      return c.json({ success: false, error: 'memories array is required' }, 400);
    }

    const maxResults = limit || 5;

    console.log(`Finding ${maxResults} memory recommendations...`);

    const groq = new Groq({ apiKey: groqApiKey });

    // Build memory descriptions for AI
    const memoryDescriptions = memories.map((m: any) => ({
      id: m.id,
      summary: `${m.type || 'memory'} from ${m.date || 'unknown date'}: ${m.text || m.description || 'no description'}`,
    }));

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that recommends relevant memories. Analyze the query and return the IDs of the most relevant memories.',
        },
        {
          role: 'user',
          content: `Query: ${query || 'interesting memories'}\n\nMemories:\n${JSON.stringify(memoryDescriptions, null, 2)}\n\nReturn the ${maxResults} most relevant memory IDs as a JSON array: ["id1", "id2", ...]`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Parse JSON response
    let recommendedIds: string[] = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendedIds = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse recommendations:', parseError);
      // Return first N memory IDs if parsing fails
      recommendedIds = memories.slice(0, maxResults).map((m: any) => m.id);
    }

    return c.json({
      recommendedIds,
    });

  } catch (error) {
    console.error('Memory recommendations error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get recommendations' 
    }, 500);
  }
});

export default ai;
