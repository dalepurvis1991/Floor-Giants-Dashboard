'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Package, RefreshCw, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import Image from 'next/image';
import styles from './page.module.css';
import StatCard from '@/components/dashboard/StatCard';
import DashboardFilters from '@/components/dashboard/DashboardFilters';
import ChartTableToggle from '@/components/ui/ChartTableToggle';
import HelpTooltip from '@/components/ui/HelpTooltip';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend
} from 'recharts';

interface StockMetrics {
    totalValuation: number;
    valuationByCategory: { category: string; value: number; itemCount: number }[];
    alerts: {
        id: number;
        name: string;
        sku: string;
        status: 'low' | 'out_of_stock' | 'slow_mover' | 'critical_lead';
        currentStock: number;
        forecastedStock: number;
        avgWeeklySales: number;
        message?: string;
    }[];
    scraps: {
        productId: number;
        name: string;
        quantity: number;
        value: number;
        date: string;
    }[];
    totalScrapValue: number;
    suggestions: {
        id: number;
        name: string;
        sku: string;
        quantity: number;
        revenue: number;
        margin: number;
        marginPercent: number;
        stockLevel: number;
        forecastedStock: number;
        type: string;
    }[];
}

export default function StockPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<StockMetrics | null>(null);
    const [filters, setFilters] = useState({
        dateFrom: getDefaultDateFrom(), // Default to 30 days for stock movement analysis
        dateTo: getToday(),
    });
    const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
    const [selectedStore, setSelectedStore] = useState<string>('');
    const [selectedRegion, setSelectedRegion] = useState<string>('');

    function getToday(): string {
        return new Date().toISOString().split('T')[0];
    }

    function getDefaultDateFrom(): string {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    }

    // Fetch stores on mount
    useEffect(() => {
        fetch('/api/stores')
            .then(res => res.json())
            .then(data => setStores(data))
            .catch(err => console.error('Failed to fetch stores:', err));
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
            });
            if (selectedStore) params.append('storeId', selectedStore);
            if (selectedRegion) params.append('region', selectedRegion);

            const response = await fetch(`/api/stock?${params}`);
            if (response.ok) {
                const data = await response.json();
                setData(data);
            }
        } catch (error) {
            console.error('Failed to fetch stock data:', error);
        } finally {
            setLoading(false);
        }
    }, [filters, selectedStore, selectedRegion]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFilterChange = (newFilters: any) => {
        setFilters({ dateFrom: newFilters.dateFrom, dateTo: newFilters.dateTo });
        // Don't update store/region here as they are now controlled separately
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            maximumFractionDigits: 0
        }).format(value);

    // Color palette for charts
    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9'];

    // Loading state
    if (loading && !data) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.titleSection}>
                        <Image src="/logo.png" alt="Floor Giants Logo" width={40} height={40} className={styles.logo} />
                        <div>
                            <h1 className={styles.title}>Floor Giants Dashboard</h1>
                            <p className={styles.subtitle}>Inventory Management & Stock</p>
                        </div>
                    </div>
                </header>
                <div className={styles.loading}>
                    <RefreshCw className={styles.spinning} size={48} />
                    <p>Loading Stock Dashboard...</p>
                </div>
            </div>
        );
    }

    const criticalAlerts = data?.alerts ? data.alerts.filter(a => a.status === 'out_of_stock' || a.status === 'critical_lead').length : 0;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <Image src="/logo.png" alt="Floor Giants Logo" width={40} height={40} className={styles.logo} />
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 className={styles.title}>Floor Giants Dashboard</h1>
                            <HelpTooltip text="Overview of current stock levels across all locations." />
                        </div>
                        <p className={styles.subtitle}>Inventory Management & Stock</p>
                    </div>
                </div>

                <nav className={styles.nav}>
                    <button className={styles.navBtn} onClick={() => router.push('/')}>Sales</button>
                    <button className={styles.navBtn} onClick={() => router.push('/quotes')}>Quotes</button>
                    <button className={`${styles.navBtn} ${styles.active}`}>Stock</button>
                </nav>

                <div className={styles.filterControls}>
                    <select
                        className={styles.storeSelect}
                        value={selectedRegion}
                        onChange={(e) => {
                            setSelectedRegion(e.target.value);
                            setSelectedStore(''); // Clear store when region changes
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
                        {stores.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <button className={styles.refreshBtn} onClick={fetchData} disabled={loading}>
                    <RefreshCw size={18} className={loading ? styles.spinning : ''} />
                    Refresh
                </button>
            </header>

            <section className={styles.filters}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Filter Data</h3>
                    <HelpTooltip text="Adjust the date range to analyze stock movements and scrap over time." />
                </div>
                <DashboardFilters
                    onFilterChange={handleFilterChange}
                // Removed showStoreFilter/showRegionFilter as they are now in the header
                />
            </section>

            {/* KPI Grid */}
            <section className={styles.statsGrid}>
                <StatCard
                    title="Total Valuation"
                    value={formatCurrency(data.totalValuation)}
                    subValue="Cost Value"
                    variant="default"
                    helpText="Total cost value of all stock currently on hand."
                />
                <StatCard
                    title="Stock Alerts"
                    value={criticalAlerts}
                    subValue="Critical Items"
                    variant={criticalAlerts > 0 ? 'danger' : 'success'}
                    helpText="Items with 0 stock or below lead time requirements."
                />
                <StatCard
                    title="Scrap / Write-offs"
                    value={formatCurrency(data.totalScrapValue)}
                    subValue="This Period"
                    variant="warning"
                    helpText="Value of items scrapped or written off in the selected period."
                />
                <StatCard
                    title="Slow Moving"
                    value={data.alerts.filter(a => a.status === 'slow_mover').length}
                    subValue="> 14 days no sales"
                    variant="default"
                    helpText="Items with stock but no sales in the filtered period."
                />
            </section>

            {/* Main Content Area */}
            <section className={styles.mainContent}>
                {/* Left Column */}
                <div className="flex flex-col gap-6">
                    <ChartTableToggle
                        title="Valuation by Category"
                        helpText="Stock value distribution across product categories."
                        chart={
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.valuationByCategory}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        nameKey="category"
                                    >
                                        {data.valuationByCategory.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                        formatter={(value) => formatCurrency(value as number)}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        }
                        tableData={data.valuationByCategory}
                        tableColumns={[
                            { header: 'Category', accessor: 'category' },
                            { header: 'Items', accessor: 'itemCount', className: 'text-right' },
                            { header: 'Value', accessor: (row) => formatCurrency(row.value), className: 'text-right' },
                        ]}
                    />

                    <div className={styles.tableCard}>
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp size={20} className="text-emerald-400" />
                            <h2 className="text-lg font-semibold text-slate-100">Restock Suggestions</h2>
                            <HelpTooltip text="High revenue items with low stock (< 2 units)." />
                        </div>
                        <div className={styles.tableContainer} style={{ maxHeight: '300px' }}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th className="text-right">Stock</th>
                                        <th className="text-right">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.suggestions.map((p: any) => (
                                        <tr key={p.id} className={styles.activeRow}>
                                            <td>
                                                <div>{p.name}</div>
                                                <div className="text-xs text-slate-400">{p.sku}</div>
                                            </td>
                                            <td className="text-right text-red-400 font-bold">{p.stockLevel}</td>
                                            <td className="text-right">{formatCurrency(p.revenue)}</td>
                                        </tr>
                                    ))}
                                    {data.suggestions.length === 0 && (
                                        <tr><td colSpan={3} className="p-4 text-center text-slate-500">No suggestions available</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column - Alerts List */}
                <div className="flex flex-col gap-6">
                    <div className={styles.tableCard}>
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle size={20} className="text-amber-400" />
                            <h2 className="text-lg font-semibold text-slate-100">Critical Alerts</h2>
                            <HelpTooltip text="Items items that have hit zero stock or are below critical thresholds." />
                        </div>
                        <div className={styles.tableContainer} style={{ maxHeight: '600px' }}>
                            {data.alerts.map((alert: any) => (
                                <div key={alert.id} className="p-3 mb-2 rounded bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${alert.status === 'out_of_stock' ? 'bg-red-500/20 text-red-400' :
                                            alert.status === 'critical_lead' ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-slate-500/20 text-slate-400'
                                            }`}>
                                            {alert.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                        <span className="text-xs text-slate-500">Stock: {alert.currentStock}</span>
                                    </div>
                                    <div className="text-sm font-medium text-slate-200">{alert.name}</div>
                                    <div className="text-xs text-slate-400 mb-1">{alert.sku}</div>
                                    {alert.message && (
                                        <div className="text-xs text-amber-500 mt-1">{alert.message}</div>
                                    )}
                                </div>
                            ))}
                            {data.alerts.length === 0 && (
                                <div className="p-4 text-center text-slate-500">No alerts found</div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
