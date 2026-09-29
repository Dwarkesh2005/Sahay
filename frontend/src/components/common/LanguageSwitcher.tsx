import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../i18n';

interface LanguageSwitcherProps {
  variant?: 'navbar' | 'mobile' | 'footer';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'navbar', className = '' }) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLangCode = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === currentLangCode) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (code: SupportedLanguage) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'mobile') {
    return (
      <div className={`py-2 border-b border-forest-light/20 ${className}`}>
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-forest-dark/60">
          <Globe className="w-4 h-4 text-primary" />
          <span>{t('navbar.language', 'Language')}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = currentLangCode === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium border transition-all ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white/80 text-forest-dark border-forest-light/20 hover:border-primary/40'
                }`}
                aria-label={`Switch to ${lang.label}`}
                aria-pressed={isSelected}
              >
                <span className="text-base leading-none mb-1">{lang.flag}</span>
                <span className="truncate">{lang.nativeLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-forest-dark hover:text-primary bg-bg-nature/80 hover:bg-forest-light/20 border border-forest-light/20 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('navbar.language', 'Select Language')}
      >
        <Globe className="w-3.5 h-3.5 text-primary" />
        <span className="hidden sm:inline">{currentLang.nativeLabel}</span>
        <span className="sm:hidden">{currentLang.flag}</span>
        <ChevronDown className={`w-3 h-3 text-forest-dark/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-2xl bg-white shadow-xl border border-forest-light/20 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
          role="listbox"
          aria-label={t('navbar.language', 'Language')}
        >
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-forest-dark/50 border-b border-forest-light/10">
            {t('navbar.language', 'Language')}
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = currentLangCode === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelectLanguage(lang.code)}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors ${
                  isSelected
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-forest-dark hover:bg-forest-light/10 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{lang.flag}</span>
                  <div>
                    <span className="block leading-tight">{lang.nativeLabel}</span>
                    <span className="text-[10px] text-forest-dark/50 font-normal">{lang.label}</span>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
