import React from 'react';
import './ModifierFilter.css';
import { useLanguage } from '../contexts/useLanguage';

// The original wall of modifier buttons: effects first, then legendary perks, each alphabetical.
const ModifierFilter = ({ options, selected, onChange }) => {
    const { t } = useLanguage();
    if (!options || options.length === 0) return null;

    const toggle = (value) => onChange(selected.includes(value) ? selected.filter(s => s !== value) : [...selected, value]);
    const sorted = [...options].sort((a, b) => (a.isLegendary === b.isLegendary ? a.label.localeCompare(b.label) : a.isLegendary ? 1 : -1));

    return (
        <div className="modifier-filter-container">
            <div className="modifier-list">
                {sorted.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        className={`mod-btn ${opt.isLegendary ? 'legendary' : ''} ${selected.includes(opt.value) ? 'active' : ''}`}
                        onClick={() => toggle(opt.value)}
                        title={t(opt.description || opt.label)}
                        aria-pressed={selected.includes(opt.value)}
                    >
                        {opt.iconName && <img src={`icons/${opt.iconName}.png`} alt="" className="mod-icon" onError={(e) => { e.target.style.display = 'none'; }} />}
                        {t(opt.label)}
                    </button>
                ))}
            </div>
            {selected.length > 0 && (
                <button type="button" className="reset-mods-btn" onClick={() => onChange([])}>{t('Clear Modifiers')}</button>
            )}
        </div>
    );
};

export default ModifierFilter;
