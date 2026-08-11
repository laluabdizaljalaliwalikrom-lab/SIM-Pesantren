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

  // Main high-frequency scan loop
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

    const runDetection = async () => {
      let detectedCode: string | null = null;

      // --- PASS 1: Native BarcodeDetector (Direct Video Stream) ---
      if (barcodeDetectorRef.current) {
        try {
          const barcodes = await barcodeDetectorRef.current.detect(video);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            detectedCode = barcodes[0].rawValue;
          }
        } catch {}
      }

      // --- PASS 2: jsQR on Direct Video Frame ---
      if (!detectedCode && canvas) {
        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw;
          canvas.height = vh;
        }
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, vw, vh);
          const imageData = ctx.getImageData(0, 0, vw, vh);
          
          const code = jsQR(imageData.data, vw, vh, { inversionAttempts: 'dontInvert' });
          if (code && code.data) {
            detectedCode = code.data;
          }
        }
      }

      // --- PASS 3: Low-Quality Camera Boost (Center Zoom ROI + Dynamic Contrast Enhancement) ---
      if (!detectedCode && boostMode && canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          // Crop center 60% region for higher effective pixel density
          const cropW = Math.floor(vw * 0.6);
          const cropH = Math.floor(vh * 0.6);
          const cropX = Math.floor((vw - cropW) / 2);
          const cropY = Math.floor((vh - cropH) / 2);

          ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, vw, vh);
          const croppedImgData = ctx.getImageData(0, 0, vw, vh);
          
          // Apply contrast boost & binarization filter
          const enhancedImgData = processImageContrast(croppedImgData, 1.8, 20);
          ctx.putImageData(enhancedImgData, 0, 0);

          // Native detector on enhanced canvas
          if (barcodeDetectorRef.current) {
            try {
              const barcodes = await barcodeDetectorRef.current.detect(canvas);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                detectedCode = barcodes[0].rawValue;
              }
            } catch {}
          }

          // jsQR fallback on enhanced canvas with inversion check
          if (!detectedCode) {
            const codeEnhanced = jsQR(enhancedImgData.data, vw, vh, { inversionAttempts: 'attemptBoth' });
            if (codeEnhanced && codeEnhanced.data) {
              detectedCode = codeEnhanced.data;
            }
          }
        }
      }

      if (detectedCode) {
        const now = Date.now();
        const isSameCode = detectedCode === lastScannedTextRef.current;
        const isRecent = now - lastScannedTimeRef.current < 2500; // 2.5 seconds cooldown

        if (!isSameCode || !isRecent) {
          lastScannedTextRef.current = detectedCode;
          lastScannedTimeRef.current = now;
          handleDetected(detectedCode);
        }
      }

      // Always continue scan loop for continuous multi-QR scanning
      animFrameRef.current = requestAnimationFrame(scanLoop);
    };

    runDetection();
  }, [boostMode, handleDetected]);

  // Start Camera Stream with optimal high resolution constraints
  const startCamera = useCallback(async () => {
    stopStream();
    setIsInitializing(true);

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, max: 2560 },
          height: { ideal: 1080, max: 1440 },
          frameRate: { ideal: 30, min: 15 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      trackRef.current = track;

      // Apply continuous auto-focus if supported
      try {
        const capabilities: any = track.getCapabilities?.() || {};
        if (capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] as any });
        }
      } catch {}

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
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
          <div className="relative w-64 h-64 border-2 border-emerald-400/70 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden">
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

      {/* Top Status Badge */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-20 pointer-events-auto">
        <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full border border-white/10">
          <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
          <span className="font-medium text-[11px] tracking-wide">{engineName}</span>
        </div>

        {/* Low Camera Boost Badge Toggle */}
        <button
          onClick={() => setBoostMode(!boostMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            boostMode
              ? 'bg-emerald-600/90 text-white shadow-md shadow-emerald-600/30 border border-emerald-400/50'
              : 'bg-black/60 text-slate-300 border border-white/10'
          }`}
          title="Super Boost untuk Kamera Low Quality / Redup"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>{boostMode ? 'Boost Low-Cam ON' : 'Boost Normal'}</span>
        </button>
      </div>

      {/* Bottom Camera Controls (Torch & Switch) */}
      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-20 pointer-events-auto">
        <div className="flex gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2.5 rounded-full backdrop-blur-md transition-all ${
                torchOn
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/40 ring-2 ring-amber-300'
                  : 'bg-black/60 text-white hover:bg-black/80'
              }`}
              title="Flashlight / Senter"
            >
              <Flashlight className="h-5 w-5" />
            </button>
          )}

          <button
            onClick={switchCamera}
            className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all"
            title="Ganti Kamera Front/Back"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        <div className="text-[11px] text-white/80 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full font-medium">
          Arahkan QR ke dalam kotak
        </div>
      </div>
    </div>
  );
}
