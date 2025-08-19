module.exports = {
  apps: [{
    name: 'equipment-checker',
    script: 'server/server.js',
    cwd: '/home/ovlab/EquipmentCheck',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 1314
    },
    error_file: '/home/ovlab/EquipmentCheck/logs/err.log',
    out_file: '/home/ovlab/EquipmentCheck/logs/out.log',
    log_file: '/home/ovlab/EquipmentCheck/logs/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    kill_timeout: 5000
  }]
};