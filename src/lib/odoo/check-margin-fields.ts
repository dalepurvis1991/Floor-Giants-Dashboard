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
        commonClient.methodCall('authenticate', [db, username, password, {}], (err: any, uid: number) => {
            if (err) reject(err);
            else resolve(uid);
        });
    });
}

async function getFields(uid: number, model: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        objectClient.methodCall(
            'execute_kw',
            [db, uid, password, model, 'fields_get', [], { attributes: ['string', 'type'] }],
            (err: any, result: Record<string, unknown>) => {
                if (err) reject(err);
                else resolve(result);
            }
        );
    });
}

async function main() {
    try {
        console.log('Authenticating...');
        const uid = await authenticate();
        console.log('Authenticated as UID:', uid);

        // Check sale.order fields
        console.log('\n--- sale.order fields containing "margin" or "cost" ---');
        const saleOrderFields = await getFields(uid, 'sale.order');
        Object.entries(saleOrderFields).forEach(([key, val]: [string, any]) => {
            if (key.toLowerCase().includes('margin') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('amount')) {
                console.log(`  ${key}: ${val.string} (${val.type})`);
            }
        });

        // Check sale.order.line fields
        console.log('\n--- sale.order.line fields containing "margin", "cost", or "purchase" ---');
        const saleLineFields = await getFields(uid, 'sale.order.line');
        Object.entries(saleLineFields).forEach(([key, val]: [string, any]) => {
            if (key.toLowerCase().includes('margin') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('purchase')) {
                console.log(`  ${key}: ${val.string} (${val.type})`);
            }
        });

        // Check pos.order fields
        console.log('\n--- pos.order fields containing "margin" or "cost" ---');
        const posOrderFields = await getFields(uid, 'pos.order');
        Object.entries(posOrderFields).forEach(([key, val]: [string, any]) => {
            if (key.toLowerCase().includes('margin') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('amount')) {
                console.log(`  ${key}: ${val.string} (${val.type})`);
            }
        });

        // Check pos.order.line fields  
        console.log('\n--- pos.order.line fields containing "margin" or "cost" ---');
        const posLineFields = await getFields(uid, 'pos.order.line');
        Object.entries(posLineFields).forEach(([key, val]: [string, any]) => {
            if (key.toLowerCase().includes('margin') || key.toLowerCase().includes('cost')) {
                console.log(`  ${key}: ${val.string} (${val.type})`);
            }
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
