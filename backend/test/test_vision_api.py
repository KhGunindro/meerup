"""API tests for FastAPI vision endpoints."""

import base64
import unittest
from pathlib import Path
import numpy as np
import cv2
from fastapi.testclient import TestClient

from app.main import app


class VisionApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.backend_dir = Path(__file__).resolve().parents[1]
        cls.dataset_dir = cls.backend_dir / "dataset"

    def test_root_endpoint(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "online")
        self.assertIn("vision_endpoints", data)

    def test_health_endpoint(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_places_catalog(self):
        response = self.client.get("/api/vision/places")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(data["total"], 2)
        place_ids = [p["place_id"] for p in data["places"]]
        self.assertIn("ima_keithel", place_ids)
        self.assertIn("kangla", place_ids)

    def test_vision_status(self):
        response = self.client.get("/api/vision/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ready")
        self.assertTrue(data["model_loaded"])
        self.assertGreater(data["indexed_references"], 0)
        self.assertIn("ima_keithel", data["supported_classes"])
        self.assertIn("kangla", data["supported_classes"])

    def test_recognize_file_ima_keithel(self):
        ima_files = list((self.dataset_dir / "Ima Keithel").glob("*.jpg"))
        self.assertTrue(len(ima_files) > 0)

        with open(ima_files[0], "rb") as f:
            response = self.client.post(
                "/api/vision/recognize",
                files={"file": (ima_files[0].name, f, "image/jpeg")},
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["recognized"])
        self.assertEqual(data["place_id"], "ima_keithel")
        self.assertEqual(data["name"], "Ima Keithel")
        self.assertGreater(data["confidence"], 0.7)
        self.assertTrue(len(data["facts"]) >= 3)
        self.assertTrue(len(data["story"]) > 0)

    def test_recognize_base64_kangla(self):
        kangla_files = list((self.dataset_dir / "Kangla").glob("*.jpeg")) + list(
            (self.dataset_dir / "Kangla").glob("*.jpg")
        )
        self.assertTrue(len(kangla_files) > 0)

        raw_bytes = kangla_files[0].read_bytes()
        b64_str = f"data:image/jpeg;base64,{base64.b64encode(raw_bytes).decode('utf-8')}"

        response = self.client.post(
            "/api/vision/recognize-base64",
            json={"image_base64": b64_str},
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["recognized"])
        self.assertEqual(data["place_id"], "kangla")
        self.assertEqual(data["name"], "Kangla")
        self.assertGreater(data["confidence"], 0.7)

    def test_recognize_unrecognized_noise(self):
        noise = np.random.randint(0, 255, (250, 250, 3), dtype=np.uint8)
        _, encoded = cv2.imencode(".jpg", noise)

        response = self.client.post(
            "/api/vision/recognize",
            files={"file": ("noise.jpg", encoded.tobytes(), "image/jpeg")},
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["recognized"])
        self.assertEqual(data["place_id"], "")


if __name__ == "__main__":
    unittest.main()
