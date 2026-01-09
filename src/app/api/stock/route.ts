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
    console.log('[Stock API] GET request received');
    try {
        const session = await getSession();
        if (!session || !session.password) {
            console.warn('[Stock API] Unauthorized: No session or password');
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

        // 1. Fetch Categories
        console.log('[Stock API] Fetching categories...');
        const categories = await getProductCategories(credentials);

        // 2. Fetch POS Orders
        console.log('[Stock API] Fetching POS orders...');
        const posOrders = await getPosOrders(dateFrom, dateTo, storeId, undefined, credentials);
        const posOrderIds = posOrders.map((o) => o.id);

        let posLines: any[] = [];
        let soldProductIds: number[] = [];

        // 3. Fetch POS Order Lines
        if (posOrderIds.length > 0) {
            console.log(`[Stock API] Fetching lines for ${posOrderIds.length} orders...`);
            posLines = await getPosOrderLines(posOrderIds, credentials);

            const productIdsSet = new Set<number>();
            posLines.forEach(l => {
                if (l.product_id && Array.isArray(l.product_id)) {
                    productIdsSet.add(l.product_id[0]);
                }
            });
            soldProductIds = Array.from(productIdsSet);
        }
        console.log(`[Stock API] Identified ${soldProductIds.length} unique sold products`);

        // 4. Fetch Product Details (Surgical + Broad Sample)
        console.log('[Stock API] Fetching product stock levels...');
        // We fetch sold products first, then a broad sample of general stock to find low items
        const [activeProducts, broadProducts] = await Promise.all([
            soldProductIds.length > 0 ? getProducts(soldProductIds, credentials) : Promise.resolve([]),
            getStockReport(credentials) // Fetches up to 2000 saleable products
        ]);

        // Merge and deduplicate
        const productMap = new Map<number, any>();
        activeProducts.forEach(p => productMap.set(p.id, p));
        broadProducts.forEach(p => productMap.set(p.id, p));
        const products = Array.from(productMap.values());

        console.log(`[Stock API] Total products for processing: ${products.length}`);

        // 5. Process Data
        console.log('[Stock API] Processing final metrics...');
        const stockMetrics = processStockData(
            products,
            posLines,
            categories,
            30 // daysInPeriod
        );
        console.log('[Stock API] Success');

        return NextResponse.json(stockMetrics);
    } catch (error) {
        console.error('[Stock API] ERROR:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stock data', details: String(error) },
            { status: 500 }
        );
    }
}
