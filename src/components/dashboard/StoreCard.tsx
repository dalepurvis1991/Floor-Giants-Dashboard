'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import styles from './StoreCard.module.css';

interface StoreCardProps {
    name: string;
    totalSales: number;
    marginPercent: number;
    discounts: number;
    refundCount: number;
    refundValue: number;
    alertLevel: 'ok' | 'warning' | 'critical';
}

export default function StoreCard({
    name,
    totalSales,
    marginPercent,
    discounts,
    refundCount,
    refundValue,
    alertLevel,
}: StoreCardProps) {
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

    const AlertIcon =
        alertLevel === 'critical'
            ? AlertCircle
            : alertLevel === 'warning'
                ? AlertTriangle
                : CheckCircle;

    return (
        <motion.div
            className={`${styles.card} ${styles[alertLevel]}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div className={styles.header}>
                <h3 className={styles.storeName}>{name}</h3>
                <div className={`${styles.alert} ${styles[`alert-${alertLevel}`]}`}>
                    <AlertIcon size={16} />
                    <span>{alertLevel === 'critical' ? 'LOW MARGIN' : alertLevel === 'warning' ? 'Monitor' : 'Healthy'}</span>
                </div>
            </div>

            <div className={styles.metrics}>
                <div className={styles.metric}>
                    <span className={styles.metricLabel}>Total Sales</span>
                    <span className={styles.metricValue}>{formatCurrency(totalSales)}</span>
                </div>
                <div className={styles.metric}>
                    <span className={styles.metricLabel}>Margin</span>
                    <span className={`${styles.metricValue} ${marginPercent < 40 ? styles.danger : ''}`}>
                        {marginPercent.toFixed(1)}%
                    </span>
                </div>
                <div className={styles.metric}>
                    <span className={styles.metricLabel}>Discounts</span>
                    <span className={styles.metricValue}>{formatCurrency(discounts)}</span>
                </div>
                <div className={styles.metric}>
                    <span className={styles.metricLabel}>Refunds</span>
                    <span className={styles.metricValue}>
                        {refundCount} ({formatCurrency(refundValue)})
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
