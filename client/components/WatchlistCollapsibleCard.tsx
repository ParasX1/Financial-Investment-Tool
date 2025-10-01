import React, { useMemo, useState, useEffect } from 'react';
import { Box, Button } from '@mui/material';
import StockChartCard from '@/components/StockCardComponent';
import type { CardSettings } from '@/pages/dashboardView';
import type { MetricType } from '@/components/graphSettingsModal';

type Props = {
  index: number;
  selectedStock: string | null;
  onSwap: (index: number) => void;
  height?: number;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
};


const WatchlistCollapsibleCard: React.FC<Props> = ({
  index,
  selectedStock,
  onSwap,
  height = 350,
  collapsed,
  onCollapsedChange,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(true);
  const isControlled = typeof collapsed === 'boolean';
  const isCollapsed = isControlled ? (collapsed as boolean) : internalCollapsed;

  const setCollapsed = (val: boolean) => {
    if (isControlled) onCollapsedChange?.(val);
    else setInternalCollapsed(val);
  };
  const toggle = () => setCollapsed(!isCollapsed);

  const [isActive, setIsActive] = useState<boolean>(false);

  // defaults for StockChartCard required props
  const { defaultStart, defaultEnd, color } = useMemo(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const iso = new Date(Date.now() - tzOffset).toISOString().slice(0, 16);
    return { defaultStart: iso, defaultEnd: iso, color: '#6ba583' };
  }, []);

  const [cardSettings, setCardSettings] = useState<CardSettings>(() => ({
    barColor: color,
    dateRange: { start: defaultStart, end: defaultEnd },
    metricType: 'BetaAnalysis'as MetricType,
    marketTicker: 'SPY',
    riskRate: 0.01,
    confidenceLevel: 0.05,
    graphMade: false,
  }));

  useEffect(() => {
    setCardSettings(s => ({
      ...s,
      barColor: color,
      dateRange: { start: defaultStart, end: defaultEnd },
    }));
  }, [defaultStart, defaultEnd, color]);

  const handleActivate = (idx: number) => {
    setIsActive(true);
  };

  const handleUpdateSettings = (idx: number, settings: CardSettings) => {
    setCardSettings(settings);
  }

  const handleClear = (idx: number) => {
    setIsActive(false);
    setCardSettings(s => ({ ...s, graphMade: false }));
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        bgcolor: '#111',
        border: '1px solid #555',
        p: 1,
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: isCollapsed ? 0 : 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={toggle}
            aria-label="Toggle collapse"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '▸' : '▾'}
          </Button>
          <Box sx={{ color: '#fff', fontWeight: 600 }}>
            {selectedStock ?? 'Select a stock'}
          </Box>
        </Box>

        {/* actions available even when collapsed */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => onSwap(index)}
            title="Move card up/down"
          >
            ↕
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => handleClear(index)}
            title="Clear ticker"
          >
            ×
          </Button>
        </Box>
      </Box>

      {/* render full StockChartCard */}
      {!isCollapsed && (
        <StockChartCard
          index={index}
          selectedStocks={selectedStock ? [selectedStock] : []}
          isActive={isActive}
          cardSettings={cardSettings}
          onClear={handleClear}
          onSwap={onSwap}
          onActivate={handleActivate}
          onUpdateSettings={handleUpdateSettings}
          height={height}
          defaultStart={defaultStart}
          defaultEnd={defaultEnd}
          color={color}
          showSwap={false}
        />
      )}
    </Box>
  );
};

export default WatchlistCollapsibleCard;
