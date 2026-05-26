export const STOCK_SERIES_COLORS = [
  '#ff2bd6',
  '#ff3b30',
  '#00a83b',
  '#1f4fff',
  '#ffb020',
  
];

export const getChartSeriesColor = (index: number, palette = STOCK_SERIES_COLORS) =>
  palette[index % palette.length];
