import React, { useState } from 'react';
import './LanguageSelector.css';

const LanguageSelector = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentLang, setCurrentLang] = useState('EN');

    const languages = [
        { code: 'EN', label: 'English', flag: '🇺🇸' },
        { code: 'PT', label: 'Português', flag: '🇧🇷' }
    ];

    const handleLanguageChange = (langCode) => {
        setCurrentLang(langCode);
        setIsOpen(false);
        // Dispatch a custom event or callback if parent needed
        console.log(`Language changed to ${langCode}`);
    };

    const currentLangObj = languages.find(l => l.code === currentLang) || languages[0];

    return (
        <div
            className="language-selector"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button className="lang-btn">
                <span className="flag-icon">{currentLangObj.flag}</span>
                <span>{currentLangObj.label}</span>
                <span className="lang-arrow">▼</span>
            </button>
            {isOpen && (
                <div className="dropdown-content">
                    {languages.map(lang => (
                        <button
                            key={lang.code}
                            className={`dropdown-item ${currentLang === lang.code ? 'active' : ''}`}
                            onClick={() => handleLanguageChange(lang.code)}
                        >
                            <span className="flag-icon">{lang.flag}</span>
                            {lang.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;
