
const xmlrpc = require('xmlrpc');

const url = 'https://staging-floorg.odoo.com';
const db = 'staging-floorg';
const username = 'admin';
const password = 'evergreenfloors';

const parsedUrl = new URL(url);
const host = parsedUrl.hostname;
const port = 443;

const objectClient = xmlrpc.createSecureClient({ host, port, path: '/xmlrpc/2/object' });

function execute(uid, model, method, args, kwargs) {
    return new Promise((resolve, reject) => {
        objectClient.methodCall('execute_kw', [db, uid, password, model, method, args, kwargs], (err, res) => {
            if (err) reject(err);
            else resolve(res);
        });
    });
}

async function run() {
    try {
        const uid = 2; // Fixed UID from previous scripts
        const fields = await execute(uid, 'res.partner', 'fields_get', [], { attributes: ['string'] });
        console.log('--- PARTNER FIELDS ---');
        Object.keys(fields).sort().forEach(f => {
            if (f.toLowerCase().includes('trade') || f.toLowerCase().includes('type') || f.toLowerCase().includes('categ')) {
                console.log(f + ': ' + fields[f].string);
            }
        });
        console.log('--- END PARTNER FIELDS ---');
    } catch (e) {
        console.error(e);
    }
}

run();
