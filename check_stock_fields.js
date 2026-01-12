
const xmlrpc = require('xmlrpc');

const url = 'https://sapentia-fg-floor-giants.odoo.com';
const db = 'sapentia-fg-floor-giants-main-19242845';
const username = 'dalepurvis@evergreenfloors.co.uk';
const password = 'c661693f3ace28dda994429960a66f30b94f0b12';

const parsedUrl = new URL(url);
const host = parsedUrl.hostname;
const port = 443;

const commonClient = xmlrpc.createSecureClient({ host, port, path: '/xmlrpc/2/common' });
const objectClient = xmlrpc.createSecureClient({ host, port, path: '/xmlrpc/2/object' });

function execute(uid, model, method, args, kwargs) {
    return new Promise((resolve, reject) => {
        objectClient.methodCall('execute_kw', [db, uid, password, model, method, args, kwargs], (err, res) => {
            if (err) reject(err);
            else resolve(res);
        });
    });
}

function authenticate() {
    return new Promise((resolve, reject) => {
        commonClient.methodCall('authenticate', [db, username, password, {}], (err, uid) => {
            if (err) reject(err);
            else resolve(uid);
        });
    });
}

async function run() {
    try {
        console.log('Authenticating...');
        const uid = await authenticate();
        console.log('Authenticated as UID:', uid);

        console.log('--- Checking stock.scrap fields ---');
        const scrapFields = await execute(uid, 'stock.scrap', 'fields_get', [], { attributes: ['string'] });
        Object.keys(scrapFields).sort().forEach(f => {
            console.log('SCRAP: ' + f + ': ' + scrapFields[f].string);
        });

        console.log('\n--- Checking product.product fields for lead time / manufacturer ---');
        const productFields = await execute(uid, 'product.product', 'fields_get', [], { attributes: ['string', 'type'] });
        Object.keys(productFields).sort().forEach(f => {
            if (f.includes('code') || f.includes('manufacturer') || f.includes('lead') || f.includes('seller') || f.includes('delay')) {
                console.log('PRODUCT: ' + f + ': ' + productFields[f].string + ' (' + productFields[f].type + ')');
            }
        });

    } catch (e) {
        console.error(e);
    }
}

run();
