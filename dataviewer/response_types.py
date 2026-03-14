import base64
import json
import math
from datetime import date, datetime
from decimal import Decimal

from fastapi.responses import JSONResponse


class Base64JSONResponse(JSONResponse):
    def render(self, content: object) -> bytes:
        def sanitize(value: object) -> object:
            if isinstance(value, float) and not math.isfinite(value):
                return None
            if isinstance(value, dict):
                return {key: sanitize(val) for key, val in value.items()}
            if isinstance(value, (list, tuple, set)):
                return [sanitize(item) for item in value]
            return value

        def default(obj: object) -> object:
            if isinstance(obj, (bytes, bytearray, memoryview)):
                return base64.b64encode(bytes(obj)).decode("utf-8")
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            if isinstance(obj, Decimal):
                return str(obj)
            raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

        return json.dumps(
            sanitize(content),
            ensure_ascii=False,
            allow_nan=False,
            separators=(",", ":"),
            default=default,
        ).encode("utf-8")
