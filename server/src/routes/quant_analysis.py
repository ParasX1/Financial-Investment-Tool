import logging
from uuid import uuid4

from flask import Blueprint, current_app, g, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge

from ..quant_analysis.contracts import (
    QuantRunRequestValidationError,
    validate_quant_run_request,
)
from ..quant_analysis.market_data import MarketDataUnavailableError
from ..quant_analysis.orchestrator import StageValidationExhausted
from ..quant_analysis.service import MAX_BODY_BYTES, SCHEMA_VERSION


LOGGER = logging.getLogger(__name__)


def _trace_id():
    return g.quant_analysis_trace_id


def _error(code, message, status, fields=None, headers=None):
    response = jsonify({
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "fields": {} if fields is None else fields,
            "traceId": _trace_id(),
        },
    })
    if headers:
        response.headers.update(headers)
    return response, status


def create_quant_analysis_blueprint(service_provider, rate_limiter):
    blueprint = Blueprint("quant_analysis", __name__)

    @blueprint.before_request
    def create_server_trace_id():
        g.quant_analysis_trace_id = str(uuid4())

    @blueprint.after_request
    def apply_quant_response_headers(response):
        response.headers["X-Trace-ID"] = _trace_id()
        response.headers["Cache-Control"] = "no-store"
        return response

    @blueprint.get("/api/v1/quant-analysis/capabilities")
    def capabilities():
        try:
            service = service_provider(current_app)
            data = service.capabilities()
        except Exception as error:
            LOGGER.error(
                "quant_analysis.capabilities_failed "
                "trace_id=%s error_type=%s",
                _trace_id(),
                type(error).__name__,
            )
            return _error(
                "SERVICE_UNAVAILABLE",
                "Quant Analysis is temporarily unavailable.",
                503,
            )
        return jsonify({
            "success": True,
            "data": data,
            "meta": {"schemaVersion": SCHEMA_VERSION},
        })

    @blueprint.post("/api/v1/quant-analysis/runs")
    def create_run():
        request.max_content_length = MAX_BODY_BYTES
        content_length = request.content_length
        if content_length is not None and content_length > MAX_BODY_BYTES:
            return _error(
                "REQUEST_TOO_LARGE",
                "The request body is too large.",
                413,
            )
        try:
            raw_body = request.get_data(cache=True)
        except RequestEntityTooLarge:
            return _error(
                "REQUEST_TOO_LARGE",
                "The request body is too large.",
                413,
            )
        if len(raw_body) > MAX_BODY_BYTES:
            return _error(
                "REQUEST_TOO_LARGE",
                "The request body is too large.",
                413,
            )

        client_key = request.remote_addr or "unknown"
        limit_decision = rate_limiter.check(client_key)
        if not limit_decision.allowed:
            return _error(
                "RATE_LIMITED",
                "Too many Quant Analysis runs. Please retry later.",
                429,
                headers={"Retry-After": str(limit_decision.retry_after)},
            )

        try:
            quant_request = validate_quant_run_request(
                request.get_json(silent=True)
            )
        except QuantRunRequestValidationError as error:
            return _error(
                "INVALID_REQUEST",
                "The request could not be validated.",
                400,
                fields=error.fields,
            )

        try:
            service = service_provider(current_app)
            artifact = service.run(quant_request, trace_id=_trace_id())
        except MarketDataUnavailableError as error:
            LOGGER.warning(
                "quant_analysis.market_data_failed "
                "trace_id=%s error_type=%s",
                _trace_id(),
                type(error).__name__,
            )
            return _error(
                "MARKET_DATA_UNAVAILABLE",
                "Market data is temporarily unavailable.",
                502,
            )
        except StageValidationExhausted as error:
            LOGGER.warning(
                "quant_analysis.stage_validation_failed "
                "trace_id=%s stage=%s attempts=%s",
                _trace_id(),
                error.stage,
                len(error.validation_attempts),
            )
            return _error(
                "INVALID_PROVIDER_OUTPUT",
                "The analysis output could not be validated.",
                422,
            )
        except Exception as error:
            LOGGER.error(
                "quant_analysis.run_failed trace_id=%s error_type=%s",
                _trace_id(),
                type(error).__name__,
            )
            return _error(
                "SERVICE_UNAVAILABLE",
                "Quant Analysis is temporarily unavailable.",
                503,
            )

        return jsonify({
            "success": True,
            "data": artifact,
            "meta": {"schemaVersion": SCHEMA_VERSION},
        })

    return blueprint
