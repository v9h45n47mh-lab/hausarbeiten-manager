"""Verify pinned frontend assets and directory delivery without a running HA instance."""
import ast
import hashlib
import json
from pathlib import Path
import unittest

COMPONENT = Path(__file__).resolve().parents[1] / 'custom_components' / 'hausarbeiten_manager'
FRONTEND = COMPONENT / 'frontend'

class UIKitTests(unittest.TestCase):
    def test_vendored_release_checksums(self):
        lock = json.loads((FRONTEND / 'family-ui.lock.json').read_text())
        self.assertEqual(lock['version'], '1.1.0')
        release = FRONTEND / 'family-ui' / lock['version']
        for filename, digest in lock['files'].items():
            self.assertEqual(hashlib.sha256((release / filename).read_bytes()).hexdigest(), digest, filename)
        self.assertEqual(hashlib.sha256((release / 'LICENSE').read_bytes()).hexdigest(), lock['licenseSha256'])
        self.assertIn(lock['module'], (FRONTEND / 'card.js').read_text())

    def test_static_path_serves_complete_frontend_only(self):
        source = (COMPONENT / '__init__.py').read_text()
        tree = ast.parse(source)
        registrations = [node for node in ast.walk(tree) if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'StaticPathConfig']
        self.assertEqual(len(registrations), 1)
        call = registrations[0]
        self.assertEqual(ast.literal_eval(call.args[0]), '/hausarbeiten-manager')
        self.assertIn("'frontend'", ast.unparse(call.args[1]))
        self.assertNotIn("'card.js'", ast.unparse(call.args[1]))
        self.assertIs(ast.literal_eval(call.args[2]), False)

    def test_shared_responsive_theme_rules(self):
        css = (FRONTEND / 'family-ui' / '1.1.0' / 'family-ui.css').read_text()
        self.assertIn('@media(max-width:600px)', css)
        self.assertIn('.grid{grid-template-columns:minmax(0,1fr)}', css)
        self.assertIn('main{padding:4px 12px 12px}', css)
        self.assertIn('var(--ha-font-family-body,Roboto,Arial,sans-serif)', css)
        self.assertIn('var(--primary-color,#03a9f4)', css)
        self.assertIn('min-height:var(--fui-touch)', css)
        self.assertIn('overflow-wrap:anywhere', css)
        self.assertIn('max-height:96dvh', css)
