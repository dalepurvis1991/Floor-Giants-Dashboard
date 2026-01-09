import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Verify env vars are loaded
console.log('Database from env:', process.env.ODOO_DB);

import { getUid, execute } from './client';

async function checkFields() {
    try {
        const uid = await getUid();
        console.log('Authenticated with UID:', uid);

        const saleFields = await execute(uid, 'sale.order', 'fields_get', [], {
            attributes: ['string', 'type', 'store'],
        });
        const sFields = Object.keys(saleFields as object).filter(f => f.includes('margin') || f.includes('amount') || f.includes('total'));
        console.log('Sale Order Fields:', sFields);

        const saleLineFields = await execute(uid, 'sale.order.line', 'fields_get', [], {
            attributes: ['string', 'type', 'store'],
        });
        const slFields = Object.keys(saleLineFields as object).filter(f => f.includes('margin') || f.includes('price') || f.includes('discount'));
        console.log('Sale Order Line Fields:', slFields);

        const posFields = await execute(uid, 'pos.order', 'fields_get', [], {
            attributes: ['string', 'type', 'store'],
        });
        const pFields = Object.keys(posFields as object).filter(f => f.includes('margin') || f.includes('amount') || f.includes('total'));
        console.log('POS Order Fields:', pFields);

    } catch (error) {
        console.log('Error checking fields:', error);
    }
}

checkFields();
