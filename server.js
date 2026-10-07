const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const http = require('node:http');
const fs = require('node:fs');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const APP_URL = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const catalog = {
    1: { title: 'Eudora Royal colônia', unit_price: 140.90 },
    2: { title: 'Natura Espécies', unit_price: 240.90 },
    3: { title: 'Natura Homem', unit_price: 134.90 },
    4: { title: 'Luna Fascinante', unit_price: 94.90 },
    5: { title: 'Pula Pula Água de colônia', unit_price: 64.90 },
    6: { title: 'Pique Pega Água de colônia', unit_price: 64.90 },
    7: { title: 'Eudora Royal colônia', unit_price: 140.90 },
    8: { title: 'Natura kaiak cada', unit_price: 39.90 },
    9: { title: 'Natura Todo Dia Cada Caixa Com 5', unit_price: 31.90 },
    10: { title: 'Natura Todo Dia Cada 1 Unidade', unit_price: 61.90 },
    11: { title: 'Avon Care O Oqueridinho 700ml de hidratação', unit_price: 39.90 },
    12: { title: 'Sabonete Vegetal em Barra Com 4 Unidades', unit_price: 32.90 }
};

function sendJson(response, status, data) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(data));
}

function readJson(request) {
    return new Promise((resolve, reject) => {
        let body = '';
        request.on('data', chunk => {
            body += chunk;
            if (body.length > 10000) reject(new Error('Payload muito grande.'));
        });
        request.on('end', () => {
            try {
                resolve(JSON.parse(body || '{}'));
            } catch {
                reject(new Error('JSON invalido.'));
            }
        });
        request.on('error', reject);
    });
}

async function createPreference(request, response) {
    if (!process.env.MP_ACCESS_TOKEN) {
        return sendJson(response, 500, { error: 'Configure MP_ACCESS_TOKEN no arquivo .env.' });
    }

    try {
        const payload = await readJson(request);
        if (!Array.isArray(payload.items) || !payload.items.length) {
            return sendJson(response, 400, { error: 'A sacola esta vazia.' });
        }

        const items = payload.items.map(item => {
            const product = catalog[Number(item.id)];
            const quantity = Number(item.quantity);
            if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
                throw new Error('Produto ou quantidade invalida.');
            }
            return { ...product, quantity, currency_id: 'BRL' };
        });

        const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items,
                external_reference: `carol-${Date.now()}`,
                back_urls: {
                    success: `${APP_URL}/?status=success`,
                    failure: `${APP_URL}/?status=failure`,
                    pending: `${APP_URL}/?status=pending`
                },
                notification_url: process.env.MP_NOTIFICATION_URL || undefined
            }
        });

        return sendJson(response, 200, {
            id: result.id,
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point
        });
    } catch (error) {
        return sendJson(response, 400, { error: error.message || 'Falha ao criar pagamento.' });
    }
}

function serveStatic(request, response) {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const requestedPath = pathname === '/' ? 'loja .app.html' : pathname.slice(1);
    const filePath = path.resolve(ROOT, requestedPath);
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        response.writeHead(404);
        return response.end('Not found');
    }

    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
    response.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
    if (request.method === 'POST' && request.url === '/api/mercadopago/create-preference') {
        return createPreference(request, response);
    }
    if (request.method === 'GET') return serveStatic(request, response);
    sendJson(response, 405, { error: 'Metodo nao permitido.' });
});

server.listen(PORT, () => {
    console.log(`Carol Presentes em http://localhost:${PORT}`);
});
