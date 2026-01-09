import { NextRequest, NextResponse } from 'next/server';
import { getPosOrders, getPosOrderLines, getSaleOrdersByIds } from '@/lib/odoo/api';
import { getSession } from '@/lib/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session || !session.password) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const credentials = { uid: session.userId, password: session.password };
        const salespersonId = parseInt(params.id);

        const searchParams = request.nextUrl.searchParams;
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const storeId = searchParams.get('storeId') ? parseInt(searchParams.get('storeId')!) : undefined;

        if (!dateFrom || !dateTo) {
            return NextResponse.json({ error: 'Date range required' }, { status: 400 });
        }

        // Fetch POS orders for this salesperson
        const posOrders = await getPosOrders(dateFrom, dateTo, storeId, salespersonId, credentials);

        // Fetch Linked Sale Orders to verify attribution (if needed)
        // For the drilldown list, we mostly want the POS orders directly.
        // We can fetch lines to show totals etc if needed, but getPosOrders already has amount_total.

        return NextResponse.json(posOrders);
    } catch (error) {
        console.error('Salesperson Orders API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
