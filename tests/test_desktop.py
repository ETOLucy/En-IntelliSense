import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch


fake_webview = types.SimpleNamespace(OPEN_DIALOG="open", SAVE_DIALOG="save")
with patch.dict(sys.modules, {"webview": fake_webview}):
    import desktop


class FakeWindow:
    def __init__(self, selections):
        self.selections = list(selections)

    def create_file_dialog(self, *_args, **_kwargs):
        return self.selections.pop(0)


class DocumentApiTests(unittest.TestCase):
    def test_opens_utf8_text_and_saves_atomically(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "draft.md"
            path.write_text("Hello world", encoding="utf-8")
            api = desktop.DocumentApi()
            api.attach_window(FakeWindow([[str(path)]]))
            opened = api.open_document()
            self.assertTrue(opened["ok"])
            self.assertEqual(opened["text"], "Hello world")
            saved = api.save_document("Updated text")
            self.assertTrue(saved["ok"])
            self.assertEqual(path.read_text(encoding="utf-8"), "Updated text")

    def test_detects_external_change_before_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "draft.txt"
            path.write_text("Original", encoding="utf-8")
            api = desktop.DocumentApi()
            api.attach_window(FakeWindow([[str(path)]]))
            api.open_document()
            path.write_text("Changed elsewhere and longer", encoding="utf-8")
            conflict = api.save_document("My edit")
            self.assertTrue(conflict["conflict"])
            self.assertEqual(path.read_text(encoding="utf-8"), "Changed elsewhere and longer")
            forced = api.save_document("My edit", force=True)
            self.assertTrue(forced["ok"])
            self.assertEqual(path.read_text(encoding="utf-8"), "My edit")

    def test_save_as_uses_selected_text_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "new-draft.md"
            api = desktop.DocumentApi()
            api.attach_window(FakeWindow([str(path)]))
            result = api.save_document("# Draft", "Draft.md", save_as=True)
            self.assertTrue(result["ok"])
            self.assertEqual(path.read_text(encoding="utf-8"), "# Draft")

    def test_bridge_does_not_expose_window_or_mutable_state(self):
        api = desktop.DocumentApi()
        api.attach_window(FakeWindow([]))
        public_state = [name for name in vars(api) if not name.startswith("_")]
        self.assertEqual(public_state, [])


if __name__ == "__main__":
    unittest.main()
