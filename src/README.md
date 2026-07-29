# Source layout

- `cloud/`: account, entitlement, provider routing, Store product, and usage guard modules imported by the root `worker.js` entry point.

Desktop runtime entry points remain at the repository root because PyInstaller and the local HTTP server load them directly.

