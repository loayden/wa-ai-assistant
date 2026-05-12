// FILE: src/components/setup/VoiceSetup.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Voice setup captures optional context without blocking setup; the
 * API integration is passed as a callback so this component stays reusable.
 */
import { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface VoiceSetupProps {
  isProcessing?: boolean;
  onSkip: () => void;
  onAudioReady: (audio: Blob) => void;
}

export function VoiceSetup({ isProcessing = false, onAudioReady, onSkip }: VoiceSetupProps) {
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      onAudioReady(new Blob(chunksRef.current, { type: "audio/webm" }));
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }

  return (
    <section className="mx-auto flex max-w-[420px] flex-col items-center px-4 text-center">
      <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">
        <Mic className="size-6" aria-hidden="true" />
      </div>
      <h1 className="text-h1 font-medium text-wa-gray-900">Tell us about your business</h1>
      <p className="mt-3 max-w-[360px] text-body text-wa-gray-600">Say what you sell, who you help, and how you want the assistant to sound.</p>
      <Button className="mt-8 w-full" isLoading={isProcessing} onClick={toggleRecording}>
        {recording ? <Square className="size-4" aria-hidden="true" /> : <Mic className="size-4" aria-hidden="true" />}
        {recording ? "Stop recording" : "Record voice note"}
      </Button>
      <button className="mt-4 text-body-sm text-wa-blue-600" type="button" onClick={onSkip}>
        Skip for now
      </button>
    </section>
  );
}
