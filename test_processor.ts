import { processDashboardData, getSalespersonForOrder } from './src/lib/odoo/processor';
import { PosOrder, PosOrderLine, SaleOrder } from './src/lib/odoo/api';

// Mock data to test processor
const mockOrder: PosOrder = {
    id: 1,
    name: 'Test/0001',
    date_order: '2026-01-01',
    amount_total: 100,
    amount_paid: 100,
    margin: 40,
    state: 'paid',
    user_id: [1, 'Admin'],
    session_id: [1, 'S01'],
    config_id: [1, 'Store 1'],
    partner_id: [1, 'Partner'],
    company_id: [1, 'Company']
};

const mockLine: PosOrderLine = {
    id: 1,
    order_id: [1, 'Test/0001'],
    product_id: [1, 'Product'],
    qty: 1,
    price_unit: 100,
    price_subtotal: 100,
    price_subtotal_incl: 120,
    discount: 0,
    margin: 40
};

const saleOrderMap = new Map<number, SaleOrder>();

try {
    console.log('Testing getSalespersonForOrder...');
    const sp = getSalespersonForOrder(mockOrder, [mockLine], saleOrderMap);
    console.log('Attributed Salesperson:', sp);

    console.log('\nTesting processDashboardData...');
    const result = processDashboardData([], [], [mockOrder], [mockLine], [], [], []);
    console.log('Salesperson Stats Count:', result.salespersonStats.length);
    if (result.salespersonStats.length > 0) {
        console.log('First Salesperson:', result.salespersonStats[0]);
    }
    console.log('Total Sales:', result.totalSales);
    console.log('Success!');
} catch (e) {
    console.error('Processor failed:', e);
}
