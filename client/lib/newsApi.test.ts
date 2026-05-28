import {
  buildCommodityMarketQuery,
  buildIndustryMarketQuery,
  buildRegionalMarketQuery,
  normalizePageSize,
} from './newsApi';

describe('newsApi helpers', () => {
  it('builds broader regional market queries for regions that lack top headlines', () => {
    expect(buildRegionalMarketQuery('au')).toContain('Australia');
    expect(buildRegionalMarketQuery('au')).toContain('ASX');
  });

  it('builds industry queries with market context', () => {
    expect(buildIndustryMarketQuery('technology')).toContain('technology');
    expect(buildIndustryMarketQuery('technology')).toContain('stocks');
  });

  it('builds commodity queries with macro market context', () => {
    expect(buildCommodityMarketQuery('gold')).toContain('gold');
    expect(buildCommodityMarketQuery('gold')).toContain('commodity');
  });

  it('normalizes NewsAPI page sizes to a safe supported range', () => {
    expect(normalizePageSize('12')).toBe('12');
    expect(normalizePageSize(['15'])).toBe('15');
    expect(normalizePageSize('0')).toBe('10');
    expect(normalizePageSize('200')).toBe('100');
    expect(normalizePageSize(undefined)).toBe('10');
  });
});
