import React, { useMemo, useState } from 'react';
import { Box, Button } from '@mui/material';
import StockChartCard from '@/components/StockCardComponent';

type Props = {
  index: number;
  selectedStock: string | null;
  onClear: (index: number) => void;
  onSwap: (index: number) => void;
  height?: number;

  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
};

// Adds collapse/expand around StockChartCard without modifying it
const WatchlistCollapsibleCard: React.FC<Props> = ({
  index,
  selectedStock,
  onClear,
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

  // defaults for StockChartCard required props
  const { defaultStart, defaultEnd, color } = useMemo(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const iso = new Date(Date.now() - tzOffset).toISOString().slice(0, 16);
    return { defaultStart: iso, defaultEnd: iso, color: '#6ba583' };
  }, []);

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
            onClick={() => onClear(index)}
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
          selectedStock={selectedStock}
          onSelectStock={() => {}}
          onClear={onClear}
          onSwap={onSwap}
          height={height}
          defaultStart={defaultStart}
          defaultEnd={defaultEnd}
          color={color}
          onSettingsChange={() => {}}
          // @ts-ignore
          swapIcon="↕"
        />
      )}
    </Box>
  );
};

export default WatchlistCollapsibleCard;
