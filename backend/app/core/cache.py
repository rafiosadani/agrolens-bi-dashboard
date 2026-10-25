import time
import threading
from typing import Any, Optional, Dict, Tuple

class SimpleTTLCache:
    """Thread-safe in-memory cache with Time-To-Live (TTL)."""
    def __init__(self, default_ttl: int = 120):
        self.default_ttl = default_ttl
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._cache:
                return None
            val, expiry = self._cache[key]
            if time.time() > expiry:
                del self._cache[key]
                return None
            return val

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        duration = ttl if ttl is not None else self.default_ttl
        expiry = time.time() + duration
        with self._lock:
            self._cache[key] = (value, expiry)

    def delete(self, key: str) -> None:
        with self._lock:
            if key in self._cache:
                del self._cache[key]

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def size(self) -> int:
        with self._lock:
            # clean expired entries first
            now = time.time()
            expired_keys = [k for k, (_, exp) in self._cache.items() if now > exp]
            for k in expired_keys:
                del self._cache[k]
            return len(self._cache)

cache = SimpleTTLCache(default_ttl=120)
