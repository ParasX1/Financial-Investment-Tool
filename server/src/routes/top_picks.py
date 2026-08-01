import traceback

from flask import Blueprint, current_app, jsonify, request

from ..supabase_client import SupabaseConfigurationError
from ..top_picks.contracts import (
    TopPicksRequestValidationError,
    validate_top_picks_request,
)
from ..top_picks.repository import TopPicksDataSourceError
from ..top_picks.service import TopPicksConfigurationError


def create_top_picks_blueprint(service_provider):
    blueprint = Blueprint("top_picks", __name__)

    @blueprint.post("/api/top-picks")
    def get_top_picks():
        try:
            top_picks_request = validate_top_picks_request(
                request.get_json(silent=True)
            )
        except TopPicksRequestValidationError as error:
            return jsonify({"error": str(error)}), 400

        try:
            service = service_provider(current_app)
            response = service.get_page(top_picks_request)
        except (SupabaseConfigurationError, TopPicksConfigurationError):
            return jsonify({
                "error": "Top Picks service is not configured."
            }), 503
        except TopPicksDataSourceError:
            return jsonify({
                "error": "Top Picks data is temporarily unavailable."
            }), 502
        except Exception:
            traceback.print_exc()
            return jsonify({
                "error": "Unable to calculate Top Picks. Please try again."
            }), 500

        return jsonify(response)

    return blueprint
