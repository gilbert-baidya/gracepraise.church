import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isProductionFile } from './build-production.mjs';

const root = await fs.realpath(fileURLToPath(new URL('../', import.meta.url)));
const host = '127.0.0.1';
const port = Number(process.env.GPBC_LOCAL_REVIEW_PORT || 8080);
const exactPrivateSources = new Set([
    'data/bible/source/bn-bsi-2016-ov.xml',
    'data/bible/source/en-niv-1984.xml'
]);
const contentTypes = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
    ['.js', 'text/javascript; charset=utf-8'], ['.mjs', 'text/javascript; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'], ['.xml', 'application/xml; charset=utf-8'],
    ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'], ['.webp', 'image/webp'], ['.ico', 'image/x-icon'],
    ['.woff', 'font/woff'], ['.woff2', 'font/woff2'], ['.ttf', 'font/ttf']
]);

function allowed(relative) {
    return isProductionFile(relative)
        || relative.startsWith('worship-studio/')
        || relative.startsWith('bible-slide-builder/')
        || exactPrivateSources.has(relative);
}

function safeRelative(urlValue) {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(urlValue, `http://${host}:${port}`).pathname);
    } catch {
        return null;
    }
    if (pathname.includes('\0') || pathname.includes('\\')) return null;
    let relative = pathname.replace(/^\/+/, '');
    if (!relative) relative = 'index.html';
    if (relative.endsWith('/')) relative += 'index.html';
    const normalized = path.posix.normalize(relative);
    if (normalized !== relative || normalized.split('/').some(part => !part || part === '.' || part === '..')) return null;
    return normalized;
}

function response(res, status, body, type = 'text/plain; charset=utf-8') {
    res.writeHead(status, {
        'Content-Type': type,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer'
    });
    res.end(body);
}

const server = http.createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method || '')) {
        response(res, 405, 'Method not allowed');
        return;
    }
    const relative = safeRelative(req.url || '/');
    if (!relative || !allowed(relative)) {
        response(res, 404, 'Not found');
        return;
    }
    const target = path.join(root, ...relative.split('/'));
    try {
        const real = await fs.realpath(target);
        if (!real.startsWith(`${root}${path.sep}`)) {
            response(res, 404, 'Not found');
            return;
        }
        const stat = await fs.stat(real);
        if (!stat.isFile()) {
            response(res, 404, 'Not found');
            return;
        }
        const type = contentTypes.get(path.extname(real).toLowerCase()) || 'application/octet-stream';
        const bytes = req.method === 'HEAD' ? '' : await fs.readFile(real);
        res.writeHead(200, {
            'Content-Type': type,
            'Content-Length': stat.size,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer'
        });
        res.end(bytes);
    } catch (error) {
        response(res, error.code === 'ENOENT' ? 404 : 500, error.code === 'ENOENT' ? 'Not found' : 'Local server error');
    }
});

server.listen(port, host, () => {
    console.log(`GPBC local review server: http://${host}:${port}/`);
    console.log('Only public-site files, the two local Studio areas, and the two locked Bible XML sources are served.');
});
