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
        Convert text to speech audio file using gTTS (free, no API key).
        Returns path to the generated MP3 file.
        """
        try:
            from gtts import gTTS
            AUDIO_CACHE.mkdir(parents=True, exist_ok=True)

            import uuid
            filename = f"tts_{uuid.uuid4().hex[:8]}.mp3"
            filepath = AUDIO_CACHE / filename

            tts = gTTS(text=text, lang="en", slow=False)
            tts.save(str(filepath))

            logger.info(f"TTS saved: {filepath}")
            return str(filepath)
        except ImportError:
            logger.warning("gtts not installed, TTS unavailable")
            return ""
        except Exception as e:
            logger.error(f"TTS failed: {e}")
            return ""


voice = VoiceEngine()
