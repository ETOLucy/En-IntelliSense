import json
import os
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import requests


ROOT = Path(__file__).resolve().parent
HOST = os.getenv("ENWRITE_HOST", "127.0.0.1")
PORT = int(os.getenv("ENWRITE_PORT", "8000"))


def load_dotenv():
    path = ROOT / ".env"
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def responses_url(base_url):
    base = base_url.rstrip("/")
    if base.endswith("/responses"):
        return base
    if base.endswith("/v1"):
        return f"{base}/responses"
    return f"{base}/v1/responses"


def normalize_completion_text(text):
    return text.translate(str.maketrans({"’": "'", "‘": "'", "“": '"', "”": '"', "–": "-", "—": "-", "…": "..."}))


load_dotenv()


class EnWriteHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".css": "text/css"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        try:
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
            return

    def do_GET(self):
        if self.path == "/api/status":
            self.send_json(200, {
                "configured": bool(os.getenv("OPENAI_API_KEY")),
                "model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
                "autocomplete_model": os.getenv("OPENAI_AUTOCOMPLETE_MODEL", "gpt-5.4-mini"),
            })
            return
        super().do_GET()

    def do_POST(self):
        if self.path not in {"/api/complete", "/api/complete-stream", "/api/assist", "/api/chat", "/api/review"}:
            self.send_json(404, {"error": "Not found"})
            return

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            self.send_json(503, {"error": "OPENAI_API_KEY is not configured"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 20_000:
                raise ValueError("Invalid request size")
            request_data = json.loads(self.rfile.read(length))
            if self.path == "/api/review":
                result = self.model_review(request_data)
                self.send_json(200, result)
                return
            if self.path == "/api/chat":
                reply = self.model_chat(request_data)
                self.send_json(200, {"reply": reply})
                return
            if self.path == "/api/assist":
                result = self.model_assist(request_data)
                self.send_json(200, result)
                return
            text = str(request_data.get("text", ""))[-6000:]
            mode = request_data.get("mode", "phrase")
            if mode not in {"word", "phrase", "sentence"} or not text.strip():
                raise ValueError("Invalid completion request")
            if self.path == "/api/complete-stream":
                self.stream_completion(request_data, text, mode)
                return
            suggestion = self.model_completion(request_data, text, mode)
            self.send_json(200, {"suggestion": suggestion, "kind": mode})
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
        except requests.HTTPError as error:
            detail = error.response.text[:500] if error.response is not None else ""
            status = error.response.status_code if error.response is not None else "unknown"
            self.send_json(502, {"error": f"Model API returned {status}", "detail": detail})
        except requests.RequestException as error:
            print(f"Model connection failed after retries: {error}")
            self.send_json(502, {"error": "Model connection was interrupted after automatic retries. Please try again."})
        except Exception as error:
            self.send_json(500, {"error": f"Completion failed: {error}"})

    def model_review(self, request_data):
        text = str(request_data.get("text", "")).strip()[:7000]
        level = request_data.get("level", "natural")
        writing_format = request_data.get("format", "letter")
        audience = request_data.get("audience", "general reader")
        tone = request_data.get("tone", "natural")
        if not text:
            raise ValueError("Draft cannot be empty")
        instructions = (
            "You review English writing for a Chinese learner. Infer the writer's communicative intent from the whole draft, then identify only real, useful issues: "
            "grammar, awkward collocation, repetition, unclear meaning, or tone mismatch. Do not overcorrect acceptable personal style. "
            "Return valid JSON only: {\"intent\":\"one concise Chinese sentence\",\"issues\":[{\"quote\":\"exact substring copied from draft\","
            "\"replacement\":\"improved English\",\"message\":\"concise Chinese explanation\",\"category\":\"grammar|clarity|wording|repetition|tone\",\"severity\":\"warning|suggestion\"}]}. "
            "Return at most 5 non-overlapping issues. Every quote must exactly match the draft."
        )
        prompt = f"Format: {writing_format}\nAudience: {audience}\nDesired tone: {tone}\nLearner level: {level}\nDraft:\n{text}"
        output = self.chat_text(instructions, prompt, 700)
        cleaned = output.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError:
            result = {"intent": "", "issues": []}
        result.setdefault("intent", "")
        result.setdefault("issues", [])
        result["issues"] = [
            issue for issue in result["issues"]
            if isinstance(issue, dict)
            and str(issue.get("quote", "")) in text
            and str(issue.get("replacement", "")).strip()
            and issue.get("replacement") != issue.get("quote")
        ][:5]
        return result

    def model_chat(self, request_data):
        message = str(request_data.get("message", "")).strip()[:2000]
        context = str(request_data.get("context", ""))[-5000:]
        selection = str(request_data.get("selection", ""))[:2000]
        history = request_data.get("history", [])[-8:]
        if not message:
            raise ValueError("Message cannot be empty")
        transcript = "\n".join(
            f"{item.get('role', 'user')}: {str(item.get('content', ''))[:1000]}"
            for item in history if isinstance(item, dict)
        )
        instructions = (
            "You are En-IntelliSense's bilingual English writing tutor. Help a Chinese learner understand and improve their own writing. "
            "Reply primarily in concise Chinese, keeping English examples where useful. Explain tone and nuance plainly, adapt to the learner, "
            "and never replace their whole draft unless asked. When suggesting English, give an immediately usable version."
        )
        prompt = f"Current draft:\n{context}\n\nSelected text:\n{selection or '(none)'}\n\nRecent conversation:\n{transcript or '(none)'}\n\nLearner: {message}"
        return self.chat_text(instructions, prompt, 500).strip()

    def model_assist(self, request_data):
        action = request_data.get("action")
        text = str(request_data.get("text", "")).strip()[:6000]
        context = str(request_data.get("context", ""))[-3000:]
        level = request_data.get("level", "natural")
        if action == "polish_subject":
            if not text:
                raise ValueError("Add a subject first")
            instructions = (
                "You help a Chinese learner write a friendly English letter subject. "
                "Return valid JSON only: {\"suggestions\":[{\"text\":\"...\",\"meaning\":\"Chinese meaning\",\"tone\":\"short Chinese tone note\"}]}. "
                "Give exactly 3 natural subjects, each under 8 words. Every suggestion must differ meaningfully from the current subject. "
                "Preserve the user's intended meaning and avoid marketing language."
            )
            prompt = f"Current subject: {text}\nLetter context: {context}"
        elif action == "polish_text":
            if not text:
                raise ValueError("Select or place the cursor in some text first")
            instructions = (
                "You help a Chinese learner polish one piece of English writing. Return valid JSON only: "
                "{\"suggestions\":[{\"text\":\"...\",\"meaning\":\"Chinese meaning\",\"tone\":\"short Chinese note about tone and difference\"}]}. "
                "Give exactly 3 alternatives: clear and simple, natural and friendly, and slightly more expressive. Preserve the original meaning. "
                f"Keep every version appropriate for a {level} English learner and do not make it unnecessarily difficult."
            )
            prompt = f"Text to polish:\n{text}\n\nNearby draft context:\n{context}"
        elif action in {"explain", "simplify"}:
            if not text:
                raise ValueError("Select or place the cursor in some text first")
            instructions = (
                "You are a patient bilingual English writing tutor for a Chinese learner. Return valid JSON only with keys "
                "translation, explanation, simpler. translation is an accurate natural Chinese translation. explanation is concise Chinese explaining "
                "the useful phrase, tone, or grammar. simpler is a clear English rewrite that keeps the original meaning. "
                f"The learner's target level is {level}."
            )
            prompt = f"Explain and simplify this English text:\n{text}"
        else:
            raise ValueError("Invalid assist action")

        output = self.chat_text(instructions, prompt, 350)
        cleaned = output.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError:
            result = {"translation": "", "explanation": output, "simpler": text}
        result["source"] = text
        return result

    def chat_text(self, instructions, prompt, max_tokens=120):
        base_url = os.getenv("OPENAI_BASE_URL") or os.getenv("OPENAI_API_BASE") or "https://api.openai.com"
        chat_url = responses_url(base_url).removesuffix("/responses") + "/chat/completions"
        response = self.model_post(chat_url, json={
            "model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            "messages": [{"role": "system", "content": instructions}, {"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "stream": False,
        }, timeout=30, headers=self.model_headers())
        response.raise_for_status()
        return response.json().get("choices", [{}])[0].get("message", {}).get("content", "")

    def model_headers(self):
        return {"Authorization": f"Bearer {api_key_value()}", "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Mozilla/5.0 En-IntelliSense/1.0"}

    def model_post(self, url, **kwargs):
        last_error = None
        for attempt in range(3):
            try:
                response = requests.post(url, **kwargs)
                if response.status_code not in {429, 500, 502, 503, 504} or attempt == 2:
                    return response
            except (requests.ConnectionError, requests.Timeout) as error:
                last_error = error
                if attempt == 2:
                    raise
            time.sleep(0.35 * (2 ** attempt))
        if last_error:
            raise last_error
        return response

    def model_completion(self, request_data, text, mode):
        level = request_data.get("level", "natural")
        writing_format = request_data.get("format", "letter")
        audience = request_data.get("audience", "friend")
        tone = request_data.get("tone", "warm")
        intent = str(request_data.get("intent", "")).strip()[:500]
        limit = {"word": "the remaining letters of the current word only", "phrase": "2 to 8 words", "sentence": "one sentence, at most 24 words"}[mode]
        instructions = (
            "You are an inline English writing autocomplete engine. Continue the user's text, never answer or discuss it. "
            f"Return only the exact continuation ({limit}), with no quotes, label, or explanation. "
            "The continuation must connect grammatically to the final characters. Do not repeat existing text. "
            f"Use {level} English, a {tone} tone, and suit a {writing_format} for a {audience}. "
            f"Infer what the writer is trying to say from the entire text and continue that intent coherently. Known intent: {intent or 'infer it yourself'}."
        )
        responses_payload = {
            "model": os.getenv("OPENAI_AUTOCOMPLETE_MODEL", "gpt-5.4-mini"),
            "instructions": instructions,
            "input": f"Text to continue:\n{text}",
            "max_output_tokens": 60,
        }
        base_url = os.getenv("OPENAI_BASE_URL") or os.getenv("OPENAI_API_BASE") or "https://api.openai.com"
        headers = self.model_headers()
        api_style = os.getenv("OPENAI_API_STYLE", "chat").lower()
        response = self.model_post(responses_url(base_url), json=responses_payload, timeout=20, headers=headers) if api_style == "responses" else None
        if response is not None and response.ok:
            data = response.json()
            output = data.get("output_text", "") or "".join(
                item.get("text", "")
                for block in data.get("output", [])
                for item in block.get("content", [])
                if item.get("type") == "output_text"
            )
        else:
            chat_url = responses_url(base_url).removesuffix("/responses") + "/chat/completions"
            response = self.model_post(chat_url, json={
                "model": os.getenv("OPENAI_AUTOCOMPLETE_MODEL", "gpt-5.4-mini"),
                "messages": [
                    {"role": "system", "content": instructions},
                    {"role": "user", "content": f"Text to continue:\n{text}"},
                ],
                "max_tokens": 60,
                "stream": False,
            }, timeout=20, headers=headers)
            response.raise_for_status()
            output = response.json().get("choices", [{}])[0].get("message", {}).get("content", "")
        output = normalize_completion_text(output.strip().strip('"').replace("\n", " "))
        if not output:
            raise RuntimeError("Model returned an empty completion")
        if mode != "word" and text and not text[-1].isspace() and output and output[0].isalnum():
            output = " " + output
        return output

    def stream_completion(self, request_data, text, mode):
        level = request_data.get("level", "natural")
        writing_format = request_data.get("format", "letter")
        audience = request_data.get("audience", "friend")
        tone = request_data.get("tone", "warm")
        intent = str(request_data.get("intent", "")).strip()[:500]
        limit = "2 to 8 words" if mode == "phrase" else "one sentence, at most 24 words"
        instructions = (
            "You are an inline English writing autocomplete engine. Continue the user's text, never answer or discuss it. "
            f"Return only the exact continuation ({limit}), with no quotes, label, or explanation. "
            "Connect grammatically to the final characters and do not repeat existing text. "
            f"Use {level} English, a {tone} tone, and suit a {writing_format} for a {audience}. "
            f"Infer the writer's intention from the full text and continue coherently. Known intent: {intent or 'infer it yourself'}."
        )
        base_url = os.getenv("OPENAI_BASE_URL") or os.getenv("OPENAI_API_BASE") or "https://api.openai.com"
        chat_url = responses_url(base_url).removesuffix("/responses") + "/chat/completions"
        response = self.model_post(chat_url, json={
            "model": os.getenv("OPENAI_AUTOCOMPLETE_MODEL", "gpt-5.4-mini"),
            "messages": [{"role": "system", "content": instructions}, {"role": "user", "content": f"Text to continue:\n{text}"}],
            "max_tokens": 60,
            "stream": True,
        }, timeout=30, headers=self.model_headers(), stream=True)
        response.raise_for_status()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        started = False
        for raw_line in response.iter_lines(decode_unicode=False):
            if not raw_line:
                continue
            try:
                line = raw_line.decode("utf-8")
            except UnicodeDecodeError:
                continue
            if not line.startswith("data:"):
                continue
            data_text = line[5:].strip()
            if data_text == "[DONE]":
                break
            try:
                data = json.loads(data_text)
                delta = normalize_completion_text(data.get("choices", [{}])[0].get("delta", {}).get("content", "") or "")
            except (json.JSONDecodeError, IndexError, AttributeError):
                continue
            if not delta:
                continue
            if not started:
                delta = delta.lstrip().strip('"')
                if text and not text[-1].isspace() and delta and delta[0].isalnum():
                    delta = " " + delta
                started = True
            self.wfile.write(delta.encode("utf-8"))
            self.wfile.flush()

    def log_message(self, fmt, *args):
        print(f"{self.address_string()} - {fmt % args}")


def api_key_value():
    return os.environ["OPENAI_API_KEY"]


if __name__ == "__main__":
    print(f"En-IntelliSense running at http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), EnWriteHandler).serve_forever()
