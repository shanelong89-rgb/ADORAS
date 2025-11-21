import React, { useState, useMemo, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Memory, UserType } from '../App';
import { Search, Filter, Calendar as CalendarIcon, Grid, ChevronLeft, ChevronRight, Camera, Mic, MessageCircle, Play, Pause, Download, Heart, Video, ChevronDown, ChevronUp, BookOpen, Edit, Trash2, MapPin, FileText, Tag, Clock, Users, Languages, ExternalLink, ScanText, X } from 'lucide-react';
import { toast } from 'sonner';
import { PhotoMetadataDialog, PhotoMetadata } from './PhotoMetadataDialog';

interface MediaLibraryTabProps {
  memories: Memory[];
  userType: UserType;
  userAge?: number; // Legacy Keeper's current age for date parsing
  partnerBirthday?: Date; // Partner's (storyteller's) birthday for "you were X" date parsing
  onEditMemory?: (memoryId: string, updates: Partial<Memory>) => void;
  onDeleteMemory?: (memoryId: string) => void;
}

const CATEGORIES = ['All', 'Photos', 'Voice', 'Video', 'Chat', 'Prompts', 'Documents'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'category', label: 'By Category' }
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Helper function to check if a string contains GPS coordinates
function isGPSCoordinates(location: string): boolean {
  if (!location) return false;
  // Check if the string matches the pattern "latitude, longitude"
  const gpsPattern = /^-?\d+\.\d+,\s*-?\d+\.\d+$/;
  return gpsPattern.test(location.trim());
}

// Helper function to get Google Maps URL from GPS coordinates
function getMapURL(location: string): string {
  const trimmed = location.trim();
  return `https://www.google.com/maps?q=${encodeURIComponent(trimmed)}`;
}

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

export function MediaLibraryTab({ memories, userType, userAge = 20, partnerBirthday, onEditMemory, onDeleteMemory }: MediaLibraryTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDayMemories, setSelectedDayMemories] = useState<Memory[]>([]);
  const [showDayDialog, setShowDayDialog] = useState(false);
  
  // Edit dialog state
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editDateTime, setEditDateTime] = useState('');
  
  // Photo metadata edit state
  const [editPhotoDate, setEditPhotoDate] = useState('');
  const [editPhotoLocation, setEditPhotoLocation] = useState('');
  const [editDetectedPeople, setEditDetectedPeople] = useState('');
  
  // Video metadata edit state
  const [editVideoDate, setEditVideoDate] = useState('');
  const [editVideoLocation, setEditVideoLocation] = useState('');
  const [editVideoPeople, setEditVideoPeople] = useState('');
  
  // Refs for datetime input auto-close debouncing
  const photoDateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoDateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editDateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Full-screen media view state
  const [showFullScreenMedia, setShowFullScreenMedia] = useState(false);
  const [fullScreenMediaUrl, setFullScreenMediaUrl] = useState('');
  const [fullScreenMediaType, setFullScreenMediaType] = useState<'photo' | 'video' | 'text' | 'document'>('photo');
  const [fullScreenTextContent, setFullScreenTextContent] = useState('');
  const [fullScreenDocument, setFullScreenDocument] = useState<{ url: string; type: string; fileName: string; scannedText?: string } | null>(null);
  
  // Voice visual reference state
  const [editVoiceVisualReference, setEditVoiceVisualReference] = useState('');
  const voiceVisualInputRef = useRef<HTMLInputElement>(null);
  
  // Voice transcription state
  const [editVoiceTranscript, setEditVoiceTranscript] = useState('');
  const [editVoiceLanguage, setEditVoiceLanguage] = useState('');
  const [editEnglishTranslation, setEditEnglishTranslation] = useState('');
  
  // Document metadata state
  const [editDocumentScannedText, setEditDocumentScannedText] = useState('');
  
  // Long press state
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [longPressedMemory, setLongPressedMemory] = useState<string | null>(null);
  
  // Video playback state
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const videoRefs = useRef<{[key: string]: HTMLVideoElement | null}>({});

  // Helper functions
  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDayKey = (date: Date) => {
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit'
    });
  };

  const formatDayDisplay = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateKey = formatDayKey(date);
    const todayKey = formatDayKey(today);
    const yesterdayKey = formatDayKey(yesterday);
    
    if (dateKey === todayKey) return 'Today';
    if (dateKey === yesterdayKey) return 'Yesterday';
    
    return date.toLocaleDateString([], { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };

  const toggleDay = (dayKey: string) => {
    const newOpenDays = new Set(openDays);
    if (newOpenDays.has(dayKey)) {
      newOpenDays.delete(dayKey);
    } else {
      newOpenDays.add(dayKey);
    }
    setOpenDays(newOpenDays);
  };

  // Enrich memories with chronological dates
  const enrichedMemories = useMemo(() => {
    return memories.map(memory => {
      let chronologicalDate: Date;
      
      // For photos, prioritize photoDate from EXIF
      if (memory.type === 'photo' && memory.photoDate) {
        chronologicalDate = memory.photoDate instanceof Date ? memory.photoDate : new Date(memory.photoDate);
      }
      // For videos, prioritize videoDate from EXIF
      else if (memory.type === 'video' && memory.videoDate) {
        chronologicalDate = memory.videoDate instanceof Date ? memory.videoDate : new Date(memory.videoDate);
      }
      // For other types or if EXIF date is not available, parse content for natural language dates
      else {
        const parsedDate = parseChronologicalDate(memory.content, userAge, partnerBirthday);
        const timestamp = memory.timestamp instanceof Date ? memory.timestamp : new Date(memory.timestamp);
        chronologicalDate = parsedDate || timestamp;
      }
      
      return {
        ...memory,
        chronologicalDate,
        displayDate: memory.timestamp instanceof Date ? memory.timestamp : new Date(memory.timestamp)
      };
    });
  }, [memories, userAge]);

  const filteredMemories = enrichedMemories
    .filter(memory => {
      if (searchQuery === '') {
        // No search query, only filter by category
        const matchesCategory = 
          selectedCategory === 'All' || 
          (selectedCategory === 'Prompts' && memory.promptQuestion) ||
          (selectedCategory !== 'Prompts' && memory.category === selectedCategory);
        return matchesCategory;
      }
      
      const query = searchQuery.toLowerCase();
      
      // Comprehensive search across all memory fields
      const matchesSearch = 
        // Basic content and tags
        memory.content.toLowerCase().includes(query) ||
        memory.tags.some(tag => tag.toLowerCase().includes(query)) ||
        formatDate(new Date(memory.timestamp)).toLowerCase().includes(query) ||
        
        // Notes
        (memory.notes && memory.notes.toLowerCase().includes(query)) ||
        
        // Prompt question
        (memory.promptQuestion && memory.promptQuestion.toLowerCase().includes(query)) ||
        
        // Photo-specific fields
        (memory.type === 'photo' && memory.photoLocation && memory.photoLocation.toLowerCase().includes(query)) ||
        (memory.type === 'photo' && memory.detectedPeople && memory.detectedPeople.toLowerCase().includes(query)) ||
        (memory.type === 'photo' && memory.detectedPeople?.some(person => person.toLowerCase().includes(query))) ||
        
        // Video-specific fields
        (memory.type === 'video' && memory.videoLocation && memory.videoLocation.toLowerCase().includes(query)) ||
        (memory.type === 'video' && memory.videoPeople && memory.videoPeople.toLowerCase().includes(query)) ||
        (memory.type === 'video' && memory.videoPeople?.some(person => person.toLowerCase().includes(query))) ||
        
        // Voice-specific fields
        (memory.type === 'voice' && memory.voiceTranscript && memory.voiceTranscript.toLowerCase().includes(query)) ||
        (memory.type === 'voice' && memory.transcript && memory.transcript.toLowerCase().includes(query)) ||
        (memory.type === 'voice' && memory.englishTranslation && memory.englishTranslation.toLowerCase().includes(query)) ||
        (memory.type === 'voice' && memory.voiceLanguage && memory.voiceLanguage.toLowerCase().includes(query)) ||
        
        // Document-specific fields - ENHANCED FOR SCANNED TEXT
        (memory.type === 'document' && memory.documentScannedText && memory.documentScannedText.toLowerCase().includes(query)) ||
        (memory.type === 'document' && memory.documentFileName && memory.documentFileName.toLowerCase().includes(query)) ||
        (memory.type === 'document' && memory.documentType && memory.documentType.toLowerCase().includes(query)) ||
        (memory.type === 'document' && memory.documentScanLanguage && memory.documentScanLanguage.toLowerCase().includes(query)) ||
        
        // General location field
        (memory.location && memory.location.toLowerCase().includes(query)) ||
        
        // Category
        (memory.category && memory.category.toLowerCase().includes(query));
      
      const matchesCategory = 
        selectedCategory === 'All' || 
        (selectedCategory === 'Prompts' && memory.promptQuestion) ||
        (selectedCategory !== 'Prompts' && memory.category === selectedCategory);
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.chronologicalDate).getTime() - new Date(a.chronologicalDate).getTime();
        case 'oldest':
          return new Date(a.chronologicalDate).getTime() - new Date(b.chronologicalDate).getTime();
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        default:
          return 0;
      }
    });

  // Calendar data - organize memories by year/month/day
  const calendarData = useMemo(() => {
    const data: Record<number, Record<number, Record<number, Memory[]>>> = {};
    
    filteredMemories.forEach(memory => {
      const date = new Date(memory.chronologicalDate);
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      
      if (!data[year]) data[year] = {};
      if (!data[year][month]) data[year][month] = {};
      if (!data[year][month][day]) data[year][month][day] = [];
      
      data[year][month][day].push(memory);
    });
    
    return data;
  }, [filteredMemories]);

  // Get available years
  const availableYears = useMemo(() => {
    return Object.keys(calendarData)
      .map(Number)
      .sort((a, b) => b - a);
  }, [calendarData]);

  // Get months for selected year
  const availableMonths = useMemo(() => {
    if (!calendarData[selectedYear]) return [];
    return Object.keys(calendarData[selectedYear])
      .map(Number)
      .sort((a, b) => a - b);
  }, [calendarData, selectedYear]);

  // Separate prompt memories and regular memories
  const promptMemories = filteredMemories.filter(m => m.promptQuestion);
  const regularMemories = filteredMemories.filter(m => !m.promptQuestion);

  // Group prompt memories by prompt question
  const memoriesByPrompt = promptMemories.reduce((acc, memory) => {
    const promptKey = memory.promptQuestion || 'unknown';
    if (!acc[promptKey]) {
      acc[promptKey] = {
        promptQuestion: promptKey,
        memories: []
      };
    }
    acc[promptKey].memories.push(memory);
    return acc;
  }, {} as Record<string, { promptQuestion: string; memories: Memory[] }>);

  // Sort prompt groups
  const sortedPrompts = Object.entries(memoriesByPrompt).sort(([, a], [, b]) => {
    const aLatest = Math.max(...a.memories.map(m => new Date(m.chronologicalDate).getTime()));
    const bLatest = Math.max(...b.memories.map(m => new Date(m.chronologicalDate).getTime()));
    if (sortBy === 'oldest') {
      return aLatest - bLatest;
    }
    return bLatest - aLatest;
  });

  // Group regular memories by day
  const memoriesByDay = regularMemories.reduce((acc, memory) => {
    const dayKey = formatDayKey(new Date(memory.chronologicalDate));
    if (!acc[dayKey]) {
      acc[dayKey] = {
        date: memory.chronologicalDate,
        memories: []
      };
    }
    acc[dayKey].memories.push(memory);
    return acc;
  }, {} as Record<string, { date: Date; memories: Memory[] }>);

  const sortedDays = Object.entries(memoriesByDay).sort(([, a], [, b]) => {
    if (sortBy === 'oldest') {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Photos': return <Camera className="w-4 h-4" />;
      case 'Voice': return <Mic className="w-4 h-4" />;
      case 'Video': return <Video className="w-4 h-4" />;
      case 'Chat': return <MessageCircle className="w-4 h-4" />;
      case 'Prompt': return <Heart className="w-4 h-4" />;
      case 'Documents': return <FileText className="w-4 h-4" />;
      default: return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string, className: string = "w-5 h-5") => {
    switch (type) {
      case 'photo': return <Camera className={className} />;
      case 'voice': return <Mic className={className} />;
      case 'video': return <Video className={className} />;
      case 'document': return <FileText className={className} />;
      default: return <MessageCircle className={className} />;
    }
  };

  const getMemoryThumbnail = (memory: Memory) => {
    const isInitialPrompt = memory.promptQuestion && memory.content === memory.promptQuestion && memory.tags.includes('question');
    
    if (isInitialPrompt) {
      return <BookOpen className="w-4 h-4 text-primary" />;
    }
    
    switch (memory.type) {
      case 'photo':
        return <div className="w-full h-full bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center"><Camera className="w-4 h-4 text-green-600" /></div>;
      case 'voice':
        return <div className="w-full h-full bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center"><Mic className="w-4 h-4 text-purple-600" /></div>;
      case 'video':
        return <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center"><Video className="w-4 h-4 text-blue-600" /></div>;
      case 'document':
        return <div className="w-full h-full bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center"><FileText className="w-4 h-4 text-orange-600" /></div>;
      default:
        return <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center"><MessageCircle className="w-4 h-4 text-gray-600" /></div>;
    }
  };

  const handleDayClick = (memories: Memory[]) => {
    setSelectedDayMemories(memories);
    setShowDayDialog(true);
  };

  // Helper function to extract search context from text
  const getSearchContext = (text: string, query: string, contextLength: number = 60): string => {
    if (!query || !text) return text.slice(0, contextLength);
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerText.indexOf(lowerQuery);
    
    if (matchIndex === -1) return text.slice(0, contextLength);
    
    // Calculate start and end positions to show context around the match
    const start = Math.max(0, matchIndex - Math.floor(contextLength / 2));
    const end = Math.min(text.length, matchIndex + query.length + Math.floor(contextLength / 2));
    
    let excerpt = text.slice(start, end);
    
    // Add ellipsis if we're not at the beginning/end
    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';
    
    return excerpt;
  };

  // Long press handlers
  const handleLongPressStart = (memory: Memory) => {
    if (userType !== 'keeper' || !onEditMemory || !onDeleteMemory) return;
    
    longPressTimer.current = setTimeout(() => {
      setLongPressedMemory(memory.id);
      setEditingMemory(memory);
      setEditNotes(memory.notes || '');
      setEditLocation(memory.location || '');
      setEditTags(memory.tags.join(', '));
      setEditDateTime(new Date(memory.timestamp).toISOString().slice(0, 16));
      
      // Initialize photo metadata if it's a photo
      if (memory.type === 'photo') {
        // Default photo date logic:
        // 1. Use EXIF photoDate if available
        // 2. Try to extract estimated date from conversation context
        // 3. Try to extract estimated date from prompt question
        // 4. Fall back to upload timestamp
        let defaultPhotoDate = memory.photoDate;
        if (!defaultPhotoDate && memory.conversationContext) {
          const estimatedDate = parseChronologicalDate(memory.conversationContext, userAge, partnerBirthday);
          if (estimatedDate) {
            defaultPhotoDate = estimatedDate;
          }
        }
        if (!defaultPhotoDate && memory.promptQuestion) {
          const estimatedDate = parseChronologicalDate(memory.promptQuestion, userAge, partnerBirthday);
          if (estimatedDate) {
            defaultPhotoDate = estimatedDate;
          }
        }
        if (!defaultPhotoDate) {
          defaultPhotoDate = memory.timestamp;
        }
        
        setEditPhotoDate(defaultPhotoDate ? new Date(defaultPhotoDate).toISOString().slice(0, 16) : '');
        setEditPhotoLocation(memory.photoLocation || '');
        setEditDetectedPeople(memory.detectedPeople?.join(', ') || '');
      }
      
      // Initialize video metadata if it's a video
      if (memory.type === 'video') {
        // Default video date logic:
        // 1. Use EXIF videoDate if available
        // 2. Try to extract estimated date from conversation context
        // 3. Try to extract estimated date from prompt question
        // 4. Fall back to upload timestamp
        let defaultVideoDate = memory.videoDate;
        if (!defaultVideoDate && memory.conversationContext) {
          const estimatedDate = parseChronologicalDate(memory.conversationContext, userAge, partnerBirthday);
          if (estimatedDate) {
            defaultVideoDate = estimatedDate;
          }
        }
        if (!defaultVideoDate && memory.promptQuestion) {
          const estimatedDate = parseChronologicalDate(memory.promptQuestion, userAge, partnerBirthday);
          if (estimatedDate) {
            defaultVideoDate = estimatedDate;
          }
        }
        if (!defaultVideoDate) {
          defaultVideoDate = memory.timestamp;
        }
        
        setEditVideoDate(defaultVideoDate ? new Date(defaultVideoDate).toISOString().slice(0, 16) : '');
        setEditVideoLocation(memory.videoLocation || '');
        setEditVideoPeople(memory.videoPeople?.join(', ') || '');
      }
      
      // Initialize voice visual reference if it's a voice
      if (memory.type === 'voice') {
        setEditVoiceVisualReference(memory.voiceVisualReference || '');
        setEditVoiceTranscript(memory.transcript || '');
        setEditVoiceLanguage(memory.voiceLanguage || '');
        setEditEnglishTranslation(memory.englishTranslation || '');
      }
      
      // Initialize document scanned text if it's a document
      if (memory.type === 'document') {
        setEditDocumentScannedText(memory.documentScannedText || '');
      }
      
      setShowEditDialog(true);
    }, 500); // 500ms hold time
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleSaveEdit = () => {
    if (!editingMemory || !onEditMemory) return;

    console.log('💾 Saving memory edit for:', editingMemory.type, editingMemory.id);

    const updates: Partial<Memory> = {
      notes: editNotes,
      location: editLocation,
      tags: editTags.split(',').map(t => t.trim()).filter(t => t),
      timestamp: new Date(editDateTime)
    };
    
    // Add photo metadata if it's a photo
    if (editingMemory.type === 'photo') {
      if (editPhotoDate) {
        updates.photoDate = new Date(editPhotoDate);
      }
      if (editPhotoLocation !== undefined) {
        updates.photoLocation = editPhotoLocation;
      }
      // Preserve GPS coordinates from the original memory
      if (editingMemory.photoGPSCoordinates) {
        updates.photoGPSCoordinates = editingMemory.photoGPSCoordinates;
      }
      if (editDetectedPeople) {
        updates.detectedPeople = editDetectedPeople.split(',').map(p => p.trim()).filter(p => p);
        updates.detectedFaces = updates.detectedPeople.length;
      }
    }

    // Add video metadata if it's a video
    if (editingMemory.type === 'video') {
      if (editVideoDate) {
        updates.videoDate = new Date(editVideoDate);
      }
      if (editVideoLocation !== undefined) {
        updates.videoLocation = editVideoLocation;
      }
      // Preserve GPS coordinates from the original memory
      if (editingMemory.videoGPSCoordinates) {
        updates.videoGPSCoordinates = editingMemory.videoGPSCoordinates;
      }
      if (editVideoPeople) {
        updates.videoPeople = editVideoPeople.split(',').map(p => p.trim()).filter(p => p);
        updates.videoFaces = updates.videoPeople.length;
      }
    }

    // Add voice visual reference and transcription if it's a voice
    if (editingMemory.type === 'voice') {
      if (editVoiceVisualReference) {
        updates.voiceVisualReference = editVoiceVisualReference;
      }
      if (editVoiceTranscript) {
        updates.transcript = editVoiceTranscript;
      }
      if (editVoiceLanguage) {
        updates.voiceLanguage = editVoiceLanguage;
      }
      if (editEnglishTranslation) {
        updates.englishTranslation = editEnglishTranslation;
      }
    }

    // Add document scanned text if it's a document
    if (editingMemory.type === 'document') {
      if (editDocumentScannedText !== undefined) {
        updates.documentScannedText = editDocumentScannedText;
      }
    }

    console.log('💾 Saving updates:', updates);
    onEditMemory(editingMemory.id, updates);
    setShowEditDialog(false);
    setEditingMemory(null);
    toast('Memory updated successfully');
  };

  const handleDeleteClick = () => {
    setShowEditDialog(false);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (!editingMemory || !onDeleteMemory) return;
    
    console.log('🗑️ Confirming deletion of memory:', editingMemory.id);
    onDeleteMemory(editingMemory.id);
    setShowDeleteDialog(false);
    setEditingMemory(null);
  };

  const renderMemoryCard = (memory: Memory) => {
    const isInitialPrompt = memory.promptQuestion && memory.content === memory.promptQuestion && memory.tags.includes('question');
    const canEdit = userType === 'keeper' && onEditMemory && onDeleteMemory;
    
    return (
      <Card 
        key={memory.id} 
        className={`group hover:shadow-md transition-shadow overflow-hidden ${isInitialPrompt ? 'bg-primary/5 border-primary/20' : ''}`}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1 flex-1 min-w-0">
              {isInitialPrompt ? <BookOpen className="w-5 h-5 text-primary flex-shrink-0" /> : getTypeIcon(memory.type)}
              {isInitialPrompt ? (
                <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
                  Question Asked
                </Badge>
              ) : (
                <>
                  <Badge variant="outline" className="text-xs">
                    {memory.category}
                  </Badge>
                  {memory.promptQuestion && !isInitialPrompt && (
                    <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">
                      Prompt Response
                    </Badge>
                  )}
                  <Badge variant={memory.sender === userType ? 'default' : 'secondary'} className="text-xs">
                    {memory.sender === userType ? 'You' : memory.sender === 'keeper' ? 'Keeper' : 'Teller'}
                  </Badge>
                </>
              )}
            </div>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingMemory(memory);
                  setEditNotes(memory.notes || '');
                  setEditLocation(memory.location || '');
                  setEditTags(memory.tags.join(', '));
                  setEditDateTime(new Date(memory.timestamp).toISOString().slice(0, 16));
                  
                  // Initialize photo metadata if it's a photo
                  if (memory.type === 'photo') {
                    console.log('📸 Opening edit dialog for photo:', {
                      photoLocation: memory.photoLocation,
                      photoGPSCoordinates: memory.photoGPSCoordinates,
                      photoDate: memory.photoDate
                    });
                    setEditPhotoDate(memory.photoDate ? new Date(memory.photoDate).toISOString().slice(0, 16) : '');
                    setEditPhotoLocation(memory.photoLocation || '');
                    setEditDetectedPeople(memory.detectedPeople?.join(', ') || '');
                  }
                  
                  // Initialize video metadata if it's a video
                  if (memory.type === 'video') {
                    console.log('🎬 Opening edit dialog for video:', {
                      videoLocation: memory.videoLocation,
                      videoGPSCoordinates: memory.videoGPSCoordinates,
                      videoDate: memory.videoDate
                    });
                    setEditVideoDate(memory.videoDate ? new Date(memory.videoDate).toISOString().slice(0, 16) : '');
                    setEditVideoLocation(memory.videoLocation || '');
                    setEditVideoPeople(memory.videoPeople?.join(', ') || '');
                  }
                  
                  // Initialize voice visual reference if it's a voice
                  if (memory.type === 'voice') {
                    setEditVoiceVisualReference(memory.voiceVisualReference || '');
                    setEditVoiceTranscript(memory.transcript || '');
                    setEditVoiceLanguage(memory.voiceLanguage || '');
                    setEditEnglishTranslation(memory.englishTranslation || '');
                  }
                  
                  // Initialize document metadata if it's a document
                  if (memory.type === 'document') {
                    console.log('📄 Opening edit dialog for document:', {
                      documentFileName: memory.documentFileName,
                      documentType: memory.documentType,
                      documentScannedText: memory.documentScannedText?.substring(0, 100)
                    });
                    setEditDocumentScannedText(memory.documentScannedText || '');
                  }
                  
                  setShowEditDialog(true);
                }}
              >
                <Edit className="w-3 h-3" />
              </Button>
            )}
          </div>

          {memory.type === 'photo' && (
            <div 
              className="relative rounded-lg overflow-hidden bg-gray-100 cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                if (memory.photoUrl) {
                  setFullScreenMediaUrl(memory.photoUrl);
                  setFullScreenMediaType('photo');
                  setShowFullScreenMedia(true);
                }
              }}
            >
              {memory.photoUrl ? (
                <>
                  <img 
                    src={memory.photoUrl} 
                    alt={memory.content}
                    className="w-full h-auto object-cover max-h-[200px]"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2">
                      <ExternalLink className="w-5 h-5 text-black" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
          )}

          {memory.type === 'voice' && (
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex flex-col items-center justify-center space-y-2">
              {memory.voiceVisualReference ? (
                <div 
                  className="relative w-full rounded-lg overflow-hidden bg-gray-100 cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullScreenMediaUrl(memory.voiceVisualReference!);
                    setFullScreenMediaType('photo');
                    setShowFullScreenMedia(true);
                  }}
                >
                  <img 
                    src={memory.voiceVisualReference} 
                    alt="Voice visual reference"
                    className="w-full h-auto object-cover max-h-[200px]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col items-center justify-end pb-3">
                    <Mic className="w-6 h-6 text-white mb-1" />
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                      <Play className="w-3 h-3 mr-1" />
                      Play
                    </Button>
                  </div>
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2">
                      <ExternalLink className="w-5 h-5 text-black" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Mic className="w-8 h-8 text-purple-600" />
                  <Button variant="ghost" size="sm">
                    <Play className="w-4 h-4 mr-1" />
                    Play
                  </Button>
                </>
              )}
            </div>
          )}

          {memory.type === 'video' && (
            <div className="relative rounded-lg overflow-hidden cursor-pointer group bg-gray-100">
              {memory.videoUrl ? (
                <>
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current[memory.id] = el;
                    }}
                    src={memory.videoUrl}
                    className="w-full h-auto object-cover max-h-[200px]"
                    onEnded={() => setPlayingVideoId(null)}
                    onError={(e) => {
                      const target = e.target as HTMLVideoElement;
                      const errorCode = target.error?.code;
                      
                      setPlayingVideoId(null);
                      
                      // Show user-friendly message only for format errors
                      // Silent for other errors as they're usually transient
                      if (errorCode === 4) {
                        toast.error('This video format cannot be played in your browser');
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Open full screen for everyone
                      setFullScreenMediaUrl(memory.videoUrl!);
                      setFullScreenMediaType('video');
                      setShowFullScreenMedia(true);
                    }}
                  />
                  {/* Full Screen Overlay - Always show expand icon */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors pointer-events-none">
                    <div className="bg-white/90 rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                      <ExternalLink className="w-6 h-6 text-black" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-teal-100 flex flex-col items-center justify-center space-y-2">
                  <Video className="w-8 h-8 text-blue-600" />
                  <span className="text-xs text-blue-600">No video preview</span>
                </div>
              )}
            </div>
          )}

          {memory.type === 'text' && (
            <div 
              className="space-y-2 cursor-pointer group/text"
              onClick={(e) => {
                e.stopPropagation();
                setFullScreenTextContent(memory.content);
                setFullScreenMediaType('text');
                setShowFullScreenMedia(true);
              }}
            >
              <div className="relative">
                <p className={`text-sm line-clamp-3 ${isInitialPrompt ? 'font-medium text-primary/90' : ''}`}>{memory.content}</p>
                <div className="absolute inset-0 bg-black/0 group-hover/text:bg-black/5 transition-colors rounded flex items-center justify-center opacity-0 group-hover/text:opacity-100">
                  <div className="bg-white/90 rounded-full p-1.5">
                    <ExternalLink className="w-4 h-4 text-black" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {memory.type === 'document' && (
            <div 
              className="space-y-2 cursor-pointer group/doc"
              onClick={(e) => {
                e.stopPropagation();
                if (memory.documentUrl) {
                  setFullScreenDocument({
                    url: memory.documentUrl,
                    type: memory.documentType || 'unknown',
                    fileName: memory.documentFileName || 'Document',
                    scannedText: memory.documentScannedText
                  });
                  setFullScreenMediaType('document');
                  setShowFullScreenMedia(true);
                }
              }}
            >
              <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 flex flex-col items-center justify-center p-4">
                <FileText className="w-12 h-12 text-amber-600 mb-2" />
                {memory.documentType && (
                  <Badge variant="secondary" className="text-xs mb-2 bg-amber-100 text-amber-700 border-amber-300">
                    {memory.documentType.toUpperCase()}
                  </Badge>
                )}
                {memory.documentFileName && (
                  <p className="text-xs text-center text-amber-800 line-clamp-2 px-2">
                    {memory.documentFileName}
                  </p>
                )}
                {memory.documentScannedText && (
                  <div className="mt-2 px-2">
                    {searchQuery ? (
                      <>
                        <p className="text-[10px] text-primary font-medium mb-1 flex items-center justify-center gap-1">
                          <ScanText className="w-3 h-3" />
                          Match found in text
                        </p>
                        <p className="text-xs text-muted-foreground text-center line-clamp-2 bg-yellow-50/50 px-2 py-1 rounded">
                          {getSearchContext(memory.documentScannedText, searchQuery, 80)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center line-clamp-2">
                        {memory.documentScannedText.slice(0, 50)}...
                      </p>
                    )}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover/doc:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover/doc:opacity-100">
                  <div className="bg-white/90 rounded-full p-2">
                    <ExternalLink className="w-5 h-5 text-black" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {formatDate(new Date(memory.displayDate))}
              {new Date(memory.chronologicalDate).getTime() !== new Date(memory.displayDate).getTime() && (
                <span className="ml-2 text-primary">
                  {/* Show more specific text for photos and videos with EXIF dates */}
                  {(memory.type === 'photo' && memory.photoDate) || (memory.type === 'video' && memory.videoDate) 
                    ? `• Taken ${formatDate(new Date(memory.chronologicalDate))}`
                    : `• Story from ${new Date(memory.chronologicalDate).getFullYear()}`
                  }
                </span>
              )}
            </div>
            {/* Display location for photos and videos */}
            {(memory.type === 'photo' && memory.photoLocation) && (
              <div className="flex items-start gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span className="break-words">{memory.photoLocation}</span>
              </div>
            )}
            {(memory.type === 'video' && memory.videoLocation) && (
              <div className="flex items-start gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span className="break-words">{memory.videoLocation}</span>
              </div>
            )}
            {/* Display document metadata */}
            {(memory.type === 'document' && memory.documentScannedText) && (
              <div className="flex items-start gap-1 text-xs text-primary/70">
                <ScanText className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span className="break-words">
                  {memory.documentScannedText.split(/\s+/).filter(w => w.length > 0).length} words extracted
                  {memory.documentScanLanguage && ` • ${memory.documentScanLanguage}`}
                </span>
              </div>
            )}
            {memory.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {memory.tags.slice(0, 2).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {memory.tags.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{memory.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Calendar view rendering
  const renderCalendarView = () => {
    if (availableYears.length === 0) {
      return (
        <div className="text-center py-12 space-y-2">
          <div className="text-4xl">📅</div>
          <h3 className="font-semibold">No memories to display</h3>
          <p className="text-sm text-muted-foreground">
            Start sharing memories to see them in the calendar
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Year Navigation */}
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 sm:px-3 text-xs sm:text-sm flex-shrink-0"
            onClick={() => {
              const currentIndex = availableYears.indexOf(selectedYear);
              if (currentIndex < availableYears.length - 1) {
                setSelectedYear(availableYears[currentIndex + 1]);
                setSelectedMonth(null);
              }
            }}
            disabled={availableYears.indexOf(selectedYear) === availableYears.length - 1}
          >
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
            <span className="hidden sm:inline">{availableYears[availableYears.indexOf(selectedYear) + 1]}</span>
          </Button>
          
          <Select value={String(selectedYear)} onValueChange={(val) => { setSelectedYear(Number(val)); setSelectedMonth(null); }}>
            <SelectTrigger className="w-20 sm:w-32 h-8 text-xs sm:text-sm flex-shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 sm:px-3 text-xs sm:text-sm flex-shrink-0"
            onClick={() => {
              const currentIndex = availableYears.indexOf(selectedYear);
              if (currentIndex > 0) {
                setSelectedYear(availableYears[currentIndex - 1]);
                setSelectedMonth(null);
              }
            }}
            disabled={availableYears.indexOf(selectedYear) === 0}
          >
            <span className="hidden sm:inline">{availableYears[availableYears.indexOf(selectedYear) - 1]}</span>
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 sm:ml-1" />
          </Button>
        </div>

        {/* Month Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {MONTHS.map((month, index) => {
            const hasMemories = availableMonths.includes(index);
            const monthMemories = calendarData[selectedYear]?.[index];
            const memoryCount = monthMemories ? Object.values(monthMemories).flat().length : 0;
            const daysWithMemories = monthMemories ? Object.keys(monthMemories).length : 0;

            return (
              <Card
                key={month}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  hasMemories 
                    ? 'border-primary/30 hover:border-primary' 
                    : 'opacity-40 cursor-not-allowed'
                } ${selectedMonth === index ? 'ring-2 ring-primary' : ''}`}
                onClick={() => hasMemories && setSelectedMonth(selectedMonth === index ? null : index)}
              >
                <CardContent className="p-2 sm:p-3 md:p-4">
                  <div className="text-center space-y-1 sm:space-y-2">
                    <div className="font-semibold text-xs sm:text-sm" style={{ fontFamily: 'Archivo' }}>
                      {month}
                    </div>
                    {hasMemories && (
                      <>
                        <div className="text-xl sm:text-2xl font-bold text-primary">
                          {memoryCount}
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">
                          {daysWithMemories} {daysWithMemories === 1 ? 'day' : 'days'}
                        </div>
                        {/* Memory type indicators */}
                        <div className="flex justify-center gap-1">
                          {monthMemories && Object.values(monthMemories).flat().some(m => m.type === 'photo') && (
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Photos" />
                          )}
                          {monthMemories && Object.values(monthMemories).flat().some(m => m.type === 'voice') && (
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" title="Voice" />
                          )}
                          {monthMemories && Object.values(monthMemories).flat().some(m => m.type === 'video') && (
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Video" />
                          )}
                          {monthMemories && Object.values(monthMemories).flat().some(m => m.type === 'text') && (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-500" title="Text" />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Day Grid for Selected Month */}
        {selectedMonth !== null && calendarData[selectedYear]?.[selectedMonth] && (
          <Card className="border-primary/30">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4" style={{ fontFamily: 'Archivo' }}>
                {MONTHS[selectedMonth]} {selectedYear}
              </h3>
              
              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-2">
                {Object.entries(calendarData[selectedYear][selectedMonth])
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([day, memories]) => (
                    <Button
                      key={day}
                      variant="outline"
                      className="h-auto min-h-[64px] sm:h-16 flex flex-col items-center justify-center p-1 sm:p-2 hover:bg-primary/10 hover:border-primary"
                      onClick={() => handleDayClick(memories)}
                    >
                      <div className="font-semibold text-xs sm:text-sm mb-0.5 sm:mb-1">{day}</div>
                      <div className="flex gap-0.5 flex-wrap justify-center max-w-full">
                        {memories.slice(0, 4).map((memory, idx) => (
                          <div key={idx} className="w-3 h-3 sm:w-4 sm:h-4 rounded flex-shrink-0">
                            {getMemoryThumbnail(memory)}
                          </div>
                        ))}
                        {memories.length > 4 && (
                          <div className="text-[7px] sm:text-[8px] font-semibold text-primary">
                            +{memories.length - 4}
                          </div>
                        )}
                      </div>
                    </Button>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* STICKY SEARCH + FILTER BAR - Stays glued at top of this container */}
      {/* On mobile: sticky top-0 (dashboard header shrinks to minimal size) */}
      {/* On desktop web (browser): sticky top-[94px] to account for fixed Dashboard header */}
      {/* On desktop PWA: sticky top-0 since no browser chrome */}
      <div className="sticky top-0 md:[display-mode:browser]:top-[94px] z-40 bg-[rgb(245,249,233)] border-b border-border/60 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-3 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search memories, scanned text, transcripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button variant="outline" size="icon" className="flex-shrink-0">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-32 sm:w-40 h-10 text-sm flex-shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom" align="start" position="popper">
                {CATEGORIES.map(category => (
                  <SelectItem key={category} value={category}>
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(category)}
                      <span>{category}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 sm:w-40 h-10 text-sm flex-shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom" align="start" position="popper">
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground flex-wrap gap-2">
          <span className="break-words">
            {filteredMemories.length} {filteredMemories.length === 1 ? 'memory' : 'memories'}
            {selectedCategory !== 'All' && ` in ${selectedCategory}`}
            {searchQuery && (
              <span className="ml-2 text-primary">
                <ScanText className="w-3 h-3 inline mr-1" />
                Searching in all text including scanned documents
              </span>
            )}
            {viewMode === 'calendar' && ` • ${availableYears.length} ${availableYears.length === 1 ? 'year' : 'years'}`}
          </span>
          <span className="whitespace-nowrap">{memories.length} total</span>
        </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT ONLY - This is the only part that scrolls */}
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-8">
        {viewMode === 'calendar' ? (
          renderCalendarView()
        ) : (
          <>
            {filteredMemories.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <div className="text-4xl">📚</div>
                <h3 className="font-semibold">No memories found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || selectedCategory !== 'All' 
                    ? 'Try adjusting your search or filters'
                    : 'Start sharing memories to build your library'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Prompt-based Groups */}
                {sortedPrompts.map(([promptKey, { promptQuestion, memories: promptMemories }]) => (
                  <Collapsible
                    key={`prompt-${promptKey}`}
                    open={openDays.has(`prompt-${promptKey}`)}
                    onOpenChange={() => toggleDay(`prompt-${promptKey}`)}
                  >
                    <Card className="border-primary/20 bg-gradient-to-br from-[rgb(245,249,233)] to-white">
                      <CollapsibleTrigger className="w-full">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
                              <div className="text-left flex-1 min-w-0">
                                <h3 className="text-xs sm:text-sm font-medium text-primary mb-1" style={{ fontFamily: 'Archivo' }}>
                                  {userType === 'child' ? 'Memory Prompt' : 'Story Prompt'}
                                </h3>
                                <p className="text-xs sm:text-sm font-medium mb-2 break-words" style={{ fontFamily: 'Inter' }}>
                                  {promptQuestion}
                                </p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                  {promptMemories.length} {promptMemories.length === 1 ? 'response' : 'responses'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                              <div className="hidden sm:flex -space-x-1">
                                {[...new Set(promptMemories.map(m => m.type))].slice(0, 3).map((type, idx) => (
                                  <div key={idx} className="w-6 h-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center">
                                    {getTypeIcon(type, "w-3 h-3 text-primary")}
                                  </div>
                                ))}
                              </div>
                              {openDays.has(`prompt-${promptKey}`) ? (
                                <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                              ) : (
                                <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="px-2 sm:px-4 pb-3 sm:pb-4 pt-0">
                          <div className="border-t border-primary/20 pt-3 sm:pt-4">
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                              {promptMemories.map(renderMemoryCard)}
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}

                {/* Date-based Groups (non-prompt memories) */}
                {sortedDays.map(([dayKey, { date, memories: dayMemories }]) => (
                  <Collapsible
                    key={dayKey}
                    open={openDays.has(dayKey)}
                    onOpenChange={() => toggleDay(dayKey)}
                  >
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                              <div className="text-left min-w-0 flex-1">
                                <h3 className="text-xs sm:text-sm font-medium truncate">{formatDayDisplay(new Date(date))}</h3>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                  {dayMemories.length} {dayMemories.length === 1 ? 'memory' : 'memories'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                              <div className="hidden sm:flex -space-x-1">
                                {[...new Set(dayMemories.map(m => m.type))].slice(0, 3).map((type, idx) => (
                                  <div key={idx} className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                    {getTypeIcon(type, "w-3 h-3")}
                                  </div>
                                ))}
                              </div>
                              {openDays.has(dayKey) ? (
                                <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="px-2 sm:px-4 pb-3 sm:pb-4 pt-0">
                          <div className="border-t border-border pt-3 sm:pt-4">
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                              {dayMemories.map(renderMemoryCard)}
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {/* Day Detail Dialog */}
      <Dialog open={showDayDialog} onOpenChange={setShowDayDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDayMemories.length > 0 && formatDayDisplay(new Date(selectedDayMemories[0].chronologicalDate))}
            </DialogTitle>
            <DialogDescription>
              {selectedDayMemories.length} {selectedDayMemories.length === 1 ? 'memory' : 'memories'} from this day
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 mt-4">
            {selectedDayMemories.map(renderMemoryCard)}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Memory Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Memory
            </DialogTitle>
            <DialogDescription>
              Update the details of this memory
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 mt-4">
            
            {/* Text Message Content - Show Full Message */}
            {editingMemory?.type === 'text' && (
              <>
                <div className="border-b pb-3 mb-2">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Message Content
                  </h4>
                </div>
                
                <Label className="text-sm font-medium">Full Message</Label>
                <Textarea
                  value={editingMemory.content}
                  readOnly
                  className="resize-none min-h-[150px] bg-muted/30"
                  placeholder="Message content..."
                />
              </>
            )}
            
            {/* Photo Metadata Fields */}
            {editingMemory?.type === 'photo' && (
              <>
                <div className="border-b pb-3 mb-2">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Photo Information
                  </h4>
                </div>
                
                {/* Photo Preview with Download */}
                {editingMemory.photoUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Photo Preview</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = editingMemory.photoUrl!;
                          link.download = `photo-${editingMemory.id}.jpg`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          toast('Photo downloaded');
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                    <div 
                      className="relative rounded-lg overflow-hidden border border-border bg-gray-100 cursor-pointer group"
                      onClick={() => {
                        setFullScreenMediaUrl(editingMemory.photoUrl!);
                        setFullScreenMediaType('photo');
                        setShowFullScreenMedia(true);
                      }}
                    >
                      <img 
                        src={editingMemory.photoUrl} 
                        alt="Photo preview"
                        className="w-full h-auto max-h-64 object-contain"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2">
                          <ExternalLink className="w-5 h-5 text-black" />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Click to view full screen
                    </p>
                  </div>
                )}
                
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Photo Date & Time
                  {editingMemory.photoDate ? (
                    <Badge variant="secondary" className="text-xs ml-auto">
                      Extracted from EXIF
                    </Badge>
                  ) : editingMemory.conversationContext && parseChronologicalDate(editingMemory.conversationContext, userAge, partnerBirthday) ? (
                    <Badge variant="outline" className="text-xs ml-auto border-amber-300 bg-amber-50 text-amber-700">
                      Estimated from Chat
                    </Badge>
                  ) : editingMemory.promptQuestion && parseChronologicalDate(editingMemory.promptQuestion, userAge, partnerBirthday) ? (
                    <Badge variant="outline" className="text-xs ml-auto border-amber-300 bg-amber-50 text-amber-700">
                      Estimated from Prompt
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs ml-auto">
                      Upload Date
                    </Badge>
                  )}
                </Label>
                <Input
                  type="datetime-local"
                  value={editPhotoDate}
                  onChange={(e) => {
                    setEditPhotoDate(e.target.value);
                    // Clear existing timeout
                    if (photoDateTimeoutRef.current) {
                      clearTimeout(photoDateTimeoutRef.current);
                    }
                    // Auto-close after user stops changing values for 1.5 seconds (indicating completion)
                    if (e.target.value && e.target.value.length === 16) {
                      photoDateTimeoutRef.current = setTimeout(() => {
                        e.target.blur();
                      }, 1500);
                    }
                  }}
                  placeholder="Select photo date and time"
                />
                {editingMemory.conversationContext && parseChronologicalDate(editingMemory.conversationContext, userAge, partnerBirthday) && !editingMemory.photoDate && (
                  <p className="text-xs text-muted-foreground">
                    💡 Date estimated from chat: "{editingMemory.conversationContext.slice(0, 100)}..."
                  </p>
                )}
                {!editingMemory.conversationContext && editingMemory.promptQuestion && parseChronologicalDate(editingMemory.promptQuestion, userAge, partnerBirthday) && !editingMemory.photoDate && (
                  <p className="text-xs text-muted-foreground">
                    💡 Date estimated from prompt: "{editingMemory.promptQuestion}"
                  </p>
                )}
                
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Photo Location
                  {editingMemory.photoLocation && (
                    <Badge variant="secondary" className="text-xs ml-auto">
                      Extracted from GPS
                    </Badge>
                  )}
                </Label>
                <div className="space-y-2">
                  <Input
                    value={editPhotoLocation}
                    onChange={(e) => setEditPhotoLocation(e.target.value)}
                    placeholder="Add location (e.g., New York, NY)"
                  />
                  {editPhotoLocation && isGPSCoordinates(editPhotoLocation) && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        GPS: {editPhotoLocation}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => window.open(getMapURL(editPhotoLocation), '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View on Map
                      </Button>
                    </div>
                  )}
                  {editingMemory.photoGPSCoordinates && !isGPSCoordinates(editPhotoLocation) && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        GPS: {editingMemory.photoGPSCoordinates.latitude.toFixed(6)}, {editingMemory.photoGPSCoordinates.longitude.toFixed(6)}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => window.open(`https://www.google.com/maps?q=${editingMemory.photoGPSCoordinates!.latitude},${editingMemory.photoGPSCoordinates!.longitude}`, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View on Map
                      </Button>
                    </div>
                  )}
                </div>
                
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  People in Photo
                  {editingMemory.detectedFaces && editingMemory.detectedFaces > 0 && (
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {editingMemory.detectedFaces} {editingMemory.detectedFaces === 1 ? 'face' : 'faces'} detected
                    </Badge>
                  )}
                </Label>
                <Input
                  value={editDetectedPeople}
                  onChange={(e) => setEditDetectedPeople(e.target.value)}
                  placeholder="Add names separated by commas (e.g., Mom, Dad, Grandma)"
                />
                {editDetectedPeople && (
                  <div className="flex flex-wrap gap-2">
                    {editDetectedPeople.split(',').map(person => person.trim()).filter(p => p).map((person, idx) => (
                      <Badge key={idx} variant="outline">
                        {person}
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}
            
            {/* Video Metadata Fields */}
            {editingMemory?.type === 'video' && (
              <>
                <div className="border-b pb-3 mb-2">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Video Information
                  </h4>
                </div>
                
                {/* Video Preview with Download */}
                {editingMemory.videoUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Video Preview</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = editingMemory.videoUrl!;
                          link.download = `video-${editingMemory.id}.mp4`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          toast('Video downloaded');
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                    <div 
                      className="relative rounded-lg overflow-hidden border border-border bg-gray-100 cursor-pointer group"
                      onClick={() => {
                        setFullScreenMediaUrl(editingMemory.videoUrl!);
                        setFullScreenMediaType('video');
                        setShowFullScreenMedia(true);
                      }}
                    >
                      <video
                        src={editingMemory.videoUrl}
                        className="w-full h-auto max-h-64 object-contain"
                        controls={false}
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="bg-white/90 rounded-full p-3">
                          <Play className="w-6 h-6 text-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Click to view full screen
                    </p>
                  </div>
                )}
                
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Video Date & Time
                  {editingMemory.videoDate ? (
                    <Badge variant="secondary" className="text-xs ml-auto">
                      Extracted from EXIF
                    </Badge>
                  ) : editingMemory.conversationContext && parseChronologicalDate(editingMemory.conversationContext, userAge, partnerBirthday) ? (
                    <Badge variant="outline" className="text-xs ml-auto border-amber-300 bg-amber-50 text-amber-700">
                      Estimated from Chat
                    </Badge>
                  ) : editingMemory.promptQuestion && parseChronologicalDate(editingMemory.promptQuestion, userAge, partnerBirthday) ? (
                    <Badge variant="outline" className="text-xs ml-auto border-amber-300 bg-amber-50 text-amber-700">
                      Estimated from Prompt
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs ml-auto">
                      Upload Date
                    </Badge>
                  )}
                </Label>
                <Input
                  type="datetime-local"
                  value={editVideoDate}
                  onChange={(e) => {
                    setEditVideoDate(e.target.value);
                    // Clear existing timeout
                    if (videoDateTimeoutRef.current) {
                      clearTimeout(videoDateTimeoutRef.current);
                    }
                    // Auto-close after user stops changing values for 1.5 seconds (indicating completion)
                    if (e.target.value && e.target.value.length === 16) {
                      videoDateTimeoutRef.current = setTimeout(() => {
                        e.target.blur();
                      }, 1500);
                    }
                  }}
                  placeholder="Select video date and time"
                />
                {editingMemory.conversationContext && parseChronologicalDate(editingMemory.conversationContext, userAge, partnerBirthday) && !editingMemory.videoDate && (
                  <p className="text-xs text-muted-foreground">
                    💡 Date estimated from chat: "{editingMemory.conversationContext.slice(0, 100)}..."
                  </p>
                )}
                {!editingMemory.conversationContext && editingMemory.promptQuestion && parseChronologicalDate(editingMemory.promptQuestion, userAge, partnerBirthday) && !editingMemory.videoDate && (
                  <p className="text-xs text-muted-foreground">
                    💡 Date estimated from prompt: "{editingMemory.promptQuestion}"
                  </p>
                )}
                
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Video Location
                  {editingMemory.videoLocation && (
                    <Badge variant="secondary" className="text-xs ml-auto">
                      Extracted from GPS
                    </Badge>
                  )}
                </Label>
                <div className="space-y-2">
                  <Input
                    value={editVideoLocation}
                    onChange={(e) => setEditVideoLocation(e.target.value)}
                    placeholder="Add location (e.g., New York, NY)"
                  />
                  {editVideoLocation && isGPSCoordinates(editVideoLocation) && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        GPS: {editVideoLocation}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => window.open(getMapURL(editVideoLocation), '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View on Map
                      </Button>
                    </div>
                  )}
                  {editingMemory.videoGPSCoordinates && !isGPSCoordinates(editVideoLocation) && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        GPS: {editingMemory.videoGPSCoordinates.latitude.toFixed(6)}, {editingMemory.videoGPSCoordinates.longitude.toFixed(6)}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => window.open(`https://www.google.com/maps?q=${editingMemory.videoGPSCoordinates!.latitude},${editingMemory.videoGPSCoordinates!.longitude}`, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View on Map
                      </Button>
                    </div>
                  )}
                </div>
                
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  People in Video
                  {editingMemory.detectedFaces && editingMemory.detectedFaces > 0 && (
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {editingMemory.detectedFaces} {editingMemory.detectedFaces === 1 ? 'face' : 'faces'} detected
                    </Badge>
                  )}
                </Label>
                <Input
                  value={editVideoPeople}
                  onChange={(e) => setEditVideoPeople(e.target.value)}
                  placeholder="Add names separated by commas (e.g., Mom, Dad, Grandma)"
                />
                {editVideoPeople && (
                  <div className="flex flex-wrap gap-2">
                    {editVideoPeople.split(',').map(person => person.trim()).filter(p => p).map((person, idx) => (
                      <Badge key={idx} variant="outline">
                        {person}
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}
            
            {/* Voice Visual Reference Field */}
            {editingMemory?.type === 'voice' && (
              <>
                <div className="border-b pb-3 mb-2">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Voice Memo Information
                  </h4>
                </div>
                
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Visual Reference Photo
                  <Badge variant="secondary" className="text-xs ml-auto">
                    Optional
                  </Badge>
                </Label>
                
                <input
                  ref={voiceVisualInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const photoUrl = URL.createObjectURL(file);
                      setEditVoiceVisualReference(photoUrl);
                      toast('Photo added as visual reference');
                    }
                  }}
                  className="hidden"
                />
                
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => voiceVisualInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {editVoiceVisualReference ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  
                  {editVoiceVisualReference && (
                    <div className="relative rounded-lg overflow-hidden border border-border bg-gray-100">
                      <img 
                        src={editVoiceVisualReference} 
                        alt="Voice visual reference"
                        className="w-full h-auto max-h-48 object-contain"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setEditVoiceVisualReference('');
                          if (voiceVisualInputRef.current) {
                            voiceVisualInputRef.current.value = '';
                          }
                          toast('Photo removed');
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Add a photo as a visual reference for this voice memo (e.g., a place, person, or object mentioned in the recording)
                  </p>
                </div>
                
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  Original Language
                  <Badge variant="secondary" className="text-xs ml-auto">
                    Optional
                  </Badge>
                </Label>
                <Input
                  value={editVoiceLanguage}
                  onChange={(e) => setEditVoiceLanguage(e.target.value)}
                  placeholder="e.g., Spanish, French, Mandarin"
                />
                
                <Label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Transcription (Original Language)
                  <Badge variant="secondary" className="text-xs ml-auto">
                    Optional
                  </Badge>
                </Label>
                <Textarea
                  value={editVoiceTranscript}
                  onChange={(e) => setEditVoiceTranscript(e.target.value)}
                  placeholder="Enter the transcription in the original language..."
                  className="resize-none min-h-[100px]"
                />
                {editVoiceLanguage && editVoiceTranscript && (
                  <p className="text-xs text-muted-foreground">
                    Transcription in {editVoiceLanguage}
                  </p>
                )}
                
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  English Translation
                  <Badge variant="secondary" className="text-xs ml-auto">
                    Optional
                  </Badge>
                </Label>
                <Textarea
                  value={editEnglishTranslation}
                  onChange={(e) => setEditEnglishTranslation(e.target.value)}
                  placeholder="Enter the English translation..."
                  className="resize-none min-h-[100px]"
                />
                {editVoiceTranscript && editEnglishTranslation && (
                  <p className="text-xs text-muted-foreground">
                    Translation from {editVoiceLanguage || 'original language'} to English
                  </p>
                )}
              </>
            )}
            
            {/* Document Metadata Fields */}
            {editingMemory?.type === 'document' && (
              <>
                <div className="border-b pb-3 mb-2">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Document Information
                  </h4>
                </div>
                
                {/* Document Preview */}
                {editingMemory.documentUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Document Preview</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = editingMemory.documentUrl!;
                          link.download = editingMemory.documentFileName || 'document';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          toast('Document downloaded');
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                    
                    {/* Clickable preview to open full screen */}
                    <div 
                      className="relative rounded-lg overflow-hidden border border-border bg-gray-100 cursor-pointer group"
                      onClick={() => {
                        setFullScreenDocument({
                          url: editingMemory.documentUrl!,
                          type: editingMemory.documentType || 'unknown',
                          fileName: editingMemory.documentFileName || 'Document',
                          scannedText: editingMemory.documentScannedText
                        });
                        setFullScreenMediaType('document');
                        setShowFullScreenMedia(true);
                      }}
                    >
                      {/* Image preview for image documents */}
                      {(editingMemory.documentType === 'jpg' || editingMemory.documentType === 'jpeg' || editingMemory.documentType === 'png') && (
                        <>
                          <img 
                            src={editingMemory.documentUrl} 
                            alt="Document preview"
                            className="w-full h-auto max-h-64 object-contain"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2">
                              <ExternalLink className="w-5 h-5 text-black" />
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* PDF preview */}
                      {editingMemory.documentType === 'pdf' && (
                        <div className="bg-gray-50">
                          <iframe 
                            src={editingMemory.documentUrl}
                            className="w-full h-64 pointer-events-none"
                            title="Document preview"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2">
                              <ExternalLink className="w-5 h-5 text-black" />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Generic document icon for other types */}
                      {!['pdf', 'jpg', 'jpeg', 'png'].includes(editingMemory.documentType || '') && (
                        <div className="aspect-square bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 flex flex-col items-center justify-center p-8">
                          <div className="text-6xl mb-4">
                            {['doc', 'docx'].includes(editingMemory.documentType || '') && '📝'}
                            {['xls', 'xlsx'].includes(editingMemory.documentType || '') && '📊'}
                            {['ppt', 'pptx'].includes(editingMemory.documentType || '') && '📽️'}
                            {!['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(editingMemory.documentType || '') && '📎'}
                          </div>
                          {editingMemory.documentFileName && (
                            <p className="text-sm text-center text-amber-800 font-medium mb-2">
                              {editingMemory.documentFileName}
                            </p>
                          )}
                          {editingMemory.documentType && (
                            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                              {editingMemory.documentType.toUpperCase()}
                            </Badge>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2">
                              <ExternalLink className="w-5 h-5 text-black" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Click to view in full screen
                    </p>
                  </div>
                )}
                
                {/* Document File Info with Details */}
                {editingMemory.documentUrl && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Document Details</Label>
                    <div className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex-shrink-0 text-2xl">
                            {editingMemory.documentType === 'pdf' && '📄'}
                            {['doc', 'docx'].includes(editingMemory.documentType || '') && '📝'}
                            {['xls', 'xlsx'].includes(editingMemory.documentType || '') && '📊'}
                            {['ppt', 'pptx'].includes(editingMemory.documentType || '') && '📽️'}
                            {['jpg', 'jpeg', 'png'].includes(editingMemory.documentType || '') && '🖼️'}
                            {!['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png'].includes(editingMemory.documentType || '') && '📎'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {editingMemory.documentFileName || 'Document'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {editingMemory.documentType && (
                                <Badge variant="secondary" className="text-xs">
                                  {editingMemory.documentType.toUpperCase()}
                                </Badge>
                              )}
                              {editingMemory.documentPageCount && editingMemory.documentPageCount > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {editingMemory.documentPageCount} {editingMemory.documentPageCount === 1 ? 'page' : 'pages'}
                                </Badge>
                              )}
                              {editingMemory.documentScanLanguage && (
                                <Badge variant="outline" className="text-xs">
                                  <Languages className="w-3 h-3 mr-1" />
                                  {editingMemory.documentScanLanguage}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Scanned Text / OCR Transcription */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <ScanText className="w-4 h-4" />
                    Scanned Text / OCR Transcription
                    <Badge variant="secondary" className="text-xs ml-auto">
                      Optional
                    </Badge>
                  </Label>
                  
                  {/* Extract/Scan Text Button - Works for ALL document types */}
                  {editingMemory.documentUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={async () => {
                        try {
                          const fileName = (editingMemory.documentFileName || '').toLowerCase();
                          const documentType = editingMemory.documentType || '';
                          
                          console.log('📄 Starting document text extraction from edit dialog:', {
                            memoryId: editingMemory.id,
                            documentUrl: editingMemory.documentUrl?.substring(0, 100) + '...',
                            documentType: documentType,
                            fileName: fileName
                          });
                          
                          toast.loading('Extracting text from document...', { id: 'extract-doc-text' });
                          
                          // Check document type and use appropriate method
                          const imageFormats = ['.png', '.jpg', '.jpeg', '.gif', '.webp', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
                          const isImageFormat = imageFormats.some(format => 
                            fileName.endsWith(format) || documentType === format.replace('.', '')
                          );
                          
                          if (isImageFormat || documentType === 'pdf') {
                            // Use AI vision for images and PDFs
                            console.log('🤖 Using AI Vision API for text extraction...');
                            const { extractDocumentText } = await import('../utils/aiService');
                            const result = await extractDocumentText(editingMemory.documentUrl!);
                            
                            console.log('✅ Document text extracted:', {
                              textLength: result.text.length,
                              wordCount: result.text.split(' ').length,
                              language: result.language
                            });
                            
                            setEditDocumentScannedText(result.text);
                            toast.success('Text extracted successfully!', { id: 'extract-doc-text' });
                          } else {
                            // For Office documents (Word, Excel, PowerPoint), use native extraction
                            console.log('📝 Using native extraction for Office document...');
                            
                            // Fetch the document as a blob
                            const response = await fetch(editingMemory.documentUrl!);
                            const blob = await response.blob();
                            const file = new File([blob], fileName, { type: blob.type });
                            
                            // Use the document scanner
                            const { scanDocument } = await import('../utils/documentScanner');
                            const result = await scanDocument(file, true);
                            
                            console.log('✅ Document text extracted:', {
                              textLength: result.text.length,
                              wordCount: result.wordCount,
                              language: result.language
                            });
                            
                            setEditDocumentScannedText(result.text);
                            toast.success(`Text extracted! Found ${result.wordCount} words`, { id: 'extract-doc-text' });
                          }
                        } catch (error) {
                          const errorMessage = error instanceof Error ? error.message : 'Failed to extract text';
                          
                          if (errorMessage === 'AI_NOT_CONFIGURED') {
                            toast.error('AI features not configured. Please set up OpenAI API key.', { id: 'extract-doc-text' });
                          } else if (errorMessage === 'OPENAI_API_KEY_INVALID') {
                            toast.error('Invalid OpenAI API key. Please update your OPENAI_API_KEY in Supabase settings.', { id: 'extract-doc-text' });
                          } else if (errorMessage.includes('not supported for AI text extraction')) {
                            toast.info('This file type is not supported for text extraction', { id: 'extract-doc-text' });
                          } else {
                            console.error('Document extraction error:', errorMessage);
                            toast.error('Failed to extract text from document', { id: 'extract-doc-text' });
                          }
                        }
                      }}
                    >
                      <ScanText className="w-4 h-4 mr-2" />
                      {editDocumentScannedText ? 'Re-scan Document' : 'Scan / Extract Text'}
                    </Button>
                  )}
                  
                  <Textarea
                    value={editDocumentScannedText}
                    onChange={(e) => setEditDocumentScannedText(e.target.value)}
                    placeholder="View or edit the scanned text from this document..."
                    className="resize-none min-h-[150px] font-mono text-xs"
                  />
                  {editDocumentScannedText && (
                    <p className="text-xs text-muted-foreground">
                      {editDocumentScannedText.split(/\s+/).filter(w => w.length > 0).length} words
                    </p>
                  )}
                </div>
              </>
            )}
            
            {/* Common Fields: Notes, Location, Tags, Date - NOW AT THE BOTTOM */}
            <div className="border-t pt-3 mt-2">
              <h4 className="text-sm font-medium mb-3">Memory Details</h4>
            </div>
            
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="resize-none"
              placeholder="Add notes about this memory..."
            />
            
            <Label className="text-sm font-medium">Location</Label>
            <Input
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              placeholder="Add a location..."
            />
            
            <Label className="text-sm font-medium">Tags</Label>
            <Input
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="Add tags separated by commas..."
            />
            
            <Label className="text-sm font-medium">Date and Time</Label>
            <Input
              type="datetime-local"
              value={editDateTime}
              onChange={(e) => {
                setEditDateTime(e.target.value);
                // Clear existing timeout
                if (editDateTimeoutRef.current) {
                  clearTimeout(editDateTimeoutRef.current);
                }
                // Auto-close after user stops changing values for 1.5 seconds (indicating completion)
                if (e.target.value && e.target.value.length === 16) {
                  editDateTimeoutRef.current = setTimeout(() => {
                    e.target.blur();
                  }, 1500);
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteClick}
            >
              Delete
            </Button>
            <Button
              onClick={handleSaveEdit}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Memory Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this memory?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This memory will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full Screen Media View Dialog */}
      <Dialog open={showFullScreenMedia} onOpenChange={setShowFullScreenMedia}>
        <DialogContent className={`${fullScreenMediaType === 'text' || fullScreenMediaType === 'document' ? 'max-w-2xl' : 'max-w-[95vw] max-h-[95vh]'} p-0 overflow-hidden`}>
          <DialogHeader className="sr-only">
            <DialogTitle>
              {fullScreenMediaType === 'photo' ? 'Full Screen Photo View' : fullScreenMediaType === 'video' ? 'Full Screen Video View' : fullScreenMediaType === 'document' ? 'Full Document View' : 'Full Message View'}
            </DialogTitle>
            <DialogDescription>
              {fullScreenMediaType === 'text' ? 'View the full message content' : fullScreenMediaType === 'document' ? 'View the document details' : `View and download the ${fullScreenMediaType} in full screen`}
            </DialogDescription>
          </DialogHeader>
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-4 right-4 z-10 ${fullScreenMediaType === 'text' || fullScreenMediaType === 'document' ? 'bg-gray-100 hover:bg-gray-200 text-black' : 'bg-black/50 hover:bg-black/70 text-white'} rounded-full`}
            onClick={() => setShowFullScreenMedia(false)}
          >
            <X className="w-5 h-5" />
            <span className="sr-only">Close full screen view</span>
          </Button>
          <div className={`relative w-full ${fullScreenMediaType === 'text' || fullScreenMediaType === 'document' ? 'max-h-[80vh] bg-white' : 'h-[95vh] bg-black'} flex items-center justify-center`}>
            {fullScreenMediaType === 'photo' ? (
              <img 
                src={fullScreenMediaUrl} 
                alt="Full screen view"
                className="max-w-full max-h-full object-contain"
              />
            ) : fullScreenMediaType === 'video' ? (
              <video
                src={fullScreenMediaUrl}
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
                onError={(e) => {
                  const target = e.target as HTMLVideoElement;
                  const errorCode = target.error?.code;
                  
                  // Show specific error message based on error code
                  if (errorCode === 4) {
                    toast.error('This video format is not supported');
                  } else {
                    toast.error('Failed to load video');
                  }
                }}
              />
            ) : fullScreenMediaType === 'text' ? (
              <ScrollArea className="w-full h-full">
                <div className="p-8">
                  <p className="text-base leading-relaxed whitespace-pre-wrap break-words" style={{ overflowWrap: 'break-word', wordWrap: 'break-word', wordBreak: 'break-word' }}>
                    {fullScreenTextContent}
                  </p>
                </div>
              </ScrollArea>
            ) : fullScreenMediaType === 'document' && fullScreenDocument ? (
              <ScrollArea className="w-full h-full">
                <div className="p-8 space-y-6">
                  {/* Document Header */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-amber-600" />
                      <div className="flex-1">
                        <h3 className="font-semibold">{fullScreenDocument.fileName}</h3>
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-300 mt-1">
                          {fullScreenDocument.type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Document Preview */}
                  {(fullScreenDocument.type === 'jpg' || fullScreenDocument.type === 'jpeg' || fullScreenDocument.type === 'png') && (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <img 
                        src={fullScreenDocument.url} 
                        alt={fullScreenDocument.fileName}
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  {fullScreenDocument.type === 'pdf' && (
                    <div className="border border-border rounded-lg overflow-hidden bg-gray-50">
                      <iframe 
                        src={fullScreenDocument.url}
                        className="w-full h-[600px]"
                        title={fullScreenDocument.fileName}
                      />
                    </div>
                  )}

                  {/* Scanned Text */}
                  {fullScreenDocument.scannedText && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <ScanText className="w-5 h-5 text-primary" />
                        <h4 className="font-medium">Scanned Text (OCR)</h4>
                      </div>
                      <div className="bg-gray-50 border border-border rounded-lg p-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ overflowWrap: 'break-word', wordWrap: 'break-word', wordBreak: 'break-word' }}>
                          {fullScreenDocument.scannedText}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Download Button inside content for documents */}
                  <div className="pt-4 border-t border-border">
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = fullScreenDocument.url;
                        link.download = fullScreenDocument.fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast('Document downloaded');
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Document
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            ) : null}
          </div>
          {fullScreenMediaType !== 'text' && fullScreenMediaType !== 'document' && (
            <DialogFooter className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
              <Button
                variant="secondary"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = fullScreenMediaUrl;
                  link.download = `${fullScreenMediaType}-${Date.now()}.${fullScreenMediaType === 'photo' ? 'jpg' : 'mp4'}`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  toast(`${fullScreenMediaType === 'photo' ? 'Photo' : 'Video'} downloaded`);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
