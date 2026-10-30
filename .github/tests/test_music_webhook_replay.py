"""Synthetic Stripe-style webhook replay rehearsal. NEVER sends Stripe or Supabase calls.

Run: python3 -m unittest -v test_music_webhook_replay.py
This tests a local harness, NOT real Stripe-managed retries or deployed fulfillment.
"""
import hashlib
import hmac
import http.client
import json
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SYNTHETIC_SECRET = b"test-fixture-only-not-a-real-stripe-secret"


def signature(body, timestamp=None):
    timestamp = int(time.time()) if timestamp is None else timestamp
    digest = hmac.new(SYNTHETIC_SECRET, f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={digest}"


def verify_signature(body, header):
    try:
        fields = dict(chunk.strip().split("=", 1) for chunk in header.split(","))
        timestamp = int(fields["t"])
        if abs(int(time.time()) - timestamp) > 300:
            return False
        expected = signature(body, timestamp).split("v1=", 1)[1]
        return hmac.compare_digest(fields["v1"], expected)
    except (ValueError, KeyError, TypeError, AttributeError):
        return False


def fixture(event_id="evt_synthetic_A", paid=True, livemode=False):
    return json.dumps({
        "id": event_id,
        "type": "checkout.session.completed",
        "livemode": livemode,
        "data": {"object": {"id": "cs_test_synthetic_A", "payment_status": "paid" if paid else "unpaid"}},
    }, separators=(",", ":")).encode()


class SyntheticState:
    def __init__(self):
        self.lock = threading.Lock()
        self.attempts = {}
        self.completed = set()
        self.fulfillment_count = {}


def make_handler(state):
    class SyntheticWebhook(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def respond(self, status, result, event_id=None, attempt=None):
            body = json.dumps({"result": result, "event_id": event_id, "attempt": attempt}).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            if self.path != "/webhook":
                return self.respond(404, "not_found")
            try:
                size = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                return self.respond(400, "bad_length")
            if not 0 < size < 65536:
                return self.respond(400, "bad_length")
            body = self.rfile.read(size)
            if not verify_signature(body, self.headers.get("Stripe-Signature", "")):
                return self.respond(400, "invalid_signature")
            try:
                event = json.loads(body)
                event_id = event["id"]
                if not isinstance(event_id, str) or not event_id.startswith("evt_"):
                    raise ValueError("invalid event ID")
            except (ValueError, TypeError, KeyError):
                return self.respond(400, "invalid_event")
            if event.get("livemode") is not False:
                return self.respond(400, "live_mode_refused", event_id)
            obj = event.get("data", {}).get("object", {})
            if event.get("type") != "checkout.session.completed" or obj.get("payment_status") != "paid":
                return self.respond(200, "ignored_unhandled_or_unpaid", event_id)
            with state.lock:
                attempt = state.attempts.get(event_id, 0) + 1
                state.attempts[event_id] = attempt
                if event_id in state.completed:
                    return self.respond(200, "duplicate_ignored", event_id, attempt)
                if attempt == 1:
                    return self.respond(500, "transient_failure_before_fulfillment", event_id, attempt)
                state.completed.add(event_id)
                state.fulfillment_count[event_id] = state.fulfillment_count.get(event_id, 0) + 1
                return self.respond(200, "synthetic_fulfillment", event_id, attempt)

    return SyntheticWebhook


class WebhookReplayTests(unittest.TestCase):
    def setUp(self):
        self.state = SyntheticState()
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(self.state))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def post(self, body, signed=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=2)
        try:
            connection.request("POST", "/webhook", body=body, headers={
                "Content-Type": "application/json",
                "Stripe-Signature": signature(body) if signed is None else signed,
            })
            result = connection.getresponse()
            return result.status, json.loads(result.read())
        finally:
            connection.close()

    def test_failure_recovery_same_event_and_duplicate(self):
        body = fixture()
        a, b, c = self.post(body), self.post(body), self.post(body)
        self.assertEqual([a[0], b[0], c[0]], [500, 200, 200])
        self.assertEqual([a[1]["attempt"], b[1]["attempt"], c[1]["attempt"]], [1, 2, 3])
        self.assertEqual(c[1]["result"], "duplicate_ignored")
        self.assertEqual(self.state.fulfillment_count, {"evt_synthetic_A": 1})

    def test_invalid_signature_refused_without_attempt(self):
        self.assertEqual(self.post(fixture(), "t=1,v1=not-a-signature")[0], 400)
        self.assertEqual(self.state.attempts, {})

    def test_stale_signature_refused(self):
        body = fixture()
        self.assertEqual(self.post(body, signature(body, int(time.time()) - 700))[0], 400)
        self.assertEqual(self.state.attempts, {})

    def test_tampered_body_refused(self):
        original = fixture()
        tampered = original.replace(b"paid", b"unpaid")
        self.assertEqual(self.post(tampered, signature(original))[0], 400)
        self.assertEqual(self.state.attempts, {})

    def test_live_mode_refused(self):
        self.assertEqual(self.post(fixture(livemode=True))[0], 400)
        self.assertEqual(self.state.fulfillment_count, {})

    def test_unpaid_checkout_no_fulfillment(self):
        self.assertEqual(self.post(fixture(paid=False))[0], 200)
        self.assertEqual(self.state.fulfillment_count, {})

    def test_separate_events_have_independent_attempts(self):
        a = fixture("evt_synthetic_A")
        b = fixture("evt_synthetic_B")
        self.assertEqual([self.post(a)[0], self.post(b)[0], self.post(a)[0], self.post(b)[0]], [500, 500, 200, 200])
        self.assertEqual(self.state.fulfillment_count, {"evt_synthetic_A": 1, "evt_synthetic_B": 1})


if __name__ == "__main__":
    unittest.main(verbosity=2)
