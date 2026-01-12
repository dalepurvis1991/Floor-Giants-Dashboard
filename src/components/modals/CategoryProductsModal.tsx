'use client';

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import styles from './CategoryProductsModal.module.css';
import { Loader2 } from 'lucide-react';

interface ProductStat {
    id: number;
    name: string;
    sku: string;
    sales: number;
    margin: number;
    marginPercent: number;
    quantity: number;
}

interface CategoryProductsModalProps {
    isOpen: boolean;
    onClose: () => void;
    categoryName: string;
    dateFrom: string;
    dateTo: string;
    storeId?: string;
    region?: string;
}

export default function CategoryProductsModal({
    isOpen,
    onClose,
    categoryName,
    dateFrom,
    dateTo,
    storeId,
    region
}: CategoryProductsModalProps) {
    const [products, setProducts] = useState<ProductStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
        }
    }, [isOpen, categoryName, dateFrom, dateTo, storeId, region]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                category: categoryName,
                dateFrom,
                dateTo,
            });
            if (storeId) params.append('storeId', storeId);
            if (region) params.append('region', region);

            const response = await fetch(`/api/categories/products?${params.toString()}`);
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            }
        } catch (error) {
            console.error('Failed to fetch category products:', error);
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
            title={`Products in ${categoryName}`}
        >
            {loading ? (
                <div className={styles.loading}>
                    <Loader2 className={styles.spinner} />
                    <p>Fetching products...</p>
                </div>
            ) : products.length === 0 ? (
                <div className={styles.empty}>
                    <p>No products found for this category.</p>
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Product / SKU</th>
                                <th className={styles.textRight}>Qty</th>
                                <th className={styles.textRight}>Revenue</th>
                                <th className={styles.textRight}>Margin %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product.id} className={styles.row}>
                                    <td>
                                        <div className={product.sku ? styles.nameWithSku : styles.nameOnly}>
                                            <span className={styles.productName}>{product.name}</span>
                                            {product.sku && <span className={styles.sku}>{product.sku}</span>}
                                        </div>
                                    </td>
                                    <td className={styles.textRight}>{product.quantity}</td>
                                    <td className={styles.textRight}>{formatCurrency(product.sales)}</td>
                                    <td className={`${styles.textRight} ${product.marginPercent < 30 ? styles.lowMargin : ''}`}>
                                        {product.marginPercent.toFixed(1)}%
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
