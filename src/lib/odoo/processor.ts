import {
    SaleOrder,
    SaleOrderLine,
    PosOrder,
    PosOrderLine,
    ProductCategory,
    Product,
} from './api';

export interface CategorySales {
    category: string;
    sales: number;
    margin: number;
    marginPercent: number;
    discounts: number;
}

export interface SalespersonStats {
    id: number;
    name: string;
    totalSales: number;
    margin: number;
    marginPercent: number;
    discounts: number;
    orderCount: number;
}

export interface StoreStats {
    id: number;
    name: string;
    totalSales: number;
    margin: number;
    marginPercent: number;
    discounts: number;
    refundCount: number;
    refundValue: number;
    alertLevel: 'ok' | 'warning' | 'critical';
    region: 'North' | 'South' | 'Other';
}

export interface RegionalStats {
    name: string;
    totalSales: number;
    margin: number;
    marginPercent: number;
    discounts: number;
    orderCount: number;
}

export interface DashboardMetrics {
    totalSales: number;
    totalMargin: number;
    totalMarginPercent: number;
    totalDiscounts: number;
    totalRefunds: number;
    refundCount: number;
    averageMarginPercent: number;
    categoryBreakdown: CategorySales[];
    salespersonStats: SalespersonStats[];
    storeStats: StoreStats[];
    regionalStats: RegionalStats[];
    lowMarginAlerts: { orderId: number; orderName: string; marginPercent: number }[];
}

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

const REGION_MAP: Record<string, 'North' | 'South'> = {
    'basildon': 'North',
    'hull': 'North',
    'doncaster': 'North',
    'derby': 'North',
    'nottingham': 'North',
    'cardiff 1': 'South',
    'cardiff 2': 'South',
    'merthyr': 'South',
    'swansea': 'South',
    'hedgend': 'South',
    'hedge end': 'South',
    'cd1': 'South',
    'cd2': 'South',
};

function getStoreRegion(storeName: string): 'North' | 'South' | 'Other' {
    const lower = storeName.toLowerCase();
    for (const [key, region] of Object.entries(REGION_MAP)) {
        if (lower.includes(key)) return region;
    }
    return 'Other';
}

export function getSalespersonForOrder(
    order: PosOrder,
    orderLines: PosOrderLine[],
    saleOrderMap: Map<number, SaleOrder>
): { id: number; name: string } {
    let userId = Array.isArray(order.user_id) ? order.user_id[0] : 0;
    let userName = Array.isArray(order.user_id) ? order.user_id[1] : 'Employee';

    // Check for linked Sale Order to override salesperson
    for (const line of orderLines) {
        if (line.sale_order_origin_id && saleOrderMap.has(line.sale_order_origin_id[0])) {
            const so = saleOrderMap.get(line.sale_order_origin_id[0])!;
            if (so.user_id) {
                userId = Array.isArray(so.user_id) ? so.user_id[0] : userId;
                userName = Array.isArray(so.user_id) ? so.user_id[1] : userName;
                break; // Use the first found original salesperson
            }
        }
    }

    if (!userName || userName === 'Unknown') userName = 'Employee';
    return { id: userId, name: userName };
}

export function processDashboardData(
    saleOrders: SaleOrder[], // Kept for signature compatibility but ignored
    saleLines: SaleOrderLine[], // Ignored
    posOrders: PosOrder[],
    posLines: PosOrderLine[],
    categories: ProductCategory[],
    products: Product[],
    refundOrders: SaleOrder[], // Ignored
    filterRegion?: 'North' | 'South'
): DashboardMetrics {
    const categoryMap = new Map<number, string>();
    categories.forEach((cat) => categoryMap.set(cat.id, cat.complete_name || cat.name));

    const productCategoryMap = new Map<number, number>();
    products.forEach((p) => {
        const catId = Array.isArray(p.categ_id) ? p.categ_id[0] : 0;
        productCategoryMap.set(p.id, catId);
    });

    // Aggregate sales metrics
    let totalSales = 0;
    let totalMargin = 0;
    let totalDiscounts = 0;
    let totalRefunds = 0;
    let refundCount = 0;

    const categoryStats = new Map<string, { sales: number; margin: number; discounts: number }>();
    const salespersonMap = new Map<number, SalespersonStats>();
    const storeMap = new Map<number, StoreStats>();
    const regionalMap = new Map<'North' | 'South', RegionalStats>();

    // Initialize regional stats
    const regions: ('North' | 'South')[] = ['North', 'South'];
    regions.forEach(r => {
        regionalMap.set(r, {
            name: r,
            totalSales: 0,
            margin: 0,
            marginPercent: 0,
            discounts: 0,
            orderCount: 0
        });
    });

    // Map pos lines by order ID for easier aggregation
    const posLinesByOrder = new Map<number, PosOrderLine[]>();
    posLines.forEach((line) => {
        const orderId = Array.isArray(line.order_id) ? line.order_id[0] : 0;
        if (!posLinesByOrder.has(orderId)) posLinesByOrder.set(orderId, []);
        posLinesByOrder.get(orderId)!.push(line);
    });

    // Map sale orders for salesperson attribution override
    const saleOrderMap = new Map<number, SaleOrder>();
    saleOrders.forEach(so => saleOrderMap.set(so.id, so));

    // Process POS orders ONLY
    posOrders.forEach((order) => {
        const configName = Array.isArray(order.config_id) ? order.config_id[1] : 'Unknown POS';
        const storeRegion = getStoreRegion(configName);

        // Apply region filter if specified
        if (filterRegion && storeRegion !== filterRegion) {
            return;
        }

        const orderLines = posLinesByOrder.get(order.id) || [];

        // Check if it's a refund
        const isRefund = order.amount_total < 0;
        if (isRefund) {
            refundCount += 1;
            // Refunds are negative in Odoo, so we take absolute for value tracking
            // but for net sales/margin we assume the negative values will reduce the total naturally?
            // Usually totalSales should be Net Sales.
            // However, totalRefunds tracks the gross value of refunds.
            // Let's assume order.amount_total is Inc VAT, but we want Ex VAT refunds too.
            // We'll calculate refund value from lines below.
        }

        // Calculate Order Totals from Lines (Ex VAT)
        let orderSalesExVat = 0;
        let orderDiscounts = 0;
        const orderMargin = order.margin || 0; // Margin is usually Ex VAT in Odoo reporting but let's trust the field

        orderLines.forEach(line => {
            orderSalesExVat += line.price_subtotal; // Sum Ex VAT
            const discountAmount = (line.price_unit * line.qty * line.discount) / 100;
            orderDiscounts += discountAmount;
        });

        if (isRefund) {
            totalRefunds += Math.abs(orderSalesExVat);
        }

        // Net Sales and Margin
        totalSales += orderSalesExVat;
        totalMargin += orderMargin;
        totalDiscounts += orderDiscounts;

        // Salesperson Processing
        const { id: userId, name: userName } = getSalespersonForOrder(order, orderLines, saleOrderMap);
        const configId = Array.isArray(order.config_id) ? order.config_id[0] : 0;

        if (!salespersonMap.has(userId)) {
            salespersonMap.set(userId, {
                id: userId,
                name: userName,
                totalSales: 0,
                margin: 0,
                marginPercent: 0,
                discounts: 0,
                orderCount: 0,
            });
        }
        const sp = salespersonMap.get(userId)!;
        sp.totalSales += orderSalesExVat;
        sp.margin += orderMargin;
        sp.discounts += orderDiscounts;
        sp.orderCount += 1;

        if (!storeMap.has(configId)) {
            storeMap.set(configId, {
                id: configId,
                name: configName,
                totalSales: 0,
                margin: 0,
                marginPercent: 0,
                discounts: 0,
                refundCount: 0,
                refundValue: 0,
                alertLevel: 'ok',
                region: getStoreRegion(configName),
            });
        }
        const store = storeMap.get(configId)!;
        store.totalSales += orderSalesExVat;
        store.margin += orderMargin;
        store.discounts += orderDiscounts;
        if (isRefund) {
            store.refundCount += 1;
            store.refundValue += Math.abs(orderSalesExVat);
        }

        // Aggregate Region Stats
        if (store.region !== 'Other') {
            const region = regionalMap.get(store.region as 'North' | 'South')!;
            region.totalSales += orderSalesExVat;
            region.margin += orderMargin;
            region.discounts += orderDiscounts;
            region.orderCount += 1;
        }
    });

    // Process POS order lines for categories and discounts
    posLines.forEach((line) => {
        const discountAmount = (line.price_unit * line.qty * line.discount) / 100;
        // totalDiscounts moved to posOrders loop

        const productId = Array.isArray(line.product_id) ? line.product_id[0] : 0;
        const categoryId = productCategoryMap.get(productId) || 0;

        // Skip category stats if the order this line belongs to was filtered out
        const orderId = Array.isArray(line.order_id) ? line.order_id[0] : 0;
        const parentOrder = posOrders.find(o => o.id === orderId);
        if (parentOrder && filterRegion) {
            const configName = Array.isArray(parentOrder.config_id) ? parentOrder.config_id[1] : '';
            if (getStoreRegion(configName) !== filterRegion) return;
        }

        const categoryName = categoryMap.get(categoryId) || 'Other';
        const mappedCategory = mapToCategory(categoryName);

        if (!categoryStats.has(mappedCategory)) {
            categoryStats.set(mappedCategory, { sales: 0, margin: 0, discounts: 0 });
        }
        const cat = categoryStats.get(mappedCategory)!;
        cat.sales += line.price_subtotal;
        cat.margin += line.margin || 0;
        cat.discounts += discountAmount;
    });

    // Calculate percentages and alerts
    const totalMarginPercent = totalSales > 0 ? (totalMargin / totalSales) * 100 : 0;

    salespersonMap.forEach((sp) => {
        sp.marginPercent = sp.totalSales > 0 ? (sp.margin / sp.totalSales) * 100 : 0;
    });

    regionalMap.forEach((reg) => {
        reg.marginPercent = reg.totalSales > 0 ? (reg.margin / reg.totalSales) * 100 : 0;
    });

    storeMap.forEach((store) => {
        store.marginPercent = store.totalSales > 0 ? (store.margin / store.totalSales) * 100 : 0;
        if (store.marginPercent < 40) {
            store.alertLevel = 'critical';
        } else if (store.marginPercent < 50) {
            store.alertLevel = 'warning';
        }
    });

    const categoryBreakdown: CategorySales[] = [];
    categoryStats.forEach((stats, category) => {
        categoryBreakdown.push({
            category,
            sales: stats.sales,
            margin: stats.margin,
            marginPercent: stats.sales > 0 ? (stats.margin / stats.sales) * 100 : 0,
            discounts: stats.discounts,
        });
    });

    // Low margin alerts (POS only)
    const lowMarginAlerts: { orderId: number; orderName: string; marginPercent: number }[] = [];
    posOrders.forEach((order) => {
        const configName = Array.isArray(order.config_id) ? order.config_id[1] : '';
        if (filterRegion && getStoreRegion(configName) !== filterRegion) return;

        const orderMargin = order.margin || 0;
        // Use calculated Ex VAT sales if possible, but for individual component logic:
        // We need order sales ex vat. We calculated it inside loop. 
        // Let's re-calculate or approximate if acceptable?
        // Actually we can just iterate posLinesByOrder again or just trust amount_total for ratio if VAT is consistent?
        // User wants Ex-VAT mostly. Let's recalculate accurately.
        const orderLines = posLinesByOrder.get(order.id) || [];
        const orderExVat = orderLines.reduce((sum, line) => sum + line.price_subtotal, 0);

        const marginPercent = orderExVat > 0 ? (orderMargin / orderExVat) * 100 : 0;
        if (marginPercent < 30 && orderExVat > 0) {
            lowMarginAlerts.push({
                orderId: order.id,
                orderName: order.name,
                marginPercent,
            });
        }
    });

    return {
        totalSales,
        totalMargin,
        totalMarginPercent,
        totalDiscounts,
        totalRefunds,
        refundCount, // Calculated from POS
        averageMarginPercent: totalMarginPercent,
        categoryBreakdown: categoryBreakdown.sort((a, b) => b.sales - a.sales),
        salespersonStats: Array.from(salespersonMap.values()).sort((a, b) => b.totalSales - a.totalSales),
        storeStats: Array.from(storeMap.values()).sort((a, b) => b.totalSales - a.totalSales),
        regionalStats: Array.from(regionalMap.values()),
        lowMarginAlerts: lowMarginAlerts.sort((a, b) => a.marginPercent - b.marginPercent),
    };
}
