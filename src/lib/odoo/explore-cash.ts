import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getUid, execute, searchRead } from './client';

async function exploreCashModels() {
    try {
        const uid = await getUid();
        console.log('Authenticated with UID:', uid);

        // Check POS Session fields for cash control
        console.log('\n=== POS Session Fields ===');
        try {
            const sessionFields = await execute(uid, 'pos.session', 'fields_get', [], {
                attributes: ['string', 'type'],
            });
            const cashFields = Object.entries(sessionFields as object)
                .filter(([k, v]: [string, any]) =>
                    k.includes('cash') || k.includes('amount') || k.includes('bank') ||
                    k.includes('statement') || k.includes('payment')
                )
                .map(([k, v]: [string, any]) => `${k}: ${v.type} - ${v.string}`);
            console.log('Cash-related fields:', cashFields);
        } catch (e) {
            console.log('pos.session error:', e);
        }

        // Check POS Payment for cash movements
        console.log('\n=== POS Payment Fields ===');
        try {
            const paymentFields = await execute(uid, 'pos.payment', 'fields_get', [], {
                attributes: ['string', 'type'],
            });
            const fields = Object.entries(paymentFields as object)
                .map(([k, v]: [string, any]) => `${k}: ${v.type} - ${v.string}`);
            console.log('POS Payment fields:', fields.slice(0, 20));
        } catch (e) {
            console.log('pos.payment error:', e);
        }

        // Check account.bank.statement.line for cash in/out
        console.log('\n=== Bank Statement Line Fields ===');
        try {
            const stmtFields = await execute(uid, 'account.bank.statement.line', 'fields_get', [], {
                attributes: ['string', 'type'],
            });
            const fields = Object.entries(stmtFields as object)
                .filter(([k, v]: [string, any]) =>
                    k.includes('amount') || k.includes('name') || k.includes('ref') ||
                    k.includes('pos') || k.includes('reason') || k.includes('note')
                )
                .map(([k, v]: [string, any]) => `${k}: ${v.type} - ${v.string}`);
            console.log('Relevant fields:', fields);

            // Fetch some recent negative amounts (cash out)
            const cashOuts = await searchRead(
                'account.bank.statement.line',
                [['amount', '<', 0], ['date', '>=', '2026-01-01']],
                ['id', 'name', 'amount', 'date', 'payment_ref', 'ref'],
                { limit: 10 }
            );
            console.log('\nRecent Cash Outs:', cashOuts);
        } catch (e) {
            console.log('account.bank.statement.line error:', e);
        }

        // Check if there's a pos.cash.box.out model
        console.log('\n=== POS Cash Box Out ===');
        try {
            const cashBoxFields = await execute(uid, 'cash.box.out', 'fields_get', [], {
                attributes: ['string', 'type'],
            });
            console.log('Cash Box Out fields:', Object.keys(cashBoxFields as object));
        } catch (e) {
            console.log('cash.box.out not found or error');
        }

    } catch (error) {
        console.log('Error:', error);
    }
}

exploreCashModels();
