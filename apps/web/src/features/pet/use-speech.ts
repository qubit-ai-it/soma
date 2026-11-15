"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
};

type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

export type DictationHandlers = {
  onText: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (code: string) => void;
};

export function useDictation(lang: string, handlers: DictationHandlers) {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => getRecognitionCtor() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  const stop = useCallback(() => recognitionRef.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || recognitionRef.current) return;
    const recognition = new Ctor();
    let transcript = "";
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      transcript = text;
      handlersRef.current.onText(text);
    };
    recognition.onerror = (event) => handlersRef.current.onError?.(event.error);
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      if (transcript.trim()) handlersRef.current.onFinal?.(transcript);
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [lang]);

  return { supported, listening, start, stop };
}

export function useSpeechSupport() {
  return useSyncExternalStore(
    noopSubscribe,
    () => "speechSynthesis" in window,
    () => false,
  );
}

function toSpeakable(text: string) {
  return text
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[*_#`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function speak(text: string, lang: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  if (synth.speaking) synth.cancel();
  const chunks = toSpeakable(text).match(/[^.!?¿\n]+[.!?]*/g)?.map((c) => c.trim()).filter(Boolean) ?? [];
  if (chunks.length === 0) {
    onEnd?.();
    return;
  }
  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = lang;
    if (index === chunks.length - 1) {
      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onEnd?.();
    }
    synth.speak(utterance);
  });
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
