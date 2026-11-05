import React, { useState } from 'react';
import { translations } from '../utils/translations';
import { LanguageContext } from './useLanguage';

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('EN');

    const t = (key) => {
        const langData = translations[language] || translations['EN'];
        return langData[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};
