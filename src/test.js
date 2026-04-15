const { ProxyAgent, request } = require('undici');

const proxyAgent = new ProxyAgent("http://yd4yclqzkx.localto.net:5791");

(async () => {
    try {
        const res = await request('https://google.com', { dispatcher: proxyAgent });
        console.log("--- PROXY TEST ---");
        console.log("Status:", res.status); // Should be 200
        console.log("Headers:", res.headers);
        console.log("Connected through Proxy!");
    } catch (e) {
        console.error(e)
        console.error("PROXY FAILED:", e.message);
    }
})();
// const http = require('http');

// const req = http.get({
//   host: '1feb4a909ed552e0-171-4-232-230.serveousercontent.com',
//   port: 80,
//   path: 'http://google.com/',
//   headers: {
//     'ngrok-skip-browser-warning': 'true',
//     'User-Agent': 'curl/8.12.0'
//   }
// }, (res) => {
//   console.log('Got response:', res.statusCode);
// });