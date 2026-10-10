from flask import Blueprint, jsonify


def create_legacy_stocks_blueprint():
    blueprint = Blueprint("legacy_stocks", __name__)

    @blueprint.post("/api/stocks/get")
    @blueprint.post("/api/stocks/set")
    def legacy_user_stocks():
        return jsonify({
            "error": (
                "This legacy portfolio endpoint is no longer available."
            )
        }), 410

    return blueprint
