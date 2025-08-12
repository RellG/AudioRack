#!/bin/bash

# AudioRack Server Startup Script
echo "Starting AudioRack Equipment Management Server..."

# Change to correct directory
cd /home/ovlab/EquipmentCheck

# Kill any existing server processes
pkill -f "node.*server.js" 2>/dev/null
sleep 2

# Clean up any stuck database connections
sudo -u postgres psql -d equipmentcheck -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE datname='equipmentcheck' 
  AND state IN ('idle in transaction', 'active') 
  AND pid != pg_backend_pid();" 2>/dev/null

echo "Database connections cleaned"

# Start server with error handling
while true; do
    echo "Starting server on port 1314..."
    node server/server.js
    
    # If server exits, wait 5 seconds and restart
    echo "Server stopped. Restarting in 5 seconds..."
    sleep 5
done