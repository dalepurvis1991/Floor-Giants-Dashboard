'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, TrendingUp, Users } from 'lucide-react';
import Image from 'next/image';
import styles from './page.module.css';
import StatCard from '@/components/dashboard/StatCard';
import DashboardFilters from '@/components/dashboard/DashboardFilters';
import ChartTableToggle from '@/components/ui/ChartTableToggle';
import HelpTooltip from '@/components/ui/HelpTooltip';
import QuoteDetailModal from '@/components/modals/QuoteDetailModal';
import QuotesModal from '@/components/modals/QuotesModal';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

interface QuoteMetrics {
    totalQuotes: number;
    totalValue: number;
    conversionRate: number;
    avgQuoteValue: number;
    sampleCount: number;
}

export default function QuotesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        metrics: QuoteMetrics;
        agedQuotes: any[];
        bySalesperson: any[];
        byStore: any[];
        productMix: any[];
        quotes: any[];
    } | null>(null);
    const [filters, setFilters] = useState({
        dateFrom: getDefaultDateFrom(),
        dateTo: getToday(),
    });
    const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
    const [selectedStore, setSelectedStore] = useState<string>('');
    const [selectedRegion, setSelectedRegion] = useState<string>('');
    const [selectedQuote, setSelectedQuote] = useState<{ id: number; name: string } | null>(null);
    const [selectedDrilldown, setSelectedDrilldown] = useState<{ type: string; value: string; title?: string } | null>(null);

    function getToday(): string {
        return new Date().toISOString().split('T')[0];
    }

    function getDefaultDateFrom(): string {
        const date = new Date();
        date.setDate(date.getDate() - 90);
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

            const response = await fetch(`/api/quotes?${params}`);
            if (response.ok) {
                const data = await response.json();
                setData(data);
            }
        } catch (error) {
            console.error('Failed to fetch quotes:', error);
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
                            <p className={styles.subtitle}>Quote Explorer & Pipeline</p>
                        </div>
                    </div>
                </header>
                <div className={styles.loading}>
                    <RefreshCw className={styles.spinning} size={48} />
                    <p>Loading Quote Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <Image src="/logo.png" alt="Floor Giants Logo" width={40} height={40} className={styles.logo} />
                    <div>
                        <h1 className={styles.title}>Floor Giants Dashboard</h1>
                        <p className={styles.subtitle}>Quote Explorer & Pipeline</p>
                    </div>
                </div>

                <nav className={styles.nav}>
                    <button className={styles.navBtn} onClick={() => router.push('/')}>Sales</button>
                    <button className={`${styles.navBtn} ${styles.active}`}>Quotes</button>
                    <button className={styles.navBtn} onClick={() => router.push('/stock')}>Stock</button>
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
                <DashboardFilters
                    onFilterChange={handleFilterChange}
                // Removed showStoreFilter/showRegionFilter as they are now in the header
                />
            </section>

            {data && (
                <>
                    <section className={styles.statsGrid}>
                        <StatCard
                            title="Pipeline Value"
                            value={formatCurrency(data.metrics.totalValue)}
                            subValue={`${data.metrics.totalQuotes} active quotes`}
                            variant="default"
                            helpText="Total value of all quotes currently in Draft or Sent state."
                        />
                        <StatCard
                            title="Conversion Rate"
                            value={`${data.metrics.conversionRate.toFixed(1)}%`}
                            subValue="Based on closed-won"
                            variant="success"
                            helpText="Percentage of total opportunities (Quotes + Sales) that have been Won."
                        />
                        <StatCard
                            title="Avg. Quote Value"
                            value={formatCurrency(data.metrics.avgQuoteValue)}
                            variant="default"
                            helpText="Average untaxed value of active quotes."
                        />
                        <StatCard
                            title="Active Samples"
                            value={data.metrics.sampleCount}
                            subValue="Awaiting follow-up"
                            variant="secondary"
                            helpText="Number of sample-only quotes currently active."
                        />
                    </section>

                    <section className={styles.mainContent}>
                        <div className="flex flex-col gap-6">
                            <ChartTableToggle
                                title="Quote Mix"
                                helpText="Distribution of quote value across product categories."
                                chart={
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data.productMix}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                nameKey="name"
                                            >
                                                {data.productMix.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={COLORS[index % COLORS.length]}
                                                        onClick={() => setSelectedDrilldown({
                                                            type: 'category',
                                                            value: entry.name,
                                                            title: `Quotes for Category: ${entry.name}`
                                                        })}
                                                        className="cursor-pointer"
                                                    />
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
                                tableData={data.productMix}
                                tableColumns={[
                                    { header: 'Category', accessor: 'name' },
                                    { header: 'Value', accessor: (row) => formatCurrency(row.value), className: 'text-right' },
                                ]}
                            />

                            <ChartTableToggle
                                title="Aged Profile"
                                helpText="Value of quotes grouped by age since creation."
                                chart={
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.agedQuotes}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                            <XAxis dataKey="name" stroke="#666" tick={{ fill: '#999', fontSize: 12 }} />
                                            <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 12 }} tickFormatter={(value) => `£${value / 1000}k`} />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                formatter={(value) => formatCurrency(value as number)}
                                            />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                {data.agedQuotes.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={
                                                            index === 3 ? '#f43f5e' :
                                                                index === 2 ? '#f59e0b' :
                                                                    '#6366f1'
                                                        }
                                                        onClick={() => setSelectedDrilldown({
                                                            type: 'age',
                                                            value: entry.name,
                                                            title: `Quotes by Age: ${entry.name}`
                                                        })}
                                                        className="cursor-pointer"
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                }
                                tableData={data.agedQuotes}
                                tableColumns={[
                                    { header: 'Age Group', accessor: 'name' },
                                    { header: 'Value', accessor: (row) => formatCurrency(row.value), className: 'text-right' },
                                ]}
                            />
                        </div>

                        <div className="flex flex-col gap-6">
                            <ChartTableToggle
                                title="Salesperson Performance"
                                helpText="Top salespeople by active pipeline value."
                                chart={
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.bySalesperson.slice(0, 10)} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                            <XAxis type="number" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} tickFormatter={(val) => `£${val / 1000}k`} />
                                            <YAxis dataKey="name" type="category" width={100} stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                                formatter={(value) => formatCurrency(value as number)}
                                            />
                                            <Bar
                                                dataKey="value"
                                                fill="#10b981"
                                                radius={[0, 4, 4, 0]}
                                                barSize={20}
                                                onClick={(entry) => setSelectedDrilldown({
                                                    type: 'salesperson',
                                                    value: (entry as any).name,
                                                    title: `Quotes for Salesperson: ${(entry as any).name}`
                                                })}
                                                className="cursor-pointer"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                }
                                tableData={data.bySalesperson}
                                tableColumns={[
                                    { header: 'Name', accessor: 'name' },
                                    { header: 'Pipeline', accessor: (row) => formatCurrency(row.value), className: 'text-right' },
                                    { header: 'CR%', accessor: (row) => `${row.conversionRate.toFixed(1)}%`, className: 'text-right' },
                                ]}
                            />

                            <ChartTableToggle
                                title="Store Performance"
                                helpText="Active pipeline value by store team."
                                chart={
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.byStore.slice(0, 10)} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                            <XAxis type="number" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} tickFormatter={(val) => `£${val / 1000}k`} />
                                            <YAxis dataKey="name" type="category" width={100} stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                                formatter={(value) => formatCurrency(value as number)}
                                            />
                                            <Bar
                                                dataKey="value"
                                                fill="#8b5cf6"
                                                radius={[0, 4, 4, 0]}
                                                barSize={20}
                                                onClick={(entry) => setSelectedDrilldown({
                                                    type: 'store',
                                                    value: (entry as any).name,
                                                    title: `Quotes for Store: ${(entry as any).name}`
                                                })}
                                                className="cursor-pointer"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                }
                                tableData={data.byStore}
                                tableColumns={[
                                    { header: 'Store', accessor: 'name' },
                                    { header: 'Pipeline', accessor: (row) => formatCurrency(row.value), className: 'text-right' },
                                ]}
                            />
                        </div>
                    </section>

                    {/* List View */}
                    <section className={styles.leaderboardSection}>
                        <div className={styles.tableCard}>
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                    <Users size={20} className="text-indigo-400" />
                                    <h2 className="text-lg font-semibold text-slate-100">Recent Opportunities</h2>
                                    <HelpTooltip text="Active quotes with filtering and sorting options." />
                                </div>
                                <div className="flex items-center gap-3">
                                    <select
                                        className={styles.storeSelect}
                                        value={selectedStore}
                                        onChange={(e) => setSelectedStore(e.target.value)}
                                        style={{ minWidth: '140px', padding: '6px 12px', fontSize: '13px' }}
                                    >
                                        <option value="">All Stores</option>
                                        {data.byStore.map((s: any) => (
                                            <option key={s.name} value={s.name}>{s.name}</option>
                                        ))}
                                    </select>
                                    <select
                                        className={styles.storeSelect}
                                        defaultValue="date"
                                        style={{ minWidth: '120px', padding: '6px 12px', fontSize: '13px' }}
                                        onChange={(e) => {
                                            // Sort is handled inline in the render
                                        }}
                                    >
                                        <option value="date">Sort by Date</option>
                                        <option value="value">Sort by Value</option>
                                        <option value="age">Sort by Age</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles.tableContainer}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Customer</th>
                                            <th>Company</th>
                                            <th>Owner</th>
                                            <th>Store</th>
                                            <th>Age</th>
                                            <th className="text-right">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.quotes
                                            .filter((q: any) => !selectedStore || (q.team_id && q.team_id[1] === selectedStore))
                                            .slice(0, 20)
                                            .map((quote: any) => (
                                                <tr
                                                    key={quote.id}
                                                    className={styles.clickableRow}
                                                    onClick={() => setSelectedQuote({ id: quote.id, name: quote.name })}
                                                >
                                                    <td>
                                                        <div className={styles.customerName}>{quote.partner_id ? quote.partner_id[1] : 'Unknown'}</div>
                                                        <div className={styles.orderRef}>{quote.name}</div>
                                                    </td>
                                                    <td>
                                                        <div className="text-slate-300 text-sm">{Array.isArray(quote.company_id) ? quote.company_id[1] : '-'}</div>
                                                    </td>
                                                    <td>
                                                        <div className={styles.userName}>{quote.user_id ? quote.user_id[1] : 'Unassigned'}</div>
                                                    </td>
                                                    <td>
                                                        <div className={styles.teamName}>{quote.team_id ? quote.team_id[1] : '-'}</div>
                                                    </td>
                                                    <td>
                                                        <span className={`${styles.ageBadge} ${(new Date().getTime() - new Date(quote.date_order).getTime()) / (1000 * 3600 * 24) > 30 ? styles.old : ''}`}>
                                                            {Math.floor((new Date().getTime() - new Date(quote.date_order).getTime()) / (1000 * 3600 * 24))}d
                                                        </span>
                                                    </td>
                                                    <td className="text-right font-bold">
                                                        {formatCurrency(quote.amount_untaxed)}
                                                    </td>
                                                </tr>
                                            ))}
                                        {data.quotes.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="text-center text-slate-500 py-4">No recent opportunities found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <QuoteDetailModal
                        isOpen={!!selectedQuote}
                        onClose={() => setSelectedQuote(null)}
                        quoteId={selectedQuote?.id || 0}
                        quoteName={selectedQuote?.name || ''}
                    />

                    {selectedDrilldown && (
                        <QuotesModal
                            isOpen={!!selectedDrilldown}
                            onClose={() => setSelectedDrilldown(null)}
                            type={selectedDrilldown.type}
                            value={selectedDrilldown.value}
                            title={selectedDrilldown.title}
                            dateFrom={filters.dateFrom}
                            dateTo={filters.dateTo}
                            storeId={selectedStore || undefined}
                            onQuoteClick={(id, name) => setSelectedQuote({ id, name })}
                        />
                    )}
                </>
            )}
        </div>
    );
}
