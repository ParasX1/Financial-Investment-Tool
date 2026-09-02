from flask import Blueprint, jsonify, request

from ..etf.service import EtfPreviewService


def create_etf_blueprint(service=None):
    blueprint = Blueprint("etf", __name__)
    resolved_service = EtfPreviewService() if service is None else service

    @blueprint.get("/api/etfs")
    def list_etfs():
        try:
            response = resolved_service.list_ranked_etfs(
                request.args.get("window")
            )
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        return jsonify(response)

    return blueprint
