from flask import Flask, jsonify, request
from flask_cors import CORS

from supabase import create_client, Client

# TODO: REMOVE
url: str = "https://vhfrriohobjzsvdxehph.supabase.co"
key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoZnJyaW9ob2JqenN2ZHhlaHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU2MjEwMzksImV4cCI6MjA0MTE5NzAzOX0._Vrt3F1KuqIXfWXf-PuXFSNc5JbTUxATatM_hOMCuyA"
supabase: Client = create_client(url, key)

# app instance
app = Flask(__name__)
CORS(app)

@app.route("/api/stocks/get", methods=["POST"])
def stocks_get():
    data = request.json
    userid = data["id"]
    try:
        response = (supabase.table("Users")
                    .select("*")
                    .eq("id", userid)
                    .single()
                    .execute()
                )

        if response.data == []:
            return jsonify({
                "stocks": ""
            })

        stocks = response.data["stocks"]
        resp = jsonify({
            "stocks": stocks
        })

        return resp
    except:
        return jsonify({
            "stocks":[]
        })

@app.route("/api/stocks/set", methods=["POST"])
def stocks_set():
    data = request.json
    userid = data["id"]
    stocks = data["stocks"]

    response = (supabase.table("Users")
                .update({
                    "stocks": stocks
                })
                .eq("id", userid).execute())

    if response.data == []:
        return jsonify({"response": "FAIL"})
    else:
        return jsonify({"response": "OK"})

if __name__ == "__main__":
    app.run(debug=True, port=8080)