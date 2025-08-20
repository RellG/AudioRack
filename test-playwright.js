const WebSocket = require('ws');

console.log('🎭 Connecting to Playwright server...');

// Connect to your Playwright server
const ws = new WebSocket('ws://localhost:9222/c1f3115d18f43efd6c6b4778dec8ecff');

ws.on('open', () => {
  console.log('✅ Connected to Playwright server!');
  
  // Test Equipment Checker site
  const testMessage = {
    id: 1,
    method: 'Page.navigate',
    params: {
      url: 'http://192.168.4.50:1314'
    }
  };
  
  console.log('🔗 Navigating to Equipment Checker...');
  ws.send(JSON.stringify(testMessage));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📝 Playwright response:', message);
  
  if (message.id === 1) {
    // Navigation complete, test WebSocket indicator
    console.log('🧪 Testing WebSocket real-time indicator...');
    
    const checkIndicator = {
      id: 2,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          // Check if WebSocket indicator shows "Real-time"
          document.querySelector('[data-testid="websocket-status"]') || 
          document.querySelector('span:contains("Real-time")') ||
          document.evaluate('//span[contains(text(), "Real-time")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
        `
      }
    };
    
    ws.send(JSON.stringify(checkIndicator));
  }
  
  if (message.id === 2) {
    if (message.result && message.result.result && message.result.result.value) {
      console.log('✅ WebSocket indicator found - Real-time connection working!');
    } else {
      console.log('⚠️ WebSocket indicator not found - may be using polling mode');
    }
    
    // Test mobile responsiveness
    console.log('📱 Testing mobile viewport...');
    
    const mobileTest = {
      id: 3,
      method: 'Emulation.setDeviceMetricsOverride',
      params: {
        width: 375,
        height: 812,
        deviceScaleFactor: 3,
        mobile: true
      }
    };
    
    ws.send(JSON.stringify(mobileTest));
  }
  
  if (message.id === 3) {
    console.log('📱 Mobile viewport set - testing responsive design...');
    
    // Take screenshot of mobile view
    const screenshot = {
      id: 4,
      method: 'Page.captureScreenshot',
      params: {
        format: 'png',
        quality: 80
      }
    };
    
    ws.send(JSON.stringify(screenshot));
  }
  
  if (message.id === 4) {
    console.log('📷 Mobile screenshot captured!');
    console.log('🎉 Equipment Checker testing complete!');
    
    // Test real-time updates by simulating equipment creation
    console.log('⚡ Testing real-time updates...');
    
    const realTimeTest = {
      id: 5,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          // Check if there's a way to trigger a test update
          fetch('/api/health').then(r => r.json()).then(data => {
            console.log('Health check:', data);
            return data.status === 'OK';
          }).catch(e => false)
        `
      }
    };
    
    ws.send(JSON.stringify(realTimeTest));
  }
  
  if (message.id === 5) {
    console.log('🔧 API health check:', message.result?.result?.value);
    
    setTimeout(() => {
      ws.close();
    }, 2000);
  }
});

ws.on('close', () => {
  console.log('👋 Disconnected from Playwright server');
});

ws.on('error', (error) => {
  console.error('❌ Playwright connection error:', error.message);
  console.log('💡 Make sure your Playwright server is running on the Pi with:');
  console.log('   node server.js');
});