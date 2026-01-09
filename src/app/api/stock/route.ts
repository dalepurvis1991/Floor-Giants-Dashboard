import { NextRequest, NextResponse } from 'next/server';
import {
    getPosOrders,
    getPosOrderLines,
    getProductCategories,
    getProducts,
    getStockReport,
} from '@/lib/odoo/api';
import { processStockData } from '@/lib/odoo/processor';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !session.password) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const credentials = { uid: session.userId, password: session.password };

        const searchParams = request.nextUrl.searchParams;
        const dateTo = new Date().toISOString().split('T')[0];
        const dateFromDate = new Date();
        dateFromDate.setDate(dateFromDate.getDate() - 30); // Last 30 days
        const dateFrom = dateFromDate.toISOString().split('T')[0];

        const storeId = searchParams.get('storeId')
            ? parseInt(searchParams.get('storeId')!)
            : undefined;

        // Fetch required data in parallel
        const [posOrders, categories, products] = await Promise.all([
            getPosOrders(dateFrom, dateTo, storeId, undefined, credentials),
            getProductCategories(credentials),
            getStockReport(credentials)
        ]);

        // Fetch Order Lines for the POS orders
        const posOrderIds = posOrders.map((o) => o.id);
        const posLines = await getPosOrderLines(posOrderIds, credentials);

        // Process data
        const stockMetrics = processStockData(
            products,
            posLines,
            categories,
            30 // daysInPeriod
        );

        return NextResponse.json(stockMetrics);
    } catch (error) {
        console.error('Stock API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stock data', details: String(error) },
            { status: 500 }
        );
    }
}
