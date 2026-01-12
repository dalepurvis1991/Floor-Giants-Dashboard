import { getSaleOrders, getSaleOrderLines, getProducts, getProductCategories } from '@/lib/odoo/api';
import { getSession } from '@/lib/auth';
import { mapToCategory } from '@/lib/odoo/categorizer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !session.password) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const credentials = { uid: session.userId, password: session.password };

        const searchParams = request.nextUrl.searchParams;
        const dateFrom = searchParams.get('dateFrom') || '';
        const dateTo = searchParams.get('dateTo') || '';
        const storeId = searchParams.get('storeId') ? parseInt(searchParams.get('storeId')!) : undefined;
        const type = searchParams.get('type'); // 'age', 'category', 'salesperson', 'store'
        const value = searchParams.get('value'); // The segment value (e.g., '> 90 Days', 'Carpet')

        // Fetch quotes (Draft + Sent)
        const quotes = await getSaleOrders(dateFrom, dateTo, undefined, undefined, credentials, { states: ['draft', 'sent'] });

        // Filter by store if provided
        let filteredQuotes = quotes;
        if (storeId) {
            filteredQuotes = filteredQuotes.filter(q => q.team_id && q.team_id[0] === storeId);
        }

        const now = new Date();

        // 1. Filter by Type
        if (type === 'age' && value) {
            filteredQuotes = filteredQuotes.filter(q => {
                const ageDays = (now.getTime() - new Date(q.date_order).getTime()) / (1000 * 3600 * 24);
                if (value === '< 30 Days') return ageDays <= 30;
                if (value === '30-60 Days') return ageDays > 30 && ageDays <= 60;
                if (value === '60-90 Days') return ageDays > 60 && ageDays <= 90;
                if (value === '> 90 Days') return ageDays > 90;
                return true;
            });
        } else if (type === 'salesperson' && value) {
            filteredQuotes = filteredQuotes.filter(q => {
                const spName = Array.isArray(q.user_id) ? q.user_id[1] : 'Unassigned';
                return spName === value;
            });
        } else if (type === 'store' && value) {
            filteredQuotes = filteredQuotes.filter(q => {
                const teamName = Array.isArray(q.team_id) ? q.team_id[1] : 'Unknown Team';
                return teamName === value;
            });
        } else if (type === 'category' && value) {
            // This is harder as it's line-based. We fetch lines and filter quotes that have at least one line in this category.
            const quoteIds = filteredQuotes.map(q => q.id);
            if (quoteIds.length > 0) {
                const lines = await getSaleOrderLines(quoteIds, credentials);
                const productIds = Array.from(new Set(lines.map(l => l.product_id[0])));
                const products = await getProducts(productIds, credentials);
                const categories = await getProductCategories(credentials);
                const catMap = new Map(categories.map(c => [c.id, c.complete_name || c.name]));

                const productInfo = new Map(products.map(p => [p.id, {
                    sku: p.default_code || '',
                    name: p.name || '',
                    catId: Array.isArray(p.categ_id) ? p.categ_id[0] : 0
                }]));

                const matchingQuoteIds = new Set<number>();
                lines.forEach(l => {
                    const prod = productInfo.get(l.product_id[0]);
                    if (prod) {
                        const mapped = mapToCategory(catMap.get(prod.catId) || '', prod.sku, prod.name);
                        if (mapped === value) {
                            matchingQuoteIds.add(l.order_id[0]);
                        }
                    }
                });
                filteredQuotes = filteredQuotes.filter(q => matchingQuoteIds.has(q.id));
            }
        }

        return NextResponse.json(filteredQuotes.map(q => ({
            id: q.id,
            name: q.name,
            date_order: q.date_order,
            amount_total: q.amount_total,
            partner_id: q.partner_id,
            user_id: q.user_id,
            team_id: q.team_id,
            company_id: q.company_id
        })));

    } catch (error: any) {
        console.error('[Quotes Drilldown API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
