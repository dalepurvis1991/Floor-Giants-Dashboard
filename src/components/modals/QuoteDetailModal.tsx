
'use client';

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import styles from './QuoteDetailModal.module.css';
import { Loader2, MessageSquare, StickyNote, Mail, Calendar, User, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuoteLine {
    id: number;
    product_id: [number, string] | false;
    product_uom_qty: number;
    price_unit: number;
    price_subtotal: number;
    discount: number;
}

interface MailMessage {
    id: number;
    subject: string;
    date: string;
    body: string;
    author_id: [number, string] | false;
    message_type: string;
}

interface QuoteDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    quoteId: number;
    quoteName: string;
}

export default function QuoteDetailModal({
    isOpen,
    onClose,
    quoteId,
    quoteName
}: QuoteDetailModalProps) {
    const [lines, setLines] = useState<QuoteLine[]>([]);
    const [messages, setMessages] = useState<MailMessage[]>([]);
    const [note, setNote] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'items' | 'comms' | 'notes'>('items');

    useEffect(() => {
        if (isOpen) {
            fetchQuoteDetails();
        }
    }, [isOpen, quoteId]);

    const fetchQuoteDetails = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/orders/${quoteId}?type=sale`);
            if (response.ok) {
                const data = await response.json();
                setLines(data.lines || []);
                setMessages(data.messages || []);
                setNote(data.order?.note || null);
            }
        } catch (error) {
            console.error('Failed to fetch quote details:', error);
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
            title={quoteName}
            size="large"
        >
            <div className={styles.container}>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'items' ? styles.active : ''}`}
                        onClick={() => setActiveTab('items')}
                    >
                        <ShoppingBag size={16} /> Items
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'comms' ? styles.active : ''}`}
                        onClick={() => setActiveTab('comms')}
                    >
                        <MessageSquare size={16} /> Communications
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'notes' ? styles.active : ''}`}
                        onClick={() => setActiveTab('notes')}
                    >
                        <StickyNote size={16} /> Internal Notes
                    </button>
                </div>

                <div className={styles.content}>
                    {loading ? (
                        <div className={styles.loading}>
                            <Loader2 className={styles.spinner} />
                            <p>Loading details...</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            {activeTab === 'items' && (
                                <motion.div
                                    key="items"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                >
                                    <div className={styles.tableContainer}>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>Product</th>
                                                    <th className={styles.textRight}>Qty</th>
                                                    <th className={styles.textRight}>Price</th>
                                                    <th className={styles.textRight}>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lines.map((line) => (
                                                    <tr key={line.id}>
                                                        <td className={styles.productName}>{line.product_id ? line.product_id[1] : 'Unknown'}</td>
                                                        <td className={styles.textRight}>{line.product_uom_qty}</td>
                                                        <td className={styles.textRight}>{formatCurrency(line.price_unit)}</td>
                                                        <td className={styles.textRight}>{formatCurrency(line.price_subtotal)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'comms' && (
                                <motion.div
                                    key="comms"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className={styles.messageList}
                                >
                                    {messages.length === 0 ? (
                                        <div className={styles.empty}>No communication history found.</div>
                                    ) : (
                                        messages.map((msg) => (
                                            <div key={msg.id} className={styles.message}>
                                                <div className={styles.messageHeader}>
                                                    <div className={styles.author}>
                                                        <User size={14} />
                                                        {msg.author_id ? msg.author_id[1] : 'System'}
                                                    </div>
                                                    <div className={styles.date}>
                                                        <Calendar size={14} />
                                                        {new Date(msg.date).toLocaleString('en-GB')}
                                                    </div>
                                                </div>
                                                <div
                                                    className={styles.messageBody}
                                                    dangerouslySetInnerHTML={{ __html: msg.body }}
                                                />
                                            </div>
                                        ))
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'notes' && (
                                <motion.div
                                    key="notes"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className={styles.notesContainer}
                                >
                                    {note ? (
                                        <div className={styles.noteContent}>{note}</div>
                                    ) : (
                                        <div className={styles.empty}>No internal notes.</div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </Modal>
    );
}
