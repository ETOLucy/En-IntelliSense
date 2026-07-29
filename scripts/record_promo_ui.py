from __future__ import annotations

import argparse
import base64
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import requests

try:
    import websocket
except ModuleNotFoundError:
    sys.path.append(str(Path(sys.base_prefix) / "Lib" / "site-packages"))
    import websocket


ROOT = Path(__file__).resolve().parents[1]
WIDTH = 1920
HEIGHT = 1080
FPS = 20
DURATION = 19
BROWSER_CANDIDATES = (
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
)


def free_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return int(probe.getsockname()[1])


def cdp(connection, method: str, params: dict | None = None, request_id: list[int] = [0]):
    request_id[0] += 1
    current_id = request_id[0]
    connection.send(json.dumps({"id": current_id, "method": method, "params": params or {}}))
    while True:
        message = json.loads(connection.recv())
        if message.get("id") == current_id:
            if "error" in message:
                raise RuntimeError(message["error"])
            return message.get("result", {})


def evaluate(connection, expression: str):
    result = cdp(connection, "Runtime.evaluate", {"expression": expression, "returnByValue": True})
    if result.get("exceptionDetails"):
        raise RuntimeError(result["exceptionDetails"].get("text", "Browser evaluation failed"))
    return result.get("result", {}).get("value")


def wait_for_url(url: str) -> None:
    for _ in range(100):
        try:
            if requests.get(url, timeout=0.5).ok:
                return
        except requests.RequestException:
            pass
        time.sleep(0.1)
    raise RuntimeError(f"Local WriteMelo server did not start: {url}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Record a deterministic WriteMelo UI demonstration.")
    parser.add_argument("--ffmpeg", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("build/promo-video/ui-demo.mp4"))
    args = parser.parse_args()

    browser = next((candidate for candidate in BROWSER_CANDIDATES if candidate.exists()), None)
    if browser is None:
        raise FileNotFoundError("Microsoft Edge or Google Chrome is required.")

    output = args.output if args.output.is_absolute() else ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    server_port = free_port()
    debug_port = free_port()
    profile = tempfile.mkdtemp(prefix="writemelo-promo-")
    server_env = os.environ.copy()
    server_env["WRITEMELO_HOST"] = "127.0.0.1"
    server_env["WRITEMELO_PORT"] = str(server_port)
    server = subprocess.Popen(
        [str(Path(os.sys.executable)), str(ROOT / "server.py")],
        cwd=ROOT,
        env=server_env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    wait_for_url(f"http://127.0.0.1:{server_port}")

    edge = subprocess.Popen(
        [
            str(browser),
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--no-proxy-server",
            "--remote-allow-origins=*",
            "--remote-debugging-address=127.0.0.1",
            f"--remote-debugging-port={debug_port}",
            f"--user-data-dir={profile}",
            f"--window-size={WIDTH},{HEIGHT}",
            f"http://127.0.0.1:{server_port}",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    encoder = None
    connection = None
    try:
        target = None
        for _ in range(100):
            try:
                pages = requests.get(f"http://127.0.0.1:{debug_port}/json", timeout=0.5).json()
                target = next(
                    (page for page in pages if f"127.0.0.1:{server_port}" in page.get("url", "")),
                    None,
                )
                if target:
                    break
            except requests.RequestException:
                pass
            time.sleep(0.1)
        if not target:
            raise RuntimeError("Browser debugging endpoint did not start.")

        connection = websocket.create_connection(
            target["webSocketDebuggerUrl"],
            timeout=30,
            http_no_proxy=["localhost", "127.0.0.1"],
        )
        for _ in range(100):
            if evaluate(connection, "document.readyState === 'complete' && typeof applyUiLanguage === 'function'"):
                break
            time.sleep(0.1)
        else:
            raise RuntimeError("WriteMelo interface did not finish loading.")

        evaluate(
            connection,
            """
            storageSet('ui-language', 'zh-CN');
            storageSet('explanation-language', 'Chinese');
            applyUiLanguage('zh-CN');
            document.querySelector('#explanationLanguage').value = 'Chinese';
            document.querySelector('#format').value = 'letter';
            setFormat('letter', false);
            document.querySelector('#title').value = 'A letter to an old friend';
            document.querySelector('#recipient').value = 'friend@example.com';
            document.querySelector('#subject').value = 'Catching up';
            document.querySelector('#editor').value = '';
            clearSuggestion();
            reviewIssues = [];
            currentIntent = '';
            renderMirror();
            renderReview();
            updateStats();
            """,
        )

        encoder = subprocess.Popen(
            [
                str(args.ffmpeg.resolve()),
                "-y",
                "-f",
                "image2pipe",
                "-vcodec",
                "mjpeg",
                "-r",
                str(FPS),
                "-i",
                "-",
                "-f",
                "lavfi",
                "-t",
                str(DURATION),
                "-i",
                "anullsrc=r=48000:cl=stereo",
                "-c:v",
                "libx264",
                "-preset",
                "medium",
                "-crf",
                "18",
                "-vf",
                "scale=1920:-2,pad=1920:1080:0:(oh-ih)/2:color=0xF5F7F6",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-shortest",
                "-movflags",
                "+faststart",
                str(output.resolve()),
            ],
            stdin=subprocess.PIPE,
        )
        assert encoder.stdin is not None

        draft = (
            "Hi Emma,\n\n"
            "Long time no see. I am very happy to write this email to you. "
            "Recently I am preparing an English presentation. "
            "My teacher gave me many useful advices. I hope"
        )
        corrected = draft.replace("many useful advices", "a lot of useful advice")
        review_start = draft.index("many useful advices")
        review_end = review_start + len("many useful advices")

        for frame_index in range(DURATION * FPS):
            current = frame_index / FPS
            if 1.0 <= current < 6.0:
                progress = min(1.0, (current - 1.0) / 5.0)
                count = round(len(draft) * progress)
                evaluate(
                    connection,
                    f"""
                    editor.value = {json.dumps(draft[:count])};
                    renderMirror();
                    updateStats();
                    editor.scrollTop = editor.scrollHeight;
                    """,
                )
            elif 6.0 <= current < 7.6:
                evaluate(
                    connection,
                    """
                    showSuggestion(' to hear from you soon.', 'phrase');
                    document.querySelector('#suggestionBar').classList.remove('hidden');
                    """,
                )
            elif 7.6 <= current < 8.5:
                evaluate(
                    connection,
                    f"""
                    editor.value = {json.dumps(draft + " to hear from you soon.")};
                    clearSuggestion();
                    renderMirror();
                    updateStats();
                    """,
                )
            elif 8.5 <= current < 9.8:
                evaluate(
                    connection,
                    """
                    document.querySelector('#reviewDraft').disabled = true;
                    document.querySelector('#reviewStatus').textContent = '正在检查语境和表达……';
                    modelThinking.classList.remove('hidden');
                    """,
                )
            elif 9.8 <= current < 13.0:
                issue = {
                    "quote": "many useful advices",
                    "replacement": "a lot of useful advice",
                    "message": "Advice 是不可数名词，这样表达更自然。",
                    "category": "grammar",
                    "start": review_start,
                    "end": review_end,
                }
                evaluate(
                    connection,
                    f"""
                    modelThinking.classList.add('hidden');
                    document.querySelector('#reviewDraft').disabled = false;
                    currentIntent = '与老朋友叙旧，并请对方帮助检查英文展示。';
                    reviewIssues = [{json.dumps(issue, ensure_ascii=False)}];
                    renderMirror();
                    renderReview();
                    document.querySelector('#reviewStatus').textContent = '发现 1 处可改进内容。';
                    """,
                )
            elif 13.0 <= current < 14.3:
                evaluate(
                    connection,
                    f"""
                    editor.value = {json.dumps(corrected + " to hear from you soon.")};
                    reviewIssues = [];
                    renderMirror();
                    renderReview();
                    updateStats();
                    notify('已应用修改');
                    """,
                )
            elif 14.3 <= current < 18.0:
                evaluate(
                    connection,
                    """
                    document.querySelector('#settingsModal').classList.remove('hidden');
                    document.body.classList.add('modal-open');
                    document.querySelector('#modelBaseUrl').value = 'https://api.example.com';
                    document.querySelector('#modelApiKey').value = 'example-api-key';
                    document.querySelector('#modelName').value = 'example-model';
                    document.querySelector('#modelApiStyle').value = 'chat';
                    document.querySelector('#settingsStatus').textContent = '';
                    """,
                )
            elif current >= 18.0:
                evaluate(
                    connection,
                    """
                    document.querySelector('#settingsModal').classList.add('hidden');
                    document.body.classList.remove('modal-open');
                    """,
                )

            screenshot = cdp(
                connection,
                "Page.captureScreenshot",
                {
                    "format": "jpeg",
                    "quality": 88,
                    "captureBeyondViewport": False,
                    "fromSurface": True,
                },
            )
            encoder.stdin.write(base64.b64decode(screenshot["data"]))

        encoder.stdin.close()
        if encoder.wait() != 0:
            raise RuntimeError("FFmpeg failed to encode the UI recording.")
        print(output.resolve())
    finally:
        if connection:
            connection.close()
        if encoder and encoder.poll() is None:
            encoder.kill()
        edge.terminate()
        server.terminate()
        for process in (edge, server):
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    main()
