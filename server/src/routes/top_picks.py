import traceback
import json
from queue import Empty

from flask import Blueprint, Response, current_app, jsonify, request

from ..supabase_client import SupabaseConfigurationError
from ..top_picks.contracts import (
    TopPicksRequestValidationError,
    validate_top_picks_request,
)
from ..top_picks.repository import TopPicksDataSourceError
from ..top_picks.events import SubscriptionLimitError, SUBSCRIPTION_RETRY_SECONDS
from ..top_picks.service import TopPicksConfigurationError
from ..top_picks.service import TOP_PICKS_WINDOWS


def create_top_picks_blueprint(service_provider):
    blueprint = Blueprint("top_picks", __name__)

    @blueprint.get("/api/top-picks/events")
    def top_picks_events():
        window = request.args.get("window", "1Y")
        if window not in TOP_PICKS_WINDOWS:
            return jsonify({"error": "Top Picks window is invalid."}), 400
        try:
            service = service_provider(current_app)
            # Use the actual server peer. Forwarding headers are untrusted here;
            # trusted proxy identity must be configured at the deployment boundary.
            subscription = service.subscribe_updates(window, client_id=request.remote_addr)
        except SubscriptionLimitError:
            return jsonify({"error": "Top Picks update capacity is busy. Please retry."}), 429, {
                "Retry-After": str(SUBSCRIPTION_RETRY_SECONDS),
            }
        except (SupabaseConfigurationError, TopPicksConfigurationError):
            return jsonify({"error": "Top Picks service is not configured."}), 503
        except Exception:
            traceback.print_exc()
            return jsonify({"error": "Unable to subscribe to Top Picks updates."}), 500

        def events():
            try:
                ready = {"revision": subscription.revision, "window": window}
                yield f"event: connected\ndata: {json.dumps(ready)}\n\n"
                while True:
                    remaining = subscription.remaining_seconds
                    if remaining <= 0:
                        subscription.close()
                        yield f"retry: {SUBSCRIPTION_RETRY_SECONDS * 1000}\nevent: reconnect\ndata: {{}}\n\n"
                        break
                    try:
                        update = subscription.get(timeout=min(15, remaining))
                    except Empty:
                        # Transport heartbeat only; does not fetch market data.
                        yield ": keep-alive\n\n"
                        continue
                    event = update.get("event", "snapshot")
                    payload = {key: value for key, value in update.items() if key != "event"}
                    event_id = f"id: {update['revision']}\n" if "revision" in update else ""
                    yield f"{event_id}event: {event}\ndata: {json.dumps(payload)}\n\n"
            finally:
                subscription.close()

        response = Response(events(), mimetype="text/event-stream", headers={
            "Cache-Control": "no-cache", "X-Accel-Buffering": "no",
        })
        response.call_on_close(subscription.close)
        return response

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
