
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
        const uid = 2;
        const models = await execute(uid, 'ir.model', 'search_read', [['model', 'like', 'stock%']], ['model', 'name']);
        console.log('STOCK MODELS:');
        models.forEach(m => console.log(m.model + ': ' + m.name));

        const scrapModels = await execute(uid, 'ir.model', 'search_read', [['model', 'like', '%scrap%']], ['model', 'name']);
        console.log('\nSCRAP MODELS:');
        scrapModels.forEach(m => console.log(m.model + ': ' + m.name));

    } catch (e) {
        console.error(e);
    }
}
run();
