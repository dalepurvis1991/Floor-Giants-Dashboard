import { searchRead } from './src/lib/odoo/client';
import * as dotenv from 'dotenv';
dotenv.config();

async function debug() {
    const name = 'Furniture Shop/0658';
    console.log(`Searching for order: ${name}`);

    // 1. Search for the order
    const orders = await searchRead('pos.order', [['name', '=', name]], [
        'id', 'name', 'date_order', 'amount_total', 'user_id', 'lines', 'sale_order_origin_id', 'state'
    ]);

    console.log('Order Data:', JSON.stringify(orders, null, 2));

    if (orders.length > 0) {
        const orderId = orders[0].id;
        // 2. Search for lines
        const lines = await searchRead('pos.order.line', [['order_id', '=', orderId]], [
            'id', 'product_id', 'qty', 'price_unit', 'price_subtotal', 'discount', 'margin', 'sale_order_origin_id'
        ]);
        console.log('Line Data:', JSON.stringify(lines, null, 2));

        // 3. If there is a sale_order_origin_id, check it
        if (orders[0].sale_order_origin_id) {
            const soId = orders[0].sale_order_origin_id[0];
            console.log(`Checking Sales Order: ${soId}`);
            const so = await searchRead('sale.order', [['id', '=', soId]], [
                'id', 'name', 'user_id', 'amount_total', 'state'
            ]);
            console.log('Sales Order Data:', JSON.stringify(so, null, 2));

            const soLines = await searchRead('sale.order.line', [['order_id', '=', soId]], [
                'id', 'product_id', 'product_uom_qty', 'price_unit', 'price_subtotal', 'discount'
            ]);
            console.log('Sales Order Line Data:', JSON.stringify(soLines, null, 2));
        }
    }
}

debug().catch(console.error);
