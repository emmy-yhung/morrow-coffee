"""ChopNow web server and Paystack transaction verifier."""

import json
import os
import re
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).parent
ROOT_DIRECTORY = ROOT.resolve()
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8000"))
PAYSTACK_SECRET_KEY = os.environ.get("PAYSTACK_SECRET_KEY", "")
REFERENCE_PATTERN = re.compile(r"^chopnow-[a-z0-9-]{10,80}$")
CATALOG = {"Party Jollof & Chicken": 5500, "Egusi & Pounded Yam": 6500, "Suya Sharing Box": 7000}
recent_requests = {}


def send_json(handler, status, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class WebsiteHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/health":
            send_json(self, 200, {"ok": True})
            return
        path = (ROOT_DIRECTORY / (self.path.split("?", 1)[0].lstrip("/") or "index.html")).resolve()
        if ROOT_DIRECTORY not in path.parents:
            send_json(self, 403, {"error": "Forbidden"})
            return
        if not path.is_file() or path.suffix not in {".html", ".css", ".js"}:
            send_json(self, 404, {"error": "Not found"})
            return
        content_type = {".html": "text/html", ".css": "text/css", ".js": "text/javascript"}[path.suffix]
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/verify-payment":
            send_json(self, 404, {"error": "Not found"})
            return
        if not PAYSTACK_SECRET_KEY:
            send_json(self, 503, {"error": "Payment verification is not configured"})
            return
        now = time.monotonic()
        client_ip = self.client_address[0]
        if now - recent_requests.get(client_ip, 0) < 2:
            send_json(self, 429, {"error": "Please wait before trying again"})
            return
        recent_requests[client_ip] = now
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 20_000:
                raise ValueError
            payload = json.loads(self.rfile.read(length))
            reference, items = payload["reference"], payload["items"]
            if not isinstance(reference, str) or not REFERENCE_PATTERN.fullmatch(reference):
                raise ValueError
            if not isinstance(items, list) or not items or len(items) > 20:
                raise ValueError
            expected_amount = 0
            for item in items:
                name, quantity = item["name"], item["quantity"]
                if name not in CATALOG or not isinstance(quantity, int) or not 1 <= quantity <= 20:
                    raise ValueError
                expected_amount += CATALOG[name] * quantity
        except (ValueError, KeyError, TypeError, json.JSONDecodeError):
            send_json(self, 400, {"error": "Invalid payment verification request"})
            return
        request = Request(
            f"https://api.paystack.co/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}", "Accept": "application/json"},
        )
        try:
            with urlopen(request, timeout=10) as response:
                result = json.loads(response.read())
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
            send_json(self, 502, {"error": "Unable to verify payment with Paystack"})
            return
        transaction = result.get("data", {})
        verified = (
            result.get("status") is True
            and transaction.get("status") == "success"
            and transaction.get("currency") == "NGN"
            and transaction.get("amount") == expected_amount * 100
        )
        if not verified:
            send_json(self, 402, {"verified": False, "error": "Payment could not be verified"})
            return
        send_json(self, 200, {"verified": True, "reference": reference, "amount": expected_amount, "currency": "NGN"})


if __name__ == "__main__":
    if not PAYSTACK_SECRET_KEY:
        print("Warning: set PAYSTACK_SECRET_KEY before accepting payments.")
    ThreadingHTTPServer((HOST, PORT), WebsiteHandler).serve_forever()
