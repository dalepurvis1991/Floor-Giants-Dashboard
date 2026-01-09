import { NextRequest, NextResponse } from 'next/server';
import {
    getPosOrderById,
    getPosOrderLines,
    getSaleOrderLines,
    getSaleOrdersByIds,
} from '@/lib/odoo/api';
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
        const orderId = parseInt(params.id);

        let [order, lines] = await Promise.all([
            getPosOrderById(orderId, credentials),
            getPosOrderLines([orderId], credentials),
        ]);

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Fetch products to get names if product_id only has [id, name]
        // Actually PosOrderLine already has product_id: [number, string]

        // FALLBACK: If POS order has no lines, check if it's linked to a Sales Order
        // and fetch lines from there. This happens when a Sales Order is settled in POS.
        const soOrigin = (order as any).sale_order_origin_id;
        if (lines.length === 0 && soOrigin && Array.isArray(soOrigin)) {
            const soId = soOrigin[0];
            const [so, soLines] = await Promise.all([
                getSaleOrdersByIds([soId], credentials),
                getSaleOrderLines([soId], credentials),
            ]);

            if (soLines.length > 0) {
                // Map Sale Order Lines to PosOrderLine format for the UI
                lines = soLines.map((sol: any) => ({
                    id: sol.id,
                    order_id: [orderId, order.name],
                    product_id: sol.product_id,
                    qty: sol.product_uom_qty,
                    price_unit: sol.price_unit,
                    price_subtotal: sol.price_subtotal,
                    price_subtotal_incl: sol.price_subtotal, // Approximation
                    discount: sol.discount,
                    margin: 0, // Margin might be missing on SO lines in this env
                } as any));
            }
        }

        return NextResponse.json({ order, lines });
    } catch (error) {
        console.error('Order Detail API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch order details' }, { status: 500 });
    }
}
