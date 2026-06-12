import { chromium } from 'playwright';

(async () => {
  let browser;
  try {
    console.log('🚀 Starting ISBL Portal Login Debug...\n');
    
    // Connect to Chrome
    console.log('🔗 Connecting to Chrome...');
    browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    let page;
    
    if (contexts.length > 0) {
      page = contexts[0].pages()[0];
    } else {
      const context = await browser.createContext();
      page = await context.newPage();
    }
    
    console.log('✅ Connected to Chrome\n');
    
    // Test backend health from Node.js
    console.log('📡 Testing backend health...');
    try {
      const response = await fetch('https://isbl.onrender.com/api/health');
      const health = await response.json();
      console.log('✅ Backend health:', JSON.stringify(health));
    } catch (e) {
      console.log('❌ Backend unreachable:', e.message);
    }
    
    // Navigate to portal
    console.log('\n🌐 Navigating to frontend...');
    await page.goto('https://isblportal.netlify.app', { waitUntil: 'load' });
    console.log('✅ Frontend loaded');
    
    // Wait for JavaScript to fully initialize
    console.log('⏳ Waiting for JavaScript to initialize...');
    await page.waitForFunction(() => {
      return typeof document.getElementById('goto-admin-login')?.__isBlInitialized !== 'undefined' ||
             document.getElementById('goto-admin-login')?.addEventListener ? true : false;
    }, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    console.log('✅ JavaScript initialized\n');
    
    // Click admin button
    console.log('🔐 Clicking Admin Access button...');
    const adminCardBtn = await page.$('#goto-admin-login');
    if (!adminCardBtn) {
      console.log('❌ Admin button not found');
      await page.screenshot({ path: 'page-initial.png' });
      console.log('📸 Screenshot: page-initial.png');
    } else {
      await adminCardBtn.click();
      console.log('✅ Admin button clicked');
      
      // Wait for admin login screen to become visible
      console.log('\n⏳ Waiting for admin login screen to appear...');
      try {
        await page.waitForSelector('#screen-admin-login.active', { timeout: 10000 });
      } catch (e) {
        console.log('⚠️  Timeout waiting for admin screen, checking DOM state...');
        const state = await page.evaluate(() => {
          const landing = document.getElementById('screen-landing');
          const admin = document.getElementById('screen-admin-login');
          return {
            landing: { active: landing?.classList.contains('active'), exists: !!landing },
            admin: { active: admin?.classList.contains('active'), exists: !!admin }
          };
        });
        console.log('DOM State:', state);
        if (!state.admin.active) throw new Error('Admin screen did not become active');
      }
      console.log('✅ Admin login screen visible');
      
      // Listen to network requests
      console.log('\n📡 Monitoring network requests...');
      page.on('request', request => {
        if (request.url().includes('api')) {
          console.log(`  → ${request.method()} ${request.url().replace('https://isbl.onrender.com', '[BACKEND]')}`);
        }
      });
      
      page.on('response', response => {
        if (response.url().includes('api')) {
          console.log(`  ← ${response.status()} ${response.url().replace('https://isbl.onrender.com', '[BACKEND]')}`);
        }
      });
      
      // Listen for network errors
      page.on('requestfailed', request => {
        console.log(`❌ Network error: ${request.url()}`);
        console.log(`   Failure: ${request.failure().errorText}`);
      });
      const emailInput = await page.$('#a-email');
      const passInput = await page.$('#a-pass');
      
      if (!emailInput || !passInput) {
        console.log('❌ Email or password input not found');
      } else {
        await emailInput.fill('amitdas@dbeb.iitd.ac.in');
        await passInput.fill('Password123');
        console.log('✅ Credentials entered');
        
        // Wait a moment for form to settle
        await page.waitForTimeout(500);
        
        // Submit form using the admin button specifically
        console.log('\n⏳ Submitting admin login form...');
        const adminSubmitBtn = await page.$('#a-btn');
        if (adminSubmitBtn) {
          await adminSubmitBtn.click();
          console.log('✅ Form submitted');
          
          // Wait for response
          await page.waitForTimeout(4000);
          
          // Check for error or success
          const errorEl = await page.$('#a-err');
          if (errorEl) {
            const errorText = await errorEl.textContent();
            if (errorText && errorText.trim()) {
              console.log('❌ Login error:', errorText);
            }
          }
          
          // Check if redirected to admin panel
          const url = page.url();
          console.log('\n📍 Current URL:', url);
          if (url.includes('admin.html')) {
            console.log('✅ Successfully logged in as admin!');
          } else if (url.includes('isblportal.netlify.app')) {
            console.log('⚠️  Still on index page - login may have failed');
          }
          
          // Take screenshot
          await page.screenshot({ path: 'login-result.png' });
          console.log('📸 Screenshot: login-result.png');
        } else {
          console.log('❌ Admin submit button not found');
        }
      }
    }
    
    console.log('\n✨ Debug complete!');
    console.log('📁 Check screenshots: page-initial.png, login-result.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore close errors
      }
    }
  }
})();
