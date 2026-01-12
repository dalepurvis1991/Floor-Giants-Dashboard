import { NextRequest, NextResponse } from 'next/server';
import {
    getPosOrders,
    getPosOrderLines,
    getProductCategories,
    getProducts,
    getStockReport,
    getScraps,
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

        // Default to last 30 days if not provided
        const dateTo = searchParams.get('dateTo') || new Date().toISOString().split('T')[0];
        const defaultDateFrom = new Date();
        defaultDateFrom.setDate(defaultDateFrom.getDate() - 30);
        const dateFrom = searchParams.get('dateFrom') || defaultDateFrom.toISOString().split('T')[0];

        const storeId = searchParams.get('storeId')
            ? parseInt(searchParams.get('storeId')!)
            : undefined;
        const region = searchParams.get('region') || undefined;

        // Calculate days in period
        const start = new Date(dateFrom);
        const end = new Date(dateTo);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const daysInPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

        // 1. Fetch Categories
        console.log('[Stock API] Fetching categories...');
        const categories = await getProductCategories(credentials).catch(e => {
            console.error('[Stock API] Error fetching categories:', e);
            return [];
        });

        // 2. Fetch POS Orders (respecting storeId and date range)
        console.log(`[Stock API] Fetching POS orders from ${dateFrom} to ${dateTo}...`);
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

        // 4.5 Fetch Scraps (Write-offs)
        let scraps: any[] = [];
        try {
            console.log('[Stock API] Fetching scraps...');
            scraps = await getScraps(dateFrom, dateTo, credentials);
        } catch (e) {
            console.error('[Stock API] Error fetching scraps:', e);
        }

        // 5. Process Data
        console.log('[Stock API] Processing final metrics...');
        try {
            const stockMetrics = processStockData(
                products,
                posOrders,
                posLines,
                categories,
                daysInPeriod,
                scraps,
                region as any
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
