// ChatTab v2.0 - Scroll-to-top button completely removed
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Memory, UserProfile, UserType } from '../App';
import { Send, Camera, Mic, Paperclip, Play, Pause, Smile, Plus, Languages, Video, BookOpen, MessageSquarePlus, X, Volume2, FileText, Quote, File, ScanText, Eye, EyeOff, UserPlus, MessageCircle } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { toast } from 'sonner';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './ui/context-menu';
import { extractPhotoMetadata, extractVideoMetadata, extractVideoCreationDate } from '../utils/exifExtractor';
import { scanDocument, detectLanguage } from '../utils/documentScanner';
import { SpeechTranscriber, TranscriptionResult, detectLanguageFromText, translateToEnglish, SUPPORTED_LANGUAGES } from '../utils/speechTranscription';
import { AudioRecorder } from '../utils/audioRecorder';
import { AudioTranscriber } from '../utils/audioTranscriber';
import { translateText } from '../utils/aiService';
import { convertVideoToMP4, needsConversion, getVideoPlayabilityInfo } from '../utils/videoConverter';
import { extractVideoThumbnail } from '../utils/videoThumbnail';
import { MediaFullscreenPreview } from './MediaFullscreenPreview';

// Natural language date parsing function
function parseChronologicalDate(content: string, currentAge: number = 20, partnerBirthday?: Date): Date | null {
  const currentYear = new Date().getFullYear();
  const lowerContent = content.toLowerCase();
  
  // Pattern: "X years ago" or "X year ago"
  const yearsAgoMatch = lowerContent.match(/(\d+)\s+years?\s+ago/);
  if (yearsAgoMatch) {
    const yearsAgo = parseInt(yearsAgoMatch[1]);
    const year = currentYear - yearsAgo;
    return new Date(year, 0, 1);
  }
  
  // Pattern: "when you were X" or "when I was X" or "at age X" or "X years old"
  const ageMatch = lowerContent.match(/(?:when (?:you|i|he|she) (?:were|was)|at age|was about)\s+(\d+)|(\d+)\s+years?\s+old/);
  if (ageMatch) {
    const age = parseInt(ageMatch[1] || ageMatch[2]);
    
    // If the text says "you were X", use partner's birthday; otherwise use current user's age
    let referenceAge = currentAge;
    if (lowerContent.includes('you were') || lowerContent.includes('you was')) {
      // Calculate partner's current age from their birthday
      if (partnerBirthday) {
        const birthYear = partnerBirthday.getFullYear();
        referenceAge = currentYear - birthYear;
      }
    }
    
    const yearDiff = referenceAge - age;
    const year = currentYear - yearDiff;
    
    // Check for season clues to set month
    let month = 0; // Default to January
    if (lowerContent.includes('spring')) {
      month = 3; // April
    } else if (lowerContent.includes('summer')) {
      month = 6; // July
    } else if (lowerContent.includes('fall') || lowerContent.includes('autumn')) {
      month = 9; // October
    } else if (lowerContent.includes('winter')) {
      month = 11; // December
    }
    
    return new Date(year, month, 15); // Use middle of month
  }
  
  // Pattern: "back in YYYY" or "in YYYY"
  const yearMatch = lowerContent.match(/(?:back in|in)\s+(19\d{2}|20\d{2})/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    
    // Check for season clues
    let month = 0;
    if (lowerContent.includes('spring')) {
      month = 3;
    } else if (lowerContent.includes('summer')) {
      month = 6;
    } else if (lowerContent.includes('fall') || lowerContent.includes('autumn')) {
      month = 9;
    } else if (lowerContent.includes('winter')) {
      month = 11;
    }
    
    return new Date(year, month, 15);
  }
  
  // Pattern: "YYYY" as standalone year (e.g., "1995 was amazing")
  const standaloneYearMatch = lowerContent.match(/\b(19\d{2}|20\d{2})\b/);
  if (standaloneYearMatch) {
    const year = parseInt(standaloneYearMatch[1]);
    
    // Check for season clues
    let month = 0;
    if (lowerContent.includes('spring')) {
      month = 3;
    } else if (lowerContent.includes('summer')) {
      month = 6;
    } else if (lowerContent.includes('fall') || lowerContent.includes('autumn')) {
      month = 9;
    } else if (lowerContent.includes('winter')) {
      month = 11;
    }
    
    return new Date(year, month, 15);
  }
  
  return null;
}

interface ChatTabProps {
  userType: UserType;
  userProfile: UserProfile;
  partnerProfile: UserProfile | null; // Allow null for "not connected" state
  memories: Memory[];
  onAddMemory: (memory: Omit<Memory, 'id' | 'timestamp'>) => void;
  onEditMemory?: (memoryId: string, updates: Partial<Memory>) => void;
  onDeleteMemory?: (memoryId: string) => void;
  activePrompt?: string | null;
  onClearPrompt?: () => void;
  shouldScrollToBottom?: boolean; // Trigger scroll to bottom
  onScrollToBottomComplete?: () => void; // Callback after scroll completes
}

export function ChatTab({ 
  userType, 
  userProfile, 
  partnerProfile, 
  memories, 
  onAddMemory,
  onEditMemory,
  onDeleteMemory,
  activePrompt,
  onClearPrompt,
  shouldScrollToBottom,
  onScrollToBottomComplete
}: ChatTabProps) {
  // ========================================================================
  // CRASH GUARD: Mount protection to prevent tab-switch crashes
  // Prevents operations during component mount (e.g., video loading, scroll detection)
  // ========================================================================
  const isMountedRef = useRef(false);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Wait 200ms before rendering content to prevent race conditions
    const loadTimer = setTimeout(() => {
      if (isMountedRef.current) {
        setIsFullyLoaded(true);
      }
    }, 200);

    return () => {
      isMountedRef.current = false;
      clearTimeout(loadTimer);
    };
  }, []);

  // ========================================================================
  // STATE: Existing state variables
  // ========================================================================
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [currentPromptContext, setCurrentPromptContext] = useState<string | null>(null);
  const [showPastPromptsSheet, setShowPastPromptsSheet] = useState(false);
  const [transcribingDocId, setTranscribingDocId] = useState<string | null>(null);
  const [voiceStates, setVoiceStates] = useState<{[key: string]: {
    isPlaying: boolean;
    transcriptionShown: boolean;
    translationShown: boolean;
  }}>({});
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [transcribingMemoryId, setTranscribingMemoryId] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micPermissionStatus, setMicPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [documentStates, setDocumentStates] = useState<{[key: string]: {
    textShown: boolean;
  }}>({});
  const [fullscreenMedia, setFullscreenMedia] = useState<{ type: 'photo' | 'video'; url: string; title: string } | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTogglingRef = useRef(false);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activePromptRef = useRef<HTMLDivElement>(null);
  const inputBoxRef = useRef<HTMLDivElement>(null); // Track fixed input box
  const [inputBoxHeight, setInputBoxHeight] = useState(140); // Dynamic input height
  const videoRefs = useRef<{[key: string]: HTMLVideoElement | null}>({});
  const lastScrollTop = useRef(0); // Track last scroll position for scroll direction detection
  
  // Audio recording refs
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioRefs = useRef<{[key: string]: HTMLAudioElement | null}>({});
  const speechTranscriberRef = useRef<SpeechTranscriber | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const detectedLanguageRef = useRef<{ code: string; name: string }>({ code: 'en-US', name: 'English (US)' });
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const emojis = ['😊', '😂', '❤️', '👍', '🙏', '😍', '🎉', '😢', '😮', '🤔', '👏', '🌟', '💯', '🔥', '✨', '🎈', '🌸', '🌺', '🎂', '🎁', '📷', '🎵', '☀️', '🌙'];

  // Track the current prompt context - persists even after activePrompt is cleared
  useEffect(() => {
    if (activePrompt) {
      setCurrentPromptContext(activePrompt);
    }
  }, [activePrompt]);

  // ========================================================================
  // CONSOLIDATED SCROLL MANAGEMENT - Single source of truth
  // ========================================================================

  // ========================================================================
  // REMOVED OLD DUPLICATE SCROLL TRACKER - using unified system below
  // ========================================================================

  // Debug: Log connection and memories on load
  useEffect(() => {
    // Only log when there are memories - reduces console noise during loading
    if (memories.length > 0 && isFullyLoaded) {
      console.log(`💬 ChatTab loaded - ${memories.length} memories for ${partnerProfile?.name}`);
    }
  }, [memories.length, partnerProfile?.name, isFullyLoaded]);

  // Debug: Log video memories (ONLY when fully loaded to prevent crashes)
  useEffect(() => {
    if (!isFullyLoaded || !isMountedRef.current) return;
    
    const videoMemories = memories.filter(m => m.type === 'video');
    if (videoMemories.length > 0) {
      console.log('📹 Video memories in ChatTab:', videoMemories.map(m => ({
        id: m.id,
        content: m.content,
        hasVideoUrl: !!m.videoUrl,
        videoUrl: m.videoUrl?.substring(0, 100),
        timestamp: m.timestamp
      })));
    }
  }, [memories, isFullyLoaded]);

  // ========================================================================
  // 🎯 UNIFIED AUTO-SCROLL SYSTEM (removed old duplicate systems)
  // ========================================================================
  // This section intentionally left empty - scroll logic consolidated below

  // Enable touch scrolling for iOS PWA
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      // Allow default touch behavior for smooth scrolling
    };
    
    document.body.addEventListener('touchmove', handleTouchMove, { passive: true });
    
    return () => {
      document.body.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Check microphone permission status on mount
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setMicPermissionStatus(result.state as 'prompt' | 'granted' | 'denied');
          
          // Listen for permission changes
          result.addEventListener('change', () => {
            setMicPermissionStatus(result.state as 'prompt' | 'granted' | 'denied');
          });
        }
      } catch (error) {
        // Permissions API not supported, will check on first use
        console.log('Permissions API not supported');
      }
    };
    
    checkMicPermission();
  }, []);

  // Deleted memories are removed from the database and won't appear in the memories array
  // No need to track them locally

  // Get all unique past prompts from memories
  const pastPrompts = React.useMemo(() => {
    const uniquePrompts = new Map<string, Date>();
    memories
      .filter(m => m.promptQuestion)
      .forEach(m => {
        if (!uniquePrompts.has(m.promptQuestion!)) {
          uniquePrompts.set(m.promptQuestion!, m.timestamp);
        } else {
          const existingDate = uniquePrompts.get(m.promptQuestion!)!;
          if (m.timestamp > existingDate) {
            uniquePrompts.set(m.promptQuestion!, m.timestamp);
          }
        }
      });
    
    return Array.from(uniquePrompts.entries())
      .map(([question, timestamp]) => ({ question, timestamp }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [memories]);

  // 📏 Dynamically measure input box height for proper padding
  useEffect(() => {
    const measureInputBox = () => {
      if (inputBoxRef.current) {
        const height = inputBoxRef.current.offsetHeight;
        setInputBoxHeight(height + 20); // Add 20px buffer for safety
      }
    };

    // Measure immediately
    measureInputBox();
    
    // Re-measure after animations settle
    const timer = setTimeout(measureInputBox, 300);
    
    return () => clearTimeout(timer);
  }, [isRecording, pastPrompts.length, currentPromptContext, activePrompt, showEmojiPicker]);

  const handleSelectPastPrompt = (promptQuestion: string) => {
    setCurrentPromptContext(promptQuestion);
    setShowPastPromptsSheet(false);
    toast.success('Replying to previous prompt');
  };

  const handleClearPromptContext = () => {
    setCurrentPromptContext(null);
    toast.success('Cleared prompt context');
  };

  const handleSendMessage = () => {
    // Safety check: Don't send if no partner connected
    if (!partnerProfile) {
      toast.error('Please connect with a partner first');
      return;
    }
    
    if (message.trim()) {
      onAddMemory({
        type: 'text',
        content: message.trim(),
        sender: userType as 'keeper' | 'teller',
        category: 'Chat',
        tags: currentPromptContext ? ['prompt', 'response', 'message', 'text'] : ['chat', 'message', 'text'],
        promptQuestion: currentPromptContext || undefined
      });
      setMessage('');
      if (activePrompt && onClearPrompt) {
        onClearPrompt();
      }
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Safety check: Don't upload if no partner connected
    if (!partnerProfile) {
      toast.error('Please connect with a partner first');
      return;
    }
    
    const file = event.target.files?.[0];
    if (file) {
      // Create a data URL for the photo preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const photoUrl = e.target?.result as string;
        
        // Extract real EXIF metadata from the photo
        const metadata = await extractPhotoMetadata(file);
        
        // Generate suggested tags based on context
        const suggestedTags = ['family', 'memory'];
        if (currentPromptContext) suggestedTags.push('prompt-response');
        if (metadata.location) suggestedTags.push('travel');
        
        // Capture recent conversation context (last 5 text messages)
        const recentTextMessages = memories
          .filter(m => m.type === 'text')
          .slice(-5)
          .map(m => m.content)
          .join(' ');
        
        // Try to estimate photo date if not available from EXIF
        let estimatedPhotoDate = metadata.date;
        if (!estimatedPhotoDate && recentTextMessages) {
          const parsedDate = parseChronologicalDate(recentTextMessages, userProfile.age, partnerProfile.birthday);
          if (parsedDate) {
            estimatedPhotoDate = parsedDate;
            console.log('📅 Estimated photo date from chat context:', parsedDate);
          }
        }
        if (!estimatedPhotoDate && currentPromptContext) {
          const parsedDate = parseChronologicalDate(currentPromptContext, userProfile.age, partnerProfile.birthday);
          if (parsedDate) {
            estimatedPhotoDate = parsedDate;
            console.log('📅 Estimated photo date from prompt:', parsedDate);
          }
        }
        
        // Automatically add photo with extracted metadata
        onAddMemory({
          type: 'photo',
          content: `Photo: ${file.name}`,
          sender: userType as 'keeper' | 'teller',
          category: 'Photos',
          tags: suggestedTags,
          promptQuestion: currentPromptContext || undefined,
          conversationContext: recentTextMessages || undefined,
          photoUrl: photoUrl,
          photoDate: estimatedPhotoDate || undefined,
          photoLocation: metadata.location || undefined,
          photoGPSCoordinates: metadata.gpsCoordinates || undefined,
          detectedPeople: undefined, // Face detection would require additional AI service
          detectedFaces: 0
        });
        
        toast.success('Photo shared!');
        if (activePrompt && onClearPrompt) {
          onClearPrompt();
        }
      };
      reader.readAsDataURL(file);
      
      // Reset the input so the same file can be uploaded again if needed
      event.target.value = '';
    }
    // Close the upload menu
    setShowUploadMenu(false);
  };

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Safety check: Don't upload if no partner connected
    if (!partnerProfile) {
      toast.error('Please connect with a partner first');
      return;
    }
    
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Process all selected files
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mov');
      
      if (isVideo) {
        let processedFile = file;
        let conversionToastId: string | number | undefined;
        
        // Check if video needs conversion (e.g., .MOV files)
        if (needsConversion(file)) {
          console.log('🎬 Video needs conversion:', file.name);
          conversionToastId = toast.loading('Converting video to web format...', { duration: Infinity });
          
          try {
            const result = await convertVideoToMP4(file, (progress) => {
              if (progress < 100) {
                toast.loading(`Converting video: ${Math.round(progress)}%`, { id: conversionToastId });
              }
            });
            
            if (result.success && result.file) {
              processedFile = result.file as File;
              toast.success('Video converted successfully!', { id: conversionToastId });
              console.log('✅ Video converted:', result.format);
            } else {
              toast.warning(result.error || 'Using original format - may not play in all browsers', { id: conversionToastId });
              console.warn('⚠️ Video conversion failed, using original:', result.error);
            }
          } catch (error) {
            console.error('❌ Video conversion error:', error);
            toast.warning('Could not convert video - using original format', { id: conversionToastId });
          }
        }
        
        // Create a blob URL for the video preview (works better than data URL for videos)
        const videoUrl = URL.createObjectURL(processedFile);
        
        // Extract video thumbnail for preview
        let videoThumbnail: string | undefined;
        try {
          console.log('🖼️ Extracting video thumbnail...');
          videoThumbnail = await extractVideoThumbnail(videoUrl, 0.5); // Get frame at 0.5 seconds
          console.log('✅ Video thumbnail extracted');
        } catch (error) {
          console.warn('⚠️ Could not extract video thumbnail:', error);
          // Continue without thumbnail - video will still work
        }
        
        // Extract video metadata including GPS and creation date
        const videoMetadata = await extractVideoMetadata(processedFile);
        console.log('📹 Video metadata - location:', videoMetadata.location, 'date:', videoMetadata.date);
        
        // Generate suggested tags based on context
        const suggestedTags = ['video', 'memory'];
        if (currentPromptContext) suggestedTags.push('prompt-response');
        if (videoMetadata.location) suggestedTags.push('travel');
        
        console.log('📹 Creating video memory with location:', videoMetadata.location);
        // Automatically add video with extracted metadata
        onAddMemory({
          type: 'video',
          content: `Video: ${processedFile.name}`,
          sender: userType as 'keeper' | 'teller',
          category: 'Video',
          tags: suggestedTags,
          promptQuestion: currentPromptContext || undefined,
          videoUrl: videoUrl,
          videoThumbnail: videoThumbnail,
          videoDate: videoMetadata.date || undefined,
          videoLocation: videoMetadata.location || undefined,
          videoGPSCoordinates: videoMetadata.gpsCoordinates || undefined,
          videoPeople: undefined, // Face detection would require additional AI service
          videoFaces: 0
        });
      } else {
        // Handle non-video files (photos) - create blob URL for preview
        const photoUrl = URL.createObjectURL(file);
        
        // Extract real EXIF metadata from the photo
        const metadata = await extractPhotoMetadata(file);
        console.log('📸 Photo metadata - location:', metadata.location, 'date:', metadata.date);
        
        // Generate suggested tags based on context
        const suggestedTags = ['family', 'memory'];
        if (currentPromptContext) suggestedTags.push('prompt-response');
        if (metadata.location) suggestedTags.push('travel');
        
        // Capture recent conversation context (last 5 text messages)
        const recentTextMessages = memories
          .filter(m => m.type === 'text')
          .slice(-5)
          .map(m => m.content)
          .join(' ');
        
        // Try to estimate photo date if not available from EXIF
        let estimatedPhotoDate = metadata.date;
        if (!estimatedPhotoDate && recentTextMessages) {
          const parsedDate = parseChronologicalDate(recentTextMessages, userProfile.age, partnerProfile.birthday);
          if (parsedDate) {
            estimatedPhotoDate = parsedDate;
            console.log('📅 Estimated photo date from chat context:', parsedDate);
          }
        }
        if (!estimatedPhotoDate && currentPromptContext) {
          const parsedDate = parseChronologicalDate(currentPromptContext, userProfile.age, partnerProfile.birthday);
          if (parsedDate) {
            estimatedPhotoDate = parsedDate;
            console.log('📅 Estimated photo date from prompt:', parsedDate);
          }
        }
        
        console.log('📸 Creating photo memory with location:', metadata.location);
        onAddMemory({
          type: 'photo',
          content: `Photo: ${file.name}`,
          sender: userType as 'keeper' | 'teller',
          category: 'Photos',
          tags: suggestedTags,
          promptQuestion: currentPromptContext || undefined,
          conversationContext: recentTextMessages || undefined,
          photoUrl: photoUrl,
          photoDate: estimatedPhotoDate || undefined,
          photoLocation: metadata.location || undefined,
          photoGPSCoordinates: metadata.gpsCoordinates || undefined,
          detectedPeople: undefined, // Face detection would require additional AI service
          detectedFaces: 0
        });
      }
    }
    
    // Show appropriate success message
    const fileCount = files.length;
    if (fileCount === 1) {
      const isVideo = files[0].type.startsWith('video/');
      toast.success(isVideo ? 'Video shared!' : 'Photo shared!');
    } else {
      toast.success(`${fileCount} files shared!`);
    }
    
    if (activePrompt && onClearPrompt) {
      onClearPrompt();
    }
    
    // Close the upload menu
    setShowUploadMenu(false);
    
    // Reset the input so the same file can be uploaded again if needed
    event.target.value = '';
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Safety check: Don't upload if no partner connected
    if (!partnerProfile) {
      toast.error('Please connect with a partner first');
      return;
    }
    
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Close the upload menu immediately
    setShowUploadMenu(false);

    // Show processing toast
    const toastId = toast.loading('Scanning document...');

    for (const file of Array.from(files)) {
      try {
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        
        // Scan the document using OCR
        const scanResult = await scanDocument(file);
        
        // Estimate page count based on file size (rough estimate)
        const estimatedPages = Math.max(1, Math.ceil(file.size / (1024 * 50))); // ~50KB per page
        
        // Generate tags based on file type
        const suggestedTags = ['document', 'scanned'];
        if (currentPromptContext) suggestedTags.push('prompt-response');
        if (fileExtension === 'pdf') suggestedTags.push('pdf');
        if (['doc', 'docx'].includes(fileExtension)) suggestedTags.push('word', 'journal');
        if (['xls', 'xlsx'].includes(fileExtension)) suggestedTags.push('excel', 'records');
        if (['ppt', 'pptx'].includes(fileExtension)) suggestedTags.push('powerpoint', 'presentation');
        if (['jpg', 'jpeg', 'png'].includes(fileExtension)) suggestedTags.push('scanned-image', 'photo');
        
        // Read file as data URL for preview
        const reader = new FileReader();
        reader.onload = (e) => {
          const documentUrl = e.target?.result as string;
          
          onAddMemory({
            type: 'document',
            content: `Document: ${file.name}`,
            sender: userType as 'keeper' | 'teller',
            category: 'Documents',
            tags: suggestedTags,
            promptQuestion: currentPromptContext || undefined,
            documentUrl: documentUrl,
            documentType: fileExtension,
            documentFileName: file.name,
            documentScannedText: scanResult.text,
            documentPageCount: estimatedPages,
            documentScanLanguage: scanResult.language
          });
          
          // Update toast with success
          toast.success(`Document scanned! Found ${scanResult.wordCount} words`, { id: toastId });
        };
        
        reader.readAsDataURL(file);
        
      } catch (error) {
        console.error('Error processing document:', error);
        toast.error('Failed to scan document', { id: toastId });
      }
    }
    
    if (activePrompt && onClearPrompt) {
      onClearPrompt();
    }
    
    event.target.value = '';
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const toggleRecording = async () => {
    // Safety check: Don't record if no partner connected
    if (!partnerProfile && !isRecording) {
      toast.error('Please connect with a partner first');
      return;
    }
    
    // Prevent multiple simultaneous toggle attempts
    if (isTogglingRef.current) {
      console.log('⚠️ Already toggling recording, ignoring...');
      return;
    }
    
    isTogglingRef.current = true;
    const wasRecording = isRecording; // Track if we're stopping or starting
    
    try {
      if (isRecording) {
        // Stop recording and transcription
        console.log('🛑 Stopping recording...');
      
      // Capture the recording time BEFORE clearing the timer
      const savedRecordingTime = recordingTime;
      console.log('⏱️ Captured recording time:', savedRecordingTime, 'seconds');
      
      setIsRecording(false);
      setIsTranscribing(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      // Stop speech recognition first
      if (speechTranscriberRef.current) {
        console.log('🛑 Stopping speech recognition...');
        try {
          speechTranscriberRef.current.stop();
        } catch (error) {
          console.error('Error stopping speech recognition:', error);
        }
      }
      
      // Stop MediaRecorder - iOS Safari needs special handling
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.log('🛑 Stopping MediaRecorder, state:', mediaRecorderRef.current.state);
        try {
          // Store the saved recording time for the onstop handler to access
          (mediaRecorderRef.current as any).savedDuration = savedRecordingTime;
          
          // Request final data before stopping for iOS compatibility
          if (mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.requestData();
          }
          mediaRecorderRef.current.stop();
          console.log('✅ MediaRecorder stop called');
        } catch (error) {
          console.error('❌ Error stopping MediaRecorder:', error);
        }
      }
      
      // Stop media stream tracks after a short delay to ensure onstop fires
      setTimeout(() => {
        if (mediaStreamRef.current) {
          console.log('🛑 Stopping media stream tracks...');
          mediaStreamRef.current.getTracks().forEach(track => {
            console.log('Stopping track:', track.kind, track.label);
            track.stop();
          });
          mediaStreamRef.current = null;
        }
        // Reset toggling flag after cleanup is complete
        // Add a small delay to ensure the stream is fully released
        setTimeout(() => {
          isTogglingRef.current = false;
          console.log('✅ Recording stopped and cleaned up');
        }, 50);
      }, 100);
      
    } else {
      // Start recording and transcription
      try {
        // IMPORTANT: Clean up any existing streams first to avoid permission conflicts
        if (mediaStreamRef.current) {
          console.log('🧹 Cleaning up existing stream before new recording...');
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
        
        console.log('🎤 Requesting microphone access...');
        
        // Request microphone permission FIRST before starting speech recognition
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
        
        console.log('✅ Microphone access granted');
        mediaStreamRef.current = stream;
        setMicPermissionStatus('granted');
        
        // NOW that we have permission, check if speech recognition is supported
        const speechSupported = SpeechTranscriber.isSupported();
        
        if (speechSupported) {
          console.log('🗣️ Starting speech recognition...');
          // Initialize speech transcriber
          if (!speechTranscriberRef.current) {
            speechTranscriberRef.current = new SpeechTranscriber();
          }
          
          finalTranscriptRef.current = '';
          setLiveTranscript('');
          
          // Set up transcription callbacks
          speechTranscriberRef.current.onTranscript((result: TranscriptionResult) => {
            setLiveTranscript(result.transcript);
            if (result.isFinal) {
              finalTranscriptRef.current = result.transcript;
              detectedLanguageRef.current = {
                code: result.languageCode,
                name: result.language
              };
            }
          });
          
          speechTranscriberRef.current.onError((error: string) => {
            console.error('Transcription error:', error);
            // Only show toast for non-permission errors (permission errors already handled above)
            if (!error.includes('permission') && !error.includes('not-allowed')) {
              toast.error(error);
            }
          });
          
          speechTranscriberRef.current.onEnd(() => {
            console.log('Transcription ended');
            setIsTranscribing(false);
          });
          
          // Start transcription with auto-detect based on user's locale
          try {
            // Detect user's preferred language from browser/system settings
            const userLocale = navigator.language || navigator.languages?.[0] || 'en-US';
            console.log('🌍 User locale detected:', userLocale);
            
            // Map common locales to speech recognition language codes
            let speechLang = userLocale;
            
            // Special handling for Chinese variants
            if (userLocale.startsWith('zh')) {
              if (userLocale.includes('HK') || userLocale.includes('Hant') || userLocale.toLowerCase().includes('hk')) {
                // Hong Kong / Cantonese
                speechLang = 'zh-HK'; // Cantonese (Traditional Chinese)
                console.log('🗣️ Using Cantonese (Hong Kong) for speech recognition');
              } else if (userLocale.includes('TW') || userLocale.includes('Hant')) {
                // Taiwan / Traditional Chinese
                speechLang = 'zh-TW';
                console.log('🗣️ Using Traditional Chinese (Taiwan) for speech recognition');
              } else {
                // Mainland China / Simplified Chinese (Mandarin)
                speechLang = 'zh-CN';
                console.log('🗣️ Using Simplified Chinese (Mandarin) for speech recognition');
              }
            }
            
            speechTranscriberRef.current.start({
              language: speechLang, // Use user's locale for native language transcription
              continuous: true,
              interimResults: true
            });
            setIsTranscribing(true);
            console.log('✅ Speech recognition started with language:', speechLang);
          } catch (error) {
            console.error('Error starting speech recognition:', error);
            // Don't show error for speech recognition - recording will still work
          }
        }
        
        // Create MediaRecorder with the best available format
        let options: MediaRecorderOptions = { mimeType: 'audio/webm;codecs=opus' };
        
        // Try different formats for iPhone compatibility
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          if (MediaRecorder.isTypeSupported('audio/mp4')) {
            options = { mimeType: 'audio/mp4' };
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            options = { mimeType: 'audio/webm' };
          } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            options = { mimeType: 'audio/ogg' };
          } else {
            options = {}; // Use default
          }
        }
        
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          console.log('📦 Audio data available:', event.data.size, 'bytes');
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          console.log('🛑 MediaRecorder stopped, chunks:', audioChunksRef.current.length);
          
          // Safety check: Don't save if no partner connected
          if (!partnerProfile) {
            console.warn('⚠️ Voice recording stopped - no partner connected');
            toast.error('Please connect with a partner first');
            return;
          }
          
          if (audioChunksRef.current.length === 0) {
            console.warn('⚠️ No audio chunks recorded');
            toast.error('No audio recorded. Please try again.');
            return;
          }
          
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: mediaRecorder.mimeType || 'audio/webm' 
          });
          console.log('✅ Created audio blob:', audioBlob.size, 'bytes');
          
          // Get the duration from the saved property
          const duration = (mediaRecorder as any).savedDuration || 0;
          console.log('⏱️ Using saved duration:', duration, 'seconds');
          setRecordingTime(0);
          
          // Create a URL for the audio blob
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // Get final transcript (empty string if nothing was transcribed)
          const finalTranscript = finalTranscriptRef.current || liveTranscript || '';
          const detectedLang = detectedLanguageRef.current || { code: 'en-US', name: 'English (US)' };
          console.log('📝 Final transcript:', finalTranscript || '(no transcript)');
          
          // Detect language if not already detected and we have a transcript
          if (finalTranscript && (!detectedLang.code || detectedLang.code === 'en-US')) {
            const langDetection = detectLanguageFromText(finalTranscript);
            detectedLang.code = langDetection.code;
            detectedLang.name = langDetection.name;
          }
          
          // Generate translation if not in English
          let englishTranslation: string | undefined;
          if (!detectedLang.code.startsWith('en') && finalTranscript) {
            try {
              englishTranslation = await translateToEnglish(finalTranscript, detectedLang.code);
            } catch (error) {
              console.error('Translation error:', error);
            }
          }
          
          // Convert blob to base64 for storage
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            console.log('✅ Saved voice memo successfully');
            
            onAddMemory({
              type: 'voice',
              content: `Voice memo (${duration}s)`,
              sender: userType as 'keeper' | 'teller',
              category: 'Voice',
              tags: currentPromptContext ? ['voice', 'prompt', 'response', 'audio'] : ['voice', 'audio'],
              transcript: finalTranscript || undefined, // Only set if we have a real transcript
              englishTranslation: englishTranslation,
              voiceLanguage: finalTranscript ? detectedLang.name : undefined,
              voiceLanguageCode: finalTranscript ? detectedLang.code : undefined,
              transcriptionShown: false,
              translationShown: false,
              promptQuestion: currentPromptContext || undefined,
              audioUrl: base64Audio,
              audioBlob: audioUrl
            });
            
            toast.success('Voice memo sent!');
            if (activePrompt && onClearPrompt) {
              onClearPrompt();
            }
            
            // Reset transcript
            setLiveTranscript('');
            finalTranscriptRef.current = '';
          };
          
          reader.onerror = (error) => {
            console.error('❌ Error reading audio blob:', error);
            toast.error('Failed to save voice memo');
          };
          
          reader.readAsDataURL(audioBlob);
          
          audioChunksRef.current = [];
        };
        
        mediaRecorder.onerror = (event: any) => {
          console.error('❌ MediaRecorder error:', event.error);
          toast.error('Recording error occurred');
        };
        
        // iOS Safari works better with timeslice - request data every 100ms
        console.log('🎙️ Starting MediaRecorder with timeslice for iOS compatibility');
        mediaRecorder.start(100);
        setIsRecording(true);
        setRecordingTime(0);
        
        // Start recording timer
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime(prev => {
            if (prev >= 120) { // Auto-stop after 2 minutes
              toggleRecording();
              return prev;
            }
            return prev + 1;
          });
        }, 1000);
        
        toast.success(speechSupported ? 'Recording with live transcription' : 'Recording started');
        
      } catch (error) {
        // Stop any ongoing transcription attempt
        if (speechTranscriberRef.current) {
          try {
            speechTranscriberRef.current.abort();
          } catch (e) {
            // Ignore abort errors
          }
        }
        
        if (error instanceof DOMException) {
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            // This is expected when user denies permission - not an error
            console.log('ℹ️ Microphone permission denied by user');
            setMicPermissionStatus('denied');
            
            // Provide device-specific instructions
            const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
            const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
            
            if (isIOS || isSafari) {
              toast.error('Microphone Access Denied\n\nTo enable:\n1. Open Settings app\n2. Scroll to Safari\n3. Tap Microphone\n4. Allow for this site', {
                duration: 10000,
                className: 'text-sm whitespace-pre-line'
              });
            } else {
              toast.error('Microphone Access Denied\n\nTo enable:\nClick the 🔒 or ⓘ icon in the address bar, then allow microphone access.', {
                duration: 8000,
                className: 'text-sm whitespace-pre-line'
              });
            }
          } else if (error.name === 'NotFoundError') {
            console.error('🎤 Microphone not found:', error);
            toast.error('No microphone detected. Please connect a microphone and try again.', {
              duration: 5000
            });
          } else if (error.name === 'NotReadableError') {
            console.error('🎤 Microphone in use:', error);
            toast.error('Microphone is being used by another app. Please close other apps and try again.', {
              duration: 6000
            });
          } else {
            console.error('🎤 Microphone access error:', error);
            toast.error('Unable to access microphone. Please check your device settings.', {
              duration: 5000
            });
          }
        } else {
          console.error('🎤 Recording failed:', error);
          toast.error('Failed to start recording. Please check microphone permissions and try again.', {
            duration: 5000
          });
        }
        
        setIsRecording(false);
        setIsTranscribing(false);
        
        // Clean up all resources if there was an error
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
        if (mediaRecorderRef.current) {
          try {
            if (mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
          } catch (e) {
            console.log('MediaRecorder already stopped');
          }
          mediaRecorderRef.current = null;
        }
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setRecordingTime(0);
      }
    }
    } finally {
      // Reset the toggling flag only for start operations
      // Stop operations reset in the setTimeout to avoid interrupting cleanup
      if (!wasRecording) {
        isTogglingRef.current = false;
      }
    }
  };

  // Voice memo interaction handlers
  const handleTogglePlay = (memoryId: string) => {
    const audioElement = audioRefs.current[memoryId];
    const memory = memories.find(m => m.id === memoryId);
    
    if (!audioElement || !memory) return;
    
    const isCurrentlyPlaying = voiceStates[memoryId]?.isPlaying;
    
    if (isCurrentlyPlaying) {
      // Pause the audio
      audioElement.pause();
      setVoiceStates(prev => ({
        ...prev,
        [memoryId]: {
          ...prev[memoryId],
          isPlaying: false
        }
      }));
      toast.success('Paused');
    } else {
      // Play the audio
      // If audio source exists (from real recording)
      if (memory.audioBlob || memory.audioUrl) {
        audioElement.src = memory.audioBlob || memory.audioUrl || '';
        audioElement.play().then(() => {
          setVoiceStates(prev => ({
            ...prev,
            [memoryId]: {
              ...prev[memoryId],
              isPlaying: true
            }
          }));
          toast.success('Playing voice memo');
        }).catch((error) => {
          console.error('Error playing audio:', error);
          toast.error('Failed to play audio');
        });
      } else {
        // For demo voice memos without real audio, just show playing state
        setVoiceStates(prev => ({
          ...prev,
          [memoryId]: {
            ...prev[memoryId],
            isPlaying: true
          }
        }));
        toast.success('Playing voice memo');
        
        // Auto "stop" after content duration (simulate playback)
        setTimeout(() => {
          setVoiceStates(prev => ({
            ...prev,
            [memoryId]: {
              ...prev[memoryId],
              isPlaying: false
            }
          }));
        }, 3000);
      }
    }
  };

  const handleToggleTranscription = async (memoryId: string) => {
    const memory = memories.find(m => m.id === memoryId);
    if (!memory) return;

    // If memory already has a transcript, just toggle visibility
    if (memory.transcript) {
      setVoiceStates(prev => ({
        ...prev,
        [memoryId]: {
          ...prev[memoryId],
          transcriptionShown: !prev[memoryId]?.transcriptionShown,
          translationShown: false // Reset translation when toggling transcription
        }
      }));
      return;
    }

    // If no transcript exists, start transcription
    await handleTranscribeAudio(memoryId);
  };

  const handleToggleTranslation = (memoryId: string) => {
    setVoiceStates(prev => ({
      ...prev,
      [memoryId]: {
        ...prev[memoryId],
        translationShown: !prev[memoryId]?.translationShown
      }
    }));
  };

  const handleTranscribeAudio = async (memoryId: string) => {
    const memory = memories.find(m => m.id === memoryId);
    if (!memory || !memory.audioUrl) {
      toast.error('Audio not available for transcription');
      return;
    }

    if (transcribingMemoryId) {
      toast.error('Already transcribing another audio');
      return;
    }

    setTranscribingMemoryId(memoryId);
    toast.loading('Transcribing audio with AI...', { id: 'transcribe' });

    try {
      // Call backend Groq Whisper API for transcription
      const response = await apiClient.transcribeAudio(memory.audioUrl);

      if (!response.success) {
        throw new Error(response.error || 'Transcription failed');
      }

      const transcript = response.originalTranscript || response.transcript || '';
      const englishTranslation = response.translated ? response.transcript : undefined;
      const detectedLanguage = response.language || 'unknown';
      
      // Map language code to readable name
      const languageName = SUPPORTED_LANGUAGES.find(l => 
        l.code.toLowerCase().includes(detectedLanguage.toLowerCase()) || 
        l.name.toLowerCase().includes(detectedLanguage.toLowerCase())
      )?.name || detectedLanguage;

      if (onEditMemory && transcript) {
        onEditMemory(memoryId, {
          transcript: transcript,
          voiceLanguage: languageName,
          voiceLanguageCode: detectedLanguage,
          englishTranslation: englishTranslation
        });

        setVoiceStates(prev => ({
          ...prev,
          [memoryId]: {
            ...prev[memoryId],
            transcriptionShown: true,
            translationShown: false
          }
        }));

        if (response.translated) {
          toast.success(`Transcribed from ${languageName}!`, { id: 'transcribe' });
        } else {
          toast.success('Audio transcribed successfully!', { id: 'transcribe' });
        }
      }
    } catch (error) {
      console.error('Transcription error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio';
      toast.error(errorMessage, { id: 'transcribe' });
    } finally {
      setTranscribingMemoryId(null);
    }
  };

  const handleQuoteVoice = (memory: Memory) => {
    const quoteText = memory.transcript || memory.content;
    setMessage(`> ${quoteText}\\n\\n`);
    messageInputRef.current?.focus();
    toast.success('Voice memo quoted');
  };

  const handleTranslateVoiceTranscript = async (memoryId: string) => {
    const memory = memories.find(m => m.id === memoryId);
    if (!memory || !memory.transcript) {
      toast.error('No transcript available to translate');
      return;
    }

    // If already has translation, just toggle visibility
    if (memory.englishTranslation) {
      setVoiceStates(prev => ({
        ...prev,
        [memoryId]: {
          ...prev[memoryId],
          translationShown: !prev[memoryId]?.translationShown,
          transcriptionShown: true // Show transcription when showing translation
        }
      }));
      return;
    }

    // Translate using Groq AI
    setTranscribingMemoryId(memoryId);
    toast.loading('Translating to English...', { id: 'translate' });

    try {
      const result = await translateText({
        text: memory.transcript,
        sourceLanguage: memory.voiceLanguage || undefined,
        targetLanguage: 'English'
      });

      if (onEditMemory) {
        onEditMemory(memoryId, {
          englishTranslation: result.translatedText
        });

        setVoiceStates(prev => ({
          ...prev,
          [memoryId]: {
            ...prev[memoryId],
            translationShown: true,
            transcriptionShown: true
          }
        }));

        toast.success('Translation complete', { id: 'translate' });
      }
    } catch (error) {
      console.error('Translation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to translate';
      
      if (errorMessage === 'AI_NOT_CONFIGURED') {
        toast.error('AI translation not configured. Please set up Groq API key.', { id: 'translate' });
      } else {
        toast.error(errorMessage, { id: 'translate' });
      }
    } finally {
      setTranscribingMemoryId(null);
    }
  };

  // Video interaction handler - opens fullscreen preview
  const handleVideoClick = (memory: Memory) => {
    if (!memory.videoUrl) {
      toast.error('Video source unavailable');
      return;
    }
    
    setFullscreenMedia({ 
      type: 'video', 
      url: memory.videoUrl, 
      title: memory.content 
    });
  };

  // Document extraction handler
  const handleExtractDocumentText = async (memoryId: string) => {
    const memory = memories.find(m => m.id === memoryId);
    if (!memory || !memory.documentUrl) {
      console.error('❌ Document extraction failed: No document URL found', { 
        memoryId, 
        hasMemory: !!memory,
        documentUrl: memory?.documentUrl 
      });
      toast.error('No document available to extract text from');
      return;
    }

    // Check if document is an image format that AI can process
    const imageFormats = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const fileName = (memory.documentFileName || '').toLowerCase();
    const isImageFormat = imageFormats.some(format => fileName.endsWith(format));
    
    if (!isImageFormat) {
      toast.error('AI text extraction only works with image formats (PNG, JPEG, GIF, WebP). This document type is not supported.');
      return;
    }

    console.log('📄 Starting document text extraction:', {
      memoryId,
      documentUrl: memory.documentUrl.substring(0, 100) + '...',
      documentType: memory.documentType,
      fileName: memory.documentFileName
    });

    // If already has text, just toggle visibility
    if (memory.documentScannedText) {
      console.log('ℹ️ Document already has extracted text, toggling visibility');
      setDocumentStates(prev => ({
        ...prev,
        [memoryId]: {
          ...prev[memoryId],
          textShown: !prev[memoryId]?.textShown
        }
      }));
      return;
    }

    // Extract text using AI
    setTranscribingDocId(memoryId);
    toast.loading('Extracting text from document...', { id: 'extract-doc' });

    try {
      console.log('🤖 Calling AI document extraction service...');
      const { extractDocumentText } = await import('../utils/aiService');
      const result = await extractDocumentText(memory.documentUrl);

      console.log('✅ Document text extracted:', {
        textLength: result.text.length,
        wordCount: result.text.split(' ').length,
        language: result.language
      });

      if (onEditMemory) {
        onEditMemory(memoryId, {
          documentScannedText: result.text,
          documentScanLanguage: result.language
        });

        setDocumentStates(prev => ({
          ...prev,
          [memoryId]: {
            ...prev[memoryId],
            textShown: true
          }
        }));

        toast.success(`Extracted ${result.text.split(' ').length} words`, { id: 'extract-doc' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to extract text';
      
      if (errorMessage === 'AI_NOT_CONFIGURED') {
        toast.error('AI extraction not configured. Please set up Groq API key.', { id: 'extract-doc' });
      } else if (errorMessage === 'GROQ_API_KEY_INVALID') {
        toast.error('Invalid Groq API key. Please update your GROQ_API_KEY in Supabase settings.', { id: 'extract-doc' });
      } else if (errorMessage.includes('not supported for AI text extraction')) {
        // Silent - this is an expected user scenario for unsupported file types (PDFs, etc.)
        toast.info('This file type is not supported for AI text extraction', { id: 'extract-doc' });
      } else {
        // Only log unexpected errors
        console.error('Document extraction error:', errorMessage);
        toast.error('Failed to extract text from document', { id: 'extract-doc' });
      }
    } finally {
      setTranscribingDocId(null);
    }
  };

  const handleToggleDocumentText = (memoryId: string) => {
    setDocumentStates(prev => ({
      ...prev,
      [memoryId]: {
        ...prev[memoryId],
        textShown: !prev[memoryId]?.textShown
      }
    }));
  };

  // Filter memories to show in chat
  const chatMessages = memories.filter(m => {
    const isRelevantCategory = m.category === 'Chat' || m.category === 'Photos' || m.category === 'Voice' || m.category === 'Video' || m.category === 'Documents' || m.category === 'Prompt' || m.category === 'Prompts';
    // Filter out the initial prompt question messages (where content equals promptQuestion)
    // These are shown in the header instead of as chat bubbles
    const isInitialPromptMessage = m.promptQuestion && m.content === m.promptQuestion && m.tags.includes('question');
    return isRelevantCategory && !isInitialPromptMessage;
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Track previous message count to detect new messages
  const prevMessageCountRef = useRef<number>(0);
  const hasScrolledInitiallyRef = useRef<boolean>(false);
  
  // CRITICAL FIX: Reset scroll tracker when partner changes (for connection switching)
  useEffect(() => {
    hasScrolledInitiallyRef.current = false;
    prevMessageCountRef.current = 0;
    console.log(`🔄 Partner changed to ${partnerProfile?.name} - resetting scroll tracker`);
  }, [partnerProfile?.id]);
  
  // 🎯 UNIFIED scrollToBottom function - works with simple div scroll container
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    try {
      requestAnimationFrame(() => {
        if (!scrollAreaRef?.current) return;
        
        // Scroll to absolute bottom (accounting for dynamic paddingBottom)
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      });
    } catch (error) {
      // Silently fail
    }
  }, []);

  // ========================================================================
  // 🎯 UNIFIED SCROLL SYSTEM - All scroll logic consolidated here
  // ========================================================================
  
  // 1. INITIAL MOUNT: Scroll to bottom when chat first loads
  useEffect(() => {
    if (!hasScrolledInitiallyRef.current && chatMessages.length > 0) {
      const timers = [
        setTimeout(() => scrollToBottom('auto'), 100),
        setTimeout(() => scrollToBottom('auto'), 250),
        setTimeout(() => {
          scrollToBottom('auto');
          prevMessageCountRef.current = chatMessages.length;
          hasScrolledInitiallyRef.current = true;
        }, 500)
      ];
      
      return () => timers.forEach(clearTimeout);
    }
  }, [chatMessages.length, scrollToBottom]);

  // 2. TAB VISIBILITY: Scroll when switching to this tab
  useEffect(() => {
    if (shouldScrollToBottom) {
      const timers = [
        setTimeout(() => scrollToBottom('auto'), 50),
        setTimeout(() => {
          scrollToBottom('auto');
          onScrollToBottomComplete?.();
        }, 200)
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [shouldScrollToBottom, scrollToBottom, onScrollToBottomComplete]);

  // 3. ACTIVE PROMPT: Scroll to TOP when prompt appears (to show banner)
  useEffect(() => {
    if (activePrompt && hasScrolledInitiallyRef.current && scrollAreaRef?.current) {
      const timer = setTimeout(() => {
        scrollAreaRef.current!.scrollTo({ top: 0, behavior: 'smooth' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activePrompt]);

  // 4. NEW MESSAGES: Auto-scroll to bottom on new messages
  useEffect(() => {
    if (hasScrolledInitiallyRef.current && chatMessages.length > prevMessageCountRef.current) {
      scrollToBottom('auto');
      const timer = setTimeout(() => scrollToBottom('smooth'), 100);
      prevMessageCountRef.current = chatMessages.length;
      return () => clearTimeout(timer);
    }
  }, [chatMessages.length, scrollToBottom]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (memory: Memory) => {
    const isOwnMessage = memory.sender === userType;
    const senderProfile = isOwnMessage ? userProfile : partnerProfile;

    return (
      <div key={memory.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in`}>
        <div className={`flex space-x-3 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''} max-w-[85%]`}>
          <Avatar className={`w-8 h-8 ring-2 ring-border flex-shrink-0 mt-0.5 ${isOwnMessage ? 'mr-0.5' : 'ml-0.5'}`}>
            <AvatarImage src={senderProfile.photo} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{senderProfile.name[0]}</AvatarFallback>
          </Avatar>
          <div className={`space-y-2 ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col min-w-0 flex-1`}>
            <div className={`px-3 py-2.5 rounded-2xl overflow-hidden ${
              isOwnMessage 
                ? 'bg-[rgb(241,241,241)] text-black rounded-br-md' 
                : 'bg-white text-black rounded-bl-md'
            }`} style={{ overflowWrap: 'break-word', wordWrap: 'break-word', wordBreak: 'break-word', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              {memory.type === 'text' && (
                <p className="text-sm leading-relaxed text-black whitespace-pre-wrap" style={{ overflowWrap: 'break-word', wordWrap: 'break-word', wordBreak: 'break-word' }}>{memory.content}</p>
              )}
              {memory.type === 'photo' && (
                <div className="space-y-2">
                  {memory.photoUrl ? (
                    <div 
                      className="w-full max-w-[280px] sm:max-w-sm cursor-pointer"
                      onClick={() => setFullscreenMedia({ type: 'photo', url: memory.photoUrl!, title: memory.content })}
                    >
                      <img 
                        src={memory.photoUrl} 
                        alt={memory.content}
                        className="w-full h-auto rounded-lg hover:opacity-90 transition-opacity"
                        loading="lazy"
                        onError={(e) => {
                          console.error('Photo failed to load:', memory.photoUrl?.substring(0, 100));
                          // Show placeholder on error
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-32 bg-muted rounded-xl flex items-center justify-center border border-border">
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <p className="text-xs opacity-75 text-black">{memory.content}</p>
                  {(memory.photoLocation || memory.detectedPeople || memory.photoDate) && (
                    <div className="space-y-1 pt-1">
                      {memory.photoLocation && (
                        <Badge variant="outline" className="text-xs mr-1">
                          📍 {memory.photoLocation}
                        </Badge>
                      )}
                      {memory.photoDate && (
                        <Badge variant="outline" className="text-xs mr-1">
                          📅 {typeof memory.photoDate === 'string' ? new Date(memory.photoDate).toLocaleDateString() : memory.photoDate.toLocaleDateString()}
                        </Badge>
                      )}
                      {memory.detectedPeople && memory.detectedPeople.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          👥 {memory.detectedPeople.join(', ')}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )}
              {memory.type === 'voice' && (
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <div className="space-y-2 min-w-[200px] cursor-pointer select-none">
                      {/* Hidden audio element for playback */}
                      <audio
                        ref={(el) => {
                          if (el) audioRefs.current[memory.id] = el;
                        }}
                        onEnded={() => {
                          setVoiceStates(prev => ({
                            ...prev,
                            [memory.id]: {
                              ...prev[memory.id],
                              isPlaying: false
                            }
                          }));
                        }}
                        className="hidden"
                      />
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant={isOwnMessage ? "secondary" : "outline"} 
                          className="rounded-full w-9 h-9 p-0 bg-[rgb(236,240,226)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePlay(memory.id);
                          }}
                        >
                          {voiceStates[memory.id]?.isPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <p className="text-sm text-black">{memory.content}</p>
                          {memory.voiceLanguage && (
                            <div className="flex items-center space-x-1 mt-1">
                              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                                {memory.voiceLanguage}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                      {!memory.transcript && (
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTranscription(memory.id);
                            }}
                            disabled={transcribingMemoryId === memory.id}
                          >
                            <FileText className="w-3 h-3 mr-1.5" />
                            {transcribingMemoryId === memory.id ? 'Transcribing...' : 'Tap to Transcribe'}
                          </Button>
                        </div>
                      )}
                      {voiceStates[memory.id]?.transcriptionShown && memory.transcript && (
                        <div className="space-y-2 pt-2 border-t border-border/30">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-black/60">Transcription</span>
                            {memory.englishTranslation && memory.voiceLanguageCode !== 'en' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleTranslation(memory.id);
                                }}
                              >
                                <Languages className="w-3 h-3 mr-1" />
                                {voiceStates[memory.id]?.translationShown ? 'Show Original' : 'Translate'}
                              </Button>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed text-black">
                            {voiceStates[memory.id]?.translationShown && memory.englishTranslation 
                              ? memory.englishTranslation 
                              : memory.transcript}
                          </p>
                          {voiceStates[memory.id]?.translationShown && (
                            <div className="flex items-center space-x-1 text-xs text-black/60 pt-1">
                              <Languages className="w-3 h-3" />
                              <span>Translated to English by Adoras</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-56">
                    <ContextMenuItem onClick={() => handleToggleTranscription(memory.id)}>
                      <FileText className="w-4 h-4 mr-2" />
                      {transcribingMemoryId === memory.id 
                        ? 'Transcribing...' 
                        : memory.transcript
                          ? (voiceStates[memory.id]?.transcriptionShown ? 'Hide Transcription' : 'Show Transcription')
                          : 'Transcribe Audio'}
                    </ContextMenuItem>
                    {memory.transcript && (
                      <ContextMenuItem onClick={() => handleTranslateVoiceTranscript(memory.id)}>
                        <Languages className="w-4 h-4 mr-2" />
                        {memory.englishTranslation 
                          ? (voiceStates[memory.id]?.translationShown ? 'Hide Translation' : 'Show Translation')
                          : 'Translate to English'}
                      </ContextMenuItem>
                    )}
                    <ContextMenuItem onClick={() => handleTogglePlay(memory.id)}>
                      <Volume2 className="w-4 h-4 mr-2" />
                      {voiceStates[memory.id]?.isPlaying ? 'Pause' : 'Play'}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleQuoteVoice(memory)}>
                      <Quote className="w-4 h-4 mr-2" />
                      Quote in Message
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )}
              {memory.type === 'video' && (
                <div className="space-y-2">
                  {memory.videoUrl ? (
                    <div 
                      className="relative w-full max-w-sm rounded-lg overflow-hidden cursor-pointer group bg-black"
                      onClick={() => handleVideoClick(memory)}
                    >
                      <video
                        ref={(el) => {
                          if (el) videoRefs.current[memory.id] = el;
                        }}
                        src={memory.videoUrl}
                        className="w-full h-auto rounded-lg"
                        preload="metadata"
                        playsInline
                        poster={memory.videoThumbnail || ''}
                        crossOrigin="anonymous"
                        onLoadedMetadata={(e) => {
                          // Video loaded successfully - can be played
                          if (isFullyLoaded) {
                            console.log('✅ Video loaded:', memory.content, 'URL:', memory.videoUrl);
                          }
                        }}
                        onLoadStart={() => {
                          if (isFullyLoaded) {
                            console.log('🎬 Video loading started:', {
                              memoryId: memory.id,
                              content: memory.content,
                              videoUrl: memory.videoUrl?.substring(0, 100)
                            });
                          }
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLVideoElement;
                          const errorCode = target.error?.code;
                          
                          console.error('❌ Video playback error:', {
                            errorCode,
                            message: target.error?.message,
                            file: memory.content,
                            videoUrl: memory.videoUrl
                          });
                          
                          // Show user-friendly message only for format errors (code 4)
                          // Error codes: 1=MEDIA_ERR_ABORTED, 2=MEDIA_ERR_NETWORK, 3=MEDIA_ERR_DECODE, 4=MEDIA_ERR_SRC_NOT_SUPPORTED
                          if (errorCode === 4 || errorCode === 3) {
                            const fileName = memory.content.toLowerCase();
                            if (fileName.includes('.mov') || fileName.includes('video.mov')) {
                              toast.error('Video format not supported by your browser. Try re-uploading or use MP4 format.', { duration: 5000 });
                            } else if (fileName.includes('.webm')) {
                              toast.error('WebM video not supported in your browser. Try Safari or Chrome.', { duration: 5000 });
                            } else {
                              toast.error('This video format cannot be played in your browser. Try uploading as MP4.', { duration: 5000 });
                            }
                          } else if (errorCode === 2) {
                            // Network error - usually transient
                            console.warn('⚠️ Video network error - may be temporary');
                          }
                        }}
                      />
                      {/* Play Overlay - Always show to indicate it's clickable */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                        <div className="bg-white/90 rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                          <Play className="w-6 h-6 text-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-48 h-32 bg-muted rounded-xl flex items-center justify-center border border-border">
                      <Video className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <p className="text-xs opacity-75 text-black">{memory.content}</p>
                  {(memory.videoLocation || memory.videoPeople || memory.videoDate) && (
                    <div className="space-y-1 pt-1">
                      {memory.videoLocation && (
                        <Badge variant="outline" className="text-xs mr-1">
                          📍 {memory.videoLocation}
                        </Badge>
                      )}
                      {memory.videoDate && (
                        <Badge variant="outline" className="text-xs mr-1">
                          📅 {typeof memory.videoDate === 'string' ? new Date(memory.videoDate).toLocaleDateString() : memory.videoDate.toLocaleDateString()}
                        </Badge>
                      )}
                      {memory.videoPeople && memory.videoPeople.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          👥 {memory.videoPeople.join(', ')}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )}
              {memory.type === 'document' && (
                <div className="space-y-3 w-full max-w-[280px] sm:min-w-[250px]">
                  {/* Document Preview */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 sm:p-4 border border-blue-200">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                          <File className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-black mb-1 break-words">
                          {memory.documentFileName || memory.content}
                        </p>
                        <div className="flex flex-wrap gap-1 sm:gap-1.5">
                          {memory.documentType && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs bg-blue-100 border-blue-300 text-blue-700 uppercase">
                              {memory.documentType}
                            </Badge>
                          )}
                          {memory.documentPageCount && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs">
                              {memory.documentPageCount} {memory.documentPageCount === 1 ? 'page' : 'pages'}
                            </Badge>
                          )}
                          {memory.documentScanLanguage && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs bg-green-100 border-green-300 text-green-700">
                              <Languages className="w-3 h-3 mr-1" />
                              {memory.documentScanLanguage}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Extract Text Button - Only for image formats */}
                  {!memory.documentScannedText && (() => {
                    const imageFormats = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
                    const fileName = (memory.documentFileName || '').toLowerCase();
                    const isImageFormat = imageFormats.some(format => fileName.endsWith(format));
                    
                    return isImageFormat ? (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs"
                          onClick={() => handleExtractDocumentText(memory.id)}
                          disabled={transcribingDocId === memory.id}
                        >
                          <ScanText className="w-3 h-3 mr-1.5" />
                          {transcribingDocId === memory.id ? 'Extracting...' : 'Extract Text with AI'}
                        </Button>
                      </div>
                    ) : null;
                  })()}
                  
                  {/* Scanned Text */}
                  {memory.documentScannedText && (
                    <div className="border-t border-border/30 pt-2 sm:pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-1.5">
                          <ScanText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                          <span className="text-[10px] sm:text-xs font-medium text-black/70">Extracted Text</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Badge variant="secondary" className="text-[10px] sm:text-xs">
                            {memory.documentScannedText.split(' ').length} words
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleToggleDocumentText(memory.id)}
                          >
                            {documentStates[memory.id]?.textShown ? (
                              <><EyeOff className="w-3 h-3 mr-1" />Hide</>
                            ) : (
                              <><Eye className="w-3 h-3 mr-1" />Show</>
                            )}
                          </Button>
                        </div>
                      </div>
                      {documentStates[memory.id]?.textShown && (
                        <div className="bg-muted/30 rounded-lg p-2 sm:p-3 max-h-32 sm:max-h-40 overflow-y-auto">
                          <p className="text-[10px] sm:text-xs leading-relaxed text-black/80 whitespace-pre-wrap break-words">
                            {memory.documentScannedText}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 px-2">
              <span className="text-xs text-muted-foreground">
                {formatTime(memory.timestamp)}
              </span>
              {memory.category && memory.category !== 'Chat' && (
                <Badge variant="secondary" className="text-xs bg-muted/50">
                  {memory.category}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Show empty state if no partner is connected
  if (!partnerProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 sm:py-16 px-4 text-center space-y-6">
        <div className="p-4 bg-primary/10 rounded-full">
          <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-medium" style={{ fontFamily: 'Archivo', letterSpacing: '-0.05em' }}>
            {userType === 'keeper' ? 'No Storyteller Connected' : 'No Connection Yet'}
          </h3>
          <p className="text-muted-foreground max-w-md text-sm sm:text-base">
            {userType === 'keeper' 
              ? 'Create an invitation to connect with a storyteller and start your memory collection.'
              : 'Accept an invitation code from a legacy keeper to begin sharing your stories.'}
          </p>
        </div>
        <Button
          onClick={() => toast.info('Open the menu (☰) → Invite to create or accept a connection')}
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Connect Now
        </Button>
      </div>
    );
  }

  // CRASH GUARD: Show loading spinner until fully mounted
  if (!isFullyLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'rgb(245, 249, 233)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col relative" 
      style={{ 
        backgroundColor: 'rgb(245, 249, 233)',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      {/* Hidden file inputs - always in DOM so they can be triggered from anywhere */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept=".mp4,.mov,.mkv,.avi,.m4v,.wmv,video/mp4,video/quicktime,video/x-matroska,video/x-msvideo,video/x-m4v,video/x-ms-wmv"
        onChange={handleMediaUpload}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,.mp4,.mov,.mkv,.avi,.m4v,.wmv,video/mp4,video/quicktime,video/x-matroska,video/x-msvideo,video/x-m4v,video/x-ms-wmv"
        onChange={handleMediaUpload}
        multiple
        className="hidden"
      />
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        onChange={handleDocumentUpload}
        multiple
        className="hidden"
      />
      
      {/* Current Prompt Context Indicator (when replying to a past prompt) */}
      {currentPromptContext && !activePrompt && (
        <div className="bg-gradient-to-br from-[rgb(245,249,233)] to-[rgb(235,244,218)] border-b border-primary/20 p-3 shadow-sm flex-shrink-0">
          <div className="flex items-start justify-between space-x-3">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <MessageSquarePlus className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-semibold text-primary" style={{ fontFamily: 'Archivo' }}>Replying to Prompt</h4>
              </div>
              <p className="text-sm font-medium" style={{ fontFamily: 'Inter' }}>
                {currentPromptContext}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearPromptContext}
              className="flex-shrink-0 h-7 w-7 hover:bg-primary/10"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      )}

      {/* Microphone Permission Warning Banner */}
      {micPermissionStatus === 'denied' && (
        <div className="bg-red-50 border-b border-red-200 p-3 shadow-sm flex-shrink-0">
          <div className="flex items-start space-x-3">
            <Mic className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-red-900 mb-1" style={{ fontFamily: 'Archivo' }}>
                Microphone Access Blocked
              </h4>
              <p className="text-xs text-red-700 mb-2" style={{ fontFamily: 'Inter' }}>
                {(() => {
                  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
                  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
                  
                  if (isIOS || isSafari) {
                    return 'To record voice memos, go to Settings → Safari → Microphone and allow this site.';
                  } else {
                    return 'To record voice memos, click the 🔒 or ⓘ icon in the address bar and allow microphone access.';
                  }
                })()}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMicPermissionStatus('unknown');
                  toast.info('Please allow microphone access when prompted');
                }}
                className="h-7 text-xs bg-white hover:bg-red-50 border-red-300 text-red-700"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active Prompt Helper */}
      {activePrompt && (
        <div ref={activePromptRef} className="bg-gradient-to-br from-[rgb(245,249,233)] to-[rgb(235,244,218)] border-b border-primary/20 p-4 shadow-sm animate-fade-in flex-shrink-0">
          <div className="flex items-start justify-between space-x-3 mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-primary" style={{ fontFamily: 'Archivo' }}>
                  {userType === 'keeper' ? 'Prompt Sent' : 'Share Your Story'}
                </h4>
              </div>
              <p className="text-sm font-medium mb-1" style={{ fontFamily: 'Inter' }}>
                {activePrompt}
              </p>
              {userType === 'keeper' && (
                <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter' }}>
                  Waiting for Storyteller's response... You can add your own thoughts below.
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearPrompt}
              className="flex-shrink-0 h-8 w-8 hover:bg-primary/10"
            >
              <Plus className="w-4 h-4 rotate-45 text-muted-foreground" />
            </Button>
          </div>
          
          {/* Action Buttons - Only for Storytellers (Tellers) */}
          {userType === 'teller' && (
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-auto py-4 bg-white hover:bg-primary/5 border-primary/20 hover:border-primary/40 transition-all"
                onClick={() => {
                  // Focus on the text input and scroll it into view (triggers mobile keyboard)
                  messageInputRef.current?.focus();
                  messageInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                <Send className="w-5 h-5 mb-2 text-primary" />
                <span className="text-sm font-medium" style={{ fontFamily: 'Inter' }}>Type</span>
              </Button>
              
              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-auto py-4 bg-white hover:bg-primary/5 border-primary/20 hover:border-primary/40 transition-all"
                onClick={toggleRecording}
              >
                <Mic className="w-5 h-5 mb-2 text-primary" />
                <span className="text-sm font-medium" style={{ fontFamily: 'Inter' }}>Voice Memo</span>
              </Button>
              
              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-auto py-4 bg-white hover:bg-primary/5 border-primary/20 hover:border-primary/40 transition-all"
                onClick={() => {
                  // Use imageInputRef which accepts both images and videos
                  imageInputRef.current?.click();
                }}
              >
                <Camera className="w-5 h-5 mb-2 text-primary" />
                <span className="text-sm font-medium" style={{ fontFamily: 'Inter' }}>Photo/Video</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Messages Area - Scrollable flex-1 container */}
      <div 
        className="overflow-y-auto overscroll-contain"
        ref={scrollAreaRef}
        style={{ 
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: `calc(${inputBoxHeight}px + env(safe-area-inset-bottom, 0px))`,
          flex: '1 1 0',
          minHeight: 0
        }}
      >
        <div 
          className={`space-y-4 max-w-full px-3 ${activePrompt || currentPromptContext ? 'pt-4' : 'pt-0'}`}
          style={{ 
            overflow: 'visible'
          }}
        >
          {memories.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <div className="text-4xl">💬</div>
              <h3 className="font-semibold">Start the conversation</h3>
              <p className="text-sm text-muted-foreground">
                Send a message, photo, or voice memo to begin sharing memories
              </p>
            </div>
          ) : (
            memories.map((message, index) => {
              const prevMessage = index > 0 ? memories[index - 1] : null;
              // Show prompt header when a new prompt question appears
              // This displays for BOTH Legacy Keepers and Storytellers so everyone knows the topic
              const showPromptHeader = message.promptQuestion && 
                (!prevMessage || prevMessage.promptQuestion !== message.promptQuestion);
              
              return (
                <React.Fragment key={message.id}>
                  {showPromptHeader && (
                    <div className="bg-gradient-to-br from-[rgb(245,249,233)] to-[rgb(235,244,218)] border border-primary/20 rounded-lg p-3 mb-4 shadow-sm animate-fade-in mx-1">
                      <div className="flex items-start space-x-2">
                        <BookOpen className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <h4 className="text-sm font-semibold text-primary mb-1" style={{ fontFamily: 'Archivo' }}>
                            {userType === 'keeper' ? 'Memory Prompt' : 'Story Prompt'}
                          </h4>
                          <p className="text-sm font-medium text-foreground break-words" style={{ fontFamily: 'Inter' }}>
                            {message.promptQuestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {renderMessage(message)}
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Box Area - Fixed at bottom, flush to screen edge */}
      <div 
        ref={inputBoxRef}
        className="bg-white border-t shadow-lg flex-shrink-0" 
        style={{ 
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0))',
          zIndex: 60,
          boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
      >
        {/* Recording Indicator */}
        {isRecording && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200">
            <div className="flex items-center justify-center space-x-2 text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Recording... {recordingTime}s</span>
            </div>
          </div>
        )}

        <div className="bg-card/95 backdrop-blur-sm p-3 max-w-[1400px] mx-auto">
        {/* Past Prompts Button - Top Row */}
        {pastPrompts.length > 0 && !currentPromptContext && !activePrompt && (
          <div className="mb-2">
            <Sheet open={showPastPromptsSheet} onOpenChange={setShowPastPromptsSheet}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs h-8 border-primary/20 hover:bg-primary/5 hover:border-primary/40"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5 mr-2 text-primary" />
                  Reply to Previous Prompt
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle style={{ fontFamily: 'Archivo' }}>Reply to Previous Prompt</SheetTitle>
                  <SheetDescription>
                    Select a previous prompt to continue adding memories to that conversation
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(80vh-120px)] mt-4">
                  <div className="space-y-2 pr-4">
                    {pastPrompts.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full h-auto p-4 text-left flex flex-col items-start hover:bg-primary/5 hover:border-primary/40 transition-all"
                        onClick={() => handleSelectPastPrompt(prompt.question)}
                      >
                        <div className="flex items-start space-x-2 w-full">
                          <BookOpen className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <p className="text-sm font-medium mb-1 text-left break-words whitespace-normal" style={{ fontFamily: 'Inter' }}>
                              {prompt.question}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last response: {prompt.timestamp.toLocaleDateString([], { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            <Badge variant="secondary" className="text-xs mt-2">
                              {memories.filter(m => m.promptQuestion === prompt.question).length} responses
                            </Badge>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        )}
        {/* Live Transcription Display (only show when recording) */}
        {isRecording && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200 px-3 sm:px-4 py-3 sm:py-4 shadow-lg animate-fade-in">
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></div>
                  <span className="text-xs sm:text-sm font-semibold text-red-700" style={{ fontFamily: 'Inter' }}>
                    Recording • {recordingTime}s
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleRecording}
                  className="h-7 text-xs bg-white hover:bg-red-100 border-red-300 text-red-700"
                >
                  Stop & Save
                </Button>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2.5 sm:p-3 min-h-[70px] border border-red-200/50">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 flex items-center gap-1 uppercase tracking-wide" style={{ fontFamily: 'Inter' }}>
                  <Languages className="w-3.5 h-3.5" />
                  Live Transcription:
                </p>
                {liveTranscript ? (
                  <p className="text-base sm:text-lg text-foreground leading-relaxed font-medium" style={{ fontFamily: 'Inter' }}>
                    {liveTranscript}
                  </p>
                ) : (
                  <p className="text-sm sm:text-base text-muted-foreground/70 italic" style={{ fontFamily: 'Inter' }}>
                    {isTranscribing ? 'Listening...' : 'Speak to see transcription...'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-4">
          {/* Voice Recording Button - Left */}
          <TooltipProvider>
            <Tooltip open={micPermissionStatus === 'denied' ? undefined : false}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleRecording}
                  className={`rounded-full w-9 h-9 sm:w-11 sm:h-11 hover:bg-muted flex-shrink-0 ${isRecording ? 'text-red-500 bg-red-50' : ''}`}
                >
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </TooltipTrigger>
              {micPermissionStatus === 'denied' && (
                <TooltipContent side="top" className="max-w-xs text-xs">
                  <p>Microphone access denied. Click to see instructions.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Message Input - Center */}
          <div className="flex-1 relative">
            <Input
              ref={messageInputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                currentPromptContext 
                  ? (userType === 'keeper' ? "Add your thoughts..." : "Share your story...") 
                  : "Type a message..."
              }
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={isRecording}
              className="border border-border/50 bg-white rounded-lg pl-3 sm:pl-4 pr-10 sm:pr-11 py-2 text-sm sm:text-base focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/70"
            />
            {message.trim() && (
              <Button
                size="icon"
                onClick={handleSendMessage}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary hover:bg-primary/90"
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            )}
          </div>

          {/* Emoji Picker - Right */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isRecording}
                className="rounded-full w-9 h-9 sm:w-11 sm:h-11 hover:bg-muted flex-shrink-0"
              >
                <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 sm:w-80 p-3 sm:p-4" align="end">
              <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
                {emojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="text-xl sm:text-2xl hover:bg-muted rounded p-1.5 sm:p-2 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Add Media Button - Right */}
          <Popover open={showUploadMenu} onOpenChange={setShowUploadMenu}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isRecording}
                className="rounded-full w-9 h-9 sm:w-11 sm:h-11 hover:bg-muted flex-shrink-0"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Photo
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => videoInputRef.current?.click()}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Video
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p className="text-xs">Supports MP4, MOV, and more. MOV files are automatically converted for web playback.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => documentInputRef.current?.click()}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Document/Scan
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        </div>
      </div>

      {/* Fullscreen Media Preview */}
      {fullscreenMedia && (
        <MediaFullscreenPreview
          type={fullscreenMedia.type}
          url={fullscreenMedia.url}
          title={fullscreenMedia.title}
          onClose={() => setFullscreenMedia(null)}
        />
      )}
    </div>
  );
}
