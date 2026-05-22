import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/sidebar';

// ── Types ──────────────────────────────────────────────────────────────────────
interface FAQItem {
  question: string;
  answer: string;
}

interface HelpSection {
  id: string;
  label: string;
  subtitle: string;
  faqs: FAQItem[];
}

// ── Data ───────────────────────────────────────────────────────────────────────
const helpSections: HelpSection[] = [
  {
    id: 'login-signup',
    label: 'Login and Signup',
    subtitle: 'Find answers to common questions about login and signup',
    faqs: [
      {
        question: 'How do I create an account?',
        answer:
          "Click the 'Get FIT' button on the landing page or navigate to the signup page. \
          Fill in your email, create a password, and verify your email address. \
          Your account will be activated immediately after verification. \
          You 'Sign up with Google'.",
      },
      {
        question: 'How do I log in?',
        answer:
          "Enter your email and password, or use “Log in with Google” for Google authentication."
      },
      {
        question: 'Can I use social login?',
        answer:
          "Yes! FIT supports Google OAuth for both sign-up and login. Click 'Log in with Google' to authenticate with your Google account in one click.",
      },
      {
        question: 'Is my data secure?',
        answer:
          "Absolutely. We use industry-standard encryption (AES-256) for data at rest and TLS 1.3 for data in transit. \
          We never share your personal information with third parties without your consent.",
      },
    ],
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    subtitle: 'Learn how to manage and customise your stock portfolio',
    faqs: [
      {
        question: 'What is the Portfolio page used for?',
        answer: 'It allows users to search, select, and manage stocks with interactive graphs.'
      },
      {
        question: 'How do I add stocks to my portfolio?',
        answer:
          "Use the stock selector at the top of the Portfolio page. Type a stock symbol or company name, then click to add it. You can select up to 5 stocks simultaneously for comparison.",
      },
      {
        question: 'What metrics can I analyze?',
        answer:
          'EFIT provides 10 key metrics including Cumulative Return, Beta Analysis, Alpha Comparison, Max Drawdown, Volatility, Sharpe Ratio, Sortino Ratio, Value at Risk, Market Correlation, and Efficient Frontier visualization.',
      },
      {
        question: 'Can I customize the dashboard layout?',
        answer:
          'Yes! Each analytics card can display different metrics. Use the dropdown menu in each card to select your preferred metric. You can also clear, expand, or swap card positions.',
      },
      {
        question: 'How do I change the date range for analysis?',
        answer:
          'Use the Start Date and End Date pickers below the stock selector. Select your desired date range to analyze historical performance for that specific period.',
      },
    ],
  },
  {
    id: 'top-picks',
    label: 'Top Picks',
    subtitle: 'Discover how stock rankings and recommendations work',
    faqs: [
      {
        question: 'How are stocks ranked in Top Picks?',
        answer:
          'Stocks are ranked using a proprietary algorithm that considers multiple risk-adjusted metrics including Sharpe Ratio, Sortino Ratio, Alpha, and 1-year returns. The ranking is updated daily.',
      },
      {
        question: 'Can I export the Top Picks data?',
        answer:
          "Yes, click the 'Export CSV' button to download the complete ranking table with all metrics. The CSV file can be opened in Excel or Google Sheets for further analysis.",
      },
      {
        question: 'How do I sort by different metrics?',
        answer:
          "Click on any column header to sort by that metric. Click again to reverse the sort order. A third click returns to the default ranking order.",
      },
      {
        question: 'Can I receive Top Picks updates via email?',
        answer:
          "Yes! Click the 'Email Updates' button and configure your notification preferences. You can choose daily, weekly, or monthly updates with customizable criteria.",
      },
    ],
  },
  {
    id: 'market-news',
    label: 'Market News',
    subtitle: 'Stay informed with the latest market news and filters',
    faqs: [
      {
        question: 'How is news categorized?',
        answer:
          "News is organized into five tabs: General (all news), Watchlist (stocks you're tracking), Regional (by geography), Industry (by sector), and Commodity (energy, metals, agriculture).",
      },
      {
        question: 'How often is news updated?',
        answer:
          "Market news is updated in real-time from multiple trusted financial sources including Bloomberg, Reuters, Financial Times, WSJ, and CNBC. New articles appear as soon as they're published.",
      },
      {
        question: 'Can I filter news by specific criteria?',
        answer:
          'Yes, use the filter controls at the top of the page. You can filter by region (North America, Europe, Asia, Middle East), industry sector, or commodity type depending on the active tab.',
      },
      {
        question: 'How do I see news for my watchlist stocks?',
        answer: "Click the 'Watchlist' tab to view news articles specifically related to stocks in your watchlist. Articles are tagged with related stock symbols for easy identification.",
      }
    ],
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    subtitle: 'Track and monitor your favourite stocks in one place',
    faqs: [
      {
        question: 'How many stocks can I add to my watchlist?',
        answer:
          "You can track up to 10 stocks in your watchlist. Each stock gets its own collapsible card with chart and related news. Use the stock selector to add or remove stocks.",
      },
      {
        question: "What information is shown for each stock?",
        answer:
          "Each watchlist item displays current price, daily change, a 90-day performance chart, and related news articles. Click the card to expand/collapse detailed information.",
      },
      {
        question: 'Can I reorder my watchlist stocks?',
        answer:
          "Yes, you can drag and drop watchlist cards to reorder them according to your preference. Your custom order is saved automatically.",
      },
      {
        question: 'What are the market trends indicators?',
        answer:
          "The market trends panel shows real-time data for major indices (S&P 500, NASDAQ, Dow Jones) and the VIX volatility index, providing context for your watchlist performance.",
      }
    ],
  },
  {
    id: 'community',
    label: 'Community',
    subtitle: 'Connect and discuss with other FIT users',
    faqs: [
      {
        question: 'How do I create a post?',
        answer:
          "Use the text box at the top of the Community page to write your post. You can add images and format your text. Click 'Post' to publish. You can also tag stocks and add topic tags.",
      },
      {
        question: 'How do posts get ranked?',
        answer:
          "Posts are ranked by upvotes when sorted by 'Top' or by recency when sorted by 'New'. Community members can upvote helpful posts and add comments to discussions.",
      },
      {
        question: 'Can I search for specific discussions?',
        answer:
          "Yes, use the search bar to find posts by keywords, stock symbols, or tags. The search looks through post titles, content, and tags.",
      },
      {
        question: 'What are community guidelines?',
        answer:
          "FIT encourages respectful, informative discussions. No spam, harassment, or market manipulation. Share insights, ask questions, and learn from other investors. Posts violating guidelines will be removed.",
      },
    ],
  },
  {
    id: 'profile',
    label: 'Profile',
    subtitle: 'Manage your personal account settings and activity',
    faqs: [
      {
        question: 'How do I change my profile picture?',
        answer:
          "Go to your Profile page and click on your current avatar. You can upload a new image from your device. Supported formats: JPG, PNG, GIF.",
      },
      {
        question: 'How do I update my name or password?',
        answer:
          "On the Profile page, edit your First Name, Last Name, or Password fields and click 'Save Profile' to apply the changes.",
      },
      {
        question: 'Where can I see my posts and comments?',
        answer:
          "Scroll to the bottom of the Profile page to find your Posts and Comments sections, which list everything you've contributed to the Community.",
      },
    ],
  },
];

// ── FAQ Card ───────────────────────────────────────────────────────────────────
const FAQCard: React.FC<{ faq: FAQItem }> = ({ faq }) => (
  <div
    style={{
      backgroundColor: '#09090B',
      border: '1px solid #27272A',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '1rem',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
      {/* Q badge */}
      <div
        style={{
          flexShrink: 0,
          width: '2rem',
          height: '2rem',
          borderRadius: '50%',
          backgroundColor: '#101939',
          border: '1px solid #203773',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#65A0FC',
          fontSize: '0.85rem',
          fontWeight: 700,
          marginTop: '0.1rem',
        }}
      >
        Q
      </div>
      <div>
        <p style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff', marginBottom: '0.6rem' }}>
          {faq.question}
        </p>
        <p style={{ color: '#9F9FA8', lineHeight: 1.65, fontSize: '0.95rem' }}>
          {faq.answer}
        </p>
      </div>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const Help: React.FC = () => {
  const [activeId, setActiveId] = useState<string>('login-signup');

  const activeSection = helpSections.find((s) => s.id === activeId) ?? helpSections[0];

  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
  contentRef.current?.scrollTo({ top: 0 });
}, [activeId]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#07080a' }}>
      <Sidebar />
      
      <div
        id="main-content"
        tabIndex={-1}
        style={{
        marginLeft: 'var(--app-sidebar-width, 64px)',
        transition: 'margin-left 200ms ease',
        display: 'flex', 
        height: '100vh', 
        backgroundColor: '#0f1117', 
        color: '#ffffff',
        }}
      >

        {/* Middle: Help Center nav */}
        <div
          style={{
            width: '280px',
            flexShrink: 0,
            borderRight: '1px solid #27272A',
            padding: '1.5rem 1rem',
            overflowY: 'auto',
            backgroundColor: '#09090B',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <span style={{ flexShrink: 0, width: '1.3rem', height: '1.3rem', borderRadius: '50%', border: '1.5px solid #437BF7', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: '#437BF7', fontSize: '1rem'}}>?</span>
            <span style={{ fontWeight: 700, fontSize: '1.15rem' }}>Help Center</span>
          </div>


          {/* Section list */}
          <nav>
            {helpSections.map((section) => {
              const isActive = section.id === activeId;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveId(section.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    marginBottom: '0.35rem',
                    borderRadius: '8px',
                    border: isActive ? '1px solid #203773' : '1px solid transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.95rem',
                    fontWeight: isActive ? 700 : 400,
                    backgroundColor: isActive ? '#101939' : 'transparent',
                    color: isActive ? '#ffffff' : '#9F9FA8',
                    transition: 'background-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#18181B';
                      (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                      (e.currentTarget as HTMLButtonElement).style.color = '#9F9FA8';
                    }
                  }}
                >
                  <span>{section.label}</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>›</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: FAQ content */}
        <main
          ref={contentRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2.5rem 2.5rem',
            backgroundColor: '#000000'
          }}
        >
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            {activeSection.label}
          </h1>
          <p style={{ color: '#9F9FA8', marginBottom: '2rem', fontSize: '1rem' }}>
            {activeSection.subtitle}
          </p>

          {activeSection.faqs.map((faq, idx) => (
            <FAQCard key={idx} faq={faq} />
          ))}

          {/* Still need help */}
          <div
            style={{
              marginTop: '3rem',
              padding: '2rem',
              borderRadius: '12px',
              border: '1px solid #1C2A5C',
              background: '#0A0818',
              color: 'white',
              textAlign: 'center'
            }}
          >
            <h2 style={{ color: '#FFFFFF', fontSize: '1.5rem', marginBottom: '0.5rem'}}>Still need help?</h2>
            <p style={{ color: '#9F9FA8', marginBottom: '1.5rem', opacity: 0.9 }}>
              Can&apos;t find what you&apos;re looking for? Our support team is here to help.
            </p>

            <button
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(90deg, #2D5BF2, #8A21F0)',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
              onClick={() => alert('Support features coming soon.')}
            >
              Contact Support
            </button>
          </div>


        </main>
      </div>
    </div>
  );
};

export default Help;
