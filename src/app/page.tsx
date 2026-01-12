'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, LayoutDashboard } from 'lucide-react';
import Image from 'next/image';
import StatCard from '@/components/dashboard/StatCard';
import StoreCard from '@/components/dashboard/StoreCard';
import Leaderboard from '@/components/dashboard/Leaderboard';
import AlertPanel from '@/components/dashboard/AlertPanel';
import CategoryChart from '@/components/charts/CategoryChart';
import DashboardFilters from '@/components/dashboard/DashboardFilters';
import ProductLeaderboard from '@/components/dashboard/ProductLeaderboard';
import OrdersModal from '@/components/modals/OrdersModal';
import OrderDetailModal from '@/components/modals/OrderDetailModal';
import CategoryProductsModal from '@/components/modals/CategoryProductsModal';
import styles from './page.module.css';

interface DashboardMetrics {
  totalSales: number;
  totalMargin: number;
  totalMarginPercent: number;
  totalDiscounts: number;
  totalRefunds: number;
  refundCount: number;
  averageMarginPercent: number;
  tradeSales: number;
  tradeSalesPercent: number;
  categoryBreakdown: {
    category: string;
    sales: number;
    margin: number;
    marginPercent: number;
    discounts: number;
  }[];
  salespersonStats: {
    id: number;
    name: string;
    totalSales: number;
    margin: number;
    marginPercent: number;
    discounts: number;
    orderCount: number;
    atv?: number;
    conversionRate?: number;
  }[];
  storeStats: {
    id: number;
    name: string;
    companyId?: number;
    companyName?: string;
    totalSales: number;
    margin: number;
    marginPercent: number;
    discounts: number;
    refundCount: number;
    refundValue: number;
    alertLevel: 'ok' | 'warning' | 'critical';
    region: 'North' | 'South' | 'Other';
  }[];
  regionalStats: {
    name: string;
    totalSales: number;
    margin: number;
    marginPercent: number;
    discounts: number;
    orderCount: number;
  }[];
  lowMarginAlerts: {
    orderId: number;
    orderName: string;
    marginPercent: number;
    date_order: string;
    amount_total: number;
    partner_id: [number, string] | false;
  }[];
  productStats: {
    id: number;
    name: string;
    sku: string;
    sales: number;
    margin: number;
    marginPercent: number;
    quantity: number;
  }[];
  sampleCount: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const router = useRouter();
  const [filters, setFilters] = useState({
    dateFrom: getDefaultDateFrom(),
    dateTo: getToday(),
  });
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  // Drilldown Modal State
  const [selectedSalesperson, setSelectedSalesperson] = useState<{ id: number; name: string } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<{ id: number; name: string } | null>(null);
  const [showAllLowMargin, setShowAllLowMargin] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cashReport, setCashReport] = useState<{
    totalCashOut: number;
    transactionCount: number;
    breakdown: { company: string; reason: string; store: string; total: number; count: number }[];
    recentTransactions: { id: number; date: string; amount: number; reference: string; store: string; company: string }[];
  } | null>(null);

  function getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  function getDefaultDateFrom(): string {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  }

  // Added fetchUser function
  async function fetchUser() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (e) {
      console.error('Failed to fetch user', e);
    }
  }

  // Added handleLogout function
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function fetchStores() {
    try {
      const res = await fetch('/api/stores');
      if (res.ok) {
        setStores(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch stores', e);
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
      if (selectedStore) params.append('storeId', selectedStore);
      if (selectedRegion) params.append('region', selectedRegion);
      const response = await fetch(`/api/dashboard?${params}`);
      if (response.status === 401) { // Added authentication check
        router.push('/login');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters, selectedStore, selectedRegion, router]);

  useEffect(() => {
    fetchUser();
    fetchStores();
    fetchData();
    fetchCashReport();
  }, [fetchData]);

  async function fetchCashReport() {
    try {
      const params = new URLSearchParams({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
      const res = await fetch(`/api/no-sale?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCashReport(data);
      }
    } catch (e) {
      console.error('Failed to fetch cash report:', e);
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

  const handleFilterChange = (newFilters: { dateFrom: string; dateTo: string }) => {
    setFilters(newFilters);
  };

  const criticalStores = metrics?.storeStats.filter((s) => s.alertLevel === 'critical') || [];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <Image src="/logo.png" alt="Floor Giants Logo" width={40} height={40} className={styles.logo} />
          <div>
            <h1 className={styles.title}>Floor Giants Dashboard</h1>
            <p className={styles.subtitle}>Sales Performance & Analytics</p>
          </div>
        </div>

        <nav className={styles.nav}>
          <button className={`${styles.navBtn} ${styles.active}`} onClick={() => router.push('/')}>Sales</button>
          <button className={styles.navBtn} onClick={() => router.push('/quotes')}>Quotes</button>
          <button className={styles.navBtn} onClick={() => router.push('/stock')}>Stock</button>
        </nav>

        <div className={styles.filterControls}>
          <select
            className={styles.storeSelect}
            value={selectedRegion}
            onChange={(e) => {
              setSelectedRegion(e.target.value);
              setSelectedStore(''); // Clear store selection when region changes
            }}
          >
            <option value="">All Regions</option>
            <option value="North">North Region</option>
            <option value="South">South Region</option>
          </select>

          <select
            className={styles.storeSelect}
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
          >
            <option value="">All Stores</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {user && ( // Added user info and logout button
          <div className={styles.userInfo}>
            <span className={styles.username}>Logged in as {user.username}</span>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
          </div>
        )}
        <button className={styles.refreshBtn} onClick={fetchData} disabled={loading}>
          <RefreshCw size={18} className={loading ? styles.spinning : ''} />
          Refresh
        </button>
      </header>

      <section className={styles.filters}>
        <DashboardFilters onFilterChange={handleFilterChange} />
      </section>

      {error && (
        <div className={styles.error}>
          <p>Error loading data: {error}</p>
          <button onClick={fetchData}>Try Again</button>
        </div>
      )}

      {loading && !metrics && (
        <div className={styles.loading}>
          <RefreshCw size={48} className={styles.spinning} />
          <p>Loading dashboard data...</p>
        </div>
      )}

      {metrics && (
        <>
          <section className={styles.statsGrid}>
            <StatCard
              title="Total Sales (Ex VAT)"
              value={formatCurrency(metrics.totalSales)}
              variant="default"
            />
            <StatCard
              title="Total Margin"
              value={formatCurrency(metrics.totalMargin)}
              subValue={`${metrics.totalMarginPercent.toFixed(1)}%`}
              variant={metrics.totalMarginPercent < 40 ? 'danger' : 'success'}
            />
            <StatCard
              title="Total Discounts"
              value={formatCurrency(metrics.totalDiscounts)}
              variant="warning"
            />
            <StatCard
              title="Total Refunds"
              value={formatCurrency(metrics.totalRefunds)}
              subValue={`${metrics.refundCount} orders`}
              variant="danger"
            />
            <StatCard
              title="Average Margin"
              value={`${metrics.averageMarginPercent.toFixed(1)}%`}
              variant={metrics.averageMarginPercent < 40 ? 'danger' : 'default'}
            />
            <StatCard
              title="Trade Sales"
              value={formatCurrency(metrics.tradeSales)}
              subValue={`${metrics.tradeSalesPercent.toFixed(1)}% of total`}
              variant="default"
              helpText="Sales associated with partners identified as 'Trade' or 'Ltd'."
            />
            <StatCard
              title="Active Samples"
              value={metrics.sampleCount}
              subValue="Sold & unreturned"
              variant="secondary"
              helpText="Total quantity of [sample] products sold but not yet offset by a return."
            />
          </section>

          <section className={styles.mainContent}>
            <div className={styles.chartsSection}>
              <CategoryChart
                data={metrics.categoryBreakdown}
                onCategoryClick={(cat) => setSelectedCategory(cat)}
              />
            </div>
            <div className={styles.alertsSection}>
              <AlertPanel
                lowMarginAlerts={metrics.lowMarginAlerts}
                criticalStores={criticalStores.map((s) => ({
                  name: s.name,
                  marginPercent: s.marginPercent,
                }))}
                onOrderClick={(id, name) => setSelectedOrder({ id, name })}
                onSeeMoreOrders={() => setShowAllLowMargin(true)}
              />
            </div>
          </section>

          <section className={styles.storeSection}>
            <h2 className={styles.sectionTitle}>Company Performance (Ex VAT)</h2>
            <div className={styles.storeGrid}>
              {metrics.storeStats.map((store) => (
                <StoreCard
                  key={store.id}
                  name={store.companyName || store.name}
                  totalSales={store.totalSales}
                  marginPercent={store.marginPercent}
                  discounts={store.discounts}
                  refundCount={store.refundCount}
                  refundValue={store.refundValue}
                  alertLevel={store.alertLevel}
                />
              ))}
            </div>
          </section>



          <section className={styles.leaderboardSection}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Leaderboard
                data={metrics.salespersonStats}
                onSalespersonClick={(id, name) => setSelectedSalesperson({ id, name })}
              />
              <div className={styles.tableCard}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Company Leadership</h2>
                </div>
                <div className={styles.tableContainer} style={{ padding: '0 1rem 1rem' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th className="text-right">Sales</th>
                        <th className="text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.storeStats.map((store) => (
                        <tr key={store.id}>
                          <td className="text-slate-300 font-medium">{store.companyName || store.name}</td>
                          <td className="text-right">{formatCurrency(store.totalSales)}</td>
                          <td className="text-right">
                            <span className={store.marginPercent < 30 ? 'text-rose-400' : 'text-emerald-400'}>
                              {store.marginPercent.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* Cash Out / No Sale Report Section */}
          {cashReport && (
            <section className={styles.cashReportSection}>
              <h2 className={styles.sectionTitle}>Cash Out Report (Petty Cash / Banking)</h2>
              <div className={styles.cashReportGrid}>
                {/* Summary Card */}
                <div className={styles.tableCard}>
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">Breakdown by Store & Reason</h3>
                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Company</th>
                          <th>Store</th>
                          <th>Reason</th>
                          <th className="text-right">Count</th>
                          <th className="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashReport.breakdown.map((item, idx) => (
                          <tr key={`${item.reason}-${item.store}-${idx}`}>
                            <td className="text-slate-400 text-sm">{item.company}</td>
                            <td className="text-slate-300">{item.store}</td>
                            <td>
                              <span className={`${styles.reasonBadge} ${item.reason === 'Banking' ? styles.banking : item.reason === 'Petty Cash' ? styles.pettyCash : ''}`}>
                                {item.reason}
                              </span>
                            </td>
                            <td className="text-right">{item.count}</td>
                            <td className="text-right font-bold">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                        <tr className={styles.totalRow}>
                          <td className="font-bold" colSpan={3}>Total</td>
                          <td className="text-right font-bold">{cashReport.transactionCount}</td>
                          <td className="text-right font-bold text-amber-400">{formatCurrency(cashReport.totalCashOut)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className={styles.tableCard}>
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">Recent Transactions</h3>
                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Company</th>
                          <th>Description/Reason</th>
                          <th>Store</th>
                          <th className="text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashReport.recentTransactions.map((tx) => (
                          <tr key={tx.id}>
                            <td>{new Date(tx.date).toLocaleDateString('en-GB')}</td>
                            <td className="text-slate-300 text-sm">{tx.company}</td>
                            <td className="text-slate-400 text-xs">{tx.reference}</td>
                            <td className="text-slate-400 text-sm">{tx.store}</td>
                            <td className="text-right font-bold text-amber-400">{formatCurrency(tx.amount)}</td>
                          </tr>
                        ))}
                        {cashReport.recentTransactions.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center text-slate-500 py-4">No cash out transactions found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Drilldown Modals */}
          {selectedSalesperson && (
            <OrdersModal
              isOpen={!!selectedSalesperson}
              onClose={() => setSelectedSalesperson(null)}
              salespersonId={selectedSalesperson.id}
              salespersonName={selectedSalesperson.name}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              storeId={selectedStore ? parseInt(selectedStore) : undefined}
              onOrderClick={(id, name) => setSelectedOrder({ id, name })}
            />
          )}

          {selectedOrder && (
            <OrderDetailModal
              isOpen={!!selectedOrder}
              onClose={() => setSelectedOrder(null)}
              orderId={selectedOrder.id}
              orderName={selectedOrder.name}
            />
          )}

          {showAllLowMargin && metrics.lowMarginAlerts && (
            <OrdersModal
              isOpen={showAllLowMargin}
              onClose={() => setShowAllLowMargin(false)}
              initialOrders={metrics.lowMarginAlerts.map(a => ({
                id: a.orderId,
                name: a.orderName,
                date_order: a.date_order,
                amount_total: a.amount_total,
                partner_id: a.partner_id
              }))}
              title="All Low Margin Orders (< 30%)"
              onOrderClick={(id, name) => setSelectedOrder({ id, name })}
            />
          )}

          {selectedCategory && (
            <CategoryProductsModal
              isOpen={!!selectedCategory}
              onClose={() => setSelectedCategory(null)}
              categoryName={selectedCategory}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              storeId={selectedStore || undefined}
              region={selectedRegion || undefined}
            />
          )}
        </>
      )}
    </div>
  );
}
