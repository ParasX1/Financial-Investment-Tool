# Financial-Investment-Tool
[![Client CI](https://github.com/ParasX1/Financial-Investment-Tool/actions/workflows/node.js.yml/badge.svg)](https://github.com/ParasX1/Financial-Investment-Tool/actions/workflows/node.js.yml)
[![Python application](https://github.com/ParasX1/Financial-Investment-Tool/actions/workflows/python-app.yml/badge.svg)](https://github.com/ParasX1/Financial-Investment-Tool/actions/workflows/python-app.yml)

The Financial Investment Tool is a web-based platform for investors and portfolio managers. It allows users to analyze stock data, calculate performance metrics, and optimize portfolios. Key features include performance metrics, correlation analysis, and machine learning for predictive analytics, all with an intuitive interface.

## Getting Started
We use a monorepo to hold both our frontend and backend code.

**Frontend**

We use npm and nextjs to run our friend. In the `client` folder, use

```
npm install
```

to install/update project dependencies and

```
npm run dev
```

to compile and host the frontend locally.

**Backend**

We use flask to run our backend.

Enable the virtual environment with

```
source venv/bin/activate
```

Then use python to run the backend

```
python3 server.py
```

