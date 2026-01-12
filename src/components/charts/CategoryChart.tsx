'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { useState } from 'react';
import styles from './CategoryChart.module.css';

interface CategoryData {
    category: string;
    sales: number;
    margin: number;
    marginPercent: number;
    discounts: number;
    [key: string]: string | number;
}

interface CategoryChartProps {
    data: CategoryData[];
    onCategoryClick?: (category: string) => void;
}

const COLORS = [
    '#6366f1',
    '#8b5cf6',
    '#a855f7',
    '#ec4899',
    '#f43f5e',
    '#f97316',
    '#eab308',
    '#22c55e',
];

export default function CategoryChart({ data, onCategoryClick }: CategoryChartProps) {
    const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            notation: 'compact',
        }).format(value);

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: CategoryData }[] }) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            return (
                <div className={styles.tooltip}>
                    <p className={styles.tooltipTitle}>{item.category}</p>
                    <p>Sales: {formatCurrency(item.sales)}</p>
                    <p>Margin: {item.marginPercent.toFixed(1)}%</p>
                    <p>Discounts: {formatCurrency(item.discounts)}</p>
                    {onCategoryClick && <p className={styles.clickHint}>Click to see products</p>}
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className={styles.header}>
                <h2 className={styles.title}>Sales by Category</h2>
                <div className={styles.toggleGroup}>
                    <button
                        className={`${styles.toggleBtn} ${chartType === 'bar' ? styles.active : ''}`}
                        onClick={() => setChartType('bar')}
                    >
                        Bar
                    </button>
                    <button
                        className={`${styles.toggleBtn} ${chartType === 'pie' ? styles.active : ''}`}
                        onClick={() => setChartType('pie')}
                    >
                        Pie
                    </button>
                </div>
            </div>

            <div className={styles.chartContainer}>
                {chartType === 'bar' ? (
                    <ResponsiveContainer width="100%" height={450}>
                        <BarChart data={data as any[]} layout="vertical" margin={{ left: 20, right: 20 }}>
                            <XAxis type="number" tickFormatter={formatCurrency} stroke="#64748b" />
                            <YAxis type="category" dataKey="category" stroke="#64748b" width={140} interval={0} fontSize={12} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                                dataKey="sales"
                                radius={[0, 6, 6, 0]}
                                style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
                                onClick={(entry: any) => onCategoryClick?.(entry.category)}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <ResponsiveContainer width="100%" height={450}>
                        <PieChart>
                            <Pie
                                data={data as any[]}
                                dataKey="sales"
                                nameKey="category"
                                cx="50%"
                                cy="50%"
                                outerRadius={120}
                                innerRadius={60}
                                paddingAngle={2}
                                style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
                                onClick={(entry: any) => onCategoryClick?.(entry.category)}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
        </motion.div>
    );
}
