import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getUid, execute } from './client';

async function checkFields() {
    try {
        const uid = await getUid();

        const models = ['sale.order', 'sale.order.line', 'pos.order', 'pos.order.line'];

        for (const model of models) {
            console.log(`\n--- Fields for ${model} ---`);
            const result = await execute(uid, model, 'fields_get', [], {
                attributes: ['string', 'type', 'store'],
            }) as any;

            const keys = Object.keys(result).sort();
            console.log('All matched keys:', keys.filter(k => k.includes('margin') || k.includes('cost') || k.includes('total')));
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkFields();
