import { createContext, useState, ReactNode } from 'react';

// Defined global graph setting
export interface GraphSettings {
  selectedStocks: (string | null)[];
  globalStart: string;
  globalEnd: string;
}

interface GraphSettingsContextValue {
  settings: GraphSettings;
  setSettings: React.Dispatch<React.SetStateAction<GraphSettings>>;
}

// Create context, and setting defalt data
export const GraphSettingsContext = createContext<GraphSettingsContextValue>({
  settings: {
    selectedStocks: [null, null, null, null, null, null],
    globalStart: '',
    globalEnd: ''
  },
  setSettings: () => {}
});

// Create provider
export const GraphSettingsProvider = ({ children }: { children: ReactNode }) => {
  const nowISO = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0,16);

  const [settings, setSettings] = useState<GraphSettings>({
    selectedStocks: [null, null, null, null, null, null],
    globalStart: nowISO,
    globalEnd: nowISO
  });

  return (
    <GraphSettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </GraphSettingsContext.Provider>
  );
};
