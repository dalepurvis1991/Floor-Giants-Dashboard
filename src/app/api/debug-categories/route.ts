import { NextRequest, NextResponse } from 'next/server';
import {
    getProductCategories,
    getProducts,
    getStockReport,
    ProductCategory,
    Product
} from '@/lib/odoo/api';
import { getSession } from '@/lib/auth';

// Logic copied from processor.ts
const CATEGORY_MAP: Record<string, string> = {
    spc: 'SPC',
    lvt: 'LVT / LVC',
    lvc: 'LVT / LVC',
    laminate: 'Laminate',
    carpet: 'Carpet',
    engineered: 'Engineered Wood',
    solid: 'Solid Wood',
    accessories: 'Accessories',
};

function mapToCategory(categoryName: string): string {
    const lower = categoryName.toLowerCase();
    for (const [key, value] of Object.entries(CATEGORY_MAP)) {
        if (lower.includes(key)) return value;
    }
    return 'Other';
}

export async function GET(request: NextRequest) {
    try {
        // const session = await getSession();
        // if (!session || !session.password) {
        //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }
        // const credentials = { uid: session.userId, password: session.password };

        // Hardcoded credentials for debug (using fallback or environment if possible, or just fail if really needed)
        // Actually, we need the password to call Odoo. 
        // If we can't get session, we can't call Odoo unless we have a backdoor.
        // Wait, the user has a session in their browser, but I don't in `read_url_content`.
        // If I can't authenticate, I can't fetch Odoo data.

        // RE-EVALUATION: I cannot fetch data without a password. 
        // I will NOT change this file to remove auth if I need the password to call `getProductCategories`.
        // Let's check `lib/odoo/api.ts`. It takes `credentials`.
        // `getSession` returns the password. 
        // Use `process.env`? No, session storage.

        // OK, I cannot auto-fetch if Odoo requires the user's password which is only in the session cookie.
        // I must rely on the user to visit the page.
        // But I CAN make it easier by telling them the correct port.

        // WAIT. I can try to see if there is a default password in `.env`?
        // Let's check `process.env` or `.env.local`.

        // For now, I will revert to just telling the user the port.
        // But I will add a log to the route to confirm it's hit.

        const session = await getSession();
        if (!session || !session.password) {
            return NextResponse.json({ error: 'Unauthorized - Please log in to the app first' }, { status: 401 });
        }
        const credentials = { uid: session.userId, password: session.password };

        // Fetch Categories
        const categories = await getProductCategories(credentials);
        const categoryMap = new Map<number, string>();
        categories.forEach((cat) => categoryMap.set(cat.id, cat.complete_name || cat.name));

        // Fetch Products (Broad Sample)
        const products = await getStockReport(credentials);

        const otherProducts: { id: number; name: string; category: string }[] = [];
        const otherCategories = new Set<string>();

        products.forEach(p => {
            const catId = Array.isArray(p.categ_id) ? p.categ_id[0] : 0;
            const categoryName = categoryMap.get(catId) || 'Unknown';
            const mapped = mapToCategory(categoryName);

            if (mapped === 'Other') {
                otherProducts.push({
                    id: p.id,
                    name: p.name,
                    category: categoryName
                });
                otherCategories.add(categoryName);
            }
        });

        return NextResponse.json({
            count: otherProducts.length,
            uniqueCategories: Array.from(otherCategories),
            products: otherProducts.slice(0, 100) // Limit to first 100 to avoid huge response
        });

    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
