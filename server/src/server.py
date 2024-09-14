from flask import Flask, jsonify, request
from flask_cors import CORS
from metrics import calculate_sharpe_ratio, calculate_volatility

app = Flask(__name__)
CORS(app)

# @app.route("/api/home", methods=['GET'])
# def return_home():
#     return jsonify({
#         'test': "test",
#         'testList': ['1', '2', '3']
#     })

@app.route("/api/metrics/sharpe_ratio", methods=['POST'])
def get_sharpe_ratio():
    data = request.json
    returns = data.get('returns')
    risk_free_rate = data.get('risk_free_rate')
    ratio = calculate_sharpe_ratio(returns, risk_free_rate)
    return jsonify({'sharpe_ratio': ratio})

@app.route("/api/metrics/volatility", methods=['POST'])
def get_volatility():
    data = request.json
    returns = data.get('returns')
    volatility = calculate_volatility(returns)
    return jsonify({'volatility': volatility})

if __name__ == "__main__":
    app.run(debug=True, port=8080)
