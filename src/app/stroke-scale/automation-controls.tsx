// AutomationControls.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import * as vision from "@mediapipe/tasks-vision";

type Props = {
  socket: Socket;
  roomId: string;
  /** The socket.id of the peer whose video the server should record */
  targetPeerId: string;
  /** The DOM id of the <video> element to analyze locally */
  videoElementId: string;
};

type LandmarkerAPI = {
  detectForVideo: (video: HTMLVideoElement, t: number) => {
    faceLandmarks?: any[];
  };
  close?: () => void;
};

export default function AutomationControls({
  socket,
  roomId,
  targetPeerId,
  videoElementId,
}: Props) {
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");

  // local analysis counters
  const framesRef = useRef(0);
  const hitsRef = useRef(0);
  const rAFRef = useRef<number | null>(null);
  const landmarkerRef = useRef<LandmarkerAPI | null>(null);

  // --- load mediapipe (web) once on first start ---
  const ensureLandmarker = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;

    // Dynamic ESM imports (works in CRA/Vite/Next)
    // @ts-ignore  — runtime import, ignore type check

    const { FaceLandmarker, FilesetResolver } = vision as any;

    const fileset = await (FilesetResolver as any).forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.7/wasm"
    );

    const lm: LandmarkerAPI = await (FaceLandmarker as any).createFromOptions(
      fileset,
      {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        },
        numFaces: 1,
        runningMode: "VIDEO",
      }
    );

    landmarkerRef.current = lm;
    return lm;
  }, []);

  // ---- local analysis loop (runs while "running" is true) ----
  const startLocalLoop = useCallback(async () => {
    const video = document.getElementById(videoElementId) as
      | HTMLVideoElement
      | null;
    if (!video) throw new Error(`No <video id="${videoElementId}"> found`);
    if (video.readyState < 2) {
      // make sure we have current frame
      await new Promise<void>((res) => {
        const onCanPlay = () => {
          video.removeEventListener("canplay", onCanPlay);
          res();
        };
        video.addEventListener("canplay", onCanPlay);
      });
    }

    const landmarker = await ensureLandmarker();
    framesRef.current = 0;
    hitsRef.current = 0;

    const tick =
      (video as any).requestVideoFrameCallback
        ? (now: any) => {
            if (!running) return;
            const res = (landmarker as any).detectForVideo(
              video,
              performance.now()
            );
            framesRef.current++;
            if (res?.faceLandmarks?.length) hitsRef.current++;
            rAFRef.current = (video as any).requestVideoFrameCallback(tick);
          }
        : () => {
            if (!running) return;
            const res = (landmarker as any).detectForVideo(
              video,
              performance.now()
            );
            framesRef.current++;
            if (res?.faceLandmarks?.length) hitsRef.current++;
            rAFRef.current = window.requestAnimationFrame(tick);
          };

    // first call
    if ((video as any).requestVideoFrameCallback) {
      rAFRef.current = (video as any).requestVideoFrameCallback(tick);
    } else {
      rAFRef.current = window.requestAnimationFrame(tick);
    }
  }, [ensureLandmarker, running, videoElementId]);

  const stopLocalLoop = useCallback(() => {
    setRunning(false);
    if (rAFRef.current != null) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }
    const detectionRate = hitsRef.current / Math.max(1, framesRef.current);
    return { detectionRate, frames: framesRef.current, hits: hitsRef.current };
  }, []);

  // ---- click handlers ----
  const onStart = useCallback(() => {
    if (running) return;
    setStatus("starting…");
    setRunning(true);

    // 1) start local analysis
    startLocalLoop()
      .catch((e) => {
        console.error(e);
        setStatus(String(e?.message || e));
        setRunning(false);
      });

    // 2) ask server to start clip recording (uses your existing handlers)
    socket.emit(
      "automation:start",
      {
        room_id: roomId,
        questionId: "q1_facial_palsy",
        targetPeerId,
        model: "face",
      },
      ({ sessionId, error }: { sessionId?: string; error?: string }) => {
        if (!sessionId) {
          setStatus(error ? `server error: ${error}` : "server failed to start");
          setRunning(false);
          return;
        }
        setSessionId(sessionId);
        setStatus(`recording… (session ${sessionId})`);
      }
    );
  }, [roomId, socket, startLocalLoop, targetPeerId, running]);

  const onStop = useCallback(() => {
    // 1) stop local analysis
    const local = stopLocalLoop();
    setStatus(
      `local detectionRate=${local.detectionRate.toFixed(
        2
      )} (${local.hits}/${local.frames})`
    );

    // 2) stop server-side clip
    if (sessionId) {
      socket.emit(
        "automation:stop",
        { room_id: roomId, sessionId },
        ({ ok }: { ok: boolean }) => {
          if (!ok) {
            console.warn("server stop returned not ok");
          }
        }
      );
    }
  }, [roomId, sessionId, socket, stopLocalLoop]);

  // Optional: listen for server's final result (if your server emits it)
  useEffect(() => {
    const onResult = (payload: any) => {
      if (!payload) return;
      setStatus(
        `server result: ${JSON.stringify(payload.summary ?? payload).slice(
          0,
          140
        )}…`
      );
    };
    const onErr = (e: any) => setStatus(`server error: ${e?.error || e}`);
    socket.on("automation:result", onResult);
    socket.on("automation:error", onErr);
    return () => {
      socket.off("automation:result", onResult);
      socket.off("automation:error", onErr);
    };
  }, [socket]);

  return (
    <div className="flex items-center gap-3 mt-3">
      <button
        onClick={onStart}
        disabled={running}
        className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
      >
        Start automation
      </button>
      <button
        onClick={onStop}
        disabled={!running}
        className="px-4 py-2 rounded-lg bg-rose-600 text-white disabled:opacity-50"
      >
        Stop
      </button>
      <span className="text-sm text-gray-600">{status}</span>
    </div>
  );
}
