import { chromium } from 'playwright';

(async () => {
  try {
    // Connect to existing Chrome instance
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    
    console.log('✅ Connected to Chrome!');
    
    // Get first page/context
    const contexts = browser.contexts();
    let page;
    
    if (contexts.length > 0) {
      page = contexts[0].pages()[0];
    } else {
      const context = await browser.createContext();
      page = await context.newPage();
    }
    
    // Test: Navigate to your frontend
    console.log('🔄 Navigating to ISBL Portal...');
    await page.goto('https://isblportal.netlify.app', { waitUntil: 'networkidle' });
    
    console.log('✅ Page loaded successfully!');
    console.log('📄 Title:', await page.title());
    console.log('📍 URL:', page.url());
    
    // Take screenshot
    await page.screenshot({ path: 'isbl-portal-screenshot.png' });
    console.log('📸 Screenshot saved: isbl-portal-screenshot.png');
    
    // Keep connection alive for debugging
    console.log('\n✨ Browser is ready for debugging. Keep this script running.');
    console.log('Press Ctrl+C to disconnect.\n');
    
    // Don't close browser - keep it open for manual interaction
    await new Promise(resolve => setTimeout(resolve, 9999999));
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
})();
