'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    RefreshCw,
    Package,
    TrendingUp,
    AlertTriangle,
    DollarSign,
    ArrowLeft,
    PieChart
} from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import styles from './page.module.css';

interface StockMetrics {
    topByQuantity: any[];
    topByRevenue: any[];
    topByMargin: any[];
    valuationByCategory: any[];
    alerts: any[];
    totalValuation: number;
}

export default function StockDashboard() {
    const [metrics, setMetrics] = useState<StockMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const fetchStockData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/stock');
            if (response.status === 401) {
                router.push('/login');
                return;
            }
            if (!response.ok) throw new Error('Failed to fetch stock data');
            const data = await response.json();
            setMetrics(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchStockData();
    }, [fetchStockData]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

    if (loading && !metrics) {
        return (
            <div className={styles.loading}>
                <RefreshCw size={48} className={styles.spinning} />
                <p>Loading inventory data...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <Package size={32} style={{ color: '#818cf8' }} />
                    <div>
                        <h1 className={styles.title}>Inventory Analysis</h1>
                        <p className={styles.subtitle}>Stock levels and performance insights</p>
                    </div>
                </div>

                <nav className={styles.nav}>
                    <button className={styles.navBtn} onClick={() => router.push('/')}>Sales</button>
                    <button className={`${styles.navBtn} ${styles.active}`}>Stock</button>
                </nav>

                <button className={styles.navBtn} onClick={fetchStockData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={18} className={loading ? styles.spinning : ''} />
                    Refresh
                </button>
            </header>

            {metrics && (
                <>
                    <section className={styles.summaryGrid}>
                        <StatCard
                            title="Total Stock Value"
                            value={formatCurrency(metrics.totalValuation)}
                            variant="default"
                        />
                        <StatCard
                            title="Critical Alerts"
                            value={String(metrics.alerts.filter(a => a.status === 'out_of_stock').length)}
                            subValue="Out of stock items"
                            variant="danger"
                        />
                        <StatCard
                            title="Slow Moving Items"
                            value={String(metrics.alerts.filter(a => a.status === 'slow_mover').length)}
                            subValue="No sales in 30 days"
                            variant="warning"
                        />
                    </section>

                    <div className={styles.mainGrid}>
                        <div className={styles.tablesColumn}>
                            <section className={styles.card}>
                                <h3 className={styles.cardTitle}>
                                    <TrendingUp size={20} style={{ color: '#4ade80' }} />
                                    Top 10 Best Sellers (by Volume)
                                </h3>
                                <div className={styles.tableContainer}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>SKU</th>
                                                <th>Qty Sold</th>
                                                <th>Revenue</th>
                                                <th>Margin %</th>
                                                <th>Stock</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {metrics.topByQuantity.map(item => (
                                                <tr key={item.id}>
                                                    <td>{item.name}</td>
                                                    <td><span className={styles.sku}>{item.sku}</span></td>
                                                    <td>{item.quantity.toFixed(0)}</td>
                                                    <td>{formatCurrency(item.revenue)}</td>
                                                    <td>{item.marginPercent.toFixed(1)}%</td>
                                                    <td>
                                                        <span className={`${styles.stockBadge} ${item.stockLevel <= 0 ? styles.stockOut : item.stockLevel < 5 ? styles.stockLow : styles.stockOk}`}>
                                                            {item.stockLevel}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>

                        <aside className={styles.alertsColumn}>
                            <section className={styles.card}>
                                <h3 className={styles.cardTitle}>
                                    <AlertTriangle size={20} style={{ color: '#f87171' }} />
                                    Inventory Alerts
                                </h3>
                                <div className={styles.alertList}>
                                    {metrics.alerts.map(alert => (
                                        <div key={alert.id} className={`${styles.alertItem} ${styles[alert.status === 'out_of_stock' ? 'out' : alert.status === 'low' ? 'low' : 'slow']}`}>
                                            <div className={styles.alertContent}>
                                                <span className={styles.alertName}>{alert.name}</span>
                                                <span className={styles.alertMeta}>
                                                    {alert.status === 'out_of_stock' ? 'Out of Stock' :
                                                        alert.status === 'low' ? `Low Stock (${alert.currentStock} left)` :
                                                            `Slow Mover (${alert.currentStock} in stock)`}
                                                </span>
                                            </div>
                                            <div className={styles.alertValue}>
                                                {alert.status !== 'slow_mover' && (
                                                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                                        {alert.avgWeeklySales.toFixed(1)}/wk
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {metrics.alerts.length === 0 && (
                                        <p style={{ textAlign: 'center', opacity: 0.5 }}>No critical alerts</p>
                                    )}
                                </div>
                            </section>

                            <section className={styles.card} style={{ marginTop: '1.5rem' }}>
                                <h3 className={styles.cardTitle}>
                                    <PieChart size={20} style={{ color: '#818cf8' }} />
                                    Stock Value by Category
                                </h3>
                                <div className={styles.alertList}>
                                    {metrics.valuationByCategory.map(cat => (
                                        <div key={cat.category} className={styles.alertItem}>
                                            <div className={styles.alertContent}>
                                                <span className={styles.alertName}>{cat.category}</span>
                                                <span className={styles.alertMeta}>{cat.itemCount} items</span>
                                            </div>
                                            <div className={styles.alertValue} style={{ fontWeight: 600 }}>
                                                {formatCurrency(cat.value)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </aside>
                    </div>
                </>
            )}
        </div>
    );
}
