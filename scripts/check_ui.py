import base64
import json
import subprocess
import tempfile
import time
from pathlib import Path

import requests
import websocket


root = Path(__file__).resolve().parents[1]
port = 9224
chrome = subprocess.Popen([
    r"C:\Program Files\Google\Chrome\Application\chrome.exe", "--headless=new", "--disable-gpu", "--hide-scrollbars",
    "--remote-allow-origins=*", f"--remote-debugging-port={port}", f"--user-data-dir={tempfile.mkdtemp(prefix='en-intellisense-ui-')}",
    "--window-size=1440,1000", "http://127.0.0.1:8000",
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def command(socket, command_id, method, params=None):
    socket.send(json.dumps({"id": command_id, "method": method, "params": params or {}}))
    while True:
        message = json.loads(socket.recv())
        if message.get("id") == command_id:
            if "error" in message:
                raise RuntimeError(message["error"])
            return message.get("result", {})


def evaluate(socket, command_id, expression):
    result = command(socket, command_id, "Runtime.evaluate", {"expression": expression, "returnByValue": True})
    if result.get("exceptionDetails"):
        raise RuntimeError(result["exceptionDetails"].get("text", "Browser evaluation failed"))
    return result.get("result", {}).get("value")


try:
    target = None
    for _ in range(50):
        try:
            pages = requests.get(f"http://127.0.0.1:{port}/json", timeout=1).json()
            target = next((page for page in pages if "127.0.0.1:8000" in page.get("url", "")), None)
            if target:
                break
        except requests.RequestException:
            time.sleep(.2)
    if not target:
        raise RuntimeError("Application tab did not open")
    socket = websocket.create_connection(target["webSocketDebuggerUrl"], timeout=20)
    evaluate(socket, 1, "localStorage.removeItem('enwrite-draft'); location.reload();")
    time.sleep(2)
    evaluate(socket, 2, "document.querySelector('#moreButton').click();")
    if not evaluate(socket, 3, "!document.querySelector('#documentMenu').classList.contains('hidden') && document.querySelectorAll('#documentMenu [data-doc-action]').length === 4"):
        raise RuntimeError("Document menu actions are incomplete")
    evaluate(socket, 4, "document.querySelector('#moreButton').click(); document.querySelector('#finishButton').click();")
    if not evaluate(socket, 5, "!document.querySelector('#emailModal').classList.contains('hidden') && document.querySelector('#emailRecipientInput').type === 'email'"):
        raise RuntimeError("Editable email chooser did not open")
    screenshot = command(socket, 6, "Page.captureScreenshot", {"format": "png"})
    (root / "ui-check.png").write_bytes(base64.b64decode(screenshot["data"]))
    socket.close()
    print("UI checks passed")
finally:
    chrome.terminate()
