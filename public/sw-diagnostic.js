/**
 * Service Worker Diagnostic Script
 * Run this in the browser console to debug SW issues
 */

async function diagnoseServiceWorker() {
  console.log('🔍 SERVICE WORKER DIAGNOSTIC');
  console.log('='.repeat(50));
  
  // 1. Check if SW is supported
  console.log('\n1️⃣ Service Worker Support:');
  console.log('  - navigator.serviceWorker:', 'serviceWorker' in navigator ? '✅ YES' : '❌ NO');
  console.log('  - PushManager:', 'PushManager' in window ? '✅ YES' : '❌ NO');
  console.log('  - Notification:', 'Notification' in window ? '✅ YES' : '❌ NO');
  
  if (!('serviceWorker' in navigator)) {
    console.error('❌ Service Workers not supported - stopping diagnostic');
    return;
  }
  
  // 2. Check current registration
  console.log('\n2️⃣ Current Registration:');
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      console.log('  ✅ Registration found!');
      console.log('  - Scope:', registration.scope);
      console.log('  - Active:', registration.active ? '✅ YES' : '❌ NO');
      console.log('  - Installing:', registration.installing ? '⏳ YES' : '✅ NO');
      console.log('  - Waiting:', registration.waiting ? '⏳ YES' : '✅ NO');
      
      if (registration.active) {
        console.log('  - SW URL:', registration.active.scriptURL);
        console.log('  - SW State:', registration.active.state);
      }
    } else {
      console.warn('  ⚠️ No registration found');
    }
  } catch (error) {
    console.error('  ❌ Error checking registration:', error);
  }
  
  // 3. Check all registrations
  console.log('\n3️⃣ All Registrations:');
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('  - Count:', registrations.length);
    registrations.forEach((reg, i) => {
      console.log(`  - Registration ${i + 1}:`, reg.scope);
    });
  } catch (error) {
    console.error('  ❌ Error listing registrations:', error);
  }
  
  // 4. Check if controller exists
  console.log('\n4️⃣ Current Controller:');
  if (navigator.serviceWorker.controller) {
    console.log('  ✅ Controller active!');
    console.log('  - URL:', navigator.serviceWorker.controller.scriptURL);
    console.log('  - State:', navigator.serviceWorker.controller.state);
  } else {
    console.warn('  ⚠️ No controller (page not controlled by SW)');
  }
  
  // 5. Try to fetch sw.js directly
  console.log('\n5️⃣ Testing SW File Access:');
  try {
    const response = await fetch('/sw.js');
    console.log('  - HTTP Status:', response.status, response.statusText);
    console.log('  - Content-Type:', response.headers.get('Content-Type'));
    console.log('  - Size:', response.headers.get('Content-Length'), 'bytes');
    
    if (response.ok) {
      const text = await response.text();
      console.log('  - First 100 chars:', text.substring(0, 100));
      console.log('  ✅ SW file is accessible');
    } else {
      console.error('  ❌ SW file returned error status');
    }
  } catch (error) {
    console.error('  ❌ Failed to fetch sw.js:', error);
  }
  
  // 6. Environment info
  console.log('\n6️⃣ Environment:');
  console.log('  - User Agent:', navigator.userAgent);
  console.log('  - Platform:', navigator.platform);
  console.log('  - Online:', navigator.onLine ? '✅ YES' : '❌ NO');
  console.log('  - Cookies:', navigator.cookieEnabled ? '✅ ENABLED' : '❌ DISABLED');
  console.log('  - Location:', window.location.href);
  console.log('  - Protocol:', window.location.protocol);
  
  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone;
  console.log('  - iOS:', isIOS ? '✅ YES' : '❌ NO');
  console.log('  - Standalone:', isStandalone ? '✅ YES' : '❌ NO');
  
  // 7. Try manual registration
  console.log('\n7️⃣ Attempting Manual Registration:');
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('  ✅ Registration successful!');
    console.log('  - Scope:', registration.scope);
    console.log('  - State:', registration.installing ? 'installing' : 
                             registration.waiting ? 'waiting' : 
                             registration.active ? 'active' : 'unknown');
    
    // Wait for it to activate
    if (registration.installing) {
      console.log('  ⏳ Waiting for activation...');
      await new Promise((resolve) => {
        registration.installing.addEventListener('statechange', (e) => {
          console.log('  📊 State changed:', e.target.state);
          if (e.target.state === 'activated') {
            console.log('  ✅ Service worker activated!');
            resolve(null);
          }
        });
      });
    }
  } catch (error) {
    console.error('  ❌ Manual registration failed:', error);
    console.error('     Error name:', error.name);
    console.error('     Error message:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ DIAGNOSTIC COMPLETE');
}

// Auto-run
diagnoseServiceWorker();
