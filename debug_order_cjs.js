const xmlrpc = require('xmlrpc');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const url = process.env.ODOO_URL;
const db = process.env.ODOO_DB;
const username = process.env.ODOO_USERNAME;
const password = process.env.ODOO_PASSWORD;

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

async function authenticate() {
    return new Promise((resolve, reject) => {
        commonClient.methodCall('authenticate', [db, username, password, {}], (err, uid) => {
            if (err) reject(err);
            else resolve(uid);
        });
    });
}

async function execute(uid, model, method, args, kwargs = {}) {
    return new Promise((resolve, reject) => {
        objectClient.methodCall('execute_kw', [db, uid, password, model, method, args, kwargs], (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

async function main() {
    try {
        const uid = await authenticate();
        console.log('Authenticated UID:', uid);

        const name = 'Furniture Shop/0658';
        console.log(`Searching for order: ${name}`);

        const orders = await execute(uid, 'pos.order', 'search_read', [[['name', '=', name]]], {
            fields: ['id', 'name', 'date_order', 'amount_total', 'user_id', 'lines', 'state']
        });

        console.log('Order Data:', JSON.stringify(orders, null, 2));

        if (orders.length > 0) {
            const orderId = orders[0].id;
            console.log(`Checking lines for POS order ${orderId}`);

            const lines = await execute(uid, 'pos.order.line', 'search_read', [[['order_id', '=', orderId]]], {
                fields: ['id', 'product_id', 'qty', 'price_unit', 'price_subtotal', 'discount', 'margin']
            });
            console.log('Line Data:', JSON.stringify(lines, null, 2));

            // Check if there are ANY lines in the system for this order
            const anyLines = await execute(uid, 'pos.order.line', 'search', [[['order_id', '=', orderId]]]);
            console.log('All line IDs for this order ID:', anyLines);
        }

    } catch (e) {
        console.error(e);
    }
}

main();
