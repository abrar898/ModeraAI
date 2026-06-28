import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const STYLES = {
  success: 'border-l-cleared',
  error: 'border-l-rose-500',
  info: 'border-l-signal',
};

const ICONS = { success: '✓', error: '✕', info: 'ℹ' };

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((type, title, msg) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, type, title, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider
      value={{
        success: (t, m) => show('success', t, m),
        error: (t, m) => show('error', t, m),
        info: (t, m) => show('info', t, m),
      }}
    >
      {children}
      <div className="fixed bottom-6 right-6 z-[1000] flex flex-col gap-2.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`min-w-72 max-w-sm bg-white dark:bg-dusk-raised border border-mist dark:border-dusk-line ${STYLES[t.type]} border-l-4 rounded-xl2 px-[18px] py-3.5 flex items-start gap-3 shadow-card dark:shadow-card-dark animate-slideUp`}
          >
            <span className="text-base font-bold shrink-0 mt-0.5 text-ink/60 dark:text-paper/60">{ICONS[t.type]}</span>
            <div className="flex-1">
              <div className="font-semibold text-sm text-ink dark:text-paper">{t.title}</div>
              {t.msg && <div className="text-xs text-ink/55 dark:text-paper/45 mt-0.5">{t.msg}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
