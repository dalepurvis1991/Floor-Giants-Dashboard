
'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Package, ChevronDown, ChevronUp, PoundSterling, BarChart3, ListFilter, Tag } from 'lucide-react';
import styles from './ProductLeaderboard.module.css';
import HelpTooltip from '../ui/HelpTooltip';

interface ProductStat {
    id: number;
    name: string;
    sku: string;
    sales: number;
    margin: number;
    marginPercent: number;
    quantity: number;
    stockLevel?: number;
    type?: string;
    category?: string;
}

interface ProductLeaderboardProps {
    data: ProductStat[];
}

type SortKey = 'sales' | 'margin' | 'quantity';

export default function ProductLeaderboard({ data }: ProductLeaderboardProps) {
    const [showMore, setShowMore] = useState(false);
    const [sortBy, setSortBy] = useState<SortKey>('margin');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const categories = useMemo(() => {
        const cats = new Set<string>();
        data.forEach(p => {
            if (p.category) cats.add(p.category);
        });
        return ['all', ...Array.from(cats).sort()];
    }, [data]);

    const filteredData = useMemo(() => {
        let result = data;
        if (selectedCategory !== 'all') {
            result = result.filter(p => p.category === selectedCategory);
        }
        return result.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
    }, [data, sortBy, selectedCategory]);

    const displayData = showMore ? filteredData : filteredData.slice(0, 10);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            maximumFractionDigits: 0
        }).format(value);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <TrendingUp className={styles.titleIcon} size={20} />
                    <h2 className={styles.title}>Product Analysis</h2>
                    <HelpTooltip text="Performance of individual products based on Sales, Margin, and Quantity." />
                </div>
                <div className={styles.controls}>
                    <div className={styles.sortGroup}>
                        <Tag size={14} className="text-slate-500" />
                        <select
                            className={styles.sortSelect}
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {categories.filter(c => c !== 'all').map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.sortGroup}>
                        <ListFilter size={14} className="text-slate-500" />
                        <select
                            className={styles.sortSelect}
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortKey)}
                        >
                            <option value="margin">By Profit</option>
                            <option value="sales">By Revenue</option>
                            <option value="quantity">By Volume</option>
                        </select>
                    </div>
                    <div className={styles.countBadge}>{filteredData.length} Products</div>
                </div>
            </div>

            <div className={styles.list}>
                <AnimatePresence mode="popLayout">
                    {displayData.map((product, index) => (
                        <motion.div
                            key={product.id || index}
                            className={styles.row}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className={styles.rank}>
                                <span className={index < 3 ? styles[`top${index + 1}`] : ''}>
                                    {index + 1}
                                </span>
                            </div>
                            <div className={styles.info}>
                                <span className={styles.name}>{product.name || 'Unknown Product'}</span>
                                <div className={styles.meta}>
                                    <span className={styles.sku}>{product.sku || 'N/A'}</span>
                                    {product.category && <span className={styles.categoryBadge}>{product.category}</span>}
                                </div>
                            </div>
                            <div className={styles.stats}>
                                <div className={`${styles.stat} ${sortBy === 'margin' ? styles.activeStat : ''}`}>
                                    <span className={styles.statValue}>{formatCurrency(product.margin || 0)}</span>
                                    <span className={styles.statLabel}>Profit</span>
                                </div>
                                <div className={styles.stat}>
                                    <span className={`${styles.statValue} ${(product.marginPercent || 0) < 30 ? styles.danger : ''}`}>
                                        {(product.marginPercent || 0).toFixed(1)}%
                                    </span>
                                    <span className={styles.statLabel}>Margin</span>
                                </div>
                                <div className={`${styles.stat} ${sortBy === 'sales' ? styles.activeStat : ''}`}>
                                    <span className={styles.statValue}>{formatCurrency(product.sales || 0)}</span>
                                    <span className={styles.statLabel}>Value</span>
                                </div>
                                <div className={`${styles.stat} ${sortBy === 'quantity' ? styles.activeStat : ''}`}>
                                    <span className={styles.statValue}>{Math.round(product.quantity || 0)}</span>
                                    <span className={styles.statLabel}>Qty</span>
                                </div>
                                {product.stockLevel !== undefined && (
                                    <div className={styles.stat}>
                                        <span className={`${styles.statValue} ${product.stockLevel <= 0 ? styles.danger : product.stockLevel < 10 ? styles.warning : ''}`}>
                                            {product.stockLevel}
                                        </span>
                                        <span className={styles.statLabel}>Stock</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredData.length > 10 && (
                <button
                    className={styles.showMoreBtn}
                    onClick={() => setShowMore(!showMore)}
                >
                    {showMore ? (
                        <>Show Less <ChevronUp size={16} /></>
                    ) : (
                        <>Show All ({filteredData.length}) <ChevronDown size={16} /></>
                    )}
                </button>
            )}
        </div>
    );
}
