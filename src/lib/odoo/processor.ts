// Processor utility for Odoo data - Force refresh
import {
    SaleOrder,
    SaleOrderLine,
    PosOrder,
    PosOrderLine,
    ProductCategory,
    Product,
    StockScrap,
} from './api';
import { isSample, mapToCategory } from './categorizer';


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
    tradeSales: number;
    tradeSalesPercent: number;
    categoryBreakdown: CategorySales[];
    salespersonStats: SalespersonStats[];
    storeStats: StoreStats[];
    regionalStats: RegionalStats[];
    lowMarginAlerts: {
        orderId: number;
        orderName: string;
        marginPercent: number;
        date_order: string;
        amount_total: number;
        partner_id: [number, string] | false;
        saleValue?: number;
        isTrade?: boolean;
    }[];
    productStats: ProductStat[];
}

export interface ProductStat {
    id: number;
    name: string;
    sku: string;
    sales: number;
    margin: number;
    marginPercent: number;
    quantity: number;
    category?: string;
    type?: string;
}

export interface BestSeller {
    id: number;
    name: string;
    sku: string;
    quantity: number;
    revenue: number;
    margin: number;
    marginPercent: number;
    stockLevel: number;
}

export interface ProductStockStat {
    id: number;
    name: string;
    sku: string;
    quantity: number;
    revenue: number;
    margin: number;
    marginPercent: number;
    stockLevel: number;
    forecastedStock: number;
    type?: string;
}

export interface StockValue {
    category: string;
    value: number;
    itemCount: number;
}

export interface StockAlert {
    id: number;
    name: string;
    sku: string;
    status: 'low' | 'out_of_stock' | 'slow_mover' | 'critical_lead';
    currentStock: number;
    forecastedStock?: number;
    avgWeeklySales: number;
    message?: string;
}

export interface ScrapStat {
    productId: number;
    name: string;
    quantity: number;
    value: number;
    date: string;
}

export interface StockMetrics {
    topByQuantity: ProductStockStat[];
    topByRevenue: ProductStockStat[];
    topByMargin: ProductStockStat[];
    valuationByCategory: StockValue[];
    totalValuation: number;
    alerts: StockAlert[];
    scraps: ScrapStat[];
    totalScrapValue: number;
    suggestions: ProductStockStat[];
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
    const productSkuMap = new Map<number, string>();
    const productNameMap = new Map<number, string>();
    const productStatsMap = new Map<number, ProductStat>();

    products.forEach((p) => {
        const catId = Array.isArray(p.categ_id) ? p.categ_id[0] : 0;
        productCategoryMap.set(p.id, catId);
        productSkuMap.set(p.id, p.default_code || '');
        productNameMap.set(p.id, p.name || '');
        const productName = p.name || '';
        const odooCatName = catId ? (categoryMap.get(catId) || 'Other') : 'Other';
        const mappedCategory = mapToCategory(odooCatName, p.default_code || '', productName);

        productStatsMap.set(p.id, {
            id: p.id,
            name: productName,
            sku: p.default_code || '',
            sales: 0,
            margin: 0,
            marginPercent: 0,
            quantity: 0,
            category: mappedCategory,
            type: p.type
        });
    });

    // Aggregate sales metrics
    let totalSales = 0;
    let totalMargin = 0;
    let totalDiscounts = 0;
    let totalRefunds = 0;
    let refundCount = 0;
    let tradeSales = 0;

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
        let orderMarginBuilt = 0;

        orderLines.forEach(line => {
            const prodSku = productSkuMap.get(Array.isArray(line.product_id) ? line.product_id[0] : 0) || '';
            const prodName = productNameMap.get(Array.isArray(line.product_id) ? line.product_id[0] : 0) || '';

            // Ignore samples from all financial totals
            if (isSample(prodSku, prodName)) return;

            orderSalesExVat += line.price_subtotal; // Sum Ex VAT
            orderMarginBuilt += line.margin || 0;
            const discountAmount = (line.price_unit * line.qty * line.discount) / 100;
            orderDiscounts += discountAmount;
        });

        if (isRefund) {
            totalRefunds += Math.abs(orderSalesExVat);
        }

        // Net Sales and Margin
        totalSales += orderSalesExVat;
        totalMargin += orderMarginBuilt;
        totalDiscounts += orderDiscounts;

        // Trade Sales Calculation
        // Use Pricelist (if available in future) or simple name check for now as robust fallback
        // We can check if partner Name contains 'Trade' or if we can fetch pricelist later.
        // For now, let's assume if partner name has "Ltd" or "Limited" or "Trade" it is trade.
        // Actually, let's use a simpler heuristic:
        // Ideally we need the pricelist field on the partner.
        // Since we don't have it on PosOrder.partner_id (it's just [id, name]), we'll use name content.
        const partnerName = Array.isArray(order.partner_id) ? order.partner_id[1] : '';
        const isTrade = partnerName.toLowerCase().includes('trade') ||
            partnerName.toLowerCase().includes('ltd') ||
            partnerName.toLowerCase().includes('limited') ||
            partnerName.toLowerCase().includes('contract');

        if (isTrade) {
            tradeSales += orderSalesExVat;
        }

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
        sp.margin += orderMarginBuilt;
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
        store.margin += orderMarginBuilt;
        store.discounts += orderDiscounts;
        if (isRefund) {
            store.refundCount += 1;
            store.refundValue += Math.abs(orderSalesExVat);
        }

        // Aggregate Region Stats
        if (store.region !== 'Other') {
            const region = regionalMap.get(store.region as 'North' | 'South')!;
            region.totalSales += orderSalesExVat;
            region.margin += orderMarginBuilt;
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
        const productSku = productSkuMap.get(productId) || '';
        const productName = productNameMap.get(productId) || '';
        const mappedCategory = mapToCategory(categoryName, productSku, productName);

        if (!categoryStats.has(mappedCategory)) {
            categoryStats.set(mappedCategory, { sales: 0, margin: 0, discounts: 0 });
        }
        const cat = categoryStats.get(mappedCategory)!;
        cat.sales += line.price_subtotal;
        cat.margin += line.margin || 0;
        cat.discounts += discountAmount;

        // Update product stats
        if (productStatsMap.has(productId)) {
            const pStat = productStatsMap.get(productId)!;
            pStat.sales += line.price_subtotal;
            pStat.margin += line.margin || 0;
            pStat.quantity += line.qty;
        }
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

    // Product SKU map already defined above for low margin alerts
    // Actually it's already in productSkuMap so we can remove this redundant block later
    // but for now we keep it consistent.

    // Low margin alerts (POS only)
    const lowMarginAlerts: DashboardMetrics['lowMarginAlerts'] = [];
    posOrders.forEach((order) => {
        const configName = Array.isArray(order.config_id) ? order.config_id[1] : '';
        if (filterRegion && getStoreRegion(configName) !== filterRegion) return;

        const orderLines = posLinesByOrder.get(order.id) || [];

        // Filter out sample products for margin alert calculation
        const filteredLines = orderLines.filter(line => {
            const productId = Array.isArray(line.product_id) ? line.product_id[0] : 0;
            const sku = productSkuMap.get(productId) || '';
            const name = productNameMap.get(productId) || '';
            return !isSample(sku, name);
        });

        // If all lines were samples, skip alert check
        if (filteredLines.length === 0) return;

        const orderMargin = filteredLines.reduce((sum, line) => sum + (line.margin || 0), 0);
        const orderExVat = filteredLines.reduce((sum, line) => sum + line.price_subtotal, 0);

        const marginPercent = orderExVat > 0 ? (orderMargin / orderExVat) * 100 : 0;

        // Determine if trade account
        const partnerName = Array.isArray(order.partner_id) ? order.partner_id[1] : '';
        const isTrade = partnerName.toLowerCase().includes('trade') ||
            partnerName.toLowerCase().includes('ltd') ||
            partnerName.toLowerCase().includes('limited') ||
            partnerName.toLowerCase().includes('contract');

        // Exclude 0 or negative value orders from alerts (likely samples or corrections)
        if (marginPercent < 30 && orderExVat > 0.1) {
            lowMarginAlerts.push({
                orderId: order.id,
                orderName: order.name,
                marginPercent,
                date_order: order.date_order,
                amount_total: order.amount_total,
                partner_id: order.partner_id,
                saleValue: orderExVat,
                isTrade
            });
        }
    });

    return {
        totalSales,
        totalMargin,
        totalMarginPercent,
        totalDiscounts,
        totalRefunds,
        refundCount,
        averageMarginPercent: totalMarginPercent,
        tradeSales,
        tradeSalesPercent: totalSales > 0 ? (tradeSales / totalSales) * 100 : 0,
        categoryBreakdown: categoryBreakdown.sort((a, b) => b.sales - a.sales),
        salespersonStats: Array.from(salespersonMap.values()).sort((a, b) => b.totalSales - a.totalSales),
        storeStats: Array.from(storeMap.values()).sort((a, b) => b.totalSales - a.totalSales),
        regionalStats: Array.from(regionalMap.values()),
        lowMarginAlerts: lowMarginAlerts.sort((a, b) => new Date(b.date_order).getTime() - new Date(a.date_order).getTime()),
        productStats: Array.from(productStatsMap.values())
            .filter(p => p.sales > 0 || p.quantity > 0)
            .map(p => ({
                ...p,
                marginPercent: p.sales > 0 ? (p.margin / p.sales) * 100 : 0
            }))
            .sort((a, b) => b.margin - a.margin)
    };
}

export function processStockData(
    products: Product[],
    posOrders: PosOrder[],
    posLines: PosOrderLine[],
    categories: ProductCategory[],
    daysInPeriod: number = 30,
    scraps: StockScrap[] = [],
    filterRegion?: 'North' | 'South'
): StockMetrics {
    const productSalesMap = new Map<number, { qty: number; revenue: number; margin: number }>();
    const categoryValuationMap = new Map<string, { value: number; count: number }>();

    // Map pos lines by order ID
    const posLinesByOrder = new Map<number, PosOrderLine[]>();
    posLines.forEach((line) => {
        const orderId = Array.isArray(line.order_id) ? line.order_id[0] : 0;
        if (!posLinesByOrder.has(orderId)) posLinesByOrder.set(orderId, []);
        posLinesByOrder.get(orderId)!.push(line);
    });

    // 1. Process Sales Data (respecting filters)
    posOrders.forEach(order => {
        const configName = Array.isArray(order.config_id) ? order.config_id[1] : '';
        if (filterRegion && getStoreRegion(configName) !== filterRegion) return;

        const orderLines = posLinesByOrder.get(order.id) || [];
        orderLines.forEach(line => {
            const productId = Array.isArray(line.product_id) ? line.product_id[0] : 0;
            if (!productId) return;

            const current = productSalesMap.get(productId) || { qty: 0, revenue: 0, margin: 0 };
            current.qty += (line.qty || 0);
            current.revenue += (line.price_subtotal || 0);
            current.margin += (line.margin || 0);
            productSalesMap.set(productId, current);
        });
    });

    const categoryMap = new Map<number, string>();
    categories.forEach(c => categoryMap.set(c.id, c.complete_name || c.name));

    // 2. Process Products for Valuation and Alerts
    const alerts: StockAlert[] = [];
    let totalValuation = 0;

    const processedProducts = products.map(p => {
        const sales = productSalesMap.get(p.id) || { qty: 0, revenue: 0, margin: 0 };
        const categoryName = p.categ_id ? (categoryMap.get(p.categ_id[0]) || 'Other') : 'Other';
        const mappedCategory = mapToCategory(categoryName, p.default_code || '', p.name || '');

        const stock = p.qty_available || 0;
        const cost = p.standard_price || 0;
        const valuation = stock > 0 ? stock * cost : 0;
        totalValuation += valuation;

        // Group Valuation
        const catVal = categoryValuationMap.get(mappedCategory) || { value: 0, count: 0 };
        catVal.value += valuation;
        catVal.count += 1;
        categoryValuationMap.set(mappedCategory, catVal);

        const avgWeeklySales = (sales.qty / daysInPeriod) * 7;
        const sku = p.default_code || '';
        const isEG = sku.toUpperCase().startsWith('EG-');
        const requiredLeadStock = isEG ? avgWeeklySales * 16 : avgWeeklySales * 2;

        // Check Alerts (Only for stockable products)
        if (p.type === 'product') {
            if (stock <= 0) {
                alerts.push({
                    id: p.id,
                    name: p.name,
                    sku: sku || 'N/A',
                    status: 'out_of_stock',
                    currentStock: stock,
                    forecastedStock: p.virtual_available || stock,
                    avgWeeklySales
                });
            } else if (stock < requiredLeadStock) {
                alerts.push({
                    id: p.id,
                    name: p.name,
                    sku: sku || 'N/A',
                    status: isEG ? 'critical_lead' : 'low',
                    currentStock: stock,
                    forecastedStock: p.virtual_available || stock,
                    avgWeeklySales,
                    message: isEG ? `EG Lead Time (16w req: ${requiredLeadStock.toFixed(1)})` : undefined
                });
            } else if (stock > 0 && sales.qty === 0 && daysInPeriod >= 14) {
                alerts.push({
                    id: p.id,
                    name: p.name,
                    sku: sku || 'N/A',
                    status: 'slow_mover',
                    currentStock: stock,
                    forecastedStock: p.virtual_available || stock,
                    avgWeeklySales: 0
                });
            }
        }

        return {
            id: p.id,
            name: p.name,
            sku: sku || 'N/A',
            quantity: sales.qty,
            revenue: sales.revenue,
            margin: sales.margin,
            marginPercent: sales.revenue > 0 ? (sales.margin / sales.revenue) * 100 : 0,
            stockLevel: stock,
            forecastedStock: p.virtual_available || stock,
            type: p.type
        };
    });

    // 2.5 Process Scraps (Write-offs)
    let totalScrapValue = 0;
    const processedScraps: ScrapStat[] = scraps.map(s => {
        const productId = s.product_id[0];
        const product = products.find(p => p.id === productId);
        const cost = product?.standard_price || 0;
        const value = s.scrap_qty * cost;
        totalScrapValue += value;
        return {
            productId,
            name: s.product_id[1],
            quantity: s.scrap_qty,
            value,
            date: s.date_done
        };
    });

    // 3. Sort for Top Lists
    const topByQuantity = [...processedProducts].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
    const topByRevenue = [...processedProducts].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    const topByMargin = [...processedProducts].sort((a, b) => b.margin - a.margin).slice(0, 10);

    const valuationByCategory = Array.from(categoryValuationMap.entries()).map(([category, data]) => ({
        category,
        value: data.value,
        itemCount: data.count
    })).sort((a, b) => b.value - a.value);

    // 4. Suggestions: Top 10 by revenue that are currently out of stock or low in this store
    // Only suggest real products (exclude services/fitting)
    const suggestions = [...processedProducts]
        .filter(p => p.type === 'product' && p.stockLevel <= 2 && p.revenue > 1000)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    return {
        topByQuantity,
        topByRevenue,
        topByMargin,
        valuationByCategory,
        totalValuation,
        alerts: alerts.sort((a, b) => (b.avgWeeklySales || 0) - (a.avgWeeklySales || 0)).slice(0, 50),
        scraps: processedScraps,
        totalScrapValue,
        suggestions
    };
}

export function processCategoryProducts(
    targetCategoryName: string,
    posOrders: PosOrder[],
    posLines: PosOrderLine[],
    categories: ProductCategory[],
    products: Product[],
    filterRegion?: 'North' | 'South'
): ProductStat[] {
    const categoryMap = new Map<number, string>();
    categories.forEach((cat) => categoryMap.set(cat.id, cat.complete_name || cat.name));

    const productMap = new Map<number, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    const posLinesByOrder = new Map<number, PosOrderLine[]>();
    posLines.forEach((line) => {
        const orderId = Array.isArray(line.order_id) ? line.order_id[0] : 0;
        if (!posLinesByOrder.has(orderId)) posLinesByOrder.set(orderId, []);
        posLinesByOrder.get(orderId)!.push(line);
    });

    const productStatsMap = new Map<number, ProductStat>();

    posOrders.forEach((order) => {
        const configName = Array.isArray(order.config_id) ? order.config_id[1] : 'Unknown POS';
        const storeRegion = getStoreRegion(configName);
        if (filterRegion && storeRegion !== filterRegion) return;

        const lines = posLinesByOrder.get(order.id) || [];
        lines.forEach((line) => {
            const productId = Array.isArray(line.product_id) ? line.product_id[0] : 0;
            const product = productMap.get(productId);
            if (!product) return;

            const categoryId = Array.isArray(product.categ_id) ? product.categ_id[0] : 0;
            const categoryName = categoryMap.get(categoryId) || 'Other';
            const mappedCategory = mapToCategory(categoryName, product.default_code || '', product.name || '');

            if (mappedCategory !== targetCategoryName) return;

            if (!productStatsMap.has(productId)) {
                productStatsMap.set(productId, {
                    id: productId,
                    name: product.name,
                    sku: product.default_code || '',
                    sales: 0,
                    margin: 0,
                    marginPercent: 0,
                    quantity: 0,
                });
            }

            const stats = productStatsMap.get(productId)!;
            stats.sales += line.price_subtotal;
            stats.margin += line.margin || 0;
            stats.quantity += line.qty;
        });
    });

    const results = Array.from(productStatsMap.values());
    results.forEach((p) => {
        p.marginPercent = p.sales > 0 ? (p.margin / p.sales) * 100 : 0;
    });

    return results.sort((a, b) => b.sales - a.sales);
}
