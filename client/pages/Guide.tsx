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
    { id: 'login-signup', label: 'Login and SignUp' },
    { id: 'portfolio',    label: 'Portfolio' },
    { id: 'top-picks',    label: 'Top Picks' },
    { id: 'market-news',  label: 'Market News' },
    { id: 'watchlist',    label: 'Watchlist' },
    { id: 'community',    label: 'Community' },
    { id: 'profile',      label: 'Profile' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, paddingLeft: '50px' }}>
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem',
          overflowY: 'auto',
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            Guide
          </h1>

          <TableOfContents items={tocItems} />

          {/* main content */}
          <section id="login-signup" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Login and SignUp
            </h2>
            {/* TODO*/}
            <p style={{ marginBottom: '1rem' }}>
                A unified form layout lets users either register or authenticate, with field sets and button labels changing based on mode.
            </p>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '500', marginBottom: '0.5rem' }}>Sign Up</h3>
            <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong>Fields:</strong> First name, last name, email, password</li>
                <li><strong>Primary Button:</strong> “Sign up” (creates account + confirmation email)</li>
                <li><strong>OAuth Option:</strong> “Sign up with Google” (one-click registration)</li>
            </ul>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '500', marginBottom: '0.5rem' }}>Log In</h3>
            <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong>Fields:</strong> Email, password</li>
                <li><strong>Primary Button:</strong> “Log in” (standard email/password auth)</li>
                <li><strong>OAuth Option:</strong> “Log in with Google” (Google OAuth)</li>
            </ul>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '500', marginBottom: '0.5rem' }}>Key Functional Points</h3>
            <ul style={{ paddingLeft: '1.25rem' }}>
                <li>Inline validation for field errors (e.g. invalid email, weak password)</li>
                <li>Sticky labels and clear focus states for accessibility</li>
                <li>Responsive: two-column inputs collapse to single column on narrow screens</li>
            </ul>
          </section>

          <section id="portfolio" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Portfolio
                {/* test */}
            </h2>
                <p style={{ marginBottom: '1rem' }}>
                Users can search and select a stock via the top search bar. 
                </p>
                <p style={{ marginBottom: '1rem' }}>
                the main chart pane then displays the chosen ticker's data.
                </p>

                <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong>Main block:</strong> Renders the selected stock's interactive chart.</li>
                <li><strong>Mini blocks (x5):</strong> Swap any chart into the main pane using the ↔ button.</li>
                <li><strong>Settings (⚙️):</strong> Adjust metric type, start/end dates, series color, and other metric‑specific parameters per pane.</li>
                <li><strong>Sync:</strong> User-defined chart configurations automatically sync to the dashboard for consistent display.</li>
                </ul>
          </section>

          <section id="top-picks" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Top Picks
            </h2>
            {/* TODO*/}
          </section>

          <section id="market-news" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Market News
            </h2>
            {/* TODO*/}
          </section>

          <section id="watchlist" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Watchlist
            </h2>
            {/* TODO*/}
          </section>

          <section id="community" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Community
            </h2>
            {/* TODO*/}
          </section>

          <section id="profile" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Profile
            </h2>
            {/* TODO*/}
          </section>

          
        </main>
      </div>
    </div>
  );
};

export default Guide;