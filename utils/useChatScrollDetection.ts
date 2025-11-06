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
      console.log('⚠️ useChatScrollDetection: Missing callbacks, skipping setup');
      return;
    }

    // Try multiple times to find the viewport (sometimes it takes a moment to render)
    let attemptCount = 0;
    const maxAttempts = 10;
    let cleanupFn: (() => void) | null = null;

    const tryAttachListeners = () => {
      attemptCount++;
      console.log(`🔍 ChatTab scroll detection attempt ${attemptCount}/${maxAttempts}`);

      // Try multiple methods to find the scroll viewport
      let scrollViewport: Element | null = null;

      // Method 1: Look for ALL viewport attributes
      const allViewports = [
        ...Array.from(document.querySelectorAll('[data-slot="scroll-area-viewport"]')),
        ...Array.from(document.querySelectorAll('[data-radix-scroll-area-viewport]')),
        ...Array.from(document.querySelectorAll('[data-radix-scroll-viewport]'))
      ];
      
      console.log(`   Found ${allViewports.length} total scroll viewports in document`);
      
      allViewports.forEach((vp, idx) => {
        // Check if this viewport is inside ChatTab by looking for chat-specific content
        const hasSpaceY = !!vp.querySelector('[class*="space-y-4"]');
        const hasConvoText = vp.textContent?.includes('Start the conversation');
        const hasMemoryPrompt = vp.textContent?.includes('Memory Prompt');
        const isChatContent = hasSpaceY || hasConvoText || hasMemoryPrompt;
        
        console.log(`   Viewport ${idx + 1}: hasSpaceY=${hasSpaceY}, hasConvoText=${hasConvoText}, hasMemoryPrompt=${hasMemoryPrompt}`);
        
        if (isChatContent && !scrollViewport) {
          scrollViewport = vp;
          console.log(`✅ Found ChatTab viewport via content matching (viewport ${idx + 1})`);
        }
      });

      // Method 2: Look for viewport inside the scrollContainerRef
      if (!scrollViewport && scrollContainerRef.current) {
        console.log('   Trying to find viewport inside scrollContainerRef...');
        const refChildren = scrollContainerRef.current.querySelectorAll('*');
        console.log(`   ScrollContainerRef has ${refChildren.length} child elements`);
        
        scrollViewport = scrollContainerRef.current.querySelector('[data-slot="scroll-area-viewport"]') ||
                        scrollContainerRef.current.querySelector('[data-radix-scroll-area-viewport]') ||
                        scrollContainerRef.current.querySelector('[data-radix-scroll-viewport]');
        if (scrollViewport) {
          console.log('✅ Found ChatTab viewport inside container ref');
        }
      }

      // Method 3: Look for any scrollable div inside the container
      if (!scrollViewport && scrollContainerRef.current) {
        console.log('   Trying fallback: looking for scrollable divs...');
        const scrollableDivs = scrollContainerRef.current.querySelectorAll('div');
        console.log(`   Found ${scrollableDivs.length} divs inside container`);
        
        let foundScrollable = false;
        scrollableDivs.forEach((div, idx) => {
          const hasScroll = div.scrollHeight > div.clientHeight;
          if (hasScroll && !foundScrollable) {
            console.log(`   Div ${idx + 1}: scrollHeight=${div.scrollHeight}, clientHeight=${div.clientHeight} → SCROLLABLE`);
            scrollViewport = div;
            foundScrollable = true;
            console.log('✅ Found ChatTab viewport via scrollable div fallback');
          }
        });
      }

      if (!scrollViewport) {
        // Try again if we haven't exceeded max attempts
        if (attemptCount < maxAttempts) {
          console.log(`⏳ ChatTab viewport not found, retrying in 200ms...`);
          setTimeout(tryAttachListeners, 200);
        } else {
          console.error('❌ Failed to find ChatTab viewport after max attempts');
          console.error('   scrollContainerRef.current:', scrollContainerRef.current);
          console.error('   All viewports in document:', allViewports);
        }
        return;
      }

      scrollViewportRef.current = scrollViewport;
      lastScrollY.current = scrollViewport.scrollTop;
      console.log('🎯 ChatTab scroll detection initialized, scrollTop:', scrollViewport.scrollTop);

      // SCROLL EVENT: Works on desktop and mobile (fires after touch)
      const handleScroll = () => {
        if (!scrollViewportRef.current) return;
        
        const currentScrollY = scrollViewportRef.current.scrollTop;
        const delta = currentScrollY - lastScrollY.current;

        // Log EVERY scroll event for debugging
        if (delta !== 0) {
          console.log(`📜 ChatTab scroll event: scrollTop=${currentScrollY}, delta=${delta}`);
        }

        // ULTRA-SENSITIVE: ANY movement triggers header show/hide
        if (delta < 0) {
          // Scrolling up - show header
          console.log('⬆️ Scroll UP detected, delta:', delta, '→ CALLING onScrollUp()');
          onScrollUp();
        } else if (delta > 0) {
          // Scrolling down - hide header
          console.log('⬇️ Scroll DOWN detected, delta:', delta, '→ CALLING onScrollDown()');
          onScrollDown();
        }

        lastScrollY.current = currentScrollY;
      };

      // TOUCH START: Track initial touch position
      const handleTouchStart = (e: TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
        isProcessingTouch.current = false;
        console.log('👆 Touch START at Y:', touchStartY.current);
      };

      // TOUCH MOVE: Detect swipe direction with minimal throttling for ultra-responsiveness
      const handleTouchMove = (e: TouchEvent) => {
        // Prevent rapid-fire calls
        if (isProcessingTouch.current) return;
        
        const currentTouchY = e.touches[0].clientY;
        const touchDelta = currentTouchY - touchStartY.current;

        // ULTRA-SENSITIVE: ANY touch movement triggers header show/hide
        if (Math.abs(touchDelta) > 3) {
          isProcessingTouch.current = true;
          
          if (touchDelta > 0) {
            // Swipe down - show header (scrolling up in content)
            console.log('👆 Touch SWIPE DOWN (scroll up), delta:', touchDelta);
            onScrollUp();
          } else {
            // Swipe up - hide header (scrolling down in content)
            console.log('👇 Touch SWIPE UP (scroll down), delta:', touchDelta);
            onScrollDown();
          }
          
          // Reset touch start for next gesture
          touchStartY.current = currentTouchY;
          
          // Allow next touch gesture after 30ms for ultra-responsiveness
          setTimeout(() => {
            isProcessingTouch.current = false;
          }, 30);
        }
      };

      // Attach listeners with passive mode for better performance
      scrollViewport.addEventListener('scroll', handleScroll, { passive: true });
      scrollViewport.addEventListener('touchstart', handleTouchStart, { passive: true });
      scrollViewport.addEventListener('touchmove', handleTouchMove, { passive: true });

      console.log('✅ ChatTab scroll listeners attached');

      // Store cleanup function
      cleanupFn = () => {
        if (scrollViewportRef.current) {
          scrollViewportRef.current.removeEventListener('scroll', handleScroll);
          scrollViewportRef.current.removeEventListener('touchstart', handleTouchStart);
          scrollViewportRef.current.removeEventListener('touchmove', handleTouchMove);
          console.log('🧹 ChatTab scroll listeners cleaned up');
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
