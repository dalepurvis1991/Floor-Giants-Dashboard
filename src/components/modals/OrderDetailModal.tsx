'use client';

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import styles from './OrderDetailModal.module.css';
import { Loader2 } from 'lucide-react';

interface OrderLine {
    id: number;
    product_id: [number, string] | false;
    qty: number;
    price_unit: number;
    price_subtotal: number;
    discount: number;
    margin: number;
}

interface OrderDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: number;
    orderName: string;
}

export default function OrderDetailModal({
    isOpen,
    onClose,
    orderId,
    orderName
}: OrderDetailModalProps) {
    const [lines, setLines] = useState<OrderLine[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchOrderDetails();
        }
    }, [isOpen, orderId]);

    const fetchOrderDetails = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/orders/${orderId}`);
            if (response.ok) {
                const data = await response.json();
                setLines(data.lines);
            }
        } catch (error) {
            console.error('Failed to fetch order details:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

    const totalMargin = lines.reduce((acc, line) => acc + line.margin, 0);
    const totalSales = lines.reduce((acc, line) => acc + line.price_subtotal, 0);
    const avgMarginPercent = totalSales !== 0 ? (totalMargin / totalSales) * 100 : 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Details for ${orderName}`}
        >
            {loading ? (
                <div className={styles.loading}>
                    <Loader2 className={styles.spinner} />
                    <p>Loading items...</p>
                </div>
            ) : (
                <div className={styles.container}>
                    <div className={styles.summaryGrid}>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Total (Ex VAT)</span>
                            <span className={styles.summaryValue}>{formatCurrency(totalSales)}</span>
                        </div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Total Margin</span>
                            <span className={styles.summaryValue}>{formatCurrency(totalMargin)}</span>
                        </div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Margin %</span>
                            <span className={`${styles.summaryValue} ${avgMarginPercent < 30 ? styles.danger : ''}`}>
                                {avgMarginPercent.toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th className={styles.textRight}>Qty</th>
                                    <th className={styles.textRight}>Price</th>
                                    <th className={styles.textRight}>Disc%</th>
                                    <th className={styles.textRight}>Total</th>
                                    <th className={styles.textRight}>Margin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((line) => (
                                    <tr key={line.id}>
                                        <td className={styles.productName}>{line.product_id ? line.product_id[1] : 'Unknown Product'}</td>
                                        <td className={styles.textRight}>{line.qty}</td>
                                        <td className={styles.textRight}>{formatCurrency(line.price_unit)}</td>
                                        <td className={styles.textRight}>{line.discount.toFixed(1)}%</td>
                                        <td className={`${styles.textRight} ${styles.fontWeight600}`}>
                                            {formatCurrency(line.price_subtotal)}
                                        </td>
                                        <td className={`${styles.textRight} ${line.margin < 0 ? styles.danger : ''}`}>
                                            {formatCurrency(line.margin)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Modal>
    );
}
