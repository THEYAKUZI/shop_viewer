import React, { useState } from 'react';
import './LanguageSelector.css';
import { useLanguage } from '../contexts/useLanguage';

// Flag emoji render as plain letters on Windows ("us"), so the menu shows short language codes instead.
const LANGUAGES = [
    { code: 'EN', label: 'English' },
    { code: 'PT', label: 'Português' },
];

const LanguageSelector = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { language, setLanguage } = useLanguage();
    const current = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

    return (
        <div className="language-selector" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
            <button type="button" className="lang-btn" onClick={() => setIsOpen(o => !o)} aria-expanded={isOpen}>
                <span className="flag-icon lang-code">{current.code}</span>
                <span>{current.label}</span>
                <span className="lang-arrow">▼</span>
            </button>
            {isOpen && (
                <div className="dropdown-content">
                    {LANGUAGES.map(lang => (
                        <button
                            key={lang.code}
                            type="button"
                            className={`dropdown-item ${language === lang.code ? 'active' : ''}`}
                            onClick={() => { setLanguage(lang.code); setIsOpen(false); }}
                        >
                            <span className="flag-icon lang-code">{lang.code}</span>
                            {lang.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;
