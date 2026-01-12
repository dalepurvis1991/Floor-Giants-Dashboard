'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './Leaderboard.module.css';
import HelpTooltip from '../ui/HelpTooltip';

interface SalespersonData {
    id: number;
    name: string;
    totalSales: number;
    marginPercent: number;
    discounts: number;
    orderCount: number;
    atv?: number;
    conversionRate?: number;
    valueConverted?: number;
}

interface LeaderboardProps {
    data: SalespersonData[];
    onSalespersonClick?: (id: number, name: string) => void;
}

type SortKey = 'totalSales' | 'marginPercent' | 'discounts' | 'conversionRate' | 'atv' | 'valueConverted';

export default function Leaderboard({ data, onSalespersonClick }: LeaderboardProps) {
    const [sortBy, setSortBy] = useState<SortKey>('totalSales');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showAll, setShowAll] = useState(false);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

    const handleSort = (key: SortKey) => {
        if (sortBy === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortOrder('desc');
        }
    };

    const sortedData = [...data].sort((a, b) => {
        const multiplier = sortOrder === 'asc' ? 1 : -1;
        const valA = (a[sortBy] as number) || 0;
        const valB = (b[sortBy] as number) || 0;
        return (valA - valB) * multiplier;
    });

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <h2 className={styles.title}>Sales Leaderboard</h2>
                    <HelpTooltip text="Ranking of salespeople based on total sales value (Ex VAT)." />
                </div>
                <div className={styles.sortButtons}>
                    {(['totalSales', 'conversionRate', 'atv', 'marginPercent', 'discounts'] as SortKey[]).map((key) => (
                        <button
                            key={key}
                            className={`${styles.sortButton} ${sortBy === key ? styles.active : ''}`}
                            onClick={() => handleSort(key)}
                        >
                            {key === 'totalSales' ? 'Sales' :
                                key === 'conversionRate' ? 'CR%' :
                                    key === 'atv' ? 'ATV' :
                                        key === 'marginPercent' ? 'Margin' : 'Discounts'}
                            <ArrowUpDown size={12} />
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.list}>
                {sortedData.slice(0, showAll ? undefined : 10).map((person, index) => (
                    <motion.div
                        key={person.id}
                        className={`${styles.row} ${onSalespersonClick ? styles.clickable : ''}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => onSalespersonClick?.(person.id, person.name)}
                    >
                        <div className={styles.rank}>
                            <span className={`${styles.rankNumber} ${index < 3 ? styles[`top${index + 1}`] : ''}`}>
                                {index + 1}
                            </span>
                        </div>
                        <div className={styles.info}>
                            <span className={styles.name}>{person.name}</span>
                            <span className={styles.orders}>{person.orderCount} orders</span>
                        </div>
                        <div className={styles.stats}>
                            <div className={styles.stat}>
                                <span className={styles.statValue}>{formatCurrency(person.totalSales)}</span>
                                <span className={styles.statLabel}>Sales</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statValue}>{person.conversionRate?.toFixed(1) || 0}%</span>
                                <span className={styles.statLabel}>CR%</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statValue}>{formatCurrency(person.atv || 0)}</span>
                                <span className={styles.statLabel}>ATV</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={`${styles.statValue} ${person.marginPercent < 30 ? styles.danger : ''}`}>
                                    {person.marginPercent.toFixed(1)}%
                                </span>
                                <span className={styles.statLabel}>Margin</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statValue}>{formatCurrency(person.discounts)}</span>
                                <span className={styles.statLabel}>Disc</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {
                data.length > 10 && (
                    <button
                        className={styles.showMoreBtn}
                        onClick={() => setShowAll(!showAll)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            width: '100%',
                            padding: '12px',
                            background: 'transparent',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        {showAll ? (
                            <>Show Less <ChevronUp size={16} /></>
                        ) : (
                            <>Show All ({data.length}) <ChevronDown size={16} /></>
                        )}
                    </button>
                )
            }
        </div >
    );
}
