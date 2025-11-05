/**
 * Clipboard Utility with Fallbacks
 * Handles copying to clipboard with multiple fallback methods
 */

/**
 * Copy text to clipboard with fallback methods
 * Tries multiple methods to ensure compatibility across browsers and contexts
 * Silently falls back without warnings since this is expected behavior
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: Modern Clipboard API (preferred)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Silently fall back - this is expected in restricted contexts
      // Don't log warnings as the fallback is working as designed
    }
  }

  // Method 2: execCommand fallback (works in more contexts)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make it invisible and non-interactive
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    
    document.body.appendChild(textArea);
    
    // Select and copy
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (success) {
      return true;
    }
  } catch (error) {
    // Only log if this method also fails
    console.warn('execCommand fallback failed:', error);
  }

  // Method 3: Create a temporary input with user interaction
  try {
    const input = document.createElement('input');
    input.value = text;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.top = '-9999px';
    
    document.body.appendChild(input);
    input.focus();
    input.select();
    
    const success = document.execCommand('copy');
    document.body.removeChild(input);
    
    if (success) {
      return true;
    }
  } catch (error) {
    console.warn('Input fallback failed:', error);
  }

  // All methods failed
  return false;
}

/**
 * Copy text to clipboard with user-friendly error handling
 */
export async function copyToClipboardWithToast(
  text: string,
  successMessage: string = 'Copied to clipboard!',
  errorMessage: string = 'Could not copy to clipboard'
): Promise<boolean> {
  const success = await copyToClipboard(text);
  
  if (!success) {
    console.error('All clipboard methods failed for text:', text.substring(0, 50) + '...');
  }
  
  return success;
}

/**
 * Check if clipboard is available
 */
export function isClipboardAvailable(): boolean {
  return !!(
    navigator.clipboard ||
    document.queryCommandSupported?.('copy')
  );
}

/**
 * Prompt user to manually copy text
 * Use this as a last resort when all automatic methods fail
 */
export function promptManualCopy(text: string, message: string = 'Please copy the following:'): void {
  // Create a modal-like prompt
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;
  
  dialog.innerHTML = `
    <h3 style="margin: 0 0 16px 0; color: rgb(54, 69, 59);">${message}</h3>
    <textarea 
      readonly
      style="
        width: 100%;
        min-height: 100px;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: monospace;
        font-size: 14px;
        resize: vertical;
        margin-bottom: 16px;
      "
    >${text}</textarea>
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button 
        id="manual-copy-btn"
        style="
          background: rgb(54, 69, 59);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        "
      >
        Try Copy Again
      </button>
      <button 
        id="close-copy-dialog"
        style="
          background: #6c757d;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        "
      >
        Close
      </button>
    </div>
  `;
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Auto-select the text
  const textarea = dialog.querySelector('textarea') as HTMLTextAreaElement;
  textarea.focus();
  textarea.select();
  
  // Try copy button
  const copyBtn = dialog.querySelector('#manual-copy-btn') as HTMLButtonElement;
  copyBtn.addEventListener('click', async () => {
    textarea.select();
    const success = await copyToClipboard(text);
    if (success) {
      copyBtn.textContent = '✓ Copied!';
      copyBtn.style.background = '#28a745';
      setTimeout(() => {
        document.body.removeChild(overlay);
      }, 1000);
    } else {
      copyBtn.textContent = 'Copy Failed - Select & Copy Manually';
      copyBtn.style.background = '#dc3545';
    }
  });
  
  // Close button
  const closeBtn = dialog.querySelector('#close-copy-dialog') as HTMLButtonElement;
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  
  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}