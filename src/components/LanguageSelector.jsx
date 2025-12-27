import React, { useState } from 'react';
import './LanguageSelector.css';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSelector = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { language, setLanguage } = useLanguage();

    const languages = [
        { code: 'EN', label: 'English', flag: '🇺🇸' },
        { code: 'PT', label: 'Português', flag: '🇧🇷' }
    ];

    const handleLanguageChange = (langCode) => {
        setLanguage(langCode);
        setIsOpen(false);
    };

    const currentLangObj = languages.find(l => l.code === language) || languages[0];

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
                            className={`dropdown-item ${language === lang.code ? 'active' : ''}`}
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
