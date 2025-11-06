import { useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { ChevronUp } from 'lucide-react';
import { useChatScrollDetection } from '../utils/useChatScrollDetection';

interface ChatScrollManagerProps {
  /** Ref to the scroll container */
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  
  /** Callback when user scrolls up (show dashboard header) */
  onScrollUp?: () => void;
  
  /** Callback when user scrolls down (hide dashboard header) */
  onScrollDown?: () => void;
  
  /** Number of messages - used to trigger auto-scroll on new message */
  messageCount: number;
  
  /** Whether to show the scroll-to-top button */
  showScrollButton: boolean;
  
  /** Callback when scroll button visibility changes */
  onScrollButtonChange: (visible: boolean) => void;
}

/**
 * PRIORITY COMPONENT: Manages ALL scroll behavior for ChatTab
 * - Dashboard header show/hide on scroll
 * - Auto-scroll to bottom on new messages
 * - Scroll-to-top button
 * - Isolated from message rendering to prevent conflicts
 */
export function ChatScrollManager({
  scrollAreaRef,
  onScrollUp,
  onScrollDown,
  messageCount,
  showScrollButton,
  onScrollButtonChange
}: ChatScrollManagerProps) {
  const isMountedRef = useRef(false);
  const lastMessageCountRef = useRef(messageCount);

  // Mark as mounted
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ========================================================================
  // PRIORITY 1: Dashboard header show/hide detection
  // ========================================================================
  useChatScrollDetection({
    onScrollUp: onScrollUp || (() => {}),
    onScrollDown: onScrollDown || (() => {}),
    scrollContainerRef: scrollAreaRef
  });

  // ========================================================================
  // PRIORITY 2: Auto-scroll to bottom when new message arrives
  // ========================================================================
  useEffect(() => {
    // Only auto-scroll if message count INCREASED (new message added)
    if (messageCount > lastMessageCountRef.current && isMountedRef.current) {
      const timer = setTimeout(() => {
        if (!isMountedRef.current) return;

        try {
          // Find the scroll viewport
          const scrollViewports = document.querySelectorAll('[data-radix-scroll-area-viewport]');
          let chatViewport: Element | null = null;
          
          scrollViewports.forEach(viewport => {
            if (viewport.querySelector('[class*="space-y-4"]') || 
                viewport.querySelector('[class*="space-y-6"]')) {
              chatViewport = viewport;
            }
          });

          if (chatViewport) {
            console.log('📜 Auto-scrolling to bottom (new message detected)');
            chatViewport.scrollTo({
              top: chatViewport.scrollHeight,
              behavior: 'smooth'
            });
          }
        } catch (error) {
          console.error('Auto-scroll error:', error);
        }
      }, 150); // Increased delay for stability

      lastMessageCountRef.current = messageCount;
      return () => clearTimeout(timer);
    }

    lastMessageCountRef.current = messageCount;
  }, [messageCount]);

  // ========================================================================
  // PRIORITY 3: Scroll-to-top button visibility detection
  // ========================================================================
  useEffect(() => {
    if (!isMountedRef.current) return;

    const timer = setTimeout(() => {
      try {
        // Find the scroll viewport
        const scrollViewports = document.querySelectorAll('[data-radix-scroll-area-viewport]');
        let chatViewport: Element | null = null;
        
        scrollViewports.forEach(viewport => {
          if (viewport.querySelector('[class*="space-y-4"]') || 
              viewport.querySelector('[class*="space-y-6"]')) {
            chatViewport = viewport;
          }
        });

        if (!chatViewport) return;

        const handleScroll = () => {
          if (!isMountedRef.current) return;
          const shouldShow = chatViewport!.scrollTop > 300;
          onScrollButtonChange(shouldShow);
        };

        chatViewport.addEventListener('scroll', handleScroll, { passive: true });
        
        return () => {
          chatViewport?.removeEventListener('scroll', handleScroll);
        };
      } catch (error) {
        console.error('Scroll button detection error:', error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [onScrollButtonChange]);

  // ========================================================================
  // Scroll to top handler
  // ========================================================================
  const scrollToTop = useCallback(() => {
    try {
      const scrollViewports = document.querySelectorAll('[data-radix-scroll-area-viewport]');
      let chatViewport: Element | null = null;
      
      scrollViewports.forEach(viewport => {
        if (viewport.querySelector('[class*="space-y-4"]') || 
            viewport.querySelector('[class*="space-y-6"]')) {
          chatViewport = viewport;
        }
      });

      if (chatViewport) {
        chatViewport.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    } catch (error) {
      console.error('Scroll to top error:', error);
    }
  }, []);

  // Render scroll-to-top button
  if (!showScrollButton) return null;

  return (
    <div className="fixed bottom-28 right-6 z-50">
      <Button
        size="icon"
        onClick={scrollToTop}
        className="h-12 w-12 rounded-full shadow-lg"
        aria-label="Scroll to top"
      >
        <ChevronUp className="h-5 w-5" />
      </Button>
    </div>
  );
}
