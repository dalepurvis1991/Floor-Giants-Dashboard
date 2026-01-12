import React, { useState } from 'react';
import { BarChart2, Table, ChevronDown, ChevronUp } from 'lucide-react';
import HelpTooltip from './HelpTooltip';
import styles from './ChartTableToggle.module.css';

interface ChartTableToggleProps {
    title: string;
    helpText?: string;
    chart: React.ReactNode;
    tableData: any[];
    tableColumns: {
        header: string;
        accessor: string | ((row: any) => React.ReactNode);
        className?: string;
    }[];
    onRowClick?: (row: any) => void;
}

export default function ChartTableToggle({
    title,
    helpText,
    chart,
    tableData,
    tableColumns,
    onRowClick
}: ChartTableToggleProps) {
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [showAll, setShowAll] = useState(false);

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <h2 className={styles.title}>{title}</h2>
                    {helpText && <HelpTooltip text={helpText} />}
                </div>

                <div className={styles.toggle}>
                    <button
                        className={`${styles.toggleBtn} ${view === 'chart' ? styles.active : ''}`}
                        onClick={() => setView('chart')}
                        title="View Chart"
                    >
                        <BarChart2 size={16} />
                    </button>
                    <button
                        className={`${styles.toggleBtn} ${view === 'table' ? styles.active : ''}`}
                        onClick={() => setView('table')}
                        title="View Table"
                    >
                        <Table size={16} />
                    </button>
                </div>
            </div>

            <div className={styles.content}>
                {view === 'chart' && (
                    <div className={styles.chartContainer}>
                        {chart}
                    </div>
                )}

                {view === 'table' && (
                    <>
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        {tableColumns.map((col, i) => (
                                            <th key={i} className={col.className || ''}>{col.header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableData.slice(0, showAll ? undefined : 10).map((row, i) => (
                                        <tr
                                            key={i}
                                            onClick={() => onRowClick && onRowClick(row)}
                                            className={onRowClick ? styles.clickable : ''}
                                        >
                                            {tableColumns.map((col, j) => (
                                                <td key={j} className={col.className || ''}>
                                                    {typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {tableData.length > 10 && (
                            <button
                                onClick={() => setShowAll(!showAll)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '12px',
                                    background: 'transparent',
                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 500
                                }}
                            >
                                {showAll ? (
                                    <>Show Less <ChevronUp size={16} /></>
                                ) : (
                                    <>Show All ({tableData.length}) <ChevronDown size={16} /></>
                                )}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div >
    );
}
