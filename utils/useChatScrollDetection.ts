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
    // Defensive: Don't setup if no callbacks or no ref
    if (!onScrollUp || !onScrollDown || !scrollContainerRef) return;
    
    // Wrap everything in try-catch to prevent crashes
    try {

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

      // DESKTOP: Scroll handler - INSTANT response, no throttle for upward scroll
      let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
      const handleScroll = () => {
        try {
          if (!scrollViewportRef.current) return;
          
          const currentScrollY = scrollViewportRef.current.scrollTop;
          const delta = currentScrollY - lastScrollY.current;
          
          // INSTANT header show on ANY upward scroll (no throttle, no threshold)
          if (delta < 0) { // ANY upward scroll = instant header show
            if (scrollTimeout) clearTimeout(scrollTimeout);
            onScrollUp?.();
            lastScrollY.current = currentScrollY;
            return;
          }
          
          // Throttle ONLY for downward scroll
          if (scrollTimeout) return;
          
          scrollTimeout = setTimeout(() => {
            if (!scrollViewportRef.current) return;
            
            const newScrollY = scrollViewportRef.current.scrollTop;
            const newDelta = newScrollY - lastScrollY.current;
            
            if (newDelta > 20) {
              onScrollDown?.();
            }
            
            lastScrollY.current = newScrollY;
            scrollTimeout = null;
          }, 50);
        } catch (error) {
          // Prevent crashes - silently fail
          console.error('[ScrollDetection] Scroll handler error:', error);
        }
      };

      // MOBILE: Touch handlers - INSTANT response for scroll up
      const handleTouchStart = (e: TouchEvent) => {
        try {
          touchStartY.current = e.touches[0].clientY;
          isProcessingTouch.current = false;
        } catch (error) {
          console.error('[ScrollDetection] Touch start error:', error);
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        try {
          if (isProcessingTouch.current) return;
          
          const touchY = e.touches[0].clientY;
          const deltaY = touchStartY.current - touchY;
          
          // INSTANT header show on ANY swipe down (reduced threshold)
          if (deltaY < -10) { // Swipe down = scroll up (INSTANT!)
            isProcessingTouch.current = true;
            onScrollUp?.();
          } else if (deltaY > 50) { // Swipe up = scroll down
            isProcessingTouch.current = true;
            onScrollDown?.();
          }
        } catch (error) {
          console.error('[ScrollDetection] Touch move error:', error);
        }
      };

      const handleTouchEnd = () => {
        try {
          isProcessingTouch.current = false;
        } catch (error) {
          console.error('[ScrollDetection] Touch end error:', error);
        }
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
    } catch (error) {
      // Silently fail to prevent crashes
      console.error('[ScrollDetection] Setup failed:', error);
      return () => {}; // No-op cleanup
    }
  }, [onScrollUp, onScrollDown, scrollContainerRef]);
}
