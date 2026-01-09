const xmlrpc = require('xmlrpc');
require('dotenv').config();

const url = process.env.ODOO_URL;
const db = process.env.ODOO_DB;
const username = process.env.ODOO_USERNAME;
const password = process.env.ODOO_PASSWORD;

async function testFieldSearch() {
    const common = xmlrpc.createSecureClient(url + '/xmlrpc/2/common');

    common.methodCall('authenticate', [db, username, password, {}], (err, uid) => {
        if (err || !uid) {
            console.error('Auth failed:', err || 'No UID');
            return;
        }

        const models = xmlrpc.createSecureClient(url + '/xmlrpc/2/object');

        console.log('Testing domain with qty_available...');
        models.methodCall('execute_kw', [db, uid, password, 'product.product', 'search_read', [
            [['sale_ok', '=', true], ['qty_available', '<=', 5]]
        ], {
                fields: ['id', 'name', 'qty_available'],
                limit: 5
            }], (err, res) => {
                if (err) {
                    console.error('Search failed (likely qty_available not searchable):', err.message || err);

                    console.log('Trying without qty_available filter but with field...');
                    models.methodCall('execute_kw', [db, uid, password, 'product.product', 'search_read', [
                        [['sale_ok', '=', true]]
                    ], {
                            fields: ['id', 'name', 'qty_available'],
                            limit: 5
                        }], (err2, res2) => {
                            if (err2) {
                                console.error('Even field access failed:', err2.message || err2);
                            } else {
                                console.log('Field access works, but filter does not. Filter in memory.');
                                console.log('Sample:', res2[0]);
                            }
                        });
                } else {
                    console.log('Success! qty_available is searchable.');
                    console.log('Result count:', res.length);
                }
            });
    });
}

testFieldSearch();
