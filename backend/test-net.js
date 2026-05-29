const net = require('net');
const hosts = ['localhost', '127.0.0.1', '0.0.0.0', 'host.docker.internal'];
console.log('Test de connexion à PostgreSQL Docker (port 5432):\n');
hosts.forEach(host => {
  const socket = net.createConnection({ host: host, port: 5432 }, () => {
    console.log('✅ ' + host + ' - CONNECTÉ !');
    socket.destroy();
  });
  socket.on('error', (err) => {
    console.log('❌ ' + host + ' - ' + (err.code || err.message));
  });
  socket.setTimeout(2000);
  socket.on('timeout', () => {
    console.log('⏰ ' + host + ' - TIMEOUT');
    socket.destroy();
  });
});