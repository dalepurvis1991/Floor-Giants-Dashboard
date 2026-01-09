import { NextRequest, NextResponse } from 'next/server';
import {
    getSaleOrders,
    getSaleOrderLines,
    getPosOrders,
    getPosOrderLines,
    getProductCategories,
    getRefunds,
    getProducts,
    getSaleOrdersByIds,
} from '@/lib/odoo/api';
import { processDashboardData } from '@/lib/odoo/processor';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !session.password) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const credentials = { uid: session.userId, password: session.password };

        const searchParams = request.nextUrl.searchParams;
        const dateFrom = searchParams.get('dateFrom') || getDefaultDateFrom();
        const dateTo = searchParams.get('dateTo') || getDefaultDateTo();
        const companyId = searchParams.get('companyId')
            ? parseInt(searchParams.get('companyId')!)
            : undefined;
        // If userId is provided in query, filter by it, otherwise default to current user if restriction is needed
        // For now, let's allow fetching data for all users unless restricted by Odoo rules
        const queryUserId = searchParams.get('userId')
            ? parseInt(searchParams.get('userId')!)
            : undefined;

        // Fetch all required data in parallel with user credentials
        const [posOrders, categories] = await Promise.all([
            getPosOrders(dateFrom, dateTo, undefined, queryUserId, credentials),
            getProductCategories(credentials),
        ]);

        // Fetch order lines
        const posOrderIds = posOrders.map((o) => o.id);
        const posLines = await getPosOrderLines(posOrderIds, credentials);

        // Fetch Linked Sale Orders for Salesperson Attribution
        const linkedSoIds = new Set<number>();
        posLines.forEach((l) => {
            if (l.sale_order_origin_id) linkedSoIds.add(l.sale_order_origin_id[0]);
        });
        const linkedSaleOrders = await getSaleOrdersByIds(Array.from(linkedSoIds), credentials);

        // Get unique product IDs to fetch categories
        const productIds = new Set<number>();
        posLines.forEach((l) => l.product_id && productIds.add(l.product_id[0]));

        const products = await getProducts(Array.from(productIds), credentials);

        // Process and return metrics
        const metrics = processDashboardData(
            linkedSaleOrders, // saleOrders (Used for salesperson lookup)
            [], // saleLines
            posOrders,
            posLines,
            categories,
            products,
            []  // refundOrders
        );

        return NextResponse.json(metrics);
    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data', details: String(error) },
            { status: 500 }
        );
    }
}

function getDefaultDateFrom(): string {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split('T')[0];
}

function getDefaultDateTo(): string {
    return new Date().toISOString().split('T')[0];
}
