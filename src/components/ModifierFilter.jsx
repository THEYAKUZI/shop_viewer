import React from 'react';
import './ModifierFilter.css';

const ModifierFilter = ({ options, selected, onChange }) => {
    if (!options || options.length === 0) return null;

    const toggleOption = (option) => {
        const newSelected = selected.includes(option.value)
            ? selected.filter(s => s !== option.value)
            : [...selected, option.value];
        onChange(newSelected);
    };

    // Sort options: types first, then legendary
    // Within types, alpha. Within legendary, alpha.
    const sortedOptions = [...options].sort((a, b) => {
        if (a.isLegendary === b.isLegendary) {
            return a.label.localeCompare(b.label);
        }
        return a.isLegendary ? 1 : -1;
    });

    return (
        <div className="modifier-filter-container">
            <div className="modifier-list">
                {sortedOptions.map(opt => (
                    <button
                        key={opt.value}
                        className={`mod-btn ${opt.isLegendary ? 'legendary' : ''} ${selected.includes(opt.value) ? 'active' : ''}`}
                        onClick={() => toggleOption(opt)}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
            {selected.length > 0 && (
                <button className="reset-mods-btn" onClick={() => onChange([])}>
                    Clear Modifiers
                </button>
            )}
        </div>
    );
};

export default ModifierFilter;
