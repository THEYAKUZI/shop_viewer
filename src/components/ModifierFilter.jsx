import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/useLanguage';

const byLabel = (a, b) => a.label.localeCompare(b.label);

function Chip({ option, active, onClick, t }) {
    return (
        <button
            type="button"
            className={`chip ${option.isLegendary ? 'legendary' : ''} ${active ? 'active' : ''}`}
            onClick={onClick}
            title={option.description ? t(option.description) : undefined}
            aria-pressed={active}
        >
            {option.iconName && (
                <img src={`icons/${option.iconName}.png`} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            )}
            {t(option.label)}
        </button>
    );
}

// "Modifiers" dropdown: pick effects/perks an item must have. Selected ones show as removable tags.
export function ModifierPicker({ options, selected, onChange }) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    if (!options || options.length === 0) return null;

    const toggle = (value) => onChange(selected.includes(value) ? selected.filter(s => s !== value) : [...selected, value]);
    const effects = options.filter(o => !o.isLegendary).sort(byLabel);
    const perks = options.filter(o => o.isLegendary).sort(byLabel);

    return (
        <div className="mod-picker" ref={rootRef}>
            <button
                type="button"
                className={`control control-btn ${open ? 'open' : ''} ${selected.length ? 'has-value' : ''}`}
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 5h18M6 12h12M10 19h4" /></svg>
                {t('Modifiers')}
                {selected.length > 0 && <span className="count-badge">{selected.length}</span>}
                <svg className="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {open && (
                <div className="mod-panel">
                    <div className="mod-group">
                        <h4>{t('Effects')}</h4>
                        <div className="chips">
                            {effects.map(o => <Chip key={o.value} option={o} active={selected.includes(o.value)} onClick={() => toggle(o.value)} t={t} />)}
                        </div>
                    </div>
                    {perks.length > 0 && (
                        <div className="mod-group">
                            <h4>{t('Legendary perks')}</h4>
                            <div className="chips">
                                {perks.map(o => <Chip key={o.value} option={o} active={selected.includes(o.value)} onClick={() => toggle(o.value)} t={t} />)}
                            </div>
                        </div>
                    )}
                    <div className="mod-panel-foot">
                        <span>{t('Shows items that have every selected modifier.')}</span>
                        {selected.length > 0 && <button type="button" className="link-btn" onClick={() => onChange([])}>{t('Clear')}</button>}
                        <button type="button" className="done-btn" onClick={() => setOpen(false)}>{t('Done')}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export function SelectedModifiers({ options, selected, onChange }) {
    const { t } = useLanguage();
    if (selected.length === 0) return null;
    const byValue = new Map(options.map(o => [o.value, o]));
    return (
        <div className="selected-mods">
            {selected.map(value => {
                const o = byValue.get(value);
                if (!o) return null;
                return (
                    <button key={value} type="button" className={`tag ${o.isLegendary ? 'legendary' : ''}`} onClick={() => onChange(selected.filter(s => s !== value))} title={t('Remove')}>
                        {o.iconName && <img src={`icons/${o.iconName}.png`} alt="" />}
                        {t(o.label)}
                        <span aria-hidden="true">×</span>
                    </button>
                );
            })}
            <button type="button" className="link-btn" onClick={() => onChange([])}>{t('Clear all')}</button>
        </div>
    );
}
