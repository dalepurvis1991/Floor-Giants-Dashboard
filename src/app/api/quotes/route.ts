import { getSaleOrders, getSaleOrderLines, getProductCategories, getProducts, SaleOrder, SaleOrderLine } from '@/lib/odoo/api';
import { getSession } from '@/lib/auth';
import { mapToCategory, isSample } from '@/lib/odoo/categorizer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const now = new Date();
        const session = await getSession();
        if (!session || !session.password) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const credentials = { uid: session.userId, password: session.password };

        const searchParams = request.nextUrl.searchParams;
        const dateTo = searchParams.get('dateTo') || new Date().toISOString().split('T')[0];
        const defaultDateFrom = new Date();
        defaultDateFrom.setDate(defaultDateFrom.getDate() - 90);
        const dateFrom = searchParams.get('dateFrom') || defaultDateFrom.toISOString().split('T')[0];
        const storeId = searchParams.get('storeId') ? parseInt(searchParams.get('storeId')!) : undefined;
        const region = searchParams.get('region');

        // 1. Fetch Quotes (Draft + Sent)
        const quotes = await getSaleOrders(dateFrom, dateTo, undefined, undefined, credentials, { states: ['draft', 'sent'] });

        // 2. Fetch Won Orders for Conversion Rate
        const wonOrders = await getSaleOrders(dateFrom, dateTo, undefined, undefined, credentials, { states: ['sale', 'done'] });

        // 3. Product Info for checks (Samples, Categories)
        const categories = await getProductCategories(credentials);
        const odooCategoryMap = new Map<number, string>();
        categories.forEach(c => odooCategoryMap.set(c.id, c.complete_name || c.name));

        const quoteIds = quotes.map(q => q.id);
        const wonOrderIds = wonOrders.map(o => o.id);
        const allOrderIds = Array.from(new Set([...quoteIds, ...wonOrderIds]));
        const lines = await getSaleOrderLines(allOrderIds, credentials);

        // --- FILTER SAMPLES & BUILD STATS ---
        const actualQuotes: SaleOrder[] = [];
        const sampleLineCounts = new Map<number, number>(); // orderId -> sampleCount

        const quoteLineMap = new Map<number, SaleOrderLine[]>();
        lines.forEach(l => {
            const oid = l.order_id[0];
            if (!quoteLineMap.has(oid)) quoteLineMap.set(oid, []);
            quoteLineMap.get(oid)!.push(l);
        });

        // Collect all product IDs from all lines to check for samples
        const allProductIds = Array.from(new Set(
            lines
                .map(l => Array.isArray(l.product_id) ? l.product_id[0] : null)
                .filter((id): id is number => id !== null)
        ));

        const productInfoMap = new Map<number, { sku: string, name: string, catId: number }>();
        if (allProductIds.length > 0) {
            const productDetails = await getProducts(allProductIds, credentials);
            productDetails.forEach(p => {
                productInfoMap.set(p.id, {
                    sku: p.default_code || '',
                    name: p.name || '',
                    catId: Array.isArray(p.categ_id) ? p.categ_id[0] : 0
                });
            });
        }

        let totalActiveSamples = 0;

        // Process lines to count net samples (delivered - returned)
        // We look at all lines in the fetched orders. 
        // NOTE: For true "Active" samples, we might need a wider window, 
        // but for now we sum net quantity in the selected period.
        lines.forEach(l => {
            if (!Array.isArray(l.product_id)) return;
            const prod = productInfoMap.get(l.product_id[0]);
            if (prod && isSample(prod.sku, prod.name)) {
                // Sum quantities to handle returns within the period
                totalActiveSamples += l.product_uom_qty || 0;
            }
        });

        quotes.forEach(q => {
            const qLines = quoteLineMap.get(q.id) || [];
            // A quote is "Actual" if it has any non-sample line
            const hasNonSample = qLines.some(l => {
                if (!Array.isArray(l.product_id)) return false;
                const prod = productInfoMap.get(l.product_id[0]);
                return !prod || !isSample(prod.sku, prod.name);
            });

            if (hasNonSample || qLines.length === 0) {
                actualQuotes.push(q);
            }
        });

        // --- METRICS ---
        const totalOutstandingValue = actualQuotes.reduce((sum, q) => sum + q.amount_untaxed, 0);
        const totalOpps = actualQuotes.length + wonOrders.length;
        const conversionRate = totalOpps > 0 ? (wonOrders.length / totalOpps) * 100 : 0; // Simple Global Conversion

        // Salesperson & Store Leaderboards
        const salespersonStats = new Map<string, {
            name: string,
            pipelineValue: number,
            quoteCount: number,
            wonCount: number,
            totalOpps: number
        }>();

        const storeStats = new Map<string, {
            name: string,
            pipelineValue: number,
            quoteCount: number
        }>();

        // Attribute Quotes
        actualQuotes.forEach(q => {
            const spName = Array.isArray(q.user_id) ? q.user_id[1] : 'Unassigned';
            const teamName = Array.isArray(q.team_id) ? q.team_id[1] : 'Unknown Team';

            // Salesperson
            const sp = salespersonStats.get(spName) || { name: spName, pipelineValue: 0, quoteCount: 0, wonCount: 0, totalOpps: 0 };
            sp.pipelineValue += q.amount_untaxed;
            sp.quoteCount += 1;
            sp.totalOpps += 1;
            salespersonStats.set(spName, sp);

            // Store (Approximated by Team)
            const st = storeStats.get(teamName) || { name: teamName, pipelineValue: 0, quoteCount: 0 };
            st.pipelineValue += q.amount_untaxed;
            st.quoteCount += 1;
            storeStats.set(teamName, st);
        });

        // Attribute Won Orders (for Conversion Rate)
        wonOrders.forEach(o => {
            const spName = Array.isArray(o.user_id) ? o.user_id[1] : 'Unassigned';
            const sp = salespersonStats.get(spName);
            if (sp) {
                sp.wonCount += 1;
                sp.totalOpps += 1;
            } else {
                // If they have no active quotes but have sales, we still track them?
                // For simplicity, we only track those with active pipeline content or create new entry
                salespersonStats.set(spName, { name: spName, pipelineValue: 0, quoteCount: 0, wonCount: 1, totalOpps: 1 });
            }
        });

        const bySalesperson = Array.from(salespersonStats.values())
            .map(s => ({
                name: s.name,
                value: s.pipelineValue,
                count: s.quoteCount,
                conversionRate: s.totalOpps > 0 ? (s.wonCount / s.totalOpps) * 100 : 0,
                avgValue: s.quoteCount > 0 ? s.pipelineValue / s.quoteCount : 0
            }))
            .sort((a, b) => b.value - a.value);

        const byStore = Array.from(storeStats.values())
            .map(s => ({
                name: s.name,
                value: s.pipelineValue,
                count: s.quoteCount,
                avgValue: s.quoteCount > 0 ? s.pipelineValue / s.quoteCount : 0
            }))
            .sort((a, b) => b.value - a.value);


        // Product Mix & Aged Profile (Existing Logic)
        const productMixMap = new Map<string, number>();
        actualQuotes.forEach(q => {
            const qLines = quoteLineMap.get(q.id) || [];
            qLines.forEach(line => {
                if (!Array.isArray(line.product_id)) return;
                const pid = line.product_id[0];
                const prod = productInfoMap.get(pid);
                const odooCatName = prod ? (odooCategoryMap.get(prod.catId) || 'Other') : 'Other';
                const sku = prod?.sku || '';
                const name = prod?.name || '';
                const mappedCategory = mapToCategory(odooCategoryMap.get(prod?.catId || 0) || '', sku, name); // Fixed arg

                const current = productMixMap.get(mappedCategory) || 0;
                productMixMap.set(mappedCategory, current + line.price_subtotal);
            });
        });

        const productMix = Array.from(productMixMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const agedStats = { less30: 0, less60: 0, less90: 0, more90: 0 };
        actualQuotes.forEach(q => {
            const ageDays = (now.getTime() - new Date(q.date_order).getTime()) / (1000 * 3600 * 24);
            const val = q.amount_untaxed;
            if (ageDays <= 30) agedStats.less30 += val;
            else if (ageDays <= 60) agedStats.less60 += val;
            else if (ageDays <= 90) agedStats.less90 += val;
            else agedStats.more90 += val;
        });

        return NextResponse.json({
            metrics: {
                totalQuotes: actualQuotes.length,
                totalValue: totalOutstandingValue,
                conversionRate,
                avgQuoteValue: actualQuotes.length > 0 ? totalOutstandingValue / actualQuotes.length : 0,
                sampleCount: Math.max(0, totalActiveSamples)
            },
            agedQuotes: [
                { name: '< 30 Days', value: agedStats.less30 },
                { name: '30-60 Days', value: agedStats.less60 },
                { name: '60-90 Days', value: agedStats.less90 },
                { name: '> 90 Days', value: agedStats.more90 },
            ],
            bySalesperson,
            byStore, // Added
            productMix,
            quotes: actualQuotes.sort((a, b) => new Date(b.date_order).getTime() - new Date(a.date_order).getTime()).slice(0, 20)
        });

    } catch (error: any) {
        console.error('[Quotes API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
    }
}
