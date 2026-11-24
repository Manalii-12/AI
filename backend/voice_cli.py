#!/usr/bin/env python3
"""
Hugg AI — Interactive Voice & Microphone Terminal Copilot
1. Speak question into microphone (Windows native winmm.dll -> Groq Whisper)
2. Hugg AI analyzes database records (Groq Qwen 3.8 27B / Deterministic Engine)
3. Answers spoken aloud through your PC speakers (Windows Speech Synthesis)
"""

import sys
import os
import re
import time
import ctypes
import subprocess
import requests

# Fix Windows console UTF-8 output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app.config import settings

BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000/api")

def record_microphone(duration_seconds: int = 5, output_wav: str = "user_speech.wav") -> str:
    """
    Records audio from the PC microphone using Windows built-in winmm.dll.
    No PyAudio or extra C++ libraries required.
    """
    winmm = ctypes.windll.winmm
    # Ensure any previous session is closed
    winmm.mciSendStringW("close recsound", None, 0, None)
    
    # Open waveaudio and record directly
    winmm.mciSendStringW("open new type waveaudio alias recsound", None, 0, None)
    winmm.mciSendStringW("record recsound", None, 0, None)

    print(f"\n🎙️  [MICROPHONE ACTIVE] Speak your question now... ({duration_seconds}s)")
    for i in range(duration_seconds, 0, -1):
        print(f"   ⏳ {i}s remaining...", end="\r", flush=True)
        time.sleep(1)
    print("\n   ✅ Recording complete! Transcribing with Groq Whisper...")

    winmm.mciSendStringW(f"save recsound {output_wav}", None, 0, None)
    winmm.mciSendStringW("close recsound", None, 0, None)
    return output_wav

def transcribe_audio_groq(wav_path: str) -> str:
    """
    Transcribes the recorded audio file using Groq Whisper.
    """
    api_key = settings.GROQ_API_KEY
    if not api_key:
        print("⚠️ Groq API key not found in .env. Falling back.")
        return ""

    try:
        with open(wav_path, "rb") as f:
            res = requests.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {api_key}"},
                files={"file": ("recording.wav", f, "audio/wav")},
                data={"model": "whisper-large-v3-turbo"},
                timeout=25
            )
        if res.status_code == 200:
            transcript = res.json().get("text", "").strip()
            return transcript
        else:
            print(f"Whisper transcription error: {res.status_code} - {res.text}")
            return ""
    except Exception as e:
        print(f"Transcription connection error: {e}")
        return ""
    finally:
        if os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except Exception:
                pass

def speak(text: str):
    """Speaks the text aloud through PC speakers using native Windows Speech Synthesis."""
    if not text:
        return
    clean_text = text.replace("'", "''").replace('"', '\"').replace("\n", " ").strip()
    clean_text = re.sub(r"[\*\_#`]", "", clean_text)
    clean_text = re.sub(r"[^\x00-\x7F]+", " ", clean_text)
    cmd = [
        "powershell",
        "-NoProfile",
        "-Command",
        f"Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.Rate = 2; $synth.Speak('{clean_text}')"
    ]
    try:
        subprocess.run(cmd, capture_output=True, timeout=12)
    except subprocess.TimeoutExpired:
        pass
    except Exception as e:
        print(f"Audio playback note: {e}")

def ask_voice_agent(message: str, session_id: str = "vscode_terminal"):
    """Queries Hugg AI backend with the user query."""
    try:
        res = requests.post(
            f"{BACKEND_URL}/voice/chat",
            json={"message": message, "session_id": session_id, "voice_mode": True},
            timeout=15
        )
        if res.status_code == 200:
            return res.json()
        else:
            return {"error": f"API Error {res.status_code}: {res.text}"}
    except requests.exceptions.ConnectionError:
        from app.database import SessionLocal
        from app.ai.voice_brain import voice_brain
        db = SessionLocal()
        try:
            return voice_brain.process_voice_turn(db=db, user_transcript=message, session_id=session_id)
        finally:
            db.close()

def execute_turn(user_question: str, session_id: str = "vscode_session"):
    """Processes a question, prints response, and speaks aloud."""
    print(f"\n👤 You asked: \"{user_question}\"\n")
    data = ask_voice_agent(user_question, session_id=session_id)
    spoken = data.get("spoken_response") or data.get("spoken_message") or ""
    display = data.get("display_response") or spoken
    
    print(f"🤖 Hugg AI:\n{display}\n")
    print("🔊 [Audio]: Speaking response through your PC speakers...")
    speak(spoken)

def main():
    print("=" * 68)
    print("🎙️  HUGG AI — FULL 2-WAY VOICE COPILOT (MIC + SPEAKERS)")
    print("=" * 68)
    print("Features:")
    print(" • Speak directly via your microphone (Groq Whisper STT)")
    print(" • Answers generated from live Hugg database records (Groq Qwen LLM)")
    print(" • Speaks answers aloud through PC speakers (Windows Speech)")
    print("=" * 68)
    print("Options:")
    print(" [1] Press [m] then [Enter] to SPEAK via MICROPHONE")
    print(" [2] Or simply TYPE your question")
    print(" [3] Type 'yes' to approve pending operations")
    print(" [4] Type 'exit' to quit")
    print("=" * 68)

    # Command line argument handling
    if len(sys.argv) > 1:
        if sys.argv[1] in ["--mic", "-m"]:
            duration = int(sys.argv[2]) if len(sys.argv) > 2 else 5
            wav = record_microphone(duration_seconds=duration)
            transcript = transcribe_audio_groq(wav)
            if transcript:
                execute_turn(transcript)
            else:
                print("Could not detect speech from microphone. Please try again.")
            return
        else:
            query = " ".join(sys.argv[1:])
            execute_turn(query)
            return

    # Interactive REPL session
    session_id = "vscode_session"
    
    # Proactive morning greeting on startup
    try:
        greeting_res = requests.get(f"{BACKEND_URL}/voice/proactive-greeting", timeout=5)
        if greeting_res.status_code == 200:
            greeting_data = greeting_res.json()
            greeting = greeting_data.get("spoken_greeting", "")
            print(f"🤖 Hugg AI:\n{greeting}\n")
            speak(greeting)
    except Exception:
        pass

    while True:
        try:
            prompt_input = input("\n[Mic: 'm' | Type Question | 'exit']: ").strip()
            if not prompt_input:
                continue
            if prompt_input.lower() in ["exit", "quit", "q"]:
                print("Exiting Hugg Voice Copilot. Have a great day!")
                break

            # Microphone recording mode
            if prompt_input.lower() in ["m", "mic", "speak", "record"]:
                wav = record_microphone(duration_seconds=5)
                transcript = transcribe_audio_groq(wav)
                if transcript:
                    execute_turn(transcript, session_id=session_id)
                else:
                    print("⚠️ No speech recognized from microphone. Check your mic input levels.")
            else:
                # Text typed mode
                execute_turn(prompt_input, session_id=session_id)

        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye!")
            break

if __name__ == "__main__":
    main()
