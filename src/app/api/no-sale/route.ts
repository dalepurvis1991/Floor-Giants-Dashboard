import { searchRead } from '@/lib/odoo/client';
import { getSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export interface CashWithdrawal {
    id: number;
    date: string;
    amount: number;
    reference: string;
    reason: string;
    store: string;
    company: string;
    reason_detail: string;
}

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !session.password) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const credentials = { uid: session.userId, password: session.password };

        const searchParams = request.nextUrl.searchParams;
        const dateTo = searchParams.get('dateTo') || new Date().toISOString().split('T')[0];
        const defaultDateFrom = new Date();
        defaultDateFrom.setDate(defaultDateFrom.getDate() - 30);
        const dateFrom = searchParams.get('dateFrom') || defaultDateFrom.toISOString().split('T')[0];

        // Fetch negative amounts from bank statement lines (cash out)
        // These are typically petty cash withdrawals and banking
        const cashOuts = await searchRead<{
            id: number;
            name: string;
            amount: number;
            date: string;
            payment_ref: string;
            ref: string;
            journal_id: [number, string] | false;
        }>(
            'account.bank.statement.line',
            [
                ['amount', '<', 0],
                ['date', '>=', dateFrom],
                ['date', '<=', dateTo],
            ],
            ['id', 'name', 'amount', 'date', 'payment_ref', 'ref', 'journal_id', 'company_id', 'narration'],
            { order: 'date desc', limit: 500 },
            credentials
        );

        // Categorize by reason
        const reasonCategories: Record<string, { total: number; count: number; items: CashWithdrawal[] }> = {
            'Banking': { total: 0, count: 0, items: [] },
            'Petty Cash': { total: 0, count: 0, items: [] },
            'Fuel': { total: 0, count: 0, items: [] },
            'Supplies': { total: 0, count: 0, items: [] },
            'Other': { total: 0, count: 0, items: [] },
        };

        cashOuts.forEach((item) => {
            const rawRef = (item.name || item.payment_ref || item.ref || '');
            const narration = (item as any).narration || '';
            const reference = (rawRef + ' ' + narration).toLowerCase();
            const amount = Math.abs(item.amount);
            const store = Array.isArray(item.journal_id) ? item.journal_id[1] : 'Unknown';

            let category = 'Other';
            if (reference.includes('bank') || reference.includes('banking')) {
                category = 'Banking';
            } else if (reference.includes('petty') || reference.includes('cash out')) {
                category = 'Petty Cash';
            } else if (reference.includes('fuel') || reference.includes('diesel') || reference.includes('petrol')) {
                category = 'Fuel';
            } else if (reference.includes('supplies') || reference.includes('office') || reference.includes('cleaning')) {
                category = 'Supplies';
            }

            if (!reasonCategories[category]) {
                reasonCategories[category] = { total: 0, count: 0, items: [] };
            }

            reasonCategories[category].total += amount;
            reasonCategories[category].count += 1;
            reasonCategories[category].items.push({
                id: item.id,
                date: item.date,
                amount: amount,
                reference: (item.name || item.payment_ref || item.ref || '') + ((item as any).narration ? ` - ${(item as any).narration}` : ''),
                reason: category,
                store: store,
                company: Array.isArray((item as any).company_id) ? (item as any).company_id[1] : 'Unknown',
                reason_detail: (item as any).narration || item.name || item.payment_ref || item.ref || '',
            });
        });

        // Format for response - aggregate by reason AND store
        const storeBreakdown = new Map<string, { reason: string; store: string; total: number; count: number }>();

        cashOuts.forEach((item) => {
            const reference = (item.name || item.payment_ref || item.ref || '').toLowerCase();
            const amount = Math.abs(item.amount);
            const store = Array.isArray(item.journal_id) ? item.journal_id[1] : 'Unknown';

            let category = 'Other';
            if (reference.includes('bank') || reference.includes('banking')) {
                category = 'Banking';
            } else if (reference.includes('petty') || reference.includes('cash out')) {
                category = 'Petty Cash';
            } else if (reference.includes('fuel') || reference.includes('diesel') || reference.includes('petrol')) {
                category = 'Fuel';
            } else if (reference.includes('supplies') || reference.includes('office') || reference.includes('cleaning')) {
                category = 'Supplies';
            }

            const key = `${category}|${store}`;
            if (!storeBreakdown.has(key)) {
                storeBreakdown.set(key, { reason: category, store, total: 0, count: 0 });
            }
            const entry = storeBreakdown.get(key)!;
            entry.total += amount;
            entry.count += 1;
        });

        const breakdown = Array.from(storeBreakdown.values())
            .filter(r => r.count > 0)
            .sort((a, b) => b.total - a.total);

        const totalCashOut = cashOuts.reduce((sum, item) => sum + Math.abs(item.amount), 0);

        // Recent transactions for detailed view
        const recentTransactions = cashOuts.slice(0, 20).map(item => ({
            id: item.id,
            date: item.date,
            amount: Math.abs(item.amount),
            reference: (item as any).narration || (item.name || item.payment_ref || item.ref || '') + ((item as any).narration ? ` - ${(item as any).narration}` : ''),
            store: Array.isArray(item.journal_id) ? item.journal_id[1] : 'Unknown',
            company: Array.isArray((item as any).company_id) ? (item as any).company_id[1] : 'Unknown',
            reason_detail: (item as any).narration || '',
        }));

        return NextResponse.json({
            totalCashOut,
            transactionCount: cashOuts.length,
            breakdown,
            recentTransactions,
        });

    } catch (error: any) {
        console.error('[No Sale API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
    }
}
