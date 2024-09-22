import json

from flask import Flask, jsonify, request
from flask_cors import CORS
from src.stocks import sanitiseStockJson

from supabase import create_client, Client

def create_app():
    # app instance
    app = Flask(__name__)
    app.config.from_prefixed_env()
    CORS(app)

    supabase: Client = create_client(app.config["SUPABASE_URL"], app.config["SUPABASE_KEY"])

    # returns a list of stocks the user holds
    # takes the user id as input
    @app.route("/api/stocks/get", methods=["POST"])
    def stocks_get():
        data = request.json
        userid = data["id"]
        try:
            response = (supabase.table("Users")
                        .select("stock_ids")
                        .eq("id", userid)
                        .single()
                        .execute()
            )
            if response:
                return response.data["stock_ids"]["stocks"], 200
            else:
                raise KeyError()
        except:
            return jsonify({
                "error": "No such user with ID " + userid
            }), 404
    # update columns in user stock entries for a single user
    # each update can only target one column at a time
    @app.route("/api/stocks/set", methods=["POST"])
    def stocks_set():
        try:
            data = request.json
            userid = data["id"]
            json = data["json"]
            if not sanitiseStockJson(json):
                raise KeyError("Invalid JSON")
            resp = (supabase.table("Users")
                        .update({"stock_ids": json})
                        .eq("id", userid)
                        .execute()
            )
            if not resp:
                raise KeyError("Couldn't find table entry")
            return jsonify({"message": "OK"}), 200
        except KeyError as e:
           return jsonify({
               "error": f"Something went wrong: {e}"
           }), 500

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=8080)