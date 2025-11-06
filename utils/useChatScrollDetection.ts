import { useEffect, useRef } from 'react';

interface UseChatScrollDetectionProps {
  onScrollUp?: () => void;
  onScrollDown?: () => void;
  scrollContainerRef: React.RefObject<HTMLElement>;
}

/**
 * CRASH-PROOF: Detects scroll direction with defensive error handling
 * Shows/hides dashboard header on scroll up/down
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
  const isUnmounted = useRef(false); // Prevent operations after unmount

  useEffect(() => {
    isUnmounted.current = false;
    
    // Defensive: Don't setup if no callbacks or no ref
    if (!onScrollUp || !onScrollDown || !scrollContainerRef) {
      return;
    }
    
    // Wrap everything in try-catch to prevent crashes
    try {
      let cleanupFn: (() => void) | null = null;
      let attemptCount = 0;
      const maxAttempts = 5; // Give it more tries
      let retryTimeout: ReturnType<typeof setTimeout> | null = null;

      const tryAttachListeners = () => {
        // CRITICAL: Check if unmounted before each attempt
        if (isUnmounted.current) {
          if (retryTimeout) clearTimeout(retryTimeout);
          return;
        }

        try {
          attemptCount++;

          // Find scroll viewport - DEFENSIVE (doesn't crash on text changes)
          let scrollViewport: Element | null = null;
          
          // 1. Try to get from ref first (most reliable) - now works with native div scrolling
          if (scrollContainerRef.current && !isUnmounted.current) {
            scrollViewport = scrollContainerRef.current;
          }
          
          // 2. Retry if not found yet and not unmounted
          if (!scrollViewport && attemptCount < maxAttempts && !isUnmounted.current) {
            retryTimeout = setTimeout(tryAttachListeners, 150); // Slightly longer delay
            return;
          }

          // 3. Give up gracefully if still not found or unmounted
          if (!scrollViewport || isUnmounted.current) {
            if (attemptCount >= maxAttempts) {
              console.log('[ScrollDetection] Could not find scroll viewport - gracefully skipping setup');
            }
            return;
          }

          scrollViewportRef.current = scrollViewport;
          lastScrollY.current = scrollViewport.scrollTop || 0;

          // DESKTOP: Scroll handler - INSTANT response, no throttle for upward scroll
          let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
          const handleScroll = () => {
            if (isUnmounted.current) return; // CRITICAL: Check unmount status
            
            try {
              if (!scrollViewportRef.current) return;
              
              const currentScrollY = scrollViewportRef.current.scrollTop;
              const delta = currentScrollY - lastScrollY.current;
              
              // INSTANT header show on ANY upward scroll (no throttle, no threshold)
              if (delta < 0) { // ANY upward scroll = instant header show
                if (scrollTimeout) clearTimeout(scrollTimeout);
                if (!isUnmounted.current) {
                  onScrollUp?.();
                }
                lastScrollY.current = currentScrollY;
                return;
              }
              
              // Throttle ONLY for downward scroll
              if (scrollTimeout) return;
              
              scrollTimeout = setTimeout(() => {
                if (isUnmounted.current || !scrollViewportRef.current) return;
                
                const newScrollY = scrollViewportRef.current.scrollTop;
                const newDelta = newScrollY - lastScrollY.current;
                
                if (newDelta > 20 && !isUnmounted.current) {
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
            if (isUnmounted.current) return;
            
            try {
              touchStartY.current = e.touches[0]?.clientY || 0;
              isProcessingTouch.current = false;
            } catch (error) {
              console.error('[ScrollDetection] Touch start error:', error);
            }
          };

          const handleTouchMove = (e: TouchEvent) => {
            if (isUnmounted.current) return;
            
            try {
              if (isProcessingTouch.current || !e.touches[0]) return;
              
              const touchY = e.touches[0].clientY;
              const deltaY = touchStartY.current - touchY;
              
              // INSTANT header show on ANY swipe down (reduced threshold)
              if (deltaY < -5) { // Swipe down = scroll up (INSTANT! - reduced from -10)
                isProcessingTouch.current = true;
                if (!isUnmounted.current) {
                  onScrollUp?.();
                }
              } else if (deltaY > 40) { // Swipe up = scroll down (reduced from 50)
                isProcessingTouch.current = true;
                if (!isUnmounted.current) {
                  onScrollDown?.();
                }
              }
            } catch (error) {
              console.error('[ScrollDetection] Touch move error:', error);
            }
          };

          const handleTouchEnd = () => {
            if (isUnmounted.current) return;
            
            try {
              isProcessingTouch.current = false;
            } catch (error) {
              console.error('[ScrollDetection] Touch end error:', error);
            }
          };

          // Attach listeners ONLY if not unmounted
          if (!isUnmounted.current && scrollViewport) {
            scrollViewport.addEventListener('scroll', handleScroll, { passive: true });
            scrollViewport.addEventListener('touchstart', handleTouchStart, { passive: true });
            scrollViewport.addEventListener('touchmove', handleTouchMove, { passive: true });
            scrollViewport.addEventListener('touchend', handleTouchEnd, { passive: true });

            // Cleanup function
            cleanupFn = () => {
              if (scrollTimeout) clearTimeout(scrollTimeout);
              if (retryTimeout) clearTimeout(retryTimeout);
              if (scrollViewportRef.current) {
                try {
                  scrollViewportRef.current.removeEventListener('scroll', handleScroll);
                  scrollViewportRef.current.removeEventListener('touchstart', handleTouchStart);
                  scrollViewportRef.current.removeEventListener('touchmove', handleTouchMove);
                  scrollViewportRef.current.removeEventListener('touchend', handleTouchEnd);
                } catch (error) {
                  // Ignore cleanup errors
                }
              }
              scrollViewportRef.current = null;
            };
          }
        } catch (error) {
          console.error('[ScrollDetection] tryAttachListeners error:', error);
        }
      };

      // Start trying to attach listeners
      tryAttachListeners();

      // Cleanup on unmount
      return () => {
        isUnmounted.current = true; // Mark as unmounted FIRST
        if (retryTimeout) clearTimeout(retryTimeout);
        if (cleanupFn) {
          try {
            cleanupFn();
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      };
    } catch (error) {
      // Silently fail to prevent crashes
      console.error('[ScrollDetection] Setup failed:', error);
      return () => {
        isUnmounted.current = true;
      };
    }
  }, [onScrollUp, onScrollDown, scrollContainerRef]);
}
