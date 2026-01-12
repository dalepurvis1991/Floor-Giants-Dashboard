import { NextRequest, NextResponse } from 'next/server';
import {
    getPosOrders,
    getPosOrderLines,
    getProductCategories,
    getProducts,
} from '@/lib/odoo/api';
import { processCategoryProducts } from '../../../../lib/odoo/processor';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !session.password) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const credentials = { uid: session.userId, password: session.password };

        const searchParams = request.nextUrl.searchParams;
        const categoryName = searchParams.get('category');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const storeId = searchParams.get('storeId')
            ? parseInt(searchParams.get('storeId')!)
            : undefined;
        const region = searchParams.get('region') as 'North' | 'South' | null;

        if (!categoryName || !dateFrom || !dateTo) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Fetch POS orders
        const posOrders = await getPosOrders(dateFrom, dateTo, storeId, undefined, credentials);
        const posOrderIds = posOrders.map(o => o.id);

        // Fetch other data in parallel
        const [posLines, categories] = await Promise.all([
            getPosOrderLines(posOrderIds, credentials),
            getProductCategories(credentials),
        ]);

        // Fetch products for aggregation
        const productIds = new Set<number>();
        posLines.forEach((l) => l.product_id && productIds.add(l.product_id[0]));
        const products = await getProducts(Array.from(productIds), credentials);

        // Process data for the specific category
        const productStats = processCategoryProducts(
            categoryName,
            posOrders,
            posLines,
            categories,
            products,
            region || undefined
        );

        return NextResponse.json(productStats);
    } catch (error) {
        console.error('Category Products API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch category products', details: String(error) },
            { status: 500 }
        );
    }
}
