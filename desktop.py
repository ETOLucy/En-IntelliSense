import os
import tempfile
import threading
import webbrowser
from http.server import ThreadingHTTPServer
from pathlib import Path

import webview

os.environ.setdefault("ENWRITE_DESKTOP", "1")

from server import EnWriteHandler


class DocumentApi:
    def __init__(self):
        # pywebview exposes public attributes on js_api objects. Keep bridge
        # internals private so its serializer cannot walk back into Window.
        self._window = None
        self._current_path = None
        self._current_signature = None
        self._lock = threading.Lock()

    def attach_window(self, window):
        self._window = window

    def _dialog_type(self, name):
        if hasattr(webview, "FileDialog"):
            return getattr(webview.FileDialog, name)
        return getattr(webview, f"{name}_DIALOG")

    @staticmethod
    def _selected_path(result):
        if isinstance(result, (list, tuple)):
            return Path(result[0]) if result else None
        return Path(result) if result else None

    @staticmethod
    def _signature(path):
        stat = path.stat()
        return (stat.st_mtime_ns, stat.st_size)

    def open_document(self):
        try:
            result = self._window.create_file_dialog(
                self._dialog_type("OPEN"),
                allow_multiple=False,
                file_types=("Text and Markdown (*.txt;*.md;*.markdown)",),
            )
            path = self._selected_path(result)
            if path is None:
                return {"ok": False, "cancelled": True}
            if path.suffix.lower() not in {".txt", ".md", ".markdown"}:
                return {"ok": False, "error": "Choose a .txt, .md, or .markdown file."}
            if path.stat().st_size > 5 * 1024 * 1024:
                return {"ok": False, "error": "The file is larger than the 5 MB editing limit."}
            try:
                text = path.read_text(encoding="utf-8-sig")
            except UnicodeDecodeError:
                return {"ok": False, "error": "The file is not UTF-8 text. Convert it to UTF-8 before opening."}
            with self._lock:
                self._current_path = path
                self._current_signature = self._signature(path)
            return {"ok": True, "name": path.name, "title": path.stem, "text": text}
        except OSError as error:
            return {"ok": False, "error": f"Could not open the file: {error}"}

    def save_document(self, content, suggested_name="document.txt", save_as=False, force=False):
        if not isinstance(content, str):
            return {"ok": False, "error": "Document content must be text."}
        if len(content.encode("utf-8")) > 5 * 1024 * 1024:
            return {"ok": False, "error": "The document is larger than the 5 MB editing limit."}
        try:
            with self._lock:
                path = None if save_as else self._current_path
                signature = self._current_signature
            if path is not None and path.exists() and signature and self._signature(path) != signature and not force:
                return {"ok": False, "conflict": True, "error": "The file changed outside WriteMelo."}
            if path is None:
                safe_name = Path(str(suggested_name)).name
                if Path(safe_name).suffix.lower() not in {".txt", ".md", ".markdown"}:
                    safe_name += ".txt"
                result = self._window.create_file_dialog(
                    self._dialog_type("SAVE"),
                    save_filename=safe_name,
                    file_types=("Text file (*.txt)", "Markdown file (*.md)"),
                )
                path = self._selected_path(result)
                if path is None:
                    return {"ok": False, "cancelled": True}
            if path.suffix.lower() not in {".txt", ".md", ".markdown"}:
                path = path.with_suffix(".txt")
            path.parent.mkdir(parents=True, exist_ok=True)
            temporary_name = None
            try:
                with tempfile.NamedTemporaryFile("w", encoding="utf-8", newline="", dir=path.parent, delete=False) as temporary:
                    temporary.write(content)
                    temporary_name = temporary.name
                os.replace(temporary_name, path)
            finally:
                if temporary_name and os.path.exists(temporary_name):
                    os.unlink(temporary_name)
            with self._lock:
                self._current_path = path
                self._current_signature = self._signature(path)
            return {"ok": True, "name": path.name}
        except OSError as error:
            return {"ok": False, "error": f"Could not save the file: {error}"}

    def detach_document(self):
        with self._lock:
            self._current_path = None
            self._current_signature = None
        return {"ok": True}

    def open_external(self, url):
        value = str(url or "")
        allowed = value.startswith(("mailto:", "https://", "http://"))
        allowed_store = value.startswith("ms-windows-store://pdp/?ProductId=")
        if not allowed and not allowed_store:
            return {"ok": False, "error": "Unsupported external URL."}
        try:
            return {"ok": bool(webbrowser.open(value, new=2))}
        except webbrowser.Error as error:
            return {"ok": False, "error": f"Could not open the system application: {error}"}

def run():
    server = ThreadingHTTPServer(("127.0.0.1", 0), EnWriteHandler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, name="en-intellisense-server", daemon=True)
    thread.start()
    document_api = DocumentApi()

    try:
        window = webview.create_window(
            "WriteMelo",
            f"http://127.0.0.1:{port}",
            width=1440,
            height=900,
            min_size=(1040, 680),
            confirm_close=False,
            js_api=document_api,
        )
        document_api.attach_window(window)
        webview.start(debug=os.getenv("ENWRITE_DEBUG") == "1", gui="edgechromium")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


if __name__ == "__main__":
    run()
