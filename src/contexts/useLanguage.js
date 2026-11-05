import { createContext, useContext } from 'react';

export const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);
