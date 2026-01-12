import React from 'react';
import styles from './StatCard.module.css';
import HelpTooltip from '../ui/HelpTooltip';

interface StatCardProps {
    title: string;
    value: string | number;
    subValue?: string;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'secondary';
    helpText?: string;
}

export default function StatCard({ title, value, subValue, variant = 'default', helpText }: StatCardProps) {
    return (
        <div className={`${styles.card} ${styles[variant]}`}>
            <div className={styles.header}>
                <h3 className={styles.title}>{title}</h3>
                {helpText && <HelpTooltip text={helpText} />}
            </div>
            <div className={styles.content}>
                <div className={styles.value}>{value}</div>
                {subValue && <div className={styles.subValue}>{subValue}</div>}
            </div>
        </div>
    );
}
