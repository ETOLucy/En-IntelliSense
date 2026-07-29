import base64
import json
import socket as net_socket
import subprocess
import tempfile
import time
from pathlib import Path

import requests
import websocket


root = Path(__file__).resolve().parents[1]
with net_socket.socket() as port_probe:
    port_probe.bind(("127.0.0.1", 0))
    port = port_probe.getsockname()[1]
chrome = subprocess.Popen([
    r"C:\Program Files\Google\Chrome\Application\chrome.exe", "--headless=new", "--disable-gpu", "--hide-scrollbars",
    "--remote-allow-origins=*", f"--remote-debugging-port={port}", f"--user-data-dir={tempfile.mkdtemp(prefix='writemelo-ui-')}",
    "--window-size=1440,1000", "http://127.0.0.1:8000",
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def command(socket, command_id, method, params=None):
    socket.send(json.dumps({"id": command_id, "method": method, "params": params or {}}))
    deadline = time.monotonic() + 15
    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise RuntimeError(f"Browser command timed out: {method}")
        socket.settimeout(remaining)
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
    evaluate(socket, 1, "localStorage.removeItem('enwrite-draft'); localStorage.removeItem('enwrite-finished');")
    time.sleep(1)
    if not evaluate(socket, 101, """(() => {
        document.querySelector('#settingsButton').click();
        const byokReady = !document.querySelector('#byokProviderFields').classList.contains('hidden')
            && document.querySelector('#modelBaseUrl').required
            && document.querySelector('#modelName').required
            && document.querySelector('#modelApiKey').type === 'password';
        const examplesOnly = document.querySelector('#modelBaseUrl').value === ''
            && document.querySelector('#modelBaseUrl').placeholder === 'https://api.example.com'
            && document.querySelector('#modelName').placeholder === 'example-model';
        const subscriptionRemoved = !document.querySelector('#subscriptionToken')
            && !document.querySelector('[data-plan-choice]');
        return byokReady && examplesOnly && subscriptionRemoved;
    })()"""):
        raise RuntimeError("First-run model settings did not open with the required fields")
    if not evaluate(socket, 108, """(() => {
        localStorage.setItem('enwrite:user:local:ui-language', 'zh-CN');
        document.querySelector('#preferencesButton').click();
        document.querySelector('#uiLanguage').value = 'zh-CN';
        document.querySelector('#preferencesForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        return document.querySelector('#format option:checked').textContent === '信件或邮件'
            && document.querySelector('[data-level="natural"]').textContent === '自然'
            && document.querySelector('[data-completion="auto"]').textContent === '自动'
            && document.querySelector('#tone option:checked').textContent === '热情友好'
            && document.querySelector('[data-i18n="writing_flow"]').textContent === '行文流畅度'
            && document.querySelector('[data-i18n="useful_phrases"]').textContent === '实用短语';
    })()"""):
        raise RuntimeError("Chinese interface details were not translated")
    settings_screenshot = command(socket, 102, "Page.captureScreenshot", {"format": "png"})
    (root / "settings-ui-check.png").write_bytes(base64.b64decode(settings_screenshot["data"]))
    command(socket, 103, "Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": True})
    if not evaluate(socket, 104, "(() => { const box = document.querySelector('.settings-dialog').getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight; })()"):
        raise RuntimeError("Plans and AI service overflow the mobile viewport")
    command(socket, 105, "Emulation.clearDeviceMetricsOverride")
    evaluate(socket, 106, "document.querySelector('#closeSettings').click();")
    if not evaluate(socket, 107, "document.querySelector('#settingsModal').classList.contains('hidden')"):
        raise RuntimeError("Plans and AI service did not close")
    evaluate(socket, 2, "document.querySelector('#closeCoach').click();")
    if not evaluate(socket, 3, "document.querySelector('#writingCoach').classList.contains('closed') && document.body.classList.contains('coach-closed') && document.querySelector('#coachToggle').getAttribute('aria-expanded') === 'false'"):
        raise RuntimeError("Writing coach did not close")
    evaluate(socket, 4, "document.querySelector('#coachToggle').click(); document.querySelector('#moreButton').click();")
    if not evaluate(socket, 5, "!document.querySelector('#writingCoach').classList.contains('closed') && !document.querySelector('#documentMenu').classList.contains('hidden') && document.querySelectorAll('#documentMenu [data-doc-action]').length === 7 && document.querySelectorAll('#documentMenu [data-desktop-file]:not(.hidden)').length === 0"):
        raise RuntimeError("Document menu actions are incomplete")
    evaluate(socket, 6, "document.querySelector('#moreButton').click(); document.querySelector('#finishButton').click();")
    if not evaluate(socket, 7, "!document.querySelector('#emailModal').classList.contains('hidden') && document.querySelector('#emailRecipientInput').type === 'email' && document.querySelector('#openDefaultEmail') && document.querySelectorAll('[data-email-provider]').length === 0 && document.querySelector('label[for=\"emailRecipientInput\"]').textContent.includes('To')"):
        raise RuntimeError("Email handoff did not open")
    email_screenshot = command(socket, 100, "Page.captureScreenshot", {"format": "png"})
    (root / "email-ui-check.png").write_bytes(base64.b64decode(email_screenshot["data"]))
    evaluate(socket, 8, "window.pywebview = { api: { open_external: async url => { window.__openedEmailUrl = url; return { ok: true }; } } }; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: text => { window.__copiedEmail = text; return Promise.resolve(); } } }); document.querySelector('#openDefaultEmail').click();")
    time.sleep(.2)
    if not evaluate(socket, 9, "window.__openedEmailUrl.startsWith('mailto:emma%40example.com') && window.__openedEmailUrl.includes('subject=Greetings%20from%20Shanghai') && window.__copiedEmail.includes('To: emma@example.com') && window.__copiedEmail.includes('Subject: Greetings from Shanghai') && window.__copiedEmail.includes('It was so lovely') && document.querySelector('#emailModal').classList.contains('hidden')"):
        raise RuntimeError("Default email handoff did not copy and open the message")
    evaluate(socket, 14, "localStorage.removeItem('enwrite-finished'); document.querySelector('#format').value = 'essay'; document.querySelector('#format').dispatchEvent(new Event('change')); document.querySelector('#finishButton').click();")
    if not evaluate(socket, 15, "!document.querySelector('#finishedView').classList.contains('hidden') && document.querySelector('#finishedCount').textContent === '1' && document.querySelectorAll('.finished-item').length === 1"):
        raise RuntimeError("Finishing a document did not open the archive")
    evaluate(socket, 16, "document.querySelector('#draftsNav').click();")
    if not evaluate(socket, 17, "!document.querySelector('#composeView').classList.contains('hidden') && document.querySelector('#draftsNav').classList.contains('active')"):
        raise RuntimeError("Drafts navigation did not return to the editor")
    evaluate(socket, 18, "document.querySelector('#finishedNav').click();")
    if not evaluate(socket, 19, "document.querySelector('#finishedNav').classList.contains('active') && !document.querySelector('#finishedView').classList.contains('hidden')"):
        raise RuntimeError("Finished navigation did not open the archive")
    screenshot = command(socket, 20, "Page.captureScreenshot", {"format": "png"})
    evaluate(socket, 21, "document.querySelector('[data-finished-action=\"edit\"]').click();")
    if not evaluate(socket, 22, "document.querySelector('#draftsNav').classList.contains('active') && document.querySelector('#editor').value.includes('Learning a new language')"):
        raise RuntimeError("Editing a finished copy did not restore the document")
    evaluate(socket, 23, "document.querySelector('#finishedNav').click(); window.confirm = () => true; document.querySelector('[data-finished-action=\"delete\"]').click();")
    if not evaluate(socket, 24, "document.querySelector('#finishedCount').textContent === '0' && document.querySelectorAll('.finished-item').length === 0"):
        raise RuntimeError("Deleting a finished document did not update the archive")
    (root / "ui-check.png").write_bytes(base64.b64decode(screenshot["data"]))
    socket.close()
    print("UI checks passed")
finally:
    chrome.terminate()
