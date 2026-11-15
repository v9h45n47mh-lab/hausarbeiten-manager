"""The read-only vacation client must match its reviewed central source."""
from pathlib import Path
import hashlib
import json
import unittest

class VacationClientTests(unittest.TestCase):
    def test_exact_central_protocol_client(self):
        component=next((Path(__file__).resolve().parents[1]/'custom_components').glob('*/vacation_client.py')).parent
        lock=json.loads((component/'vacation-client.lock.json').read_text())
        self.assertEqual(lock['protocol'],1)
        self.assertIn('/v1.2.0/',lock['source'])
        self.assertEqual(hashlib.sha256((component/'vacation_client.py').read_bytes()).hexdigest(),lock['sha256'])
