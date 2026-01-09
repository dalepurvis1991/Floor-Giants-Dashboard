import { NextRequest, NextResponse } from 'next/server';
import { getPosOrderById, getPosOrderLines, getProducts } from '@/lib/odoo/api';
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

        const [order, lines] = await Promise.all([
            getPosOrderById(orderId, credentials),
            getPosOrderLines([orderId], credentials),
        ]);

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Fetch products to get names if product_id only has [id, name]
        // Actually PosOrderLine already has product_id: [number, string]

        return NextResponse.json({ order, lines });
    } catch (error) {
        console.error('Order Detail API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch order details' }, { status: 500 });
    }
}
