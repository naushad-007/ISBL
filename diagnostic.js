import { chromium } from 'playwright';

(async () => {
  let browser;
  try {
    console.log('🚀 ISBL Portal Diagnostic Debug...\n');
    
    browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    let page;
    
    if (contexts.length > 0) {
      page = contexts[0].pages()[0];
    } else {
      const context = await browser.createContext();
      page = await context.newPage();
    }
    
    // Navigate
    console.log('🌐 Loading frontend...');
    await page.goto('https://isblportal.netlify.app', { waitUntil: 'domcontentloaded' });
    console.log('✅ Frontend loaded\n');
    
    // Wait a bit for JS to execute
    await page.waitForTimeout(1000);
    
    // Check what's on the page
    console.log('🔍 Page diagnostics:');
    const pageState = await page.evaluate(() => {
      return {
        screens: Array.from(document.querySelectorAll('.screen')).map(s => ({
          id: s.id,
          active: s.classList.contains('active'),
          visible: s.offsetParent !== null
        })),
        adminBtn: !!document.getElementById('goto-admin-login'),
        adminForm: !!document.getElementById('admin-login-form'),
        adminEmailInput: !!document.getElementById('a-email'),
        adminPassInput: !!document.getElementById('a-pass'),
        adminSubmitBtn: !!document.getElementById('a-btn'),
        hasEventListeners: typeof document.body.addEventListener !== 'undefined',
        location: window.location.href
      };
    });
    
    console.log('Screens on page:', pageState.screens);
    console.log('Admin button exists:', pageState.adminBtn);
    console.log('Admin form exists:', pageState.adminForm);
    console.log('Admin inputs exist:', pageState.adminEmailInput, pageState.adminPassInput);
    console.log('Admin submit button exists:', pageState.adminSubmitBtn);
    console.log('Current URL:', pageState.location);
    
    // Check for console errors
    page.on('console', msg => {
      console.log(`📢 [${msg.type()}] ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      console.log(`📢 [ERROR] ${error.message}`);
    });
    
    console.log('\n🔐 Attempting to click admin button...');
    const adminBtn = await page.$('#goto-admin-login');
    if (adminBtn) {
      await adminBtn.click();
      console.log('✅ Admin button clicked');
      
      // Wait a moment and check state again
      await page.waitForTimeout(500);
      
      const afterClick = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.screen')).map(s => ({
          id: s.id,
          active: s.classList.contains('active'),
          visible: s.offsetParent !== null
        }));
      });
      
      console.log('\n📊 Screen state after click:');
      afterClick.forEach(s => {
        console.log(`  ${s.id}: active=${s.active}, visible=${s.visible}`);
      });
      
      // Check if admin login screen became active
      const adminLoginActive = afterClick.find(s => s.id === 'screen-admin-login')?.active;
      if (adminLoginActive) {
        console.log('\n✅ Admin login screen is now ACTIVE');
      } else {
        console.log('\n❌ Admin login screen is NOT active after button click');
        console.log('📸 Taking screenshot to see current state...');
        await page.screenshot({ path: 'diagnostic-state.png' });
        console.log('Screenshot saved: diagnostic-state.png');
      }
    } else {
      console.log('❌ Admin button not found');
    }
    
    console.log('\n✨ Diagnostic complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore
      }
    }
  }
})();
