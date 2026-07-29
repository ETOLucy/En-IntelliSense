import base64
import json
import shutil
import socket as net_socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import requests
import websocket


ROOT = Path(__file__).resolve().parents[1]
BROWSER_CANDIDATES = (
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
)
with net_socket.socket() as port_probe:
    port_probe.bind(("127.0.0.1", 0))
    PORT = port_probe.getsockname()[1]


def cdp(socket, method, params=None, command_id=[0]):
    command_id[0] += 1
    request_id = command_id[0]
    socket.send(json.dumps({"id": request_id, "method": method, "params": params or {}}))
    deadline = time.monotonic() + 15
    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise RuntimeError(f"Browser command timed out: {method}")
        socket.settimeout(remaining)
        message = json.loads(socket.recv())
        if message.get("id") == request_id:
            if "error" in message:
                raise RuntimeError(message["error"])
            return message.get("result", {})


def evaluate(socket, expression):
    result = cdp(socket, "Runtime.evaluate", {"expression": expression, "returnByValue": True})
    if result.get("exceptionDetails"):
        raise RuntimeError(result["exceptionDetails"].get("text", "Browser evaluation failed"))
    return result.get("result", {}).get("value")


def capture(socket, name):
    screenshot = cdp(socket, "Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
    output = ROOT / "docs" / "assets" / name
    output.write_bytes(base64.b64decode(screenshot["data"]))
    print(output)


def main():
    browser_executable = next((path for path in BROWSER_CANDIDATES if path.exists()), None)
    if browser_executable is None:
        raise RuntimeError("Microsoft Edge or Google Chrome is required to capture demos")
    profile = tempfile.mkdtemp(prefix="writemelo-demo-")
    process = subprocess.Popen([
        str(browser_executable), "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--no-proxy-server",
        "--remote-allow-origins=*", "--remote-debugging-address=127.0.0.1",
        f"--remote-debugging-port={PORT}",
        f"--user-data-dir={profile}", "--window-size=1920,1080",
        "http://127.0.0.1:8000",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                pages = requests.get(f"http://127.0.0.1:{PORT}/json", timeout=1).json()
                target = next((page for page in pages if "127.0.0.1:8000" in page.get("url", "")), None)
                if target:
                    break
            except requests.RequestException:
                time.sleep(0.2)
        else:
            raise RuntimeError("Chrome debugging endpoint did not start")

        socket = websocket.create_connection(
            target["webSocketDebuggerUrl"],
            timeout=90,
            http_no_proxy=["localhost", "127.0.0.1"],
        )
        for _ in range(100):
            if evaluate(socket, "document.readyState === 'complete' && typeof storageSet === 'function'"):
                break
            time.sleep(0.1)
        else:
            raise RuntimeError("WriteMelo page did not finish loading")

        draft = {
            "format": "letter",
            "title": "A letter to an old friend",
            "text": (
                "Hi Emma,\n\nLong time no see. I am very happy can write this email to you. Recently I am "
                "preparing an important English presentation, but I have many pressure because my English "
                "is not very good.\n\nMy teacher gave me many useful advices and suggested me to practice "
                "every day. I hope I can improve my English level and express my ideas more clearly. "
                "If you have time, could you help me check my presentation? I will very appreciate it."
            ),
            "recipient": "recipient@example.com",
            "subject": "",
        }
        locales = (
            ("en-us", "en-US", "English"),
            ("zh-cn", "zh-CN", "Chinese"),
            ("es-es", "es-ES", "Spanish"),
            ("ja-jp", "ja-JP", "Japanese"),
            ("ko-kr", "ko-KR", "Korean"),
            ("fr-fr", "fr-FR", "French"),
            ("de-de", "de-DE", "German"),
            ("pt-br", "pt-BR", "Portuguese"),
            ("ar-sa", "ar-SA", "Arabic"),
            ("hi-in", "hi-IN", "Hindi"),
            ("ru-ru", "ru-RU", "Russian"),
        )
        requested_locales = set(sys.argv[1:])
        if requested_locales:
            locales = tuple(locale for locale in locales if locale[0] in requested_locales)
            unknown_locales = requested_locales - {locale[0] for locale in locales}
            if unknown_locales:
                raise RuntimeError(f"Unsupported locale: {', '.join(sorted(unknown_locales))}")
        evaluate(socket, f"storageSet('draft', {json.dumps(json.dumps(draft))})")
        evaluate(socket, f"""
            document.querySelector('#title').value = {json.dumps(draft["title"])};
            document.querySelector('#editor').value = {json.dumps(draft["text"])};
            document.querySelector('#recipient').value = {json.dumps(draft["recipient"])};
            document.querySelector('#subject').value = {json.dumps(draft["subject"])};
            document.querySelector('#format').value = 'letter';
            setFormat('letter', false);
            renderMirror();
            updateStats();
        """)
        for file_locale, ui_locale, explanation_language in locales:
            evaluate(socket, f"""
                storageSet('ui-language', {json.dumps(ui_locale)});
                storageSet('explanation-language', {json.dumps(explanation_language)});
                applyUiLanguage({json.dumps(ui_locale)});
                document.querySelector('#explanationLanguage').value = {json.dumps(explanation_language)};
                clearTimeout(completionTimer);
                if (completionRequest) completionRequest.abort();
                clearTimeout(reviewTimer);
                if (reviewRequest) reviewRequest.abort();
                modelThinking.classList.add('hidden');
                clearSuggestion();
                reviewIssues = [];
                currentIntent = '';
                renderReview();
            """)
            evaluate(socket, "reviewDraft(true)")
            for _ in range(60):
                time.sleep(1)
                issue_count = evaluate(socket, "document.querySelectorAll('.review-issue').length") or 0
                reviewing = evaluate(socket, "document.querySelector('#reviewDraft').disabled")
                if issue_count and not reviewing:
                    break
            else:
                status = evaluate(socket, "document.querySelector('#reviewStatus').textContent") or "unknown"
                raise RuntimeError(f"{file_locale} review did not render issues: {status}")
            evaluate(socket, """
                modelThinking.classList.add('hidden');
                showSuggestion(' I hope to hear from you soon and catch up on your news.', 'sentence');
                saveStatus.textContent = translated('saved');
                window.scrollTo(0, 0);
            """)
            time.sleep(0.5)
            capture(socket, f"store-{file_locale}-01-writing.png")

            evaluate(socket, f"""
                document.querySelector('#uiLanguage').value = {json.dumps(ui_locale)};
                document.querySelector('#languageStatus').textContent = '';
                document.querySelector('#preferencesModal').classList.remove('hidden');
                document.body.classList.add('modal-open');
            """)
            time.sleep(0.3)
            capture(socket, f"store-{file_locale}-02-language.png")

            evaluate(socket, """
                document.querySelector('#preferencesModal').classList.add('hidden');
                document.querySelector('#settingsModal').classList.remove('hidden');
                document.querySelector('#modelBaseUrl').value = 'https://api.example.com';
                document.querySelector('#modelApiKey').value = 'example-api-key';
                document.querySelector('#modelName').value = 'example-model';
                document.querySelector('#modelApiStyle').value = 'chat';
                document.querySelector('#settingsStatus').textContent = '';
            """)
            time.sleep(0.3)
            capture(socket, f"store-{file_locale}-03-ai-service.png")

            evaluate(socket, """
                document.querySelector('#settingsModal').classList.add('hidden');
                document.body.classList.remove('modal-open');
            """)
        socket.close()
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    main()
