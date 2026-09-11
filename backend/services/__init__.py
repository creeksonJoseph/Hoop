# services/__init__.py
# Expose the zernio sub-package as `zernio_service` so that callers using
#   from services import zernio_service
# continue to work without any changes.
from services import zernio as zernio_service  # noqa: F401
