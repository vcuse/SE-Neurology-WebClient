"use client";

import { useVideoCall } from "./video-call-provider";
import { CallControls } from "./call-controls";

export function CallUI() {
  const { videoEl, isCallActive } = useVideoCall();

  if (!isCallActive) {
    return null;
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-4">Active Call</h2>
      <div className="relative aspect-video">
        <video
          ref={videoEl}
          autoPlay
          playsInline
          className="w-full h-full border rounded-lg object-cover"
          muted
        />
      </div>
      <CallControls />
    </div>
  );
}
