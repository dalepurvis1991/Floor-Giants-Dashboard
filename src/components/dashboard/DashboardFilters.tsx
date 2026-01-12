'use client';

import { useState, useEffect } from 'react';
import { Calendar, Building2, User, ChevronDown, MapPin } from 'lucide-react';
import styles from './DashboardFilters.module.css';

interface FiltersProps {
    onFilterChange: (filters: {
        dateFrom: string;
        dateTo: string;
        companyId?: number;
        userId?: number;
        storeId?: number;
        region?: 'North' | 'South';
    }) => void;
    showStoreFilter?: boolean;
    showRegionFilter?: boolean;
}

type DatePreset = 'today' | 'week' | 'month' | 'custom';

// Generate month options for the last 12 months
function getMonthOptions(): { label: string; dateFrom: string; dateTo: string }[] {
    const options: { label: string; dateFrom: string; dateTo: string }[] = [];
    const today = new Date();

    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();

        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0); // Last day of month

        const monthName = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

        options.push({
            label: monthName,
            dateFrom: monthStart.toISOString().split('T')[0],
            dateTo: monthEnd.toISOString().split('T')[0],
        });
    }

    return options;
}

export default function DashboardFilters({ onFilterChange, showStoreFilter = false, showRegionFilter = false }: FiltersProps) {
    const [datePreset, setDatePreset] = useState<DatePreset>('month');
    const [showCustomDates, setShowCustomDates] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [dateFrom, setDateFrom] = useState(getDateFrom('month'));
    const [dateTo, setDateTo] = useState(getToday());
    const [stores, setStores] = useState<any[]>([]);
    const [selectedStore, setSelectedStore] = useState<number | undefined>();
    const [selectedRegion, setSelectedRegion] = useState<'North' | 'South' | undefined>();

    const monthOptions = getMonthOptions();

    useEffect(() => {
        if (showStoreFilter) {
            fetch('/api/stores')
                .then(res => res.json())
                .then(data => setStores(data))
                .catch(err => console.error('Failed to fetch stores:', err));
        }
    }, [showStoreFilter]);

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
        setShowMonthPicker(false);
        if (preset === 'custom') {
            setShowCustomDates(true);
        } else {
            setShowCustomDates(false);
            const newDateFrom = getDateFrom(preset);
            setDateFrom(newDateFrom);
            setDateTo(getToday());
            onFilterChange({
                dateFrom: newDateFrom,
                dateTo: getToday(),
                storeId: selectedStore,
                region: selectedRegion
            });
        }
    };

    const handleMonthSelect = (monthOption: { label: string; dateFrom: string; dateTo: string }) => {
        setDateFrom(monthOption.dateFrom);
        setDateTo(monthOption.dateTo);
        setShowMonthPicker(false);
        setDatePreset('month');
        onFilterChange({
            dateFrom: monthOption.dateFrom,
            dateTo: monthOption.dateTo,
            storeId: selectedStore,
            region: selectedRegion
        });
    };

    const handleCustomDateChange = () => {
        onFilterChange({
            dateFrom,
            dateTo,
            storeId: selectedStore,
            region: selectedRegion
        });
    };

    const handleStoreChange = (id: string) => {
        const storeId = id === 'all' ? undefined : parseInt(id);
        setSelectedStore(storeId);
        onFilterChange({
            dateFrom,
            dateTo,
            storeId,
            region: selectedRegion
        });
    };

    const handleRegionChange = (region: string) => {
        const r = region === 'all' ? undefined : (region as 'North' | 'South');
        setSelectedRegion(r);
        onFilterChange({
            dateFrom,
            dateTo,
            storeId: selectedStore,
            region: r
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.filterGroup}>
                <Calendar size={18} className={styles.icon} />
                <div className={styles.presets}>
                    <button
                        className={`${styles.presetBtn} ${datePreset === 'today' ? styles.active : ''}`}
                        onClick={() => handlePresetChange('today')}
                    >
                        Today
                    </button>
                    <button
                        className={`${styles.presetBtn} ${datePreset === 'week' ? styles.active : ''}`}
                        onClick={() => handlePresetChange('week')}
                    >
                        This Week
                    </button>
                    <div style={{ position: 'relative' }}>
                        <button
                            className={`${styles.presetBtn} ${datePreset === 'month' ? styles.active : ''}`}
                            onClick={() => setShowMonthPicker(!showMonthPicker)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            This Month
                            <ChevronDown size={14} />
                        </button>
                        {showMonthPicker && (
                            <div className={styles.monthDropdown}>
                                {monthOptions.map((opt) => (
                                    <button
                                        key={opt.label}
                                        className={styles.monthOption}
                                        onClick={() => handleMonthSelect(opt)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        className={`${styles.presetBtn} ${datePreset === 'custom' ? styles.active : ''}`}
                        onClick={() => handlePresetChange('custom')}
                    >
                        Custom
                    </button>
                </div>
            </div>

            {showStoreFilter && (
                <div className={styles.filterGroup}>
                    <Building2 size={18} className={styles.icon} />
                    <select
                        className={styles.select}
                        value={selectedStore || 'all'}
                        onChange={(e) => handleStoreChange(e.target.value)}
                    >
                        <option value="all">All Stores</option>
                        {stores.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {showRegionFilter && (
                <div className={styles.filterGroup}>
                    <MapPin size={18} className={styles.icon} />
                    <select
                        className={styles.select}
                        value={selectedRegion || 'all'}
                        onChange={(e) => handleRegionChange(e.target.value)}
                    >
                        <option value="all">Entire UK</option>
                        <option value="North">North Region</option>
                        <option value="South">South Region</option>
                    </select>
                </div>
            )}

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
