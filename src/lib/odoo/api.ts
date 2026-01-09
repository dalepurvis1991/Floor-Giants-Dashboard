import { searchRead } from './client';

export interface SaleOrder {
    id: number;
    name: string;
    date_order: string;
    amount_total: number;
    amount_untaxed: number;
    state: string;
    user_id: [number, string] | false;
    team_id: [number, string] | false;
    partner_id: [number, string] | false;
    company_id: [number, string] | false;
}

export interface SaleOrderLine {
    id: number;
    order_id: [number, string];
    product_id: [number, string] | false;
    product_uom_qty: number;
    price_unit: number;
    price_subtotal: number;
    discount: number;
}

export interface PosOrder {
    id: number;
    name: string;
    date_order: string;
    amount_total: number;
    amount_paid: number;
    margin: number;
    state: string;
    user_id: [number, string] | false;
    session_id: [number, string] | false;
    config_id: [number, string] | false;
    partner_id: [number, string] | false;
    company_id: [number, string] | false;
    sale_order_origin_id?: [number, string] | false;
}

export interface PosOrderLine {
    id: number;
    order_id: [number, string];
    product_id: [number, string] | false;
    qty: number;
    price_unit: number;
    price_subtotal: number;
    price_subtotal_incl: number;
    discount: number;
    margin: number;
    sale_order_origin_id?: [number, string]; // Link to original SO
}

export interface PosConfig {
    id: number;
    name: string;
}

export interface ProductCategory {
    id: number;
    name: string;
    complete_name: string;
    parent_id: [number, string] | false;
}

export interface Product {
    id: number;
    name: string;
    categ_id: [number, string] | false;
    qty_available?: number;
    virtual_available?: number;
    standard_price?: number;
    list_price?: number;
    default_code?: string | false;
}

export interface AccountMoveLine {
    id: number;
    move_id: [number, string];
    product_id: [number, string] | false;
    quantity: number;
    price_unit: number;
    price_subtotal: number;
    partner_id: [number, string] | false;
    date: string;
    parent_state: string;
}

const INTERNAL_PARTNERS = [
    'FG Nottingham',
    'FG NOTTINGHAM',
    'Evergreen Floors',
    'Floor Giants',
];

function isInternalTransaction(partnerName: string): boolean {
    if (!partnerName) return false;
    return INTERNAL_PARTNERS.some((p) => partnerName.includes(p));
}

export async function getSaleOrders(
    dateFrom: string,
    dateTo: string,
    companyId?: number,
    userId?: number,
    credentials?: { uid: number; password: string }
): Promise<SaleOrder[]> {
    const domain: unknown[] = [
        ['date_order', '>=', dateFrom],
        ['date_order', '<=', dateTo],
        ['state', 'in', ['sale', 'done']],
    ];
    if (companyId) domain.push(['company_id', '=', companyId]);
    if (userId) domain.push(['user_id', '=', userId]);

    const orders = await searchRead<SaleOrder>('sale.order', domain, [
        'id',
        'name',
        'date_order',
        'amount_total',
        'amount_untaxed',
        'state',
        'user_id',
        'team_id',
        'partner_id',
        'company_id',
    ], { limit: 10000 }, credentials);

    return orders.filter(order => {
        const companyId = Array.isArray(order.company_id) ? order.company_id[0] : 0;
        const partnerName = Array.isArray(order.partner_id) ? order.partner_id[1] : '';

        // Exclude Evergreen Floors Ltd (ID 12)
        if (companyId === 12) return false;

        // Exclude inter-company transactions
        if (isInternalTransaction(partnerName)) return false;

        return true;
    });
}

export async function getSaleOrderLines(
    orderIds: number[],
    credentials?: { uid: number; password: string }
): Promise<SaleOrderLine[]> {
    if (orderIds.length === 0) return [];
    return searchRead<SaleOrderLine>(
        'sale.order.line',
        [['order_id', 'in', orderIds]],
        [
            'id',
            'order_id',
            'product_id',
            'product_uom_qty',
            'price_unit',
            'price_subtotal',
            'discount',
        ],
        { limit: 10000 },
        credentials
    );
}

export async function getSaleOrdersByIds(
    ids: number[],
    credentials?: { uid: number; password: string }
): Promise<SaleOrder[]> {
    if (ids.length === 0) return [];

    // We fetch raw sales orders by ID.
    const orders = await searchRead<SaleOrder>('sale.order', [['id', 'in', ids]], [
        'id',
        'name',
        'date_order',
        'amount_total',
        'amount_untaxed',
        'state',
        'user_id',
        'team_id',
        'partner_id',
        'company_id',
    ], {}, credentials);

    return orders;
}

export async function getProducts(
    productIds: number[],
    credentials?: { uid: number; password: string }
): Promise<Product[]> {
    if (productIds.length === 0) return [];
    return searchRead<Product>('product.product', [['id', 'in', productIds]], [
        'id',
        'name',
        'categ_id',
        'qty_available',
        'standard_price',
        'list_price',
        'default_code',
    ], { limit: 10000 }, credentials);
}

export async function getStockReport(
    credentials?: { uid: number; password: string }
): Promise<Product[]> {
    return searchRead<Product>('product.product', [['sale_ok', '=', true]], [
        'id',
        'name',
        'categ_id',
        'qty_available',
        'virtual_available',
        'standard_price',
        'list_price',
        'default_code',
    ], { limit: 10000, order: 'qty_available desc' }, credentials);
}

export async function getPosConfigs(
    credentials?: { uid: number; password: string }
): Promise<PosConfig[]> {
    return searchRead<PosConfig>('pos.config', [], ['id', 'name'], { limit: 1000 }, credentials);
}

export async function getPosOrders(
    dateFrom: string,
    dateTo: string,
    configId?: number,
    userId?: number,
    credentials?: { uid: number; password: string }
): Promise<PosOrder[]> {
    const domain: unknown[] = [
        ['date_order', '>=', dateFrom],
        ['date_order', '<=', dateTo],
        ['state', 'in', ['paid', 'done', 'invoiced']],
    ];
    if (configId) domain.push(['config_id', '=', configId]);
    if (userId) domain.push(['user_id', '=', userId]);

    const orders = await searchRead<PosOrder>('pos.order', domain, [
        'id',
        'name',
        'date_order',
        'amount_total',
        'amount_paid',
        'margin',
        'state',
        'user_id',
        'session_id',
        'config_id',
        'partner_id',
        'company_id',
    ], { limit: 10000 }, credentials);

    return orders.filter(order => {
        const companyId = Array.isArray(order.company_id) ? order.company_id[0] : 0;
        const partnerName = Array.isArray(order.partner_id) ? order.partner_id[1] : '';

        // Exclude Evergreen Floors Ltd (ID 12)
        if (companyId === 12) return false;

        // Exclude inter-company transactions
        if (isInternalTransaction(partnerName)) return false;

        return true;
    });
}

export async function getPosOrderById(
    orderId: number,
    credentials?: { uid: number; password: string }
): Promise<PosOrder | null> {
    const orders = await searchRead<PosOrder>(
        'pos.order',
        [['id', '=', orderId]],
        [
            'id',
            'name',
            'date_order',
            'amount_total',
            'amount_paid',
            'margin',
            'state',
            'user_id',
            'session_id',
            'config_id',
            'partner_id',
            'company_id',
        ],
        { limit: 1 },
        credentials
    );
    return orders.length > 0 ? orders[0] : null;
}

export async function getPosOrderLines(
    orderIds: number[],
    credentials?: { uid: number; password: string }
): Promise<PosOrderLine[]> {
    if (orderIds.length === 0) return [];
    return searchRead<PosOrderLine>(
        'pos.order.line',
        [['order_id', 'in', orderIds]],
        [
            'id',
            'order_id',
            'product_id',
            'qty',
            'price_unit',
            'price_subtotal',
            'price_subtotal_incl',
            'discount',
            'margin',
            'sale_order_origin_id',
        ],
        { limit: 10000 },
        credentials
    );
}

export async function getProductCategories(
    credentials?: { uid: number; password: string }
): Promise<ProductCategory[]> {
    return searchRead<ProductCategory>('product.category', [], [
        'id',
        'name',
        'complete_name',
        'parent_id',
    ], { limit: 1000 }, credentials);
}

export async function getRefunds(
    dateFrom: string,
    dateTo: string,
    companyId?: number,
    credentials?: { uid: number; password: string }
): Promise<SaleOrder[]> {
    const domain: unknown[] = [
        ['date_order', '>=', dateFrom],
        ['date_order', '<=', dateTo],
        ['amount_total', '<', 0],
    ];
    if (companyId) domain.push(['company_id', '=', companyId]);

    return searchRead<SaleOrder>('sale.order', domain, [
        'id',
        'name',
        'date_order',
        'amount_total',
        'user_id',
        'company_id',
    ], { limit: 10000 }, credentials);
}

export async function getAccountMoveLines(
    dateFrom: string,
    dateTo: string,
    partnerId?: number,
    credentials?: { uid: number; password: string }
): Promise<AccountMoveLine[]> {
    const domain: unknown[] = [
        ['date', '>=', dateFrom],
        ['date', '<=', dateTo],
        ['parent_state', '=', 'posted'],
    ];
    if (partnerId) domain.push(['partner_id', '=', partnerId]);

    return searchRead<AccountMoveLine>('account.move.line', domain, [
        'id',
        'move_id',
        'product_id',
        'quantity',
        'price_unit',
        'price_subtotal',
        'partner_id',
        'date',
        'parent_state',
    ], { limit: 10000 }, credentials);
}
