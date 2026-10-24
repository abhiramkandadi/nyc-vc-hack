"""Offline regression tests: real ranker and HTTP handlers, stubbed sponsor calls."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
from fastapi.testclient import TestClient

SERVICE = Path(__file__).resolve().parents[2] / "services/thesis"
sys.path.insert(0, str(SERVICE))
import app as service
import export_seed
from model import Ranker

class ThesisIntegrationTest(unittest.TestCase):
    def test_seed_export_and_http_contract(self):
        source = (SERVICE.parents[1] / "lib/seededAktaData.json").read_bytes()
        companies = export_seed.export()
        self.assertEqual(len(companies), 50)
        self.assertEqual(len({c["uuid"] for c in companies}), 50)
        rng = np.random.default_rng(7)
        embeddings = {c["uuid"]: rng.normal(size=8) for c in companies}
        with tempfile.TemporaryDirectory() as folder:
            pool = Path(folder) / "companies.json"
            pool.write_text(json.dumps(companies))
            with patch.object(service, "COMPANIES_FILE", pool), patch.object(service, "load_embeddings", return_value=embeddings), patch.object(service, "load_fund_embeddings", side_effect=lambda funds: {f["id"]: rng.normal(size=8) for f in funds}), patch.object(service, "generate", return_value="Offline test readback."):
                with TestClient(service.app) as client:
                    ranking = client.get("/ranking").json()
                    self.assertFalse(ranking["fitted"])
                    self.assertEqual(len(ranking["ranked"]), 50)
                    self.assertTrue(all(row["score"] is None for row in ranking["ranked"]))
                    first = companies[0]["uuid"]
                    self.assertEqual(client.post("/action", json={"uuid": first, "action": "invalid"}).status_code, 422)
                    self.assertEqual(client.post("/action", json={"uuid": "missing", "action": "pass"}).status_code, 404)
                    for index, company in enumerate(companies[:10]):
                        response = client.post("/action", json={"uuid": company["uuid"], "action": "save" if index % 2 else "pass"})
                        self.assertEqual(response.status_code, 200)
                    self.assertEqual(client.post("/action", json={"uuid": first, "action": "pass"}).status_code, 409)
                    ranking = client.get("/ranking").json()
                    self.assertTrue(ranking["fitted"])
                    self.assertEqual(len(ranking["ranked"]), 40)
                    self.assertTrue(all(0 <= row["score"] <= 1 for row in ranking["ranked"]))
                    thesis = client.get("/thesis").json()
                    self.assertEqual(thesis["readback_at"], 10)
                    self.assertEqual(thesis["readback"], "Offline test readback.")
                    client.post("/reset")
                    self.assertEqual(client.get("/thesis").json()["n_actions"], 0)
                    self.assertEqual(len(client.get("/ranking").json()["ranked"]), 50)
        self.assertEqual((SERVICE.parents[1] / "lib/seededAktaData.json").read_bytes(), source)

if __name__ == "__main__":
    unittest.main()
