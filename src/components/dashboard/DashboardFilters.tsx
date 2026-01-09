'use client';

import { useState } from 'react';
import { Calendar, Building2, User, ChevronDown } from 'lucide-react';
import styles from './DashboardFilters.module.css';

interface FiltersProps {
    onFilterChange: (filters: {
        dateFrom: string;
        dateTo: string;
        companyId?: number;
        userId?: number;
    }) => void;
}

type DatePreset = 'today' | 'week' | 'month' | 'custom';

export default function DashboardFilters({ onFilterChange }: FiltersProps) {
    const [datePreset, setDatePreset] = useState<DatePreset>('month');
    const [showCustomDates, setShowCustomDates] = useState(false);
    const [dateFrom, setDateFrom] = useState(getDateFrom('month'));
    const [dateTo, setDateTo] = useState(getToday());

    function getToday(): string {
        return new Date().toISOString().split('T')[0];
    }

    function getDateFrom(preset: DatePreset): string {
        const today = new Date();
        switch (preset) {
            case 'today':
                return getToday();
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                return weekAgo.toISOString().split('T')[0];
            case 'month':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                return monthStart.toISOString().split('T')[0];
            default:
                return getToday();
        }
    }

    const handlePresetChange = (preset: DatePreset) => {
        setDatePreset(preset);
        if (preset === 'custom') {
            setShowCustomDates(true);
        } else {
            setShowCustomDates(false);
            const newDateFrom = getDateFrom(preset);
            setDateFrom(newDateFrom);
            onFilterChange({ dateFrom: newDateFrom, dateTo: getToday() });
        }
    };

    const handleCustomDateChange = () => {
        onFilterChange({ dateFrom, dateTo });
    };

    return (
        <div className={styles.container}>
            <div className={styles.filterGroup}>
                <Calendar size={18} className={styles.icon} />
                <div className={styles.presets}>
                    {(['today', 'week', 'month', 'custom'] as DatePreset[]).map((preset) => (
                        <button
                            key={preset}
                            className={`${styles.presetBtn} ${datePreset === preset ? styles.active : ''}`}
                            onClick={() => handlePresetChange(preset)}
                        >
                            {preset === 'today' ? 'Today' : preset === 'week' ? 'This Week' : preset === 'month' ? 'This Month' : 'Custom'}
                        </button>
                    ))}
                </div>
            </div>

            {showCustomDates && (
                <div className={styles.customDates}>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className={styles.dateInput}
                    />
                    <span className={styles.dateSeparator}>to</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className={styles.dateInput}
                    />
                    <button className={styles.applyBtn} onClick={handleCustomDateChange}>
                        Apply
                    </button>
                </div>
            )}
        </div>
    );
}
