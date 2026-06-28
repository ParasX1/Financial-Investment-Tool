// File purpose: Defines the static Help Center topics and FAQ copy rendered by the Help feature.
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import NewspaperRoundedIcon from "@mui/icons-material/NewspaperRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import type { HelpSection } from "../types";

export const helpSections: HelpSection[] = [
  {
    id: "login-signup",
    label: "Login and Signup",
    subtitle: "Find answers to common questions about login and signup",
    icon: LoginRoundedIcon,
    faqs: [
      {
        question: "How do I create an account?",
        answer:
          "Click the 'Get FIT' button on the landing page or navigate to the signup page. Fill in your email, create a password, and verify your email address. Your account will be activated immediately after verification. You can also sign up with Google.",
      },
      {
        question: "How do I log in?",
        answer:
          "Enter your email and password, or use 'Log in with Google' for Google authentication.",
      },
      {
        question: "Can I use social login?",
        answer:
          "Yes! FIT supports Google OAuth for both sign-up and login. Click 'Log in with Google' to authenticate with your Google account in one click.",
      },
      {
        question: "Is my data secure?",
        answer:
          "Absolutely. We use industry-standard encryption (AES-256) for data at rest and TLS 1.3 for data in transit. We never share your personal information with third parties without your consent.",
      },
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    subtitle: "Learn how to manage and customise your stock portfolio",
    icon: AccountBalanceWalletRoundedIcon,
    faqs: [
      {
        question: "What is the Portfolio page used for?",
        answer:
          "It allows users to search, select, and manage stocks with interactive graphs.",
      },
      {
        question: "How do I add stocks to my portfolio?",
        answer:
          "Use the stock selector at the top of the Portfolio page. Type a stock symbol or company name, then click to add it. You can select up to 5 stocks simultaneously for comparison.",
      },
      {
        question: "What metrics can I analyze?",
        answer:
          "EFIT provides 10 key metrics including Cumulative Return, Beta Analysis, Alpha Comparison, Max Drawdown, Volatility, Sharpe Ratio, Sortino Ratio, Value at Risk, Market Correlation, and Efficient Frontier visualization.",
      },
      {
        question: "Can I customize the dashboard layout?",
        answer:
          "Yes! Each analytics card can display different metrics. Use the dropdown menu in each card to select your preferred metric. You can also clear, expand, or swap card positions.",
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
    subtitle: "Discover how stock rankings and recommendations work",
    icon: TrendingUpRoundedIcon,
    faqs: [
      {
        question: "How are stocks ranked in Top Picks?",
        answer:
          "Stocks are ranked using a proprietary algorithm that considers multiple risk-adjusted metrics including Sharpe Ratio, Sortino Ratio, Alpha, and 1-year returns. The ranking is updated daily.",
      },
      {
        question: "Can I export the Top Picks data?",
        answer:
          "Yes, click the 'Export CSV' button to download the complete ranking table with all metrics. The CSV file can be opened in Excel or Google Sheets for further analysis.",
      },
      {
        question: "How do I sort by different metrics?",
        answer:
          "Click on any column header to sort by that metric. Click again to reverse the sort order. A third click returns to the default ranking order.",
      },
      {
        question: "Can I receive Top Picks updates via email?",
        answer:
          "Yes! Click the 'Email Updates' button and configure your notification preferences. You can choose daily, weekly, or monthly updates with customizable criteria.",
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
          "The page requests fresh provider results when you change topic, search, look up a ticker, refresh, or open a deep link. In development it may use free providers such as Google News RSS, Yahoo Finance RSS, or GDELT; configured production providers such as MarketAux and NewsAPI can be swapped in through the provider layer.",
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
          "You can track up to 10 stocks in your watchlist. Each stock gets its own collapsible card with chart and related news. Use the stock selector to add or remove stocks.",
      },
      {
        question: "What information is shown for each stock?",
        answer:
          "Each watchlist item displays current price, daily change, a 90-day performance chart, and related news articles. Click the card to expand/collapse detailed information.",
      },
      {
        question: "Can I reorder my watchlist stocks?",
        answer:
          "Yes, you can drag and drop watchlist cards to reorder them according to your preference. Your custom order is saved automatically.",
      },
      {
        question: "What are the market trends indicators?",
        answer:
          "The market trends panel shows real-time data for major indices (S&P 500, NASDAQ, Dow Jones) and the VIX volatility index, providing context for your watchlist performance.",
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
          "Use the text box at the top of the Community page to write your post. You can add images and format your text. Click 'Post' to publish. You can also tag stocks and add topic tags.",
      },
      {
        question: "How do posts get ranked?",
        answer:
          "Posts are ranked by upvotes when sorted by 'Top' or by recency when sorted by 'New'. Community members can upvote helpful posts and add comments to discussions.",
      },
      {
        question: "Can I search for specific discussions?",
        answer:
          "Yes, use the search bar to find posts by keywords, stock symbols, or tags. The search looks through post titles, content, and tags.",
      },
      {
        question: "What are community guidelines?",
        answer:
          "FIT encourages respectful, informative discussions. No spam, harassment, or market manipulation. Share insights, ask questions, and learn from other investors. Posts violating guidelines will be removed.",
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
          "Go to Profile, choose Edit profile, then use Change avatar. The new image is previewed first; click Save profile to apply it.",
      },
      {
        question: "How do I update my name, email, or phone?",
        answer:
          "Choose Edit profile, update your personal details, and click Save profile. Email changes may require confirmation from the new inbox.",
      },
      {
        question: "How do I change my password?",
        answer:
          "Choose Edit profile, enter and confirm a new password in the Security section, then click Update password. Password changes are separate from profile saves.",
      },
    ],
  },
];
