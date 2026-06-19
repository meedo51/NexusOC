import json
import logging
from typing import AsyncGenerator

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self):
        self.api_key = settings.openai_api_key
        self.base_url = settings.openai_base_url.rstrip("/")
        self.model = settings.openai_model
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(120.0, connect=30.0),
            follow_redirects=True,
        )

    def _build_system_prompt(self, context: str | None = None) -> str:
        prompt = (
            "You are NexusOC, an elite AI code assistant integrated into a web-based IDE. "
            "You have access to the user's workspace files and can help write, debug, and review code. "
            "When providing code blocks, always specify the language for syntax highlighting.\n\n"
            "Guidelines:\n"
            "- Write clean, production-ready code with proper error handling.\n"
            "- Explain your reasoning concisely before showing code.\n"
            "- Use markdown formatting in your responses.\n"
            "- When suggesting file edits, use fenced code blocks with the language specified.\n"
        )
        if context:
            prompt += f"\n--- Current Workspace Context ---\n{context}\n---\n"
        return prompt

    async def stream_chat(
        self,
        messages: list[dict],
        context: str | None = None,
    ) -> AsyncGenerator[dict, None]:
        openai_messages = [{"role": "system", "content": self._build_system_prompt(context)}]

        for msg in messages:
            openai_messages.append({"role": msg["role"], "content": msg["content"]})

        payload = {
            "model": self.model,
            "messages": openai_messages,
            "stream": True,
            "temperature": 0.2,
            "max_tokens": 8192,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with self.client.stream(
                "POST",
                "/chat/completions",
                json=payload,
                headers=headers,
            ) as response:
                if response.status_code != 200:
                    error_body = await response.aread()
                    logger.error(f"AI API error {response.status_code}: {error_body}")
                    yield {"type": "error", "content": f"AI service returned {response.status_code}"}
                    return

                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue

                    data = line[6:].strip()
                    if data == "[DONE]":
                        yield {"type": "done", "content": ""}
                        return

                    try:
                        chunk = json.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield {"type": "delta", "content": content}
                    except json.JSONDecodeError:
                        continue

        except httpx.TimeoutException:
            logger.error("AI API request timed out")
            yield {"type": "error", "content": "Request timed out. Please try again."}
        except Exception as e:
            logger.exception("AI streaming error")
            yield {"type": "error", "content": f"Streaming error: {str(e)}"}

    async def close(self):
        await self.client.aclose()


ai_service = AIService()
