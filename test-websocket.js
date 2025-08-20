const io = require('socket.io-client');

console.log('🔌 Testing WebSocket connection...');

// Test WebSocket connection to equipment namespace
const socket = io('http://192.168.4.50:1314/equipment', {
  transports: ['websocket', 'polling'],
  timeout: 10000
});

socket.on('connect', () => {
  console.log('✅ WebSocket connected:', socket.id);
  console.log('🎯 Joining team-global...');
  socket.emit('join-team', 'global');
});

socket.on('disconnect', (reason) => {
  console.log('❌ WebSocket disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('🚫 WebSocket connection error:', error.message);
});

socket.on('equipment-update', (data) => {
  console.log('📡 Received equipment update:', data);
});

socket.on('stats-update', (data) => {
  console.log('📊 Received stats update:', data);
});

// Test message after 2 seconds
setTimeout(() => {
  console.log('🧪 Testing WebSocket functionality...');
  
  // If connected, the server should broadcast when we make equipment changes
  console.log('💡 To test: Update equipment status on the website');
  console.log('💡 You should see real-time updates appear here');
  
}, 2000);

// Keep alive for 30 seconds
setTimeout(() => {
  console.log('👋 Closing WebSocket connection');
  socket.disconnect();
  process.exit(0);
}, 30000);