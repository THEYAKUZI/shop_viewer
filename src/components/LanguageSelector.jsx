import React from 'react';
import { useLanguage } from '../contexts/useLanguage';

const LANGUAGES = [
    { code: 'EN', label: 'English' },
    { code: 'PT', label: 'Português' },
];

const LanguageSelector = () => {
    const { language, setLanguage } = useLanguage();

    return (
        <div className="lang-toggle" role="group" aria-label="Language">
            {LANGUAGES.map(lang => (
                <button
                    key={lang.code}
                    type="button"
                    className={language === lang.code ? 'active' : ''}
                    aria-pressed={language === lang.code}
                    title={lang.label}
                    onClick={() => setLanguage(lang.code)}
                >
                    {lang.code}
                </button>
            ))}
        </div>
    );
};

export default LanguageSelector;
