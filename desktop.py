import os
import threading
from http.server import ThreadingHTTPServer

import webview

from server import EnWriteHandler


def run():
    server = ThreadingHTTPServer(("127.0.0.1", 0), EnWriteHandler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, name="en-intellisense-server", daemon=True)
    thread.start()

    try:
        webview.create_window(
            "En-IntelliSense",
            f"http://127.0.0.1:{port}",
            width=1440,
            height=900,
            min_size=(1040, 680),
            confirm_close=False,
        )
        webview.start(debug=os.getenv("ENWRITE_DEBUG") == "1", gui="edgechromium")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


if __name__ == "__main__":
    run()
