const { ProxyAgent, setGlobalDispatcher, request, Headers } = require('undici');

const headers = new Headers()
headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) curl/8.0.1');
headers.set('serveo-skip-browser-warning', 'true');

// // console.log(headers)

const proxyAgent =  new ProxyAgent({
    uri: "http://0.tcp.ap.ngrok.io:19665",
    proxyTunnel: true,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) curl/8.0.1',
      'serveo-skip-browser-warning': 'true'
    }
});

// proxyAgent.compose((dispatch) => {
//   return (opts, handler) => {
//     console.log(opts.headers)
//     opts.headers = { 
//       ...opts.headers, 
//       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) curl/8.0.1',
//       'serveo-skip-browser-warning': 'true'
//     };
//     return dispatch(opts, handler);
//   };
// });

// setGlobalDispatcher(proxyAgent);

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