// Added for repository reproduction; the original bridge was not in CPS_Final.zip.
// Accept the camera sketch's JSON array and send 38 OSC float arguments.
const dgram = require('node:dgram');
const { WebSocketServer } = require('ws');

const INPUT_COUNT = 38;
const udp = dgram.createSocket('udp4');
const server = new WebSocketServer({
  host: '127.0.0.1', port: 8080, maxPayload: 16384
});

function oscString(value) {
  const bytes = Buffer.from(value + '\0', 'utf8');
  const padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4);
  bytes.copy(padded);
  return padded;
}

server.on('listening', () => {
  console.log('Camera: ws://localhost:8080');
  console.log('Wekinator: /wek/inputs -> 127.0.0.1:6448 (38 floats)');
});
server.on('error', error => { console.error(error.message); process.exit(1); });
udp.on('error', error => { console.error(error.message); process.exit(1); });

server.on('connection', socket => {
  socket.on('error', error => console.error('WebSocket:', error.message));
  socket.on('message', (data, isBinary) => {
    if (isBinary) return;
    let values;
    try { values = JSON.parse(data.toString()); } catch { return; }
    if (!Array.isArray(values) || values.length !== INPUT_COUNT ||
        !values.every(v => typeof v === 'number' && Number.isFinite(v) &&
          Number.isFinite(Math.fround(v)))) return;

    const floats = Buffer.alloc(INPUT_COUNT * 4);
    values.forEach((value, i) => floats.writeFloatBE(value, i * 4));
    const message = Buffer.concat([
      oscString('/wek/inputs'), oscString(',' + 'f'.repeat(INPUT_COUNT)), floats
    ]);
    udp.send(message, 6448, '127.0.0.1', error => {
      if (error) console.error('OSC send failed:', error.message);
    });
  });
});
