import { NextRequest, NextResponse } from 'next/server';
import {
    getPosOrderById,
    getPosOrderLines,
    getSaleOrderLines,
    getSaleOrdersByIds,
    getMessages,
} from '@/lib/odoo/api';
import { getSession } from '@/lib/auth';

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
        const orderId = parseInt(id);
        const searchParams = request.nextUrl.searchParams;
        const type = searchParams.get('type') || 'pos';

        let order: any;
        let lines: any[];
        let messages: any[] = [];

        if (type === 'sale') {
            const [orders, saleLines, msgs] = await Promise.all([
                getSaleOrdersByIds([orderId], credentials),
                getSaleOrderLines([orderId], credentials),
                getMessages('sale.order', orderId, credentials)
            ]);
            order = orders[0];
            lines = saleLines;
            messages = msgs;
        } else {
            const [posOrder, posLines] = await Promise.all([
                getPosOrderById(orderId, credentials),
                getPosOrderLines([orderId], credentials),
            ]);
            order = posOrder;
            lines = posLines;

            // FALLBACK: If POS order has no lines, check if it's linked to a Sales Order
            const soOrigin = (order as any)?.sale_order_origin_id;
            if (lines.length === 0 && soOrigin && Array.isArray(soOrigin)) {
                const soId = soOrigin[0];
                const [soLines] = await Promise.all([
                    getSaleOrderLines([soId], credentials)
                ]);

                if (soLines.length > 0) {
                    lines = soLines.map((sol: any) => ({
                        id: sol.id,
                        order_id: [orderId, order.name],
                        product_id: sol.product_id,
                        qty: sol.product_uom_qty,
                        price_unit: sol.price_unit,
                        price_subtotal: sol.price_subtotal,
                        price_subtotal_incl: sol.price_subtotal,
                        discount: sol.discount,
                        margin: 0,
                    } as any));
                }
            }
        }

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        return NextResponse.json({ order, lines, messages });
    } catch (error) {
        console.error('Order Detail API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch order details' }, { status: 500 });
    }
}
