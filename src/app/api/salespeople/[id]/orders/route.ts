import { NextRequest, NextResponse } from 'next/server';
import { getPosOrders, getPosOrderLines, getSaleOrdersByIds } from '@/lib/odoo/api';
import { getSession } from '@/lib/auth';
import { getSalespersonForOrder } from '@/lib/odoo/processor';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getSession();
        if (!session || !session.password) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const credentials = { uid: session.userId, password: session.password };
        const salespersonId = parseInt(id);

        const searchParams = request.nextUrl.searchParams;
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const storeId = searchParams.get('storeId') ? parseInt(searchParams.get('storeId')!) : undefined;

        if (!dateFrom || !dateTo) {
            return NextResponse.json({ error: 'Date range required' }, { status: 400 });
        }

        // Fetch ALL POS orders for this period/store (we will filter by salesperson in memory to ensure consistency)
        // NOTE: We don't pass storeId to Odoo yet because we need to ensure we have ALL orders 
        // that MIGHT be attributed to this salesperson via linked SO from ANY store?
        // Actually, no. If the dashboard is filtered by store, the leaderboard totals are for that store.
        // So the drilldown MUST also be filtered by store.
        const posOrders = await getPosOrders(dateFrom, dateTo, storeId, undefined, credentials);

        if (posOrders.length === 0) {
            return NextResponse.json([]);
        }

        // Fetch Order Lines
        const posOrderIds = posOrders.map(o => o.id);
        const posLines = await getPosOrderLines(posOrderIds, credentials);

        // Fetch Linked Sale Orders for Attribution
        const linkedSoIds = new Set<number>();
        posLines.forEach(l => {
            if (l.sale_order_origin_id) linkedSoIds.add(l.sale_order_origin_id[0]);
        });
        const linkedSaleOrders = await getSaleOrdersByIds(Array.from(linkedSoIds), credentials);
        const saleOrderMap = new Map<number, any>();
        linkedSaleOrders.forEach(so => saleOrderMap.set(so.id, so));

        // Group lines by order
        const posLinesByOrder = new Map<number, any[]>();
        posLines.forEach(l => {
            const oid = Array.isArray(l.order_id) ? l.order_id[0] : 0;
            if (!posLinesByOrder.has(oid)) posLinesByOrder.set(oid, []);
            posLinesByOrder.get(oid)!.push(l);
        });

        // Filter orders by salesperson
        const filteredOrders = posOrders.filter(order => {
            const lines = posLinesByOrder.get(order.id) || [];
            const sp = getSalespersonForOrder(order, lines, saleOrderMap);
            const isMatch = sp.id === salespersonId;
            return isMatch;
        });

        console.log(`[Salesperson Orders API] Found ${filteredOrders.length} orders for ${salespersonId}`);

        return NextResponse.json(filteredOrders);
    } catch (error) {
        console.error('Salesperson Orders API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
