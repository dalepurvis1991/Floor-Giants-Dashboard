'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import styles from './StatCard.module.css';

interface StatCardProps {
    title: string;
    value: string;
    subValue?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    variant?: 'default' | 'success' | 'warning' | 'danger';
}

export default function StatCard({
    title,
    value,
    subValue,
    trend,
    trendValue,
    variant = 'default',
}: StatCardProps) {
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

    return (
        <motion.div
            className={`${styles.card} ${styles[variant]}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className={styles.header}>
                <span className={styles.title}>{title}</span>
                {trend && (
                    <div className={`${styles.trend} ${styles[`trend-${trend}`]}`}>
                        <TrendIcon size={14} />
                        {trendValue && <span>{trendValue}</span>}
                    </div>
                )}
            </div>
            <div className={styles.value}>{value}</div>
            {subValue && <div className={styles.subValue}>{subValue}</div>}
        </motion.div>
    );
}
