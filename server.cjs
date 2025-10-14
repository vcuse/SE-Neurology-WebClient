const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const port = 6002;
const dev = process.env.NODE_ENV;
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
    // ⚠️ UPDATE THESE PATHS to your certificate files
    // key: fs.readFileSync('/etc/letsencrypt/live/meechie.techkit.xyz/privkey.pem'),
    // cert: fs.readFileSync('/etc/letsencrypt/live/meechie.techkit.xyz/fullchain.pem')
};

app.prepare().then(() => {
    createServer(httpsOptions, (req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    }).listen(port, (err) => {
        if (err) throw err;
        console.log(`> Ready on https://localhost:${port}`);
    });
});