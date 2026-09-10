"""
Root configuration shim for backward compatibility.

Canonical configuration resides in `backend.core.config`.
All imports of `from config import config` will resolve here seamlessly.
"""
from backend.core.config import *  # noqa: F401, F403
from backend.core.config import config  # noqa: F401

