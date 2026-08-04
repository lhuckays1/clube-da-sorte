module.exports = {
  apps: [
    {
      name: "rifas-online-backend",
      script: "./dist/server.cjs",
      // Ajustado para Socket.IO: Em cluster mode, o Socket.IO exige um Redis Adapter ou Sticky Sessions no Nginx.
      // Para manter a simplicidade e total estabilidade de conexao WebSocket sem dependencias externas de Redis,
      // configuramos 1 instancia em modo 'fork'. Caso escale, utilize @socket.io/pm2 ou Redis Adapter.
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 4100,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 4100,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      max_memory_restart: "1G", // Reboot if memory leaks exceed 1GB
    },
  ],
};
