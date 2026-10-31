"""Offline startup and MongoDB wire-protocol regressions; never use production data."""
import asyncio
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

import httpx
from mockupdb import MockupDB, go
from motor.motor_asyncio import AsyncIOMotorClient

BACKEND = Path(__file__).resolve().parents[1]


def load_backend():
    spec = importlib.util.spec_from_file_location("compatibility_server", BACKEND / "server.py")
    module = importlib.util.module_from_spec(spec)
    with patch.dict(os.environ, {"MONGO_URL": "", "DB_NAME": "compatibility_test"}):
        spec.loader.exec_module(module)
    return module


class DriverCompatibilityTests(unittest.TestCase):
    def test_import_with_and_without_database_configuration(self):
        for url in ("", "mongodb://127.0.0.1:27017/?serverSelectionTimeoutMS=250"):
            with self.subTest(configured=bool(url)):
                result = subprocess.run(
                    [sys.executable, "-c", (
                        "import server; "
                        f"assert (server.db is not None) == {bool(url)!r}; "
                        "assert server.db_name == 'compatibility_test'; "
                        "server.client.close() if server.client is not None else None"
                    )],
                    cwd=BACKEND,
                    env={**os.environ, "MONGO_URL": url, "DB_NAME": "compatibility_test"},
                    capture_output=True, text=True, timeout=15,
                )
                self.assertEqual(result.returncode, 0, result.stderr)

    def test_fastapi_lifespan_and_in_memory_leaderboard(self):
        backend = load_backend()

        async def exercise():
            async with backend.app.router.lifespan_context(backend.app):
                async with httpx.AsyncClient(
                    transport=httpx.ASGITransport(app=backend.app), base_url="http://test"
                ) as client:
                    for path in ("/api/", "/api/health"):
                        response = await client.get(path)
                        self.assertEqual(response.status_code, 200)
                        self.assertEqual(response.json()["database"], "missing")
                    response = await client.post("/api/leaderboard", json={
                        "name": " tone ", "score": 42, "level": 2, "character": "invalid"
                    })
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.json()["name"], "TONE")
                    self.assertEqual(response.json()["character"], "boy")
                    rows = await client.get("/api/leaderboard")
                    self.assertEqual(rows.json()[0]["score"], 42)
                    rank = await client.get("/api/leaderboard/rank?score=1")
                    self.assertEqual(rank.json()["rank"], 2)
                    invalid = await client.get("/api/leaderboard?period=invalid")
                    self.assertEqual(invalid.status_code, 400)
                    invalid = await client.post("/api/leaderboard", json={
                        "name": "TONE", "score": -1, "level": 1
                    })
                    self.assertEqual(invalid.status_code, 422)

        asyncio.run(exercise())

    def test_real_motor_insert_find_and_count_over_wire_protocol(self):
        backend = load_backend()
        mongo = MockupDB(auto_ismaster=True, max_wire_version=17)
        mongo.run()
        backend.client = AsyncIOMotorClient(mongo.uri, serverSelectionTimeoutMS=2000)
        backend.db = backend.client["compatibility_test"]
        doc = {}

        async def exercise():
            async with backend.app.router.lifespan_context(backend.app):
                async with httpx.AsyncClient(
                    transport=httpx.ASGITransport(app=backend.app), base_url="http://test"
                ) as client:
                    health = await client.get("/api/health")
                    self.assertEqual(health.json()["database"], "configured")
                    response = await client.post("/api/leaderboard", json={
                        "name": "tone", "score": 42, "level": 2
                    })
                    self.assertEqual(response.status_code, 200, response.text)
                    response = await client.get("/api/leaderboard?period=week&limit=10")
                    self.assertEqual(response.status_code, 200, response.text)
                    self.assertEqual(response.json()[0]["score"], 42)
                    response = await client.get("/api/leaderboard/rank?score=1")
                    self.assertEqual(response.status_code, 200, response.text)
                    self.assertEqual(response.json()["rank"], 2)

        finish = go(lambda: asyncio.run(exercise()))
        try:
            request = mongo.receives(timeout=10)
            self.assertEqual(request.command_name, "insert")
            self.assertEqual(request.doc["$db"], "compatibility_test")
            doc.update(request.doc["documents"][0])
            self.assertEqual(doc["name"], "TONE")
            self.assertIsInstance(doc["timestamp"], str)
            request.ok(n=1)
            request = mongo.receives(timeout=10)
            self.assertEqual(request.command_name, "find")
            self.assertEqual(request.doc["sort"], {"score": -1})
            self.assertEqual(request.doc["limit"], 10)
            self.assertIn("$gte", request.doc["filter"]["timestamp"])
            request.ok(cursor={"id": 0, "ns": "compatibility_test.leaderboard", "firstBatch": [
                {key: value for key, value in doc.items() if key != "_id"}
            ]})
            request = mongo.receives(timeout=10)
            self.assertEqual(request.command_name, "aggregate")
            self.assertEqual(request.doc["pipeline"][0], {"$match": {"score": {"$gt": 1}}})
            request.ok(cursor={"id": 0, "ns": "compatibility_test.leaderboard", "firstBatch": [{"n": 1}]})
            finish(timeout=10)
        finally:
            backend.client.close()
            mongo.stop()


if __name__ == "__main__":
    unittest.main()
