import React from 'react';
import Sidebar from '@/components/sidebar';

interface TOCItem { id: string; label: string; }
interface TableOfContentsProps { items: TOCItem[]; }

const TableOfContents: React.FC<TableOfContentsProps> = ({ items }) => (
  <nav style={{
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderLeft: '4px solid #0070f3', 
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    position: 'sticky',              
    top: '1rem',
  }}>
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map(item => (
        <li key={item.id} style={{ margin: '0.5rem 0' }}>
          <a
            href={`#${item.id}`}
            style={{
              color: '#0070f3',
              textDecoration: 'none',
              fontSize: '1rem',
              fontWeight: 500,
            }}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  </nav>
);

const Guide: React.FC = () => {
  const tocItems: TOCItem[] = [
    { id: 'General', label: 'Guide' },
    { id: 'BetaAnalysis', label: 'Beta Analysis' },
    { id: 'AlphaComparison',    label: 'Alpha Comparison' },
    { id: 'MaxDrawdownAnalysis',    label: 'Max Drawdown' },
    { id: 'CumulativeReturnComparison',  label: 'Cumulative Return' },
    { id: 'SortinoRatioVisualization',    label: 'Sortino Ratio' },
    { id: 'MarketCorrelationAnalysis',    label: 'Market Correlation' },
    { id: 'SharpeRatioMatrix',      label: 'Sharpe Ratio' },
    { id: 'Volatility',   label: 'Volatility'},
    { id: 'ValueAtRiskAnalysis',      label: 'Value at Risk' },
    { id: 'EfficientFrontierVisualization',      label: 'Efficient Frontier' }
  ];

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />

      {/* Wrapper ensures content and TOC shift right to avoid sidebar overlap */}
      <div style={{ flex: 1, paddingLeft: '70px', display: 'flex' }}>
        {/* Sticky Table of Contents */}
        <aside
          style={{
            width: '250px',
            marginRight: '2rem',
            position: 'sticky',
            top: '2rem',
            alignSelf: 'flex-start',
            height: 'fit-content',
          }}
        >
          <TableOfContents items={tocItems} />
        </aside>

        {/* Scrollable main content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2rem',
            boxSizing: 'border-box',
          }}
        >
        <section id="General" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            Guide
          </h1>

            <p style={{ marginBottom: '1rem' }}>
              In this Guide you will learn how to explore and customize all of our built-in financial metrics.
            </p>

            <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong>Step1:</strong> Click the Plus button to create a graph or the Settings button above any graph to edit it.</li>
                <li><strong>Step2:</strong> In the modal, choose your Metric Type, set a Start Date and End Date, pick a Series Color, and fill in any extra fields that appear (like benchmark ticker, risk-free rate, or confidence level).</li>
                <li><strong>Step3:</strong> Hit Apply to generate or update your chart.</li>
            </ul>

            <p style={{ marginBottom: '1rem' }}>
                Use the table of contents on the left to jump to detailed instructions for each metric.
            </p>
            
          </section>

          <section id="BetaAnalysis" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Beta Analysis
            </h2>
            <p style={{ marginBottom: '1rem' }}>
                Beta measures how sensitive your portfolio (or individual stock) is to overall market movements.
            </p>

            <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong>Metric Type:</strong> Select “Beta Analysis”.</li>
                <li><strong>Market Ticker:</strong> Enter the symbol of the benchmark index (e.g. "SPY" for S&P 500 or “AMZN” for Amazon).</li>
                <li><strong>Date Range:</strong> Select the timeframe.</li>
            </ul>

            <p style={{ marginBottom: '1rem' }}>
                Once applied, you will see a bar graph comparing how selected stocks typically move relative to a 1% change in the market ticker.
            </p>
            
          </section>

          <section id="AlphaComparison" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Alpha Comparison
            </h2>
            <p style={{ marginBottom: '1rem' }}>
                Alpha represents the excess return of your portfolio relative to a risk-free investment.
            </p>

            <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong>Metric Type:</strong> Select “Alpha Comparison”.</li>
                <li><strong>Risk-Free Rate:</strong> Enter the annual risk-free rate (e.g. 0.02 for 2%). </li>
                <li><strong>Date Range:</strong> Select the timeframe.</li>
            </ul>

            <p style={{ marginBottom: '1rem' }}>
                Once applied, you will see a bar graph showing the difference between the stock's actual return and the expected return based on its risk relative to the market.
            </p>
          </section>

          <section id="MaxDrawdownAnalysis" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Max Drawdown
            </h2>
            <p style={{ marginBottom: '1rem' }}>
                Max Drawdown shows the largest peak-to-trough loss your portfolio experienced during the selected period.
            </p>

            <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong>Metric Type:</strong> Select “Max Drawdown”.</li>
                <li><strong>Date Range:</strong> Select the timeframe.</li>
            </ul>

            <p style={{ marginBottom: '1rem' }}>
              Once applied, you will see a line graph highlighting each drawdown cycle, with the maximum decline prominently marked.
            </p>
          </section>

          <section id="CumulativeReturnComparison" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Cumulative Return
            </h2>
            <p style={{ marginBottom: '1rem' }}>
                Cumulative Return tracks how an initial investment grows (or shrinks) over time.
            </p>

            <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong>Metric Type:</strong> Select “Cumulative Return”.</li>
                <li><strong>Date Range:</strong> Select the timeframe.</li>
            </ul>
          
          <p style={{ marginBottom: '1rem' }}>
              Once applied, you will see a line graph showing the cumulative return from the start date to each date within the range.
          </p>
          
          </section>

          <section id="SortinoRatioVisualization" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Sortino Ratio
            </h2>
            <p style={{ marginBottom: '1rem' }}>
                Sortino Ratio is a risk-adjusted performance metric that penalizes only downside volatility.
            </p>

            <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong>Metric Type:</strong> Select “Sortino Ratio”.</li>
                <li><strong>Risk-Free Rate:</strong> Provide the annual risk-free rate. </li>
                <li><strong>Date Range:</strong> Select the timeframe.</li>
            </ul>
          
            <p style={{ marginBottom: '1rem' }}>
              Once applied, you will see a bar graph showing the performance of each stock, based on the downside risk. 
            </p>
          </section>

          <section id="MarketCorrelationAnalysis" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Market Correlation
            </h2>
            <p style={{ marginBottom: '1rem' }}>
                Market Correlation measures how similarly each stock and the market perform compared to each other. 
            </p>

            <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong>Metric Type:</strong> Select “Market Correlation”.</li>
                <li><strong>Market Ticker:</strong> Enter the benchmark symbol. </li>
                <li><strong>Date Range:</strong> Select the timeframe.</li>
            </ul>

            <p style={{ marginBottom: '1rem' }}>
              Once applied, you will see a heatmap showing the correlation between all pairs of selected stocks as well as the market ticker
            </p>
          </section>

          <section id="SharpeRatioMatrix" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Sharpe Ratio
            </h2>
            <p style={{ marginBottom: '1rem' }}>
                Sharpe Ratio evaluates risk-adjusted return using total volatility (standard deviation).
            </p>

            <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong>Metric Type:</strong> Select “Sharpe Ratio”.</li>
                <li><strong>Risk-Free Rate:</strong> Enter the annual risk-free rate. </li>
                <li><strong>Date Range:</strong> Select the timeframe.</li>
            </ul>

            <p style={{ marginBottom: '1rem' }}>
              Once applied, you will see a bar graph showing the performance of each stock, based on the volatility
            </p>
          </section>

            <section id="Volatility" style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Volatility
            </h2>
            <p style={{ marginBottom: '1rem' }}>
                Volatility measures how much a price moves up and down over time.
            </p>

            <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong>Metric Type:</strong> Select “Volatility”.</li>
                <li><strong>Date Range:</strong> Select the timeframe.</li>
            </ul>

            <p style={{ marginBottom: '1rem' }}>
              The resulting chart plots Volatility values—higher values indicate greater price fluctuations.
            </p>
          </section>

          <section id="ValueAtRiskAnalysis" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Value at Risk
            </h2>
            <p style={{ marginBottom: '1rem' }}>
                Value at Risk (VaR) estimates your potential loss at a given confidence level.
            </p>

            <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong>Metric Type:</strong> Select “Value at Risk”.</li>
                <li><strong>Confidence Level:</strong> Enter a decimal (e.g. 0.05 for 95% VaR). </li>
                <li><strong>Date Range:</strong> Select the timeframe.</li>
            </ul>

            <p style={{ marginBottom: '1rem' }}>
              Once applied, you will see a bar graph showing the largest loss you are likely to experience, given your chosen confidence level.
            </p>
          </section>

          <section id="EfficientFrontierVisualization" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Efficient Frontier
            </h2>
            <p style={{ marginBottom: '1rem' }}>
                Efficient Frontier shows the set of optimal portfolios that offer the highest expected return for each level of risk.
            </p>

            <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong>Metric Type:</strong> Select “Efficient Frontier”.</li>
                <li><strong>Date Range:</strong> Select the timeframe.</li>
            </ul>

            <p style={{ marginBottom: '1rem' }}>
              Once applied, you will see a scatter plot of each portfolio based on their returns to risk ratio.
              There is also a clear indication of the best portfolios per risk level.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Guide;
