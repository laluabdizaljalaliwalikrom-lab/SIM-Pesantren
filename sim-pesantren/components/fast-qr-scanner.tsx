'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Flashlight, Camera, Zap, Sliders, RefreshCw } from 'lucide-react';

interface FastQrScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  active: boolean;
  className?: string;
}

// Web Audio API beep sound for instant feedback
function playSuccessBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
    osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.08); // E6
    
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {}
}

function triggerHapticFeedback() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([60]);
    } catch {}
  }
}

/**
 * Fast contrast & adaptive thresholding algorithm for low-end/blurry cameras.
 * Enhances grayscale contrast and binarizes dark/light patterns.
 */
function processImageContrast(imageData: ImageData, contrast: number = 1.6, brightness: number = 15): ImageData {
  const data = imageData.data;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  
  for (let i = 0; i < data.length; i += 4) {
    // Luminance grayscale conversion
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    
    // Contrast adjustment
    let val = factor * (gray - 128) + 128 + brightness;
    if (val < 0) val = 0;
    if (val > 255) val = 255;
    
    // Soft binarization to accentuate QR finder patterns
    const bw = val > 120 ? 255 : 0;
    data[i] = bw;
    data[i + 1] = bw;
    data[i + 2] = bw;
  }
  return imageData;
}

export default function FastQrScanner({ onScan, onError, active, className = '' }: FastQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<any>(null);

  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [engineName, setEngineName] = useState<string>('Memuat Engine...');
  const [boostMode, setBoostMode] = useState<boolean>(true);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Initialize Native BarcodeDetector if available
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        setEngineName('⚡ Hardware Accelerated (BarcodeDetector API)');
      } catch {
        barcodeDetectorRef.current = null;
        setEngineName('🚀 Ultra-Fast JS Engine (jsQR)');
      }
    } else {
      setEngineName('🚀 Ultra-Fast JS Engine (jsQR)');
    }
  }, []);

  const stopStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    trackRef.current = null;
    setTorchOn(false);
  }, []);

  const handleDetected = useCallback((result: string) => {
    playSuccessBeep();
    triggerHapticFeedback();
    onScanRef.current(result);
  }, []);

  const lastScannedTextRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  // Main lightweight throttled scan loop (target ~10-12 scans/sec for ultra-low CPU)
  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (!vw || !vh) {
      animFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const now = performance.now();
    // Throttle frame processing to every 90ms (~11 FPS) to keep low-end CPUs cool and responsive
    if (now - lastFrameTimeRef.current < 90 || isProcessingRef.current) {
      animFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    lastFrameTimeRef.current = now;
    isProcessingRef.current = true;

    const runDetection = async () => {
      try {
        let detectedCode: string | null = null;

        // --- PASS 1: Native BarcodeDetector (Zero CPU overhead, uses GPU/NPU) ---
        if (barcodeDetectorRef.current) {
          try {
            const barcodes = await barcodeDetectorRef.current.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              detectedCode = barcodes[0].rawValue;
            }
          } catch {}
        }

        // --- PASS 2: jsQR with Downscaled Canvas (Max 480px width) ---
        if (!detectedCode && canvas) {
          // Downscale to max 480px width to reduce pixel processing by up to 75%
          const scale = Math.min(1, 480 / vw);
          const targetW = Math.round(vw * scale);
          const targetH = Math.round(vh * scale);

          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, targetW, targetH);
            const imageData = ctx.getImageData(0, 0, targetW, targetH);

            const code = jsQR(imageData.data, targetW, targetH, { inversionAttempts: 'dontInvert' });
            if (code && code.data) {
              detectedCode = code.data;
            } else if (boostMode) {
              // Quick single pass contrast on the already tiny 480px image data
              const enhancedImgData = processImageContrast(imageData, 1.5, 15);
              const codeEnhanced = jsQR(enhancedImgData.data, targetW, targetH, { inversionAttempts: 'dontInvert' });
              if (codeEnhanced && codeEnhanced.data) {
                detectedCode = codeEnhanced.data;
              }
            }
          }
        }

        if (detectedCode) {
          const currentTime = Date.now();
          const isSameCode = detectedCode === lastScannedTextRef.current;
          const isRecent = currentTime - lastScannedTimeRef.current < 2500;

          if (!isSameCode || !isRecent) {
            lastScannedTextRef.current = detectedCode;
            lastScannedTimeRef.current = currentTime;
            handleDetected(detectedCode);
          }
        }
      } finally {
        isProcessingRef.current = false;
        animFrameRef.current = requestAnimationFrame(scanLoop);
      }
    };

    runDetection();
  }, [boostMode, handleDetected]);

  // Start Camera Stream with light, mobile-friendly resolution constraints
  const startCamera = useCallback(async () => {
    stopStream();
    setIsInitializing(true);

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 24, max: 30 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      trackRef.current = track;

      // Apply continuous auto-focus if supported
      try {
        const capabilities: any = track.getCapabilities?.() || {};
        setHasTorch(Boolean(capabilities.torch));
        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] as any });
        }
      } catch {}

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr: any) {
          // Ignore AbortError / interrupted playback if component unmounted or stream stopped
          if (playErr?.name !== 'AbortError') {
            console.warn('Video play warning:', playErr);
          }
        }
      }

      setIsInitializing(false);
      animFrameRef.current = requestAnimationFrame(scanLoop);
    } catch (err: any) {
      setIsInitializing(false);
      const msg = err?.message || 'Gagal mengakses kamera. Pastikan izin telah diberikan.';
      if (onErrorRef.current) {
        onErrorRef.current(msg);
      }
    }
  }, [facingMode, scanLoop, stopStream]);

  useEffect(() => {
    if (active) {
      startCamera();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [active, startCamera, stopStream]);

  const toggleTorch = async () => {
    if (!trackRef.current) return;
    try {
      const nextState = !torchOn;
      await trackRef.current.applyConstraints({
        advanced: [{ torch: nextState }] as any,
      });
      setTorchOn(nextState);
    } catch (err: any) {
      console.error('Torch toggle failed:', err);
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className={`relative overflow-hidden bg-black rounded-xl ${className}`}>
      {/* Video Feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="w-full h-full object-cover min-h-[300px] max-h-[500px]"
      />

      {/* Hidden processing Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Scanning Target Finder UI */}
      {active && !isInitializing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative w-64 h-64 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden">
            {/* Animated Laser Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-laser" />
            
            {/* Corner Markers */}
            <div className="absolute top-2 left-2 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-md" />
            <div className="absolute top-2 right-2 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-md" />
            <div className="absolute bottom-2 left-2 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-md" />
            <div className="absolute bottom-2 right-2 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-md" />
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-20 pointer-events-auto">
        {hasTorch && (
          <button
            onClick={toggleTorch}
            className={`p-2.5 rounded-full backdrop-blur-md transition-all ${
              torchOn
                ? 'bg-amber-500 text-white shadow-lg ring-2 ring-amber-300'
                : 'bg-black/50 text-white hover:bg-black/70'
            }`}
            title="Senter"
          >
            <Flashlight className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={switchCamera}
          className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all"
          title="Ganti Kamera"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center z-20 pointer-events-none">
        <div className="text-[11px] text-white/90 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full font-medium shadow-sm">
          Arahkan QR ke dalam kotak
        </div>
      </div>
    </div>
  );
}
