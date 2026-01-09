'use client';

import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import styles from './AlertPanel.module.css';

interface Alert {
    orderId: number;
    orderName: string;
    marginPercent: number;
}

interface AlertPanelProps {
    lowMarginAlerts: Alert[];
    criticalStores: { name: string; marginPercent: number }[];
}

export default function AlertPanel({ lowMarginAlerts, criticalStores }: AlertPanelProps) {
    const hasAlerts = lowMarginAlerts.length > 0 || criticalStores.length > 0;

    if (!hasAlerts) {
        return (
            <motion.div
                className={styles.container}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className={styles.noAlerts}>
                    <span className={styles.checkmark}>✓</span>
                    <p>No margin alerts at this time</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className={`${styles.container} ${styles.hasAlerts}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className={styles.header}>
                <AlertTriangle className={styles.alertIcon} size={24} />
                <h2 className={styles.title}>Margin Alerts</h2>
            </div>

            {criticalStores.length > 0 && (
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Store Margin Below 40%</h3>
                    <div className={styles.alertList}>
                        {criticalStores.map((store) => (
                            <div key={store.name} className={styles.alertItem}>
                                <span className={styles.alertName}>{store.name}</span>
                                <span className={styles.alertValue}>{store.marginPercent.toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {lowMarginAlerts.length > 0 && (
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Orders Below 30% Margin</h3>
                    <div className={styles.alertList}>
                        {lowMarginAlerts.slice(0, 10).map((alert) => (
                            <div key={alert.orderId} className={styles.alertItem}>
                                <span className={styles.alertName}>{alert.orderName}</span>
                                <span className={styles.alertValue}>{alert.marginPercent.toFixed(1)}%</span>
                            </div>
                        ))}
                        {lowMarginAlerts.length > 10 && (
                            <p className={styles.moreAlerts}>
                                +{lowMarginAlerts.length - 10} more orders
                            </p>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
