import { useEffect, useRef, useState } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

interface PoseDetectionOptions {
    onResults?: (landmarks: any, worldLandmarks: any) => void;
    onError?: (error: Error) => void;
    runningMode?: 'IMAGE' | 'VIDEO';
}

export const usePoseDetection = (options: PoseDetectionOptions = {}) => {
    const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const animationFrameRef = useRef<number>();
    const lastVideoTimeRef = useRef<number>(-1);

    // initialize landmarker
    useEffect(() => {
        const initializePoseLandmarker = async () => {
            try {
                setIsLoading(true);

                // load mediapipe from library
                const vision = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
                );

                // create pose landmarker with model

                const landmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: '/models/pose_landmarker_full.task', // path to model
                        delegate: 'GPU'
                    },
                    runningMode: options.runningMode || 'VIDEO',
                    numPoses: 1,
                    minPoseDetectionConfidence: 0.5,
                    minPosePresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                console.log("PoseLandmarker initialized!", landmarker);

                setPoseLandmarker(landmarker);
                setIsLoading(false);
            } catch (err) {
                const error = err as Error;
                setError(error);
                setIsLoading(false);
                options.onError?.(error);
            }
        };

        initializePoseLandmarker();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    // process video frame 
    const detectPose = async (videoElement: HTMLVideoElement, canvasElement?: HTMLCanvasElement) => {
        if (!poseLandmarker || !videoElement) return;

        const startTimeMs = performance.now();
        console.log('[pose] detecting frame at', startTimeMs, 'videoTime:', videoElement.currentTime);

        // only process if we have a new frame
        if (videoElement.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = videoElement.currentTime;

            // Detdetect pose landmarks
            let results;
            try {
                results = poseLandmarker.detectForVideo(videoElement, startTimeMs);
            } catch (err) {
                console.error('[pose] detectForVideo error:', err);
                results = { landmarks: [] };
            }

            console.log('[pose] results:', results && results.landmarks && results.landmarks.length);

            if (canvasElement) {
                console.log('[pose] canvas size (px):', canvasElement.width, canvasElement.height);
                console.log('[pose] video size (px):', videoElement.videoWidth, videoElement.videoHeight);
            }

            // draw landmarks if canvas is provided
            if (canvasElement && results.landmarks.length > 0) {
                const canvasCtx = canvasElement.getContext('2d');
                if (canvasCtx) {
                    canvasCtx.save();
                    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

                    const drawingUtils = new DrawingUtils(canvasCtx);

                    // draw each detected pose
                    for (const landmarks of results.landmarks) {
                        drawingUtils.drawLandmarks(landmarks, {
                            radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
                        });
                        drawingUtils.drawConnectors(
                            landmarks,
                            PoseLandmarker.POSE_CONNECTIONS
                        );
                    }

                    canvasCtx.restore();
                }
            }

            // get callback with results
            if (results && results.landmarks && results.landmarks.length > 0 && results.worldLandmarks && results.worldLandmarks.length > 0) {
                options.onResults?.(results.landmarks[0], results.worldLandmarks[0]);
            }
        }

        // continue processing
        animationFrameRef.current = requestAnimationFrame(() =>
            detectPose(videoElement, canvasElement)
        );
    };

    // start detection
    const startDetection = (videoElement: HTMLVideoElement, canvasElement?: HTMLCanvasElement) => {
        if (!poseLandmarker) {
            console.warn('PoseLandmarker not initialized yet');
            return;
        }

        if (animationFrameRef.current) {
            // already running
            console.log('[pose] detection already running');
            return;
        }

        // ensure canvas matches video dimensions
        if (canvasElement && videoElement) {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            console.log('[pose] set canvas size ->', canvasElement.width, canvasElement.height);

        }

        detectPose(videoElement, canvasElement);
    };

    // stop detection
    const stopDetection = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = undefined;
        }
        lastVideoTimeRef.current = -1;
    };

    // detect pose from image
    const detectPoseInImage = async (imageElement: HTMLImageElement) => {
        if (!poseLandmarker) {
            throw new Error('PoseLandmarker not initialized');
        }

        const results = poseLandmarker.detect(imageElement);

        if (results.landmarks.length > 0) {
            options.onResults?.(results.landmarks[0], results.worldLandmarks[0]);
        }

        return results;
    };

    return {
        poseLandmarker,
        isLoading,
        error,
        startDetection,
        stopDetection,
        detectPoseInImage
    };
};