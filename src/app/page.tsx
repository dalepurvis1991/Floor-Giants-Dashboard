'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, LayoutDashboard } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import StoreCard from '@/components/dashboard/StoreCard';
import Leaderboard from '@/components/dashboard/Leaderboard';
import AlertPanel from '@/components/dashboard/AlertPanel';
import CategoryChart from '@/components/charts/CategoryChart';
import DashboardFilters from '@/components/dashboard/DashboardFilters';
import OrdersModal from '@/components/modals/OrdersModal';
import OrderDetailModal from '@/components/modals/OrderDetailModal';
import styles from './page.module.css';

interface DashboardMetrics {
  totalSales: number;
  totalMargin: number;
  totalMarginPercent: number;
  totalDiscounts: number;
  totalRefunds: number;
  refundCount: number;
  averageMarginPercent: number;
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
  }[];
  storeStats: {
    id: number;
    name: string;
    totalSales: number;
    margin: number;
    marginPercent: number;
    discounts: number;
    refundCount: number;
    refundValue: number;
    alertLevel: 'ok' | 'warning' | 'critical';
  }[];
  lowMarginAlerts: { orderId: number; orderName: string; marginPercent: number }[];
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

  // Drilldown Modal State
  const [selectedSalesperson, setSelectedSalesperson] = useState<{ id: number; name: string } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<{ id: number; name: string } | null>(null);

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
  }, [filters, selectedStore, router]); // Added selectedStore to dependencies

  useEffect(() => {
    fetchUser();
    fetchStores();
    fetchData();
  }, [fetchData]);

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
          <LayoutDashboard size={32} className={styles.icon} />
          <div>
            <h1 className={styles.title}>Sales Dashboard</h1>
            <p className={styles.subtitle}>Overview of sales performance</p>
          </div>
        </div>

        <select
          className={styles.storeSelect}
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
        >
          <option value="">All Stores</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

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
          </section>

          <section className={styles.mainContent}>
            <div className={styles.chartsSection}>
              <CategoryChart data={metrics.categoryBreakdown} />
            </div>
            <div className={styles.alertsSection}>
              <AlertPanel
                lowMarginAlerts={metrics.lowMarginAlerts}
                criticalStores={criticalStores.map((s) => ({
                  name: s.name,
                  marginPercent: s.marginPercent,
                }))}
              />
            </div>
          </section>

          <section className={styles.storeSection}>
            <h2 className={styles.sectionTitle}>Store Performance (Ex VAT)</h2>
            <div className={styles.storeGrid}>
              {metrics.storeStats.map((store) => (
                <StoreCard
                  key={store.id}
                  name={store.name}
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
            <Leaderboard
              data={metrics.salespersonStats}
              onSalespersonClick={(id, name) => setSelectedSalesperson({ id, name })}
            />
          </section>

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
        </>
      )}
    </div>
  );
}
