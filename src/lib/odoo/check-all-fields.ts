import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getUid, execute } from './client';

async function checkFields() {
    try {
        const uid = await getUid();
        const saleLineFields = await execute(uid, 'sale.order.line', 'fields_get', [], {
            attributes: ['string'],
        });
        console.log('Sale Order Line All Fields:', Object.keys(saleLineFields as object).sort());

        const posLineFields = await execute(uid, 'pos.order.line', 'fields_get', [], {
            attributes: ['string'],
        });
        console.log('POS Order Line All Fields:', Object.keys(posLineFields as object).sort());

    } catch (error) {
        console.log('Error:', error);
    }
}

checkFields();
