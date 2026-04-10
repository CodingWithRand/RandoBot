const http = require('http');
const setup = require('proxy');

// Create a blank server - let the 'proxy' package handle the logic
const server = setup.createProxy(http.createServer());

// Log requests so you can see your Bot working in real-time
server.on('request', (req) => {
    console.log(`[${new Date().toLocaleTimeString()}] Proxying: ${req.method} ${req.url}`);
    console.log(`[${new Date().toLocaleTimeString()}] 🎵 Streaming data to Bot: ${req.url}`);
});

server.on('connect', (req, socket, head) => {
    console.log(`[${new Date().toLocaleTimeString()}] 🔒 Secure Tunnel created for: ${req.url}`);
});

// Handle errors so the server doesn't crash if a connection drops
server.on('error', (err) => {
    console.error('Proxy Server Error:', err.message);
});

const PORT = 5050;
server.listen(PORT, '127.0.0.1', () => {
    console.log(`\x1b[32m✔\x1b[0m Proxy is live on port ${PORT}`);
    console.log(`\x1b[33mℹ\x1b[0m Point your Discord Bot to your Ngrok URL.`);
});

// The "Safety Net" for the header error you saw earlier
process.on('uncaughtException', (err) => {
    if (err.code === 'ERR_HTTP_HEADERS_SENT') return; 
    console.error('Critical Error:', err);
});