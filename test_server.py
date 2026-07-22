import os
import unittest
from unittest.mock import Mock, patch

import server


class CompletionTests(unittest.TestCase):
    def make_handler(self):
        return object.__new__(server.EnWriteHandler)

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
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key", "OPENAI_API_STYLE": "responses"}):
            result = self.make_handler().model_completion({}, "Learning a language matters.", "sentence")
        self.assertEqual(result, " This helps us understand other perspectives.")

    @patch("server.requests.post")
    def test_falls_back_to_chat_completions(self, post):
        failed = Mock(ok=False)
        successful = Mock(ok=True)
        successful.raise_for_status.return_value = None
        successful.json.return_value = {"choices": [{"message": {"content": "onderful"}}]}
        post.side_effect = [failed, successful]
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key", "OPENAI_API_STYLE": "responses"}):
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


if __name__ == "__main__":
    unittest.main()
