import traceback

from flask import Blueprint, current_app, jsonify

from ..supabase_client import (
    SupabaseConfigurationError,
    get_supabase_client,
)


def create_market_data_blueprint():
    blueprint = Blueprint("market_data", __name__)

    @blueprint.get("/api/fetch_data")
    def get_stock_data():
        try:
            supabase = get_supabase_client(current_app)
        except SupabaseConfigurationError:
            return jsonify({
                "error": "Market data service is not configured."
            }), 503

        try:
            response = (
                supabase.table("stock_data")
                .select("MSFT")
                .execute()
            )
            return jsonify(response.data)
        except Exception:
            traceback.print_exc()
            return jsonify({
                "error": "Market data is temporarily unavailable."
            }), 502

    return blueprint
