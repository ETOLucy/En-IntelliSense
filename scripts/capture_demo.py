import base64
import json
import subprocess
import tempfile
import time
from pathlib import Path

import requests
import websocket


ROOT = Path(__file__).resolve().parents[1]
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
PORT = 9223


def cdp(socket, method, params=None, command_id=[0]):
    command_id[0] += 1
    request_id = command_id[0]
    socket.send(json.dumps({"id": request_id, "method": method, "params": params or {}}))
    while True:
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
    profile = tempfile.mkdtemp(prefix="en-intellisense-demo-")
    process = subprocess.Popen([
        str(CHROME), "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--remote-allow-origins=*", f"--remote-debugging-port={PORT}",
        f"--user-data-dir={profile}", "--window-size=1440,1000",
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

        socket = websocket.create_connection(target["webSocketDebuggerUrl"], timeout=30)
        letter = {
            "format": "letter",
            "title": "A letter to an old friend",
            "text": (
                "Hi Emma,\n\nIt was so lovely to receive your last letter. I was happy to hear about your new "
                "apartment and the little garden you have started.\n\nLife here has been busy, but in a good way. "
                "Last weekend, I went for a walk and thought of you."
            ),
            "recipient": "emma@example.com",
            "subject": "Greetings from Shanghai",
        }
        evaluate(socket, f"localStorage.setItem('enwrite-draft', {json.dumps(json.dumps(letter))}); location.reload();")
        time.sleep(2)
        evaluate(socket, "clearTimeout(completionTimer); if (completionRequest) completionRequest.abort(); clearTimeout(reviewTimer); if (reviewRequest) reviewRequest.abort(); modelThinking.classList.add('hidden'); saveStatus.textContent = 'Draft saved'; showSuggestion('\\n\\nI would love to hear how the garden is growing.', 'sentence');")
        capture(socket, "demo.png")
        evaluate(socket, "document.querySelector('#finishButton').click();")
        time.sleep(0.5)
        capture(socket, "demo-email.png")

        draft = {
            "format": "essay",
            "title": "Why Learning English Matters",
            "text": (
                "Nowadays, more and more people like learn English. I think learn English is very important, "
                "because it can let us know more friends and open our eyes. Although it is difficult, but we "
                "should insist to study it. Only in this way, our English can become better and better."
            ),
            "recipient": "",
            "subject": "",
        }
        evaluate(socket, f"localStorage.setItem('enwrite-draft', {json.dumps(json.dumps(draft))}); location.reload();")
        time.sleep(2)
        evaluate(socket, "clearTimeout(completionTimer); if (completionRequest) completionRequest.abort(); clearTimeout(reviewTimer); if (reviewRequest) reviewRequest.abort(); reviewDraft(true);")
        for _ in range(60):
            time.sleep(1)
            issue_count = evaluate(socket, "document.querySelectorAll('.review-issue').length") or 0
            if issue_count:
                break
        else:
            status = evaluate(socket, "document.querySelector('#reviewStatus').textContent") or "unknown"
            raise RuntimeError(f"Review did not render issues: {status}")
        time.sleep(1)
        evaluate(socket, "modelThinking.classList.add('hidden'); clearSuggestion(); autocompleteStatus.style.display = 'none'; suggestionBar.classList.add('hidden'); saveStatus.textContent = 'Draft saved';")
        time.sleep(0.3)
        capture(socket, "demo-chinese-logic.png")
        socket.close()
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()


if __name__ == "__main__":
    main()
