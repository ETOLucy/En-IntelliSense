import os
import json
import tempfile
import unittest
from base64 import urlsafe_b64encode
from pathlib import Path
from unittest.mock import Mock, patch

import server


class CompletionTests(unittest.TestCase):
    def make_handler(self):
        return object.__new__(server.WriteMeloHandler)

    def test_completion_punctuation_is_ascii_safe(self):
        self.assertEqual(server.normalize_completion_text("I’d say “hello”—soon…"), 'I\'d say "hello"-soon...')

    @patch("server.requests.post")
    def test_phrase_completion_parses_output_text(self, post):
        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {"output_text": "with you this weekend"}
        post.return_value = response
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key", "OPENAI_MODEL": "test-model", "OPENAI_AUTOCOMPLETE_MODEL": "test-model", "OPENAI_API_STYLE": "responses"}):
            result = self.make_handler().model_completion(
                {"level": "natural", "format": "letter", "audience": "friend", "tone": "warm"},
                "I would love to catch up ",
                "phrase",
            )
        self.assertEqual(result, "with you this weekend")
        payload = post.call_args.kwargs["json"]
        self.assertEqual(payload["model"], "test-model")
        self.assertIn("2 to 8 words", payload["instructions"])

    @patch("server.requests.post")
    def test_sentence_completion_parses_content_blocks(self, post):
        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {"output": [{"content": [{"type": "output_text", "text": "This helps us understand other perspectives."}]}]}
        post.return_value = response
        with patch.dict(os.environ, {
            "OPENAI_API_KEY": "test-key",
            "OPENAI_BASE_URL": "https://api.example.com/v1",
            "OPENAI_AUTOCOMPLETE_MODEL": "example-fast-model",
            "OPENAI_API_STYLE": "responses",
        }):
            result = self.make_handler().model_completion({}, "Learning a language matters.", "sentence")
        self.assertEqual(result, " This helps us understand other perspectives.")

    @patch("server.requests.post")
    def test_falls_back_to_chat_completions(self, post):
        failed = Mock(ok=False)
        successful = Mock(ok=True)
        successful.raise_for_status.return_value = None
        successful.json.return_value = {"choices": [{"message": {"content": "onderful"}}]}
        post.side_effect = [failed, successful]
        with patch.dict(os.environ, {
            "OPENAI_API_KEY": "test-key",
            "OPENAI_BASE_URL": "https://api.example.com/v1",
            "OPENAI_AUTOCOMPLETE_MODEL": "example-fast-model",
            "OPENAI_API_STYLE": "responses",
        }):
            result = self.make_handler().model_completion({}, "That was w", "word")
        self.assertEqual(result, "onderful")
        self.assertTrue(post.call_args_list[1].args[0].endswith("/chat/completions"))

    @patch("server.requests.post")
    def test_subject_polish_returns_structured_suggestions(self, post):
        response = Mock(ok=True)
        response.raise_for_status.return_value = None
        response.json.return_value = {"choices": [{"message": {"content": '{"suggestions":[{"text":"How Have You Been Lately?","meaning":"最近过得怎么样？","tone":"自然亲切"}]}'}}]}
        post.return_value = response
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            result = self.make_handler().model_assist({"action": "polish_subject", "text": "How's it going?", "context": "Hi!"})
        self.assertEqual(result["suggestions"][0]["text"], "How Have You Been Lately?")

    @patch("server.requests.post")
    def test_chat_includes_draft_and_selection(self, post):
        response = Mock(ok=True)
        response.raise_for_status.return_value = None
        response.json.return_value = {"choices": [{"message": {"content": "这句话语气亲切。"}}]}
        post.return_value = response
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            result = self.make_handler().model_chat({"message": "语气怎么样？", "context": "How have you been?", "selection": "have you been"})
        self.assertEqual(result, "这句话语气亲切。")
        prompt = post.call_args.kwargs["json"]["messages"][1]["content"]
        self.assertIn("How have you been?", prompt)
        self.assertIn("have you been", prompt)

    @patch("server.requests.post")
    def test_body_polish_returns_alternatives(self, post):
        response = Mock(ok=True)
        response.raise_for_status.return_value = None
        response.json.return_value = {"choices": [{"message": {"content": '{"suggestions":[{"text":"I would love to hear how you have been.","meaning":"我很想知道你最近过得怎么样。","tone":"自然亲切"}]}'}}]}
        post.return_value = response
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            result = self.make_handler().model_assist({"action": "polish_text", "text": "I want know recent how", "context": "Hi Ayna", "level": "simple"})
        self.assertEqual(result["suggestions"][0]["text"], "I would love to hear how you have been.")

    @patch("server.requests.post")
    def test_review_keeps_only_issues_that_map_to_source(self, post):
        response = Mock(ok=True)
        response.raise_for_status.return_value = None
        response.json.return_value = {"choices": [{"message": {"content": '{"intent":"ask about a friend","issues":[{"quote":"I very like it","replacement":"I really like it","message":"word order","category":"grammar","severity":"warning"},{"quote":"missing text","replacement":"fixed","message":"not in source","category":"clarity","severity":"suggestion"}]}'}}]}
        post.return_value = response
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            result = self.make_handler().model_review({"text": "I very like it", "level": "simple", "format": "message"})
        self.assertEqual(result["intent"], "ask about a friend")
        self.assertEqual(len(result["issues"]), 1)
        self.assertEqual(result["issues"][0]["replacement"], "I really like it")

    @patch("server.time.sleep")
    @patch("server.requests.post")
    def test_model_request_retries_connection_reset(self, post, sleep):
        response = Mock(status_code=200)
        post.side_effect = [server.requests.ConnectionError("connection reset"), response]
        result = self.make_handler().model_post("https://example.test", timeout=1)
        self.assertIs(result, response)
        self.assertEqual(post.call_count, 2)
        sleep.assert_called_once()


class ModelConfigTests(unittest.TestCase):
    def test_rejects_insecure_remote_provider_url(self):
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            server.validate_model_config({
                "base_url": "http://example.com/v1",
                "model": "chat-model",
                "autocomplete_model": "fast-model",
                "api_style": "chat",
            })

    def test_saves_protected_key_and_applies_config(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch.object(server, "USER_CONFIG_ROOT", root), patch.object(server, "USER_CONFIG_PATH", root / "config.json"), patch.object(server, "protect_secret", return_value="protected-value"):
                with patch.dict(os.environ, {}, clear=True):
                    result = server.save_user_config({
                        "base_url": "https://provider.example/v1",
                        "api_key": "private-key",
                        "model": "chat-model",
                        "autocomplete_model": "fast-model",
                        "api_style": "responses",
                    })
                    stored = json.loads((root / "config.json").read_text(encoding="utf-8"))
                    applied_model = os.environ["OPENAI_MODEL"]
        self.assertNotIn("private-key", json.dumps(stored))
        self.assertEqual(stored["api_key_protected"], "protected-value")
        self.assertTrue(result["configured"])
        self.assertEqual(applied_model, "chat-model")

    @patch("server.requests.post")
    def test_connection_test_uses_entered_settings(self, post):
        response = Mock()
        response.raise_for_status.return_value = None
        post.return_value = response
        result = object.__new__(server.WriteMeloHandler).test_model_config({
            "base_url": "https://provider.example/v1",
            "api_key": "test-key",
            "model": "chat-model",
            "autocomplete_model": "fast-model",
            "api_style": "chat",
        })
        self.assertTrue(result["ok"])
        self.assertEqual(post.call_args.args[0], "https://provider.example/v1/chat/completions")
        self.assertEqual(post.call_args.kwargs["json"]["model"], "chat-model")

    def test_first_release_rejects_subscription_mode(self):
        with self.assertRaisesRegex(ValueError, "only your own API key"):
            server.validate_model_config({"provider_mode": "hosted"})


class StorageIsolationTests(unittest.TestCase):
    def test_migrates_legacy_config_without_removing_source(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            legacy_path = root / "En-IntelliSense" / "config.json"
            current_path = root / "WriteMelo" / "config.json"
            legacy_path.parent.mkdir()
            legacy_path.write_text('{"provider_mode":"byok","model":"example-model"}', encoding="utf-8")
            with (
                patch.object(server, "USER_CONFIG_ROOT", current_path.parent),
                patch.object(server, "USER_CONFIG_PATH", current_path),
                patch.object(server, "LEGACY_USER_CONFIG_PATH", legacy_path),
            ):
                server.migrate_legacy_user_config()
            self.assertEqual(
                json.loads(current_path.read_text(encoding="utf-8"))["model"],
                "example-model",
            )
            self.assertTrue(legacy_path.exists())

    def test_local_profiles_have_different_stable_scopes(self):
        with patch.object(server, "read_user_config", return_value={"device_id": "device-a"}):
            first = server.storage_scope()
            self.assertEqual(first, server.storage_scope())
        with patch.object(server, "read_user_config", return_value={"device_id": "device-b"}):
            second = server.storage_scope()
        self.assertNotEqual(first, second)

    def test_byok_scope_does_not_expose_windows_username(self):
        with patch.dict(os.environ, {
            "ENWRITE_PROVIDER_MODE": "byok",
            "USERDOMAIN": "EXAMPLE",
            "USERNAME": "private-user",
        }, clear=True), patch.object(server, "read_user_config", return_value={}):
            scope = server.storage_scope()
        self.assertRegex(scope, r"^[0-9a-f]{24}$")
        self.assertNotIn("private-user", scope)


class LocalRequestSecurityTests(unittest.TestCase):
    def handler_with_headers(self, headers):
        handler = object.__new__(server.WriteMeloHandler)
        handler.headers = headers
        return handler

    def test_accepts_loopback_host_and_origin(self):
        handler = self.handler_with_headers({
            "Host": "127.0.0.1:8000",
            "Origin": "http://127.0.0.1:8000",
        })
        self.assertTrue(handler.trusted_local_request())

    def test_rejects_non_loopback_host_or_origin(self):
        self.assertFalse(self.handler_with_headers({"Host": "example.com"}).trusted_local_request())
        self.assertFalse(self.handler_with_headers({
            "Host": "127.0.0.1:8000",
            "Origin": "https://example.com",
        }).trusted_local_request())


if __name__ == "__main__":
    unittest.main()
