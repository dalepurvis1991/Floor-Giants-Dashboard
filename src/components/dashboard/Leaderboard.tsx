'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import styles from './Leaderboard.module.css';

interface SalespersonData {
    id: number;
    name: string;
    totalSales: number;
    marginPercent: number;
    discounts: number;
    orderCount: number;
}

interface LeaderboardProps {
    data: SalespersonData[];
}

type SortKey = 'totalSales' | 'marginPercent' | 'discounts';

export default function Leaderboard({ data }: LeaderboardProps) {
    const [sortBy, setSortBy] = useState<SortKey>('totalSales');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
        return (a[sortBy] - b[sortBy]) * multiplier;
    });

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Sales Leaderboard</h2>
                <div className={styles.sortButtons}>
                    {(['totalSales', 'marginPercent', 'discounts'] as SortKey[]).map((key) => (
                        <button
                            key={key}
                            className={`${styles.sortButton} ${sortBy === key ? styles.active : ''}`}
                            onClick={() => handleSort(key)}
                        >
                            {key === 'totalSales' ? 'Sales' : key === 'marginPercent' ? 'Margin' : 'Discounts'}
                            <ArrowUpDown size={12} />
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.list}>
                {sortedData.map((person, index) => (
                    <motion.div
                        key={person.id}
                        className={styles.row}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
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
                                <span className={`${styles.statValue} ${person.marginPercent < 30 ? styles.danger : ''}`}>
                                    {person.marginPercent.toFixed(1)}%
                                </span>
                                <span className={styles.statLabel}>Margin</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statValue}>{formatCurrency(person.discounts)}</span>
                                <span className={styles.statLabel}>Discounts</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
