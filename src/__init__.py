"""Backward-compatibility proxy for backend package."""
import sys
from backend import *  # noqa: F401, F403
__version__ = "1.0.0"
