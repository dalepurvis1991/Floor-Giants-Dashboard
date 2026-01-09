import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import xmlrpc from 'xmlrpc';

const url = process.env.ODOO_URL || 'https://staging-floorg.odoo.com';
const db = process.env.ODOO_DB || '';
const username = process.env.ODOO_USERNAME || '';
const password = process.env.ODOO_PASSWORD || '';

const parsedUrl = new URL(url);
const isSecure = parsedUrl.protocol === 'https:';
const host = parsedUrl.hostname;
const port = isSecure ? 443 : 80;

const commonClient = isSecure
    ? xmlrpc.createSecureClient({ host, port, path: '/xmlrpc/2/common' })
    : xmlrpc.createClient({ host, port, path: '/xmlrpc/2/common' });

const objectClient = isSecure
    ? xmlrpc.createSecureClient({ host, port, path: '/xmlrpc/2/object' })
    : xmlrpc.createClient({ host, port, path: '/xmlrpc/2/object' });

async function authenticate(): Promise<number> {
    return new Promise((resolve, reject) => {
        // Authenticating as the user in env
        commonClient.methodCall('authenticate', [db, username, password, {}], (err: Error, uid: number) => {
            if (err) reject(err);
            else resolve(uid);
        });
    });
}

async function execute(uid: number, model: string, method: string, args: any[], kwargs: any = {}) {
    return new Promise((resolve, reject) => {
        objectClient.methodCall('execute_kw', [db, uid, password, model, method, args, kwargs], (err: Error, result: any) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

async function main() {
    try {
        const uid = await authenticate();
        console.log('Authenticated UID:', uid);

        const companyNames = ['FG Nottingham', 'FG NOTTINGHAM LTD', 'Evergreen Floors Ltd', 'Floor Giants'];

        console.log('\n--- Searching Partners ---');
        const domain = [['name', 'in', companyNames]];
        const partners = await execute(uid, 'res.partner', 'search_read', [domain], { fields: ['id', 'name'] });
        console.log(JSON.stringify(partners, null, 2));

    } catch (e) {
        console.error(e);
    }
}

main();
