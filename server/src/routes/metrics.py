import traceback

from flask import Blueprint, jsonify, request

from ..analytics.metric_contract import MetricRequestValidationError
from ..analytics.metric_service import (
    UnknownMetricTypeError,
    process_metric_request,
)


def create_metrics_blueprint(calculator_provider):
    blueprint = Blueprint("metrics", __name__)

    @blueprint.post("/api/metrics/<metric_type>")
    def get_metric(metric_type):
        try:
            response = process_metric_request(
                metric_type,
                request.get_json(silent=True),
                calculator_provider,
            )
        except MetricRequestValidationError as error:
            return jsonify({"error": str(error)}), 400
        except UnknownMetricTypeError:
            return jsonify({
                "error": f"Unknown metric type: {metric_type}"
            }), 400
        except Exception:
            traceback.print_exc()
            return jsonify({
                "error": "Metric calculation failed. Please try again."
            }), 500

        return jsonify(response)

    return blueprint
