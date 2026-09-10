"""Backward-compatibility proxy for backend.server."""
from backend.server import *  # noqa: F401, F403
from backend.server import app, media_gateway  # noqa: F401

if __name__ == "__main__":
    import uvicorn
    from backend.core.config import config
    uvicorn.run("backend.server:app", host=config.host, port=config.port, reload=True)
