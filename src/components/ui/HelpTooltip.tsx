import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import styles from './HelpTooltip.module.css';

interface HelpTooltipProps {
    text: string;
    size?: number;
}

export default function HelpTooltip({ text, size = 16 }: HelpTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className={styles.container}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onClick={() => setIsVisible(!isVisible)}
        >
            <HelpCircle size={size} className={styles.icon} />
            {isVisible && (
                <div className={styles.tooltip}>
                    {text}
                </div>
            )}
        </div>
    );
}
