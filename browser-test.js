// Copy and paste this into your browser console (F12) to test WebSocket
console.log('🧪 Testing Equipment Checker WebSocket...');

// Check if Socket.IO is loaded
if (typeof io !== 'undefined') {
  console.log('✅ Socket.IO library is loaded');
  
  // Create test connection
  const testSocket = io('http://192.168.4.50:1314/equipment');
  
  testSocket.on('connect', () => {
    console.log('✅ WebSocket connected:', testSocket.id);
    testSocket.emit('join-team', 'global');
  });
  
  testSocket.on('equipment-update', (data) => {
    console.log('📡 Equipment update received:', data);
  });
  
  testSocket.on('connect_error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
  
  // Clean up after 30 seconds
  setTimeout(() => {
    testSocket.disconnect();
    console.log('🧪 Test complete');
  }, 30000);
  
} else {
  console.error('❌ Socket.IO not loaded - frontend build may be cached');
  console.log('💡 Try hard refresh: Ctrl+Shift+R');
}

// Check for React Query
if (window.React) {
  console.log('✅ React is loaded');
} else {
  console.log('❌ React not detected');
}

// Test equipment data fetching
fetch('/api/health')
  .then(r => r.json())
  .then(data => console.log('✅ API Health:', data))
  .catch(e => console.error('❌ API Error:', e));