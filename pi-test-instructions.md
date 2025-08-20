# Playwright Testing Instructions

## Pi Network Setup Required:

### 1. Open Port 9222 on Pi (192.168.4.129):
```bash
# On your Pi, run:
sudo ufw allow 9222
# Or if using iptables:
sudo iptables -A INPUT -p tcp --dport 9222 -j ACCEPT
```

### 2. Test Equipment Checker from Pi:
```bash
# On your Pi, test the connection:
curl http://192.168.4.50:1314/api/health

# Should return:
{"status":"OK","timestamp":"...","server":"Equipment Checker API"...}
```

### 3. Playwright Test Commands:
```javascript
// Navigate to Equipment Checker
await page.goto('http://192.168.4.50:1314');

// Check WebSocket indicator
await page.waitForSelector('[class*="Real-time"]', { timeout: 10000 });

// Test mobile viewport
await page.setViewportSize({ width: 375, height: 812 });

// Take screenshot
await page.screenshot({ path: 'equipment-mobile.png' });

// Test equipment update
await page.click('button:has-text("Checked")');
await page.waitForSelector('[class*="bg-green-500"]');
```

## Expected Results:
- ✅ WebSocket indicator shows "Real-time" with WiFi icon
- ✅ Mobile layout is responsive (1 column on phone)
- ✅ Equipment updates appear instantly across tabs
- ✅ Action buttons work on mobile (touch-friendly)