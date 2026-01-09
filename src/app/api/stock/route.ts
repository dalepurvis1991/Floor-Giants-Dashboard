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
        const categories = await getProductCategories(credentials).catch(e => {
            console.error('[Stock API] Error fetching categories:', e);
            return [];
        });

        // 2. Fetch POS Orders
        console.log('[Stock API] Fetching POS orders...');
        const posOrders = await getPosOrders(dateFrom, dateTo, storeId, undefined, credentials).catch(e => {
            console.error('[Stock API] Error fetching POS orders:', e);
            return [];
        });
        const posOrderIds = posOrders.map((o) => o.id);

        let posLines: any[] = [];
        let soldProductIds: number[] = [];

        // 3. Fetch POS Order Lines
        if (posOrderIds.length > 0) {
            try {
                console.log(`[Stock API] Fetching lines for ${posOrderIds.length} orders...`);
                posLines = await getPosOrderLines(posOrderIds, credentials);

                const productIdsSet = new Set<number>();
                posLines.forEach(l => {
                    if (l.product_id && Array.isArray(l.product_id)) {
                        productIdsSet.add(l.product_id[0]);
                    }
                });
                soldProductIds = Array.from(productIdsSet);
                console.log(`[Stock API] Identified ${soldProductIds.length} unique sold products`);
            } catch (e) {
                console.error('[Stock API] Error fetching POS order lines:', e);
            }
        }

        // 4. Fetch Product Details (Surgical + Broad Sample)
        console.log('[Stock API] Fetching product stock levels...');
        let activeProducts: any[] = [];
        let broadProducts: any[] = [];

        try {
            if (soldProductIds.length > 0) {
                console.log(`[Stock API] Fetching details for ${soldProductIds.length} active products...`);
                activeProducts = await getProducts(soldProductIds, credentials);
            }
        } catch (e) {
            console.error('[Stock API] Error fetching active products:', e);
        }

        try {
            console.log('[Stock API] Fetching broad stock report sample...');
            broadProducts = await getStockReport(credentials);
        } catch (e) {
            console.error('[Stock API] Error fetching broad stock report:', e);
        }

        // Merge and deduplicate
        const productMap = new Map<number, any>();
        activeProducts.forEach(p => p && p.id && productMap.set(p.id, p));
        broadProducts.forEach(p => p && p.id && productMap.set(p.id, p));
        const products = Array.from(productMap.values());

        console.log(`[Stock API] Total unique products for processing: ${products.length}`);

        // 5. Process Data
        console.log('[Stock API] Processing final metrics...');
        try {
            const stockMetrics = processStockData(
                products,
                posLines,
                categories,
                30 // daysInPeriod
            );
            console.log('[Stock API] Success');
            return NextResponse.json(stockMetrics);
        } catch (processingError) {
            console.error('[Stock API] Processing error:', processingError);
            throw processingError;
        }

    } catch (error) {
        console.error('[Stock API] Top-level ERROR:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stock data', details: String(error) },
            { status: 500 }
        );
    }
}
