"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type FaceState = "idle" | "listening" | "thinking" | "speaking";

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi, I’m Altair. I’m online and ready to help you.",
    },
  ]);
  const [input, setInput] = useState("");
  const [faceState, setFaceState] = useState<FaceState>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [mouthScale, setMouthScale] = useState(1);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mouthTimerRef = useRef<number | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      if (speechRef.current) {
        window.speechSynthesis.cancel();
      }
      if (mouthTimerRef.current) {
        window.clearInterval(mouthTimerRef.current);
      }
    };
  }, []);

  const statusText = useMemo(() => {
    if (faceState === "listening") return "Listening";
    if (faceState === "thinking") return "Thinking";
    if (faceState === "speaking") return "Talking";
    return "Idle";
  }, [faceState]);

  function stopSpeaking() {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    if (mouthTimerRef.current) {
      window.clearInterval(mouthTimerRef.current);
      mouthTimerRef.current = null;
    }
    setMouthScale(1);
  }

  function speakText(text: string) {
    if (typeof window === "undefined") return;
    if (!voiceEnabled || !("speechSynthesis" in window)) {
      setFaceState("idle");
      return;
    }

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    speechRef.current = utterance;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => /Samantha|Google US English|Daniel|Karen/i.test(v.name)) ||
      voices.find((v) => /English/i.test(v.lang)) ||
      voices[0];

    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 1;
    utterance.pitch = 1.25;
    utterance.volume = 1;

    utterance.onstart = () => {
      setFaceState("speaking");
      mouthTimerRef.current = window.setInterval(() => {
        setMouthScale(0.8 + Math.random() * 0.9);
      }, 120);
    };

    utterance.onend = () => {
      if (mouthTimerRef.current) {
        window.clearInterval(mouthTimerRef.current);
        mouthTimerRef.current = null;
      }
      setMouthScale(1);
      setFaceState("idle");
    };

    utterance.onerror = () => {
      if (mouthTimerRef.current) {
        window.clearInterval(mouthTimerRef.current);
        mouthTimerRef.current = null;
      }
      setMouthScale(1);
      setFaceState("idle");
    };

    window.speechSynthesis.speak(utterance);
  }

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    stopSpeaking();

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);
    setFaceState("thinking");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
        }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      const data = await res.json();
      const reply =
        data?.reply?.trim() ||
        "Sorry, I had trouble generating a response.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);
      setIsLoading(false);

      if (voiceEnabled) {
        speakText(reply);
      } else {
        setFaceState("idle");
      }
    } catch (error) {
      setIsLoading(false);
      setFaceState("idle");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I hit an error connecting to the model. Check your OPENAI_API_KEY and deployment settings.",
        },
      ]);
      console.error(error);
    }
  }

  function onInputChange(value: string) {
    setInput(value);
    if (!isLoading) {
      setFaceState(value.trim() ? "listening" : "idle");
    }
  }

  function clearChat() {
    stopSpeaking();
    setMessages([
      {
        role: "assistant",
        content: "Hi, I’m Altair. I’m online and ready to help you.",
      },
    ]);
    setInput("");
    setFaceState("idle");
    setIsLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-zinc-100 overflow-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(80,120,255,0.10),transparent_24%),radial-gradient(circle_at_50%_60%,rgba(255,255,255,0.05),transparent_30%)] pointer-events-none" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="hidden lg:flex w-72 shrink-0 flex-col justify-between border-r border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div>
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-black font-semibold">
                A
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">
                  Altair OS
                </p>
                <p className="text-sm text-white">Cute AI Assistant</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Core Status
              </p>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      faceState === "idle"
                        ? "bg-zinc-400"
                        : faceState === "listening"
                        ? "bg-sky-400"
                        : faceState === "thinking"
                        ? "bg-violet-400"
                        : "bg-emerald-300"
                    }`}
                  />
                  <span className="text-sm text-zinc-200">{statusText}</span>
                </div>
                <p className="text-xs text-zinc-500">
                  Voice, motion, and chat are all linked together.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={clearChat}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 transition hover:bg-white/10"
          >
            Clear conversation
          </button>
        </aside>

        <section className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-4 backdrop-blur-xl sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-black font-semibold lg:hidden">
                A
              </div>
              <div>
                <p className="text-sm text-white">Altair</p>
                <p className="text-xs text-zinc-500">WALL-E style assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setVoiceEnabled((v) => !v)}
                className={`rounded-full border px-4 py-2 text-xs transition ${
                  voiceEnabled
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 bg-white/5 text-zinc-300"
                }`}
              >
                Voice {voiceEnabled ? "On" : "Off"}
              </button>

              <button
                onClick={clearChat}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-zinc-300 transition hover:bg-white/10"
              >
                Reset
              </button>
            </div>
          </header>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-col items-center px-4 pt-8 sm:px-6 lg:px-10">
              <CuteRobotFace state={faceState} mouthScale={mouthScale} />
              <div className="mt-5 text-center">
                <p className="text-xl font-medium text-white">Altair is {statusText.toLowerCase()}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Ask anything and it will reply out loud.
                </p>
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-4 pb-4 pt-6 sm:px-6">
              <div className="flex-1 space-y-4 overflow-y-auto rounded-[28px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
                {messages.map((message, idx) => (
                  <div
                    key={`${message.role}-${idx}`}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-lg ${
                        message.role === "user"
                          ? "bg-white text-black"
                          : "border border-white/10 bg-zinc-900/90 text-zinc-100"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-3xl border border-white/10 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.2s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.1s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              <div className="mt-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-2 backdrop-blur-xl">
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={1}
                    placeholder="Message Altair..."
                    className="min-h-[56px] flex-1 resize-none bg-transparent px-4 py-4 text-sm text-white placeholder:text-zinc-500 outline-none"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading}
                    className="mb-1 rounded-2xl bg-white px-5 py-4 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>

              <p className="mt-3 text-center text-xs text-zinc-600">
                Uses your secure server route on Vercel.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function CuteRobotFace({
  state,
  mouthScale,
}: {
  state: FaceState;
  mouthScale: number;
}) {
  const eyeClass =
    state === "listening"
      ? "bg-sky-300 shadow-[0_0_30px_rgba(125,211,252,0.65)]"
      : state === "thinking"
      ? "bg-violet-300 shadow-[0_0_30px_rgba(196,181,253,0.7)]"
      : state === "speaking"
      ? "bg-amber-200 shadow-[0_0_30px_rgba(253,230,138,0.8)]"
      : "bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.45)]";

  const bodyGlow =
    state === "listening"
      ? "shadow-[0_0_100px_rgba(56,189,248,0.18)]"
      : state === "thinking"
      ? "shadow-[0_0_100px_rgba(168,85,247,0.18)]"
      : state === "speaking"
      ? "shadow-[0_0_100px_rgba(250,204,21,0.15)]"
      : "shadow-[0_0_70px_rgba(255,255,255,0.08)]";

  return (
    <div className="relative flex items-center justify-center">
      <div
        className={`absolute h-64 w-64 rounded-full blur-3xl ${bodyGlow} animate-pulse`}
      />
      <div
        className={`relative h-64 w-64 rounded-[42%] border border-white/10 bg-gradient-to-b from-zinc-800 to-zinc-950 ${bodyGlow} transition-all duration-500`}
      >
        <div className="absolute inset-3 rounded-[38%] border border-white/10 bg-black/60" />
        <div className="absolute left-1/2 top-5 h-4 w-20 -translate-x-1/2 rounded-full bg-white/5" />

        <div
          className={`absolute inset-x-8 top-14 h-28 rounded-[38px] border border-white/10 bg-black/80 transition-all duration-300 ${
            state === "thinking" ? "animate-pulse" : ""
          }`}
        >
          <div className="absolute left-7 top-1/2 flex -translate-y-1/2 items-center gap-8">
            <div
              className={`h-10 w-10 rounded-full transition-all duration-200 ${eyeClass} ${
                state === "speaking" ? "animate-pulse" : ""
              }`}
            />
            <div
              className={`h-10 w-10 rounded-full transition-all duration-200 ${eyeClass} ${
                state === "speaking" ? "animate-pulse" : ""
              }`}
            />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-10 flex justify-center">
          <div className="relative flex h-10 w-28 items-center justify-center">
            <div
              style={{
                transform: `scaleY(${mouthScale})`,
              }}
              className={`h-3 w-16 rounded-full transition-transform duration-75 ${
                state === "speaking"
                  ? "bg-amber-200 shadow-[0_0_25px_rgba(253,230,138,0.75)]"
                  : state === "thinking"
                  ? "bg-violet-300 shadow-[0_0_20px_rgba(196,181,253,0.65)]"
                  : state === "listening"
                  ? "bg-sky-300 shadow-[0_0_20px_rgba(125,211,252,0.65)]"
                  : "bg-zinc-300 shadow-[0_0_18px_rgba(255,255,255,0.35)]"
              }`}
            />
          </div>
        </div>

        <div className="absolute -left-3 top-20 h-20 w-6 rounded-full border border-white/10 bg-zinc-900/70" />
        <div className="absolute -right-3 top-20 h-20 w-6 rounded-full border border-white/10 bg-zinc-900/70" />

        <div className="absolute bottom-4 left-1/2 h-3 w-20 -translate-x-1/2 rounded-full bg-white/5" />
      </div>
    </div>
  );
}
