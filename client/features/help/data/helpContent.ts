// File purpose: Defines the static Help Center topics and FAQ copy rendered by the Help feature.
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import NewspaperRoundedIcon from "@mui/icons-material/NewspaperRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import type { HelpSectionCollection } from "../types";

export const helpSections = Object.freeze([
  {
    id: "login-signup",
    label: "Login and Signup",
    subtitle: "Find answers to common questions about login and signup",
    icon: LoginRoundedIcon,
    faqs: [
      {
        question: "How do I create an account?",
        answer:
          "On the Home page, select Sign in or Start free today, then choose Create account in the account dialog. Enter your name, email, and password, or continue with Google. A confirmation email may be required before email and password sign-in, depending on the authentication configuration.",
      },
      {
        question: "How do I log in?",
        answer:
          "Select Sign in, then enter your email and password or choose Continue with Google. FIT returns you to the page where you opened the account dialog.",
      },
      {
        question: "Can I use social login?",
        answer:
          "Yes. FIT supports Google OAuth for both sign-up and sign-in through the Google button in the shared account dialog.",
      },
      {
        question: "How is account access handled?",
        answer:
          "FIT delegates email and password sessions and Google OAuth to Supabase Auth. Use a unique password, keep access to your email account secure, and sign out when using a shared device.",
      },
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    subtitle: "Compare stocks and customise analytics charts",
    icon: AccountBalanceWalletRoundedIcon,
    faqs: [
      {
        question: "What is the Portfolio page used for?",
        answer:
          "Portfolio is an analytics workspace for comparing selected stocks across interactive metric charts. It does not record trades or represent a brokerage account.",
      },
      {
        question: "How do I add stocks to my portfolio?",
        answer:
          "Enter or choose a ticker symbol in the stock selector. You can compare up to 5 stocks at a time. Select a ticker chip to include or exclude it from charts; use the chip's remove control to delete it from the selector.",
      },
      {
        question: "What metrics can I analyze?",
        answer:
          "FIT provides 10 analytics views: Cumulative Return, Beta Analysis, Alpha Comparison, Max Drawdown, Volatility, Sharpe Ratio, Sortino Ratio, Value at Risk, Market Correlation, and the simulated Efficient Frontier portfolio cloud.",
      },
      {
        question: "Can I customize the dashboard layout?",
        answer:
          "Each analytics card can display a different metric. Use the metric control in a card, switch a secondary card into the main view, enter fullscreen, or clear a chart.",
      },
      {
        question: "How do I change the date range for analysis?",
        answer:
          "Use the Start Date and End Date pickers below the stock selector. Select your desired date range to analyze historical performance for that specific period.",
      },
    ],
  },
  {
    id: "top-picks",
    label: "Top Picks",
    subtitle: "Discover how metric-based stock rankings work",
    icon: TrendingUpRoundedIcon,
    faqs: [
      {
        question: "How are stocks ranked in Top Picks?",
        answer:
          "Top Picks calculates the available one-year performance and risk metrics for the current ticker set, then ranks the loaded rows by the selected metric and direction. Sharpe Ratio in descending order is the default.",
      },
      {
        question: "Can I export the Top Picks data?",
        answer:
          "Yes. Export CSV downloads the currently loaded sorted rows using the visible columns. Edit the column selection first if you want to change what the file contains.",
      },
      {
        question: "How do I sort by different metrics?",
        answer:
          "Select a metric column header to sort by it. Selecting the same header again toggles between descending and ascending order. The Rank column is not sortable.",
      },
      {
        question: "Does Email Updates send notifications?",
        answer:
          "Not yet. The current Email Updates control validates an address and keeps it stored only in this browser; an email delivery service is not connected.",
      },
    ],
  },
  {
    id: "market-news",
    label: "Market News",
    subtitle: "Stay informed with the latest market news and filters",
    icon: NewspaperRoundedIcon,
    faqs: [
      {
        question: "How is news categorized?",
        answer:
          "Market News is organized around investor-facing topics: Cost of Living, Markets, Money, Work, and Technology. Markets and Money include secondary topics such as Australian Markets, International Markets, Commodities, Money News, Personal Finance, and Property News.",
      },
      {
        question: "How often is news updated?",
        answer:
          "Market News reloads when you change topic, search, or ticker. While the page is visible it requests an update about every three minutes, and requests again when you return to the tab. Public topic results may still use a short shared cache; manual and automatic refresh requests bypass that cache. Publication freshness depends on provider availability and may be delayed.",
      },
      {
        question: "Can I filter news by specific criteria?",
        answer:
          "Yes. Use Signals to narrow the current story set by all stories, watchlist links, company-linked headlines, best matches, risks, or opportunities. Use Scan order to reorder the same story set by latest, best signal, or watchlist-first without changing the underlying category or search.",
      },
      {
        question: "How do I see news for my watchlist stocks?",
        answer:
          "Use the My watchlist signal to show stories linked to saved tickers, or use the quote lookup panel to search a specific ticker. The market scope selector above the ticker strip changes the quote snapshots only; it does not change the news category query.",
      },
    ],
  },
  {
    id: "watchlist",
    label: "Watchlist",
    subtitle: "Track and monitor your favourite stocks in one place",
    icon: BookmarkBorderRoundedIcon,
    faqs: [
      {
        question: "How many stocks can I add to my watchlist?",
        answer:
          "You can save up to 20 market ideas. Search by company name or ticker, then remove an idea when it is no longer part of your research queue.",
      },
      {
        question: "What information is shown for each stock?",
        answer:
          "Each item shows the latest available price and daily move, plus an optional note explaining why you are watching it and an optional research target. A research target is only a personal comparison point, not an alert or recommendation.",
      },
      {
        question: "Can I reorder my watchlist stocks?",
        answer:
          "Yes. Choose Custom order, then use the up and down controls on an item. You can also sort temporarily by symbol, company, daily move, or date added without changing the saved custom order.",
      },
      {
        question: "How do I continue researching a saved idea?",
        answer:
          "Open the news action on an item to review stories for that ticker, or use View Watchlist News to see stories connected to your saved list. Use Portfolio Analytics whenever you want to compare an idea with other symbols; it does not record a trade or indicate ownership.",
      },
      {
        question: "How often does Market Monitor update?",
        answer:
          "During regular trading, quote snapshots target every 15 seconds and charts every 30 seconds. During extended hours, quotes target every 30 seconds and charts every 60 seconds. When the market is closed, both target every five minutes. Provider data may be delayed, and FIT slows or retries requests when live data is unavailable.",
      },
    ],
  },
  {
    id: "community",
    label: "Community",
    subtitle: "Connect and discuss with other FIT users",
    icon: GroupsRoundedIcon,
    faqs: [
      {
        question: "How do I create a post?",
        answer:
          "Select Create post in Community to open the dedicated Community Create page. Add a required title and an optional Markdown discussion. You can choose up to four topic or ticker tags and, when signed in, attach one supported image.",
      },
      {
        question: "How do posts get ranked?",
        answer:
          "Top combines votes, comments, ticker mentions, and selected content signals into an investment signal score, with recency included and used as a tie-break. New sorts by recency, and Top supports time-range filtering.",
      },
      {
        question: "Can I search for specific discussions?",
        answer:
          "Yes, use the search bar to find posts by keywords, stock symbols, or tags. The search looks through post titles, content, and tags.",
      },
      {
        question: "What are community guidelines?",
        answer:
          "Keep discussions respectful and informative. Do not post spam, harassment, or attempts to manipulate markets. Treat Community posts as peer discussion rather than verified financial advice.",
      },
    ],
  },
  {
    id: "profile",
    label: "Profile",
    subtitle: "Manage your profile details and sign-in security",
    icon: PersonOutlineRoundedIcon,
    faqs: [
      {
        question: "How do I change my profile picture?",
        answer:
          "On Profile, choose Photo and select an image. FIT previews the avatar, then uploads and saves it automatically.",
      },
      {
        question: "How do I update my name, email, or phone?",
        answer:
          "Use Edit profile for your handle and name. Identity, email, and phone use separate dialogs and save actions; choose Change or Add beside Email or Phone. Email changes may require confirmation from the new inbox.",
      },
      {
        question: "How do I change my password?",
        answer:
          "Open the Change password dialog under Security, enter and confirm the new password, then select Update password.",
      },
    ],
  },
] satisfies HelpSectionCollection);
