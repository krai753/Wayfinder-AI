"""
Wayfinder AI — Voice Engine
Speech-to-Text (STT) via OpenAI Whisper API + Text-to-Speech (TTS) via gTTS.
"""
import os, logging, tempfile, httpx
from pathlib import Path
from config import settings

logger = logging.getLogger("wayfinder.voice")

# Audio cache directory
AUDIO_CACHE = Path(__file__).parent / "data" / "audio"


class VoiceEngine:
    """Handles speech-to-text and text-to-speech conversion."""

    async def speech_to_text(self, audio_file_path: str) -> str:
        """
        Convert audio file to text using OpenAI Whisper API.
        Supports: MP3, WAV, FLAC, M4A, etc.
        Returns the transcribed text.
        """
        try:
            api_key = settings.openai_api_key
            if not api_key:
                logger.warning("No OpenAI API key for Whisper STT")
                return ""

            # Read the audio file
            with open(audio_file_path, "rb") as f:
                audio_data = f.read()

            # Determine file extension
            ext = os.path.splitext(audio_file_path)[1].lower().lstrip(".")
            if not ext:
                ext = "mp3"
            # Map m4a to mp4 for OpenAI
            if ext == "m4a":
                ext = "mp4"

            # Call OpenAI Whisper API
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = {
                    "file": (f"audio.{ext}", audio_data, f"audio/{ext}"),
                    "model": (None, "whisper-1"),
                }
                headers = {"Authorization": f"Bearer {api_key}"}
                resp = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    files=files,
                    headers=headers,
                )
                resp.raise_for_status()
                result = resp.json()
                text = result.get("text", "")
                logger.info(f"STT (Whisper): {text}")
                return text

        except httpx.HTTPStatusError as e:
            logger.error(f"Whisper API error: {e.response.status_code} - {e.response.text[:200]}")
            return ""
        except Exception as e:
            logger.error(f"STT failed: {e}")
            return ""

    async def text_to_speech(self, text: str) -> str:
        """
        Convert text to speech using OpenAI TTS (natural voice).
        Falls back to gTTS if OpenAI API is unavailable.
        Returns path to the generated MP3 file.
        """
        AUDIO_CACHE.mkdir(parents=True, exist_ok=True)
        import uuid
        filename = f"tts_{uuid.uuid4().hex[:8]}.mp3"
        filepath = AUDIO_CACHE / filename

        # Try OpenAI TTS first (natural, high quality)
        api_key = settings.openai_api_key
        if api_key:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(
                        "https://api.openai.com/v1/audio/speech",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": "tts-1-hd",
                            "input": text,
                            "voice": "nova",
                            "response_format": "mp3",
                            "speed": 1.0,
                        },
                    )
                    resp.raise_for_status()
                    with open(filepath, "wb") as f:
                        f.write(resp.content)
                    logger.info(f"TTS (OpenAI): {filepath} — {len(text)} chars")
                    return str(filepath)
            except Exception as e:
                logger.warning(f"OpenAI TTS failed, falling back to gTTS: {e}")

        # Fallback to gTTS (free)
        try:
            from gtts import gTTS
            tts = gTTS(text=text, lang="en", slow=False)
            tts.save(str(filepath))
            logger.info(f"TTS (gTTS): {filepath}")
            return str(filepath)
        except Exception as e:
            logger.error(f"All TTS failed: {e}")
            return ""


voice = VoiceEngine()
