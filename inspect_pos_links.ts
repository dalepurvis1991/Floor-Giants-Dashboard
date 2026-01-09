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

async function execute(uid: number, model: string, method: string, args: any[], kwargs: any = {}) {
    return new Promise((resolve, reject) => {
        objectClient.methodCall('execute_kw', [db, uid, password, model, method, args, kwargs], (err: any, result: any) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

async function main() {
    try {
        const uid = await authenticate();
        console.log('Authenticated UID:', uid);

        // 1. Fetch a recent POS order
        console.log('\n--- Recent POS Order ---');
        // Try fetching with potential link fields
        // Note: If a field doesn't exist, search_read usually ignores it or errors. 
        // We'll try a safe set first.
        const orders = await execute(uid, 'pos.order', 'search_read', [[]], {
            limit: 5,
            fields: [
                'name',
                'user_id',
                'lines',
                'amount_total',
                // Potential Refund Links
                'refunded_order_ids',
                // Potential SO Links
                // 'sale_order_id' 
            ]
        });
        console.log(JSON.stringify(orders, null, 2));

        // 2. Fetch lines for one of the orders
        if ((orders as any[]).length > 0) {
            const orderId = (orders as any[])[0].id;
            console.log(`\n--- Lines for Order ${orderId} ---`);

            // Try to fetch likely link fields on lines
            try {
                const lines = await execute(uid, 'pos.order.line', 'search_read', [[['order_id', '=', orderId]]], {
                    fields: [
                        'product_id',
                        'qty',
                        'sale_order_origin_id', // Common in V16+ for SO link
                        'sale_order_line_id',   // Common for SO line link
                        'refunded_orderline_id' // Link to original line for refunds
                    ]
                });
                console.log(JSON.stringify(lines, null, 2));
            } catch (lineError) {
                console.error("Error fetching lines with specific fields (some might not exist):", lineError);

                // Fallback to basic fields
                const linesBasic = await execute(uid, 'pos.order.line', 'search_read', [[['order_id', '=', orderId]]], {
                    fields: ['product_id', 'qty']
                });
                console.log("Basic lines fetch:", JSON.stringify(linesBasic, null, 2));
            }
        }

    } catch (e) {
        console.error(e);
    }
}

main();
