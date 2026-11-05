import React, { useEffect, useState } from 'react';
import { translations } from '../utils/translations';
import { LanguageContext } from './useLanguage';

const STORAGE_KEY = 'rampage_language';

const readSavedLanguage = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return translations[saved] ? saved : 'EN';
    } catch {
        return 'EN';
    }
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(readSavedLanguage);

    useEffect(() => {
        document.documentElement.lang = language === 'PT' ? 'pt-BR' : 'en';
    }, [language]);

    const setLanguage = (code) => {
        setLanguageState(code);
        try { localStorage.setItem(STORAGE_KEY, code); } catch { /* not persisted */ }
    };

    const t = (key) => {
        const langData = translations[language] || translations['EN'];
        return langData[key] || key;
    };

    // Locale for dates and numbers; undefined lets the browser pick for English.
    const locale = language === 'PT' ? 'pt-BR' : undefined;

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, locale }}>
            {children}
        </LanguageContext.Provider>
    );
};
