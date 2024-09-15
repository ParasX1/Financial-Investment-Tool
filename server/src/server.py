from flask import Flask, jsonify, request
from flask_cors import CORS
from metrics import fetch_stock_data, calculate_beta

app = Flask(__name__)
CORS(app)

@app.route("/api/home", methods=['GET'])
def return_home():
    # Example stock tickers, market index, date range for testing
    stock_tickers = ['AAPL', 'MSFT']
    market_ticker = 'SPY'
    start_date = '2023-11-01'
    end_date = '2024-01-01'

    stock_data = fetch_stock_data(stock_tickers, start_date, end_date)

    betas = calculate_beta(stock_tickers, market_ticker, start_date, end_date)

    return jsonify({
        'stock_data': stock_data,
        'betas': betas,
    })



# @app.route("/api/metrics/sharpe_ratio", methods=['POST'])
# def get_sharpe_ratio():
#     data = request.json
#     returns = data.get('returns')
#     risk_free_rate = data.get('risk_free_rate')
#     ratio = calculate_sharpe_ratio(returns, risk_free_rate)
#     return jsonify({'sharpe_ratio': ratio})

# @app.route("/api/metrics/volatility", methods=['POST'])
# def get_volatility():
#     data = request.json
#     returns = data.get('returns')
#     volatility = calculate_volatility(returns)
#     return jsonify({'volatility': volatility}) 

if __name__ == "__main__":
    app.run(debug=True, port=8080)
