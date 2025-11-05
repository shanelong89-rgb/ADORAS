import { useEffect, useRef } from 'react';

interface UseChatScrollDetectionProps {
  onScrollUp?: () => void;
  onScrollDown?: () => void;
  scrollContainerRef: React.RefObject<HTMLElement>;
}

/**
 * Custom hook for detecting scroll direction in the Chat tab
 * Handles both mouse/trackpad scrolling and touch gestures on mobile
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
    if (!onScrollUp || !onScrollDown) {
      return;
    }

    // Try multiple times to find the viewport (sometimes it takes a moment to render)
    let attemptCount = 0;
    const maxAttempts = 10;
    let cleanupFn: (() => void) | null = null;

    const tryAttachListeners = () => {
      attemptCount++;

      // Try multiple methods to find the scroll viewport
      let scrollViewport: Element | null = null;

      // Method 1: Look for Radix ScrollArea viewport
      const radixViewports = document.querySelectorAll('[data-radix-scroll-area-viewport]');
      
      radixViewports.forEach((vp) => {
        if (scrollContainerRef.current?.contains(vp)) {
          scrollViewport = vp;
        }
      });

      // Method 2: Try to find by looking inside the scrollContainerRef
      if (!scrollViewport && scrollContainerRef.current) {
        scrollViewport = scrollContainerRef.current.querySelector('[data-radix-scroll-area-viewport]');
      }

      // Method 3: Look for any scrollable div inside the container
      if (!scrollViewport && scrollContainerRef.current) {
        const scrollableDivs = scrollContainerRef.current.querySelectorAll('div');
        scrollableDivs.forEach((div) => {
          const hasScroll = div.scrollHeight > div.clientHeight;
          if (hasScroll && !scrollViewport) {
            scrollViewport = div;
          }
        });
      }

      if (!scrollViewport) {
        // Try again if we haven't exceeded max attempts
        if (attemptCount < maxAttempts) {
          setTimeout(tryAttachListeners, 200);
        }
        return;
      }

      scrollViewportRef.current = scrollViewport;
      lastScrollY.current = scrollViewport.scrollTop;

      // SCROLL EVENT: Works on desktop and mobile (fires after touch)
      const handleScroll = () => {
        if (!scrollViewportRef.current) return;
        
        const currentScrollY = scrollViewportRef.current.scrollTop;
        const delta = currentScrollY - lastScrollY.current;

        // ULTRA-SENSITIVE: Threshold of 1px for immediate response
        if (delta < -1) {
          onScrollUp();
        } else if (delta > 1) {
          onScrollDown();
        }

        lastScrollY.current = currentScrollY;
      };

      // TOUCH START: Track initial touch position
      const handleTouchStart = (e: TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
        isProcessingTouch.current = false;
      };

      // TOUCH MOVE: Detect swipe direction with minimal throttling for ultra-responsiveness
      const handleTouchMove = (e: TouchEvent) => {
        // Prevent rapid-fire calls
        if (isProcessingTouch.current) return;
        
        const currentTouchY = e.touches[0].clientY;
        const touchDelta = currentTouchY - touchStartY.current;

        // ULTRA-SENSITIVE: Threshold of 5px for immediate response on ANY touch movement
        if (Math.abs(touchDelta) > 5) {
          isProcessingTouch.current = true;
          
          if (touchDelta > 0) {
            // Swipe down - show header (scrolling up in content)
            onScrollUp();
          } else {
            // Swipe up - hide header (scrolling down in content)
            onScrollDown();
          }
          
          // Reset touch start for next gesture
          touchStartY.current = currentTouchY;
          
          // Allow next touch gesture after 50ms for ultra-responsiveness
          setTimeout(() => {
            isProcessingTouch.current = false;
          }, 50);
        }
      };

      // Attach listeners with passive mode for better performance
      scrollViewport.addEventListener('scroll', handleScroll, { passive: true });
      scrollViewport.addEventListener('touchstart', handleTouchStart, { passive: true });
      scrollViewport.addEventListener('touchmove', handleTouchMove, { passive: true });

      // Store cleanup function
      cleanupFn = () => {
        if (scrollViewportRef.current) {
          scrollViewportRef.current.removeEventListener('scroll', handleScroll);
          scrollViewportRef.current.removeEventListener('touchstart', handleTouchStart);
          scrollViewportRef.current.removeEventListener('touchmove', handleTouchMove);
        }
      };
    };

    // Start trying to attach listeners
    tryAttachListeners();

    // Cleanup on unmount
    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [onScrollUp, onScrollDown, scrollContainerRef]);
}
