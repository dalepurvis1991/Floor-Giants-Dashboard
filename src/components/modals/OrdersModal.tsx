'use client';

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import styles from './OrdersModal.module.css';
import { Loader2, ArrowRight } from 'lucide-react';

interface Order {
    id: number;
    name: string;
    date_order: string;
    amount_total: number;
    partner_id: [number, string] | false;
}

interface OrdersModalProps {
    isOpen: boolean;
    onClose: () => void;
    salespersonId: number;
    salespersonName: string;
    dateFrom: string;
    dateTo: string;
    storeId?: number;
    onOrderClick: (orderId: number, orderName: string) => void;
}

export default function OrdersModal({
    isOpen,
    onClose,
    salespersonId,
    salespersonName,
    dateFrom,
    dateTo,
    storeId,
    onOrderClick
}: OrdersModalProps) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchOrders();
        }
    }, [isOpen, salespersonId, dateFrom, dateTo, storeId]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                dateFrom,
                dateTo,
            });
            if (storeId) params.append('storeId', storeId.toString());

            const response = await fetch(`/api/salespeople/${salespersonId}/orders?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setOrders(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Orders for ${salespersonName}`}
        >
            {loading ? (
                <div className={styles.loading}>
                    <Loader2 className={styles.spinner} />
                    <p>Fetching orders...</p>
                </div>
            ) : orders.length === 0 ? (
                <div className={styles.empty}>
                    <p>No orders found for this period.</p>
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Order Ref</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th className={styles.textRight}>Total</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr
                                    key={order.id}
                                    className={styles.row}
                                    onClick={() => onOrderClick(order.id, order.name)}
                                >
                                    <td className={styles.name}>{order.name}</td>
                                    <td>{new Date(order.date_order).toLocaleDateString('en-GB')}</td>
                                    <td>{order.partner_id ? order.partner_id[1] : 'Cash Customer'}</td>
                                    <td className={`${styles.total} ${styles.textRight}`}>
                                        {formatCurrency(order.amount_total)}
                                    </td>
                                    <td className={styles.action}>
                                        <ArrowRight size={16} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Modal>
    );
}
