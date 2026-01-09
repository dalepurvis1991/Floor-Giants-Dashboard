import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getUid, execute } from './client';

async function checkFields() {
    try {
        const uid = await getUid();
        console.log('Authenticated with UID:', uid);

        const saleLineFields = await execute(uid, 'sale.order.line', 'fields_get', [], {
            attributes: ['string', 'type', 'store'],
        });

        const fields = saleLineFields as any;
        console.log('Sale Order Line Fields:');
        Object.keys(fields).sort().forEach(f => {
            if (f.includes('cost') || f.includes('price') || f.includes('margin') || f.includes('amount')) {
                console.log(`${f}: ${JSON.stringify(fields[f])}`);
            }
        });

    } catch (error) {
        console.error('Error checking fields:', error);
    }
}

checkFields();
