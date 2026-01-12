'use client';

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import styles from './OrdersModal.module.css'; // Reuse OrdersModal styles for consistency
import { Loader2, ArrowRight, User, Building2 } from 'lucide-react';

interface Quote {
    id: number;
    name: string;
    date_order: string;
    amount_total: number;
    partner_id: [number, string] | false;
    user_id: [number, string] | false;
    company_id: [number, string] | false;
}

interface QuotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    type?: string;
    value?: string;
    dateFrom?: string;
    dateTo?: string;
    storeId?: string;
    onQuoteClick: (quoteId: number, quoteName: string) => void;
    title?: string;
}

export default function QuotesModal({
    isOpen,
    onClose,
    type,
    value,
    dateFrom,
    dateTo,
    storeId,
    onQuoteClick,
    title
}: QuotesModalProps) {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && type && value) {
            fetchQuotes();
        }
    }, [isOpen, type, value, dateFrom, dateTo, storeId]);

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);
            if (storeId) params.append('storeId', storeId);
            if (type) params.append('type', type);
            if (value) params.append('value', value);

            const response = await fetch(`/api/quotes/drilldown?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setQuotes(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Failed to fetch quotes:', error);
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
            title={title || `Quotes for ${value}`}
            size="large"
        >
            {loading ? (
                <div className={styles.loading}>
                    <Loader2 className={styles.spinner} />
                    <p>Fetching quotes...</p>
                </div>
            ) : quotes.length === 0 ? (
                <div className={styles.empty}>
                    <p>No quotes found for this selection.</p>
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Quote Ref</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Salesperson</th>
                                <th>Company</th>
                                <th className={styles.textRight}>Total</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotes.map((quote) => (
                                <tr
                                    key={quote.id}
                                    className={styles.row}
                                    onClick={() => onQuoteClick(quote.id, quote.name)}
                                >
                                    <td className={styles.name}>{quote.name}</td>
                                    <td>{new Date(quote.date_order).toLocaleDateString('en-GB')}</td>
                                    <td>{quote.partner_id ? quote.partner_id[1] : 'Unknown Customer'}</td>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            <User size={12} className="text-slate-500" />
                                            <span className="text-xs">{quote.user_id ? quote.user_id[1] : 'Unassigned'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            <Building2 size={12} className="text-slate-500" />
                                            <span className="text-xs">{quote.company_id ? quote.company_id[1] : 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className={`${styles.total} ${styles.textRight}`}>
                                        {formatCurrency(quote.amount_total)}
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
