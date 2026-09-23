from __future__ import annotations

import json
import os

import requests


class LocalLLM:
    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
    ):
        self.base_url = (
            base_url
            or os.getenv(
                "LLM_BASE_URL",
                "http://127.0.0.1:8080/v1",
            )
        ).rstrip("/")

        self.model = (
            model
            or os.getenv(
                "LLM_MODEL",
                "Qwen3-4B-Instruct-2507",
            )
        )

    def chat(
        self,
        messages: list[dict],
        temperature: float = 0.4,
        max_tokens: int = 300,
    ) -> str:

        response = requests.post(
            f"{self.base_url}/chat/completions",
            json={
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": False,
            },
            timeout=120,
        )

        response.raise_for_status()

        data = response.json()

        return data["choices"][0]["message"]["content"]

    def stream(
        self,
        messages: list[dict],
        temperature: float = 0.4,
        max_tokens: int = 300,
    ):
        response = requests.post(
            f"{self.base_url}/chat/completions",
            json={
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True,
            },
            stream=True,
            timeout=120,
        )

        response.raise_for_status()

        for line in response.iter_lines(decode_unicode=True):

            if not line:
                continue

            if line.startswith("data: "):
                line = line[6:]

            if line == "[DONE]":
                break

            chunk = json.loads(line)

            choices = chunk.get("choices", [])

            if not choices:
                continue

            delta = choices[0].get("delta", {})

            text = delta.get("content")

            if text:
                yield text