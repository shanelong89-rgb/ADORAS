import { useEffect, useRef } from 'react';

interface UseChatScrollDetectionProps {
  onScrollUp?: () => void;
  onScrollDown?: () => void;
  scrollContainerRef: React.RefObject<HTMLElement>;
}

/**
 * OPTIMIZED for Vercel: Minimal logging, fast detection
 * Detects scroll direction in Chat tab for dashboard header visibility
 */
export function useChatScrollDetection({
  onScrollUp,
  onScrollDown,
  scrollContainerRef
}: UseChatScrollDetectionProps) {
  const lastScrollY = useRef(0);
  const touchStartY = useRef(0);
  const scrollViewportRef = useRef<Element | null>(null);
  const isProcessingTouch = useRef(false);

  useEffect(() => {
    if (!onScrollUp || !onScrollDown) return;

    let cleanupFn: (() => void) | null = null;
    let attemptCount = 0;
    const maxAttempts = 3; // Reduced from 10

    const tryAttachListeners = () => {
      attemptCount++;

      // Find scroll viewport quickly
      let scrollViewport: Element | null = null;
      
      const allViewports = [
        ...Array.from(document.querySelectorAll('[data-slot="scroll-area-viewport"]')),
        ...Array.from(document.querySelectorAll('[data-radix-scroll-area-viewport]'))
      ];
      
      // Find ChatTab viewport by checking for conversation content
      for (const vp of allViewports) {
        const hasSpaceY = vp.classList.contains('space-y-6');
        const hasConvoText = vp.textContent?.includes('Start a conversation');
        const hasMemoryPrompt = vp.textContent?.includes('Reply to Previous Prompt');
        
        if (hasSpaceY && (hasConvoText || hasMemoryPrompt)) {
          scrollViewport = vp;
          break;
        }
      }

      if (!scrollViewport && attemptCount < maxAttempts) {
        setTimeout(tryAttachListeners, 100);
        return;
      }

      if (!scrollViewport) return;

      scrollViewportRef.current = scrollViewport;
      lastScrollY.current = scrollViewport.scrollTop;

      // DESKTOP: Scroll handler - OPTIMIZED with throttle
      let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
      const handleScroll = () => {
        if (scrollTimeout) return; // Throttle
        
        scrollTimeout = setTimeout(() => {
          if (!scrollViewportRef.current) return;
          
          const currentScrollY = scrollViewportRef.current.scrollTop;
          const delta = currentScrollY - lastScrollY.current;
          
          // IMMEDIATE header show on ANY upward scroll
          if (delta < -5) { // Small threshold for instant response
            onScrollUp?.();
          } else if (delta > 20) {
            onScrollDown?.();
          }
          
          lastScrollY.current = currentScrollY;
          scrollTimeout = null;
        }, 50); // 50ms throttle
      };

      // MOBILE: Touch handlers - OPTIMIZED
      const handleTouchStart = (e: TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
        isProcessingTouch.current = false;
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (isProcessingTouch.current) return;
        
        const touchY = e.touches[0].clientY;
        const deltaY = touchStartY.current - touchY;
        
        // IMMEDIATE header show on swipe down
        if (deltaY < -30) { // Swipe down = scroll up
          isProcessingTouch.current = true;
          onScrollUp?.();
        } else if (deltaY > 50) { // Swipe up = scroll down
          isProcessingTouch.current = true;
          onScrollDown?.();
        }
      };

      const handleTouchEnd = () => {
        isProcessingTouch.current = false;
      };

      // Attach listeners
      scrollViewport.addEventListener('scroll', handleScroll, { passive: true });
      scrollViewport.addEventListener('touchstart', handleTouchStart, { passive: true });
      scrollViewport.addEventListener('touchmove', handleTouchMove, { passive: true });
      scrollViewport.addEventListener('touchend', handleTouchEnd, { passive: true });

      // Cleanup function
      cleanupFn = () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        if (scrollViewportRef.current) {
          scrollViewportRef.current.removeEventListener('scroll', handleScroll);
          scrollViewportRef.current.removeEventListener('touchstart', handleTouchStart);
          scrollViewportRef.current.removeEventListener('touchmove', handleTouchMove);
          scrollViewportRef.current.removeEventListener('touchend', handleTouchEnd);
        }
      };
    };

    // Start trying to attach listeners
    tryAttachListeners();

    // Cleanup on unmount
    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, [onScrollUp, onScrollDown, scrollContainerRef]);
}
