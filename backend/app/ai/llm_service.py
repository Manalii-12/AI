import os
import json
import logging
import requests
from app.config import settings

logger = logging.getLogger("hugg_ai.llm")

def call_llm(prompt: str, system_prompt: str = "", max_tokens: int = 500, temperature: float = 0.3) -> dict:
    """
    Universal LLM router supporting free and premium providers:
    1. Groq (100% Free, ultra-fast Llama-3.3-70b / Llama-3.1-8b)
    2. Google Gemini (Free tier with API key from aistudio.google.com)
    3. OpenRouter (Free models like meta-llama/llama-3.3-70b-instruct:free)
    4. Perplexity API (Sonar models)
    5. Anthropic Claude (Claude 3.5 Sonnet / Haiku)
    6. OpenAI (GPT-4o-mini / GPT-4o)
    7. Ollama (100% Free Local, runs on localhost:11434)
    8. Deterministic Fallback Engine (Zero crashes if offline / no key)
    """
    # 1. GROQ (Recommended Free Tier: https://console.groq.com/keys)
    if settings.GROQ_API_KEY:
        try:
            model = settings.LLM_MODEL or "qwen/qwen3.8-27b"
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature
                },
                timeout=15
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"].strip()
                return {"source": f"Groq ({model})", "content": content, "success": True}
            else:
                logger.warning(f"Groq API error {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Groq invocation failed: {e}")

    # 2. GOOGLE GEMINI (Free Tier: https://aistudio.google.com/)
    if settings.GEMINI_API_KEY:
        try:
            model = settings.LLM_MODEL or "gemini-1.5-flash"
            # Using Google Gemini's OpenAI-compatible endpoint
            url = f"https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            resp = requests.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.GEMINI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature
                },
                timeout=15
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"].strip()
                return {"source": f"Google Gemini ({model})", "content": content, "success": True}
            else:
                logger.warning(f"Gemini API error {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Gemini invocation failed: {e}")

    # 3. OPENROUTER (Free models available: https://openrouter.ai/keys)
    if settings.OPENROUTER_API_KEY:
        try:
            model = settings.LLM_MODEL or "meta-llama/llama-3.3-70b-instruct:free"
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            resp = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://huggai.platform",
                    "X-Title": "Hugg AI"
                },
                json={
                    "model": model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature
                },
                timeout=20
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"].strip()
                return {"source": f"OpenRouter ({model})", "content": content, "success": True}
            else:
                logger.warning(f"OpenRouter API error {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"OpenRouter invocation failed: {e}")

    # 4. PERPLEXITY API (https://docs.perplexity.ai/)
    if settings.PERPLEXITY_API_KEY:
        try:
            model = settings.LLM_MODEL or "sonar"
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            resp = requests.post(
                "https://api.perplexity.ai/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.PERPLEXITY_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature
                },
                timeout=20
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"].strip()
                return {"source": f"Perplexity ({model})", "content": content, "success": True}
            else:
                logger.warning(f"Perplexity API error {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Perplexity invocation failed: {e}")

    # 5. ANTHROPIC CLAUDE
    if settings.ANTHROPIC_API_KEY:
        try:
            model = settings.LLM_MODEL or "claude-3-5-haiku-20241022"
            body = {
                "model": model,
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}]
            }
            if system_prompt:
                body["system"] = system_prompt

            resp = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": settings.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json=body,
                timeout=20
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["content"][0]["text"].strip()
                return {"source": f"Claude ({model})", "content": content, "success": True}
        except Exception as e:
            logger.error(f"Claude invocation failed: {e}")

    # 6. OPENAI (GPT-4o-mini)
    if settings.OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            model = settings.LLM_MODEL or "gpt-4o-mini"
            msgs = []
            if system_prompt:
                msgs.append({"role": "system", "content": system_prompt})
            msgs.append({"role": "user", "content": prompt})

            resp = client.chat.completions.create(
                model=model,
                messages=msgs,
                max_tokens=max_tokens,
                temperature=temperature
            )
            content = resp.choices[0].message.content.strip()
            return {"source": f"OpenAI ({model})", "content": content, "success": True}
        except Exception as e:
            logger.error(f"OpenAI invocation failed: {e}")

    # 7. LOCAL OLLAMA (100% Free, Offline)
    if settings.OLLAMA_BASE_URL:
        try:
            model = settings.LLM_MODEL or "llama3.2"
            resp = requests.post(
                f"{settings.OLLAMA_BASE_URL.rstrip('/')}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        *([{"role": "system", "content": system_prompt}] if system_prompt else []),
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": temperature
                },
                timeout=5
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"].strip()
                return {"source": f"Local Ollama ({model})", "content": content, "success": True}
        except Exception:
            pass

    # 8. BUILT-IN DETERMINISTIC FALLBACK
    return {
        "source": "Hugg Deterministic Intelligence Engine",
        "content": "",
        "success": False
    }

def enrich_insight_with_llm(title: str, problem: str, metrics: dict) -> dict:
    """
    Enriches root cause explanations using any configured free or paid LLM.
    """
    system_prompt = "You are an executive Chief Operating Officer AI for Hugg Beverages. Provide a concise 2-sentence executive summary emphasizing root cause and operational countermeasure. Keep facts grounded strictly in the provided metrics."
    prompt = f"Title: {title}\nProblem: {problem}\nMetrics: {json.dumps(metrics)}"
    
    result = call_llm(prompt, system_prompt=system_prompt, max_tokens=150)
    if result.get("success"):
        return {
            "source": result["source"],
            "enriched": True,
            "executive_summary": result["content"]
        }
    
    return {
        "source": "Deterministic Intelligence Engine",
        "enriched": False
    }
