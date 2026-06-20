"""
Wayfinder AI — LLM-Based NLP Parser
Uses an external LLM (DeepSeek or OpenRouter) to parse natural language
into structured flight booking commands.

Sits alongside the rule-based parser (llm_orchestrator.py) as primary parser.
Falls back gracefully if API key is missing or API call fails.
"""

import json
import re
import logging
from datetime import date, timedelta, datetime
from typing import Optional

import httpx
from config import settings

logger = logging.getLogger("wayfinder.ai_parser")

# ── System prompt used for every parse ─────────────────────────────

SYSTEM_PROMPT = """You are a flight booking parser. Extract structured data from the user's request.

VALID INTENTS:
- search_flights: User wants to SEARCH for flights (giving origin+destination+date).
  Use this even if they say "cheapest flight" or "find flights" — that's a SEARCH, not a selection.
  Only use select_flight when they are choosing FROM existing results (e.g., "book the first one").
- search_with_budget: Same as search but with a max price limit
- select_flight: User is PICKING a specific flight from results shown to them.
  Only use this AFTER a search has been done (e.g., "I'll take the cheapest", "pick number 2").
  If "cheapest" appears with origin+destination, it's SEARCH not SELECT.
- provide_name: User is giving their name (e.g., "my name is John", "I am Jane")
- confirm_booking: User confirms they want to book (e.g., "yes", "confirm", "book it")
- cancel_booking: User wants to cancel a booking
- reschedule_booking: User wants to change flight date
- view_history: User wants to see past trips
- view_portfolio: User wants travel stats
- help: User asks what you can do, or says something NOT about flights
- unknown: Cannot determine intent

CITY TO IATA MAPPING (use these for origin/destination — origin=FROM, destination=TO):
new york=JFK, london=LHR, paris=CDG, tokyo=NRT, dubai=DXB,
singapore=SIN, bangkok=BKK, mumbai=BOM, delhi=DEL, sydney=SYD,
melbourne=MEL, frankfurt=FRA, munich=MUC, amsterdam=AMS,
rome=FCO, milan=MXP, madrid=MAD, barcelona=BCN, los angeles=LAX,
san francisco=SFO, chicago=ORD, boston=BOS, washington=IAD,
miami=MIA, toronto=YYZ, hong kong=HKG, seoul=ICN, beijing=PEK,
shanghai=PVG, istanbul=IST, doha=DOH, zurich=ZRH, vienna=VIE,
copenhagen=CPH, stockholm=ARN, oslo=OSL, helsinki=HEL, dublin=DUB,
manchester=MAN, berlin=BER, lisbon=LIS, prague=PRG, warsaw=WAW,
budapest=BUD, kuala lumpur=KUL, jakarta=CGK, manila=MNL, cairo=CAI,
johannesburg=JNB, nairobi=NBO, lagos=LOS, sao paulo=GRU,
rio de janeiro=GIG, buenos aires=EZE, mexico city=MEX,
denver=DEN, seattle=SEA, atlanta=ATL, dallas=DFW, las vegas=LAS,
orlando=MCO, osaka=KIX, taipei=TPE

DATE HANDLING:
- "tomorrow", "day after tomorrow" → relative dates from today
- "next monday", "next tuesday", etc. → next occurrence of that weekday
- "July 15th", "15 July", "Jul 15" → parse to YYYY-MM-DD
- "in 3 days", "in 2 weeks" → relative dates
- "next month" → same day next month
- Return dates as YYYY-MM-DD format

RULES:
1. REQUIRED FIELDS for search_flights: origin (FROM city), destination (TO city), date (YYYY-MM-DD)
2. REQUIRED FIELDS for provide_name: name
3. OPTIONAL FIELDS: max_price (number), passengers (number)
4. For select_flight: set parameters.position = "first", "cheapest", "second", "third", or a number string like "3"
5. For confirm_booking: set parameters.confirmed = true
6. If the user says ANYTHING not related to flights, return intent="help" with a friendly message
7. response_text should be a NATURAL friendly spoken response in English
8. Today's date is: {today}

CONFIDENCE SCORING:
Always include a "confidence" field (0.0 to 1.0) in parameters that rates how confident you are that you correctly understood and extracted ALL the user's fields.
- 1.0 = Perfect, all fields clearly stated and unambiguously extracted
- 0.95-0.99 = Very confident, minor ambiguity
- 0.80-0.94 = Somewhat confident, some guessing involved
- Below 0.80 = Not confident, had to infer or guess significantly
- Set confidence LOW (0.5-0.7) if the user's speech was garbled, unclear, or you had to guess several fields
- Set confidence HIGH (0.95+) if the user clearly stated origin, destination, and date with no ambiguity

Respond ONLY with valid JSON (no markdown, no backticks):
{{"intent": "...", "parameters": {{...}}, "response_text": "..."}}"""


class AIParser:
    """LLM-powered NLP parser with rule-based fallback."""

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None

    async def parse(self, text: str, context: dict = None) -> Optional[dict]:
        """
        Parse natural language using an LLM.
        Returns dict with intent/parameters/response_text, or None if unavailable/failed.
        """
        if not text or not text.strip():
            return None

        if not settings.ai_parser_enabled:
            logger.info("AI parser disabled in config")
            return None

        api_key = self._resolve_api_key()
        if not api_key:
            logger.info("No AI parser API key configured — falling back to rule-based")
            return None

        # Build the prompt
        today_str = date.today().isoformat()
        system_prompt = SYSTEM_PROMPT.format(today=today_str)

        user_prompt = text.strip()

        # Add session context if available (helps with multi-turn)
        if context:
            ctx_parts = []
            if context.get("origin"):
                ctx_parts.append(f"Current session origin: {context['origin']}")
            if context.get("destination"):
                ctx_parts.append(f"Current session destination: {context['destination']}")
            if context.get("departure_date"):
                ctx_parts.append(f"Current session date: {context['departure_date']}")
            if context.get("passenger_name"):
                ctx_parts.append(f"Current session passenger name: {context['passenger_name']}")
            if ctx_parts:
                user_prompt += "\n\nSession context:\n" + "\n".join(ctx_parts)

        try:
            result = await self._call_llm(system_prompt, user_prompt, api_key)
            if result:
                return result
        except Exception as e:
            logger.warning(f"AI parser failed: {e}")

        return None

    def _resolve_api_key(self) -> Optional[str]:
        """Get the right API key based on configured provider."""
        if settings.ai_parser_provider == "deepseek":
            return settings.deepseek_api_key or None
        elif settings.ai_parser_provider == "openrouter":
            return settings.ai_parser_api_key or None
        return None

    async def _call_llm(self, system_prompt: str, user_prompt: str, api_key: str) -> Optional[dict]:
        """Call the LLM API and parse the response. Retries once if empty."""
        provider = settings.ai_parser_provider
        # Hardcoded to DeepSeek V4 Flash via OpenRouter — do not change
        model = "deepseek/deepseek-v4-flash"

        url, headers = self._build_request(provider, api_key)
        if not url:
            return None

        body = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 500,
        }

        client = await self._get_client()

        # Try up to 2 times
        for attempt in range(2):
            try:
                resp = await client.post(url, json=body, headers=headers)
                resp.raise_for_status()
                data = resp.json()

                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                if not content:
                    logger.warning(f"LLM returned empty (attempt {attempt + 1})")
                    if attempt == 0:
                        continue  # Retry once
                    return None

                # Strip markdown code blocks if present
                content = content.strip()
                if content.startswith("```"):
                    content = re.sub(r"^```(?:json)?\s*", "", content)
                    content = re.sub(r"\s*```$", "", content)

                parsed = json.loads(content)
                intent = parsed.get("intent", "help")
                params = parsed.get("parameters", {})
                response_text = parsed.get("response_text", "")

                # Extract confidence (default to 1.0 if not provided)
                confidence = float(params.get("confidence", 1.0))

                # Normalize position values
                if intent == "select_flight" and params.get("position"):
                    pos_map = {"1st": "first", "2nd": "second", "3rd": "third",
                               "4th": "fourth", "5th": "fifth", "1": "first",
                               "2": "second", "3": "third", "4": "fourth", "5": "fifth"}
                    pos = str(params["position"])
                    if pos in pos_map:
                        params["position"] = pos_map[pos]

                logger.info(f"AI parser: intent={intent}, confidence={confidence}, params={params}")
                return {
                    "intent": intent,
                    "parameters": {**params, "user_lang": params.get("user_lang", "en")},
                    "response_text": response_text,
                }

            except (httpx.HTTPStatusError, httpx.RequestError, json.JSONDecodeError, KeyError) as e:
                logger.warning(f"LLM call failed (attempt {attempt + 1}): {type(e).__name__}")
                if attempt == 0:
                    continue  # Retry once
                return None

        return None

    def _build_request(self, provider: str, api_key: str):
        """Build URL and headers for the LLM provider."""
        if provider == "deepseek":
            return "https://api.deepseek.com/v1/chat/completions", {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        elif provider == "openrouter":
            return "https://openrouter.ai/api/v1/chat/completions", {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://wayfinder.app",
                "X-Title": "Wayfinder AI",
            }
        logger.warning(f"Unknown AI parser provider: {provider}")
        return None, None


# Singleton
ai_parser = AIParser()