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

const Help: React.FC = () => {
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
            Help
          </h1>

          <TableOfContents items={tocItems} />

          {/* main content */}
          <section id="login-signup" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Login and SignUp
            </h2>
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
            </h2>
                <p style={{ marginBottom: '1rem' }}>
                Users can search and select stocks via the top search bar. Their previously selected stocks are saved. 
                </p>

                <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong> Stock bar:</strong> Displays selected stocks and allows searching for more stocks.</li>
                <li><strong>Main block:</strong> Renders the selected graph in the main, larger card.</li>
                <li><strong>Mini blocks (x5):</strong> Swap any graph into the main card using the ↔ button.</li>
                <li><strong>Create (+):</strong> Create a new graph in the selected card.</li>
                <li><strong>Delete (×):</strong> Remove the selected graph from the card.</li>
                <li><strong>Expand (⤢):</strong> Expand the graph to fit the whole screen.</li>
                <li><strong>Settings (⚙️):</strong> Adjust metric type, start/end dates, series color, and other metric‑specific parameters per pane.</li>
                <li><strong>Sync:</strong> User-defined graph configurations automatically sync to the dashboard for consistent display.</li>
                </ul>
          </section>

          <section id="top-picks" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Top Picks
            </h2>
                <p style={{ marginBottom: '1rem' }}>
                Stocks are ranked based on different metrics. General stock recommendations instead of the specific Portfolio page.
                </p>

                <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong> Main Table:</strong> Displays the stocks and their performance metrics.</li>
                <li><strong> Metric Headers:</strong> Can be toggled to rank the stocks based on that metric, either ascending or descending</li>
                <li><strong> Rows per page:</strong> Number of rows displayed per page, can be adjusted by the user.</li>
                <li><strong> Export:</strong> Download the current table view as a CSV file.</li>
                <li><strong> Edit Columns:</strong> Customize the columns displayed in the main table.</li>
                <li><strong> Email Updates:</strong> Receive email notifications for important updates.</li>
                </ul>
          </section>

          <section id="market-news" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Market News
            </h2>
                <p style={{ marginBottom: '1rem' }}>
                General news about the market. Clicking leads to the article the news is from.
                </p>

                <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong> Items:</strong> The number of news items to be displayed.</li>
                <li><strong> General:</strong> News updates about anything.</li>
                <li><strong> Watchlist:</strong> News updates specifically related to selected stocks.</li>
                <li><strong> Regional:</strong> News updates specifically from a particular country.</li>
                <li><strong> Industry:</strong> News updates specifically related to a particular industry.</li>
                <li><strong> Commodity:</strong> News updates specifically related to a particular commodity.</li>
                </ul>
          </section>

          <section id="watchlist" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Watchlist
            </h2>
                <p style={{ marginBottom: '1rem' }}>
                Display information about selected stocks.
                </p>

                <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong> Stock bar:</strong> Displays selected stocks and allows searching for more stocks.</li>
                <li><strong> Todays Trend:</strong> Displays today's movement for selected stocks.</li>
                <li><strong> Open and Close All:</strong> Expand or collapse all graphs and news posts.</li>
                <li><strong> Swap Up:</strong> Move the stock graph and news posts to the top.</li>
                </ul>
          </section>

          <section id="community" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Community
            </h2>
                <p style={{ marginBottom: '1rem' }}>
                Discussion forum for all users.
                </p>

                <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong> Top and New:</strong> Sort posts by most votes and newest respectively.</li>
                <li><strong> Search:</strong> Search for specific posts.</li>
                <li><strong> View and Add Comments:</strong> Display and add comments on the post.</li>
                </ul>
          </section>

          <section id="profile" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Profile
            </h2>
                <p style={{ marginBottom: '1rem' }}>
                Display information about your profile.
                </p>

                <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                <li><strong> Avatar:</strong> Display and change your profile picture.</li>
                <li><strong> First and Last Name:</strong> Display and change your name.</li>
                <li><strong> Email:</strong> Display your email address.</li>
                <li><strong> Password:</strong> Display and change your password.</li>
                <li><strong> Save Profile:</strong> Save changes to your profile.</li>
                <li><strong> Posts and Comments:</strong> Display your posts and comments.</li>
                </ul>
          </section>

          
        </main>
      </div>
    </div>
  );
};

export default Help;
