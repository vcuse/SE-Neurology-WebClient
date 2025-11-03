import React, { useRef, useEffect, useState } from 'react';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { Camera } from '@mediapipe/camera_utils';

interface PoseCameraProps {
    onPoseData?: (landmarks: any, worldLandmarks: any) => void;
    sendToServer?: boolean;
    socket?: any;
}

export const PoseCameraComponent: React.FC<PoseCameraProps> = ({
    onPoseData,
    sendToServer = false,
    socket
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cameraRef = useRef<Camera | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);

    const { startDetection, stopDetection, isLoading, error } = usePoseDetection({
        onResults: (landmarks, worldLandmarks) => {
            // handle pose detection results
            onPoseData?.(landmarks, worldLandmarks);

            // send to server via socket optionalyl
            if (sendToServer && socket) {
                socket.emit('poseLandmarks', {
                    landmarks,
                    worldLandmarks,
                    timestamp: Date.now()
                });
            }
        },
        onError: (err) => {
            console.error('Pose detection error:', err);
        },
        runningMode: 'VIDEO'
    });

    useEffect(() => {
        if (!videoRef.current || isLoading) return;

        // initialize camera
        const initCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: 1280,
                        height: 720,
                        facingMode: 'user'
                    }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.addEventListener('loadeddata', () => {
                        setIsCameraReady(true);
                    });
                }
            } catch (err) {
                console.error('Error accessing camera:', err);
            }
        };

        initCamera();

        return () => {
            // cleanup camera
            if (videoRef.current?.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, [isLoading]);

    useEffect(() => {
        if (isCameraReady && videoRef.current && canvasRef.current) {
            startDetection(videoRef.current, canvasRef.current);
        }

        return () => {
            stopDetection();
        };
    }, [isCameraReady, startDetection, stopDetection]);

    if (error) {
        return (
            <div className="flex items-center justify-center p-4 bg-red-50 text-red-600 rounded-lg">
                Error initializing pose detection: {error.message}
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Loading MediaPipe Pose Landmarker...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-4xl mx-auto">
            <div className="relative">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-auto rounded-lg"
                    style={{ transform: 'scaleX(-1)' }} // mirror the video
                />
                <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full"
                    style={{ transform: 'scaleX(-1)' }} // mirror the canvas
                />
            </div>

            {!isCameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 rounded-lg">
                    <p className="text-white">Initializing camera...</p>
                </div>
            )}
        </div>
    );
};