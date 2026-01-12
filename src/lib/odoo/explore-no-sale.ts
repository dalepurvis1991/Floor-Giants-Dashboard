import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getUid, execute } from './client';

async function checkNoSale() {
    try {
        const uid = await getUid();
        console.log('Authenticated with UID:', uid);

        // Check if account.bank.statement.line exists and has relevant fields
        try {
            const statementFields = await execute(uid, 'account.bank.statement.line', 'fields_get', [], {
                attributes: ['string', 'type', 'store'],
            });
            const sLines = Object.keys(statementFields as object).filter(f => f.includes('amount') || f.includes('reason') || f.includes('note') || f.includes('pos'));
            console.log('Statement Line Fields:', sLines);

            // Fetch recent ones with amount < 0 (withdrawals)
            const recentLines = await execute(uid, 'account.bank.statement.line', 'search_read', [
                [['amount', '<', 0], ['date', '>=', '2026-01-01']]
            ], {
                fields: ['id', 'amount', 'date', 'payment_ref', 'note', 'pos_session_id'],
                limit: 10
            });
            console.log('Recent Withdrawals:', recentLines);
        } catch (e) {
            console.log('account.bank.statement.line not found or error:', e);
        }

        // Check pos.payment
        try {
            const paymentFields = await execute(uid, 'pos.payment', 'fields_get', [], {
                attributes: ['string', 'type', 'store'],
            });
            const pFields = Object.keys(paymentFields as object).filter(f => f.includes('amount') || f.includes('type') || f.includes('method'));
            console.log('POS Payment Fields:', pFields);

            const recentPayments = await execute(uid, 'pos.payment', 'search_read', [
                [['amount', '<', 0]]
            ], {
                fields: ['id', 'amount', 'payment_date', 'payment_method_id', 'pos_order_id'],
                limit: 10
            });
            console.log('Recent POS Payments:', recentPayments);
        } catch (e) {
            console.log('pos.payment not found or error:', e);
        }

    } catch (error) {
        console.log('Error checking data:', error);
    }
}

checkNoSale();
