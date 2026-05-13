import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  src: string;
  onComplete: () => void;
  onSkip?: () => void;
}

/**
 * Full-screen video player that auto-plays and closes when finished.
 * Shows a skip button and progress bar.
 * Falls back gracefully if video file doesn't exist.
 */
export default function VideoPlayer({ src, onComplete, onSkip }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [canPlay, setCanPlay] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      setCanPlay(true);
      video.play().catch(() => setError(true));
    };

    const handleEnded = () => {
      onComplete();
    };

    const handleError = () => {
      setError(true);
      // If video doesn't exist, just complete immediately
      setTimeout(onComplete, 100);
    };

    const handleTimeUpdate = () => {
      if (video.duration > 0) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('timeupdate', handleTimeUpdate);

    // Fallback: if video doesn't load in 2 seconds, skip
    const fallbackTimer = setTimeout(() => {
      if (!canPlay) {
        setError(true);
        onComplete();
      }
    }, 2000);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      clearTimeout(fallbackTimer);
    };
  }, [src, onComplete, canPlay]);

  const handleSkip = () => {
    if (onSkip) onSkip();
    onComplete();
  };

  // If video errored (file not found), don't render anything
  if (error) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.95)' }}>

      {/* Video */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        playsInline
        muted={false}
        autoPlay
      />

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute bottom-6 right-6 px-4 py-2 rounded font-orbitron text-[10px] font-bold tracking-wider
          transition-all hover:brightness-125 hover:scale-105"
        style={{
          background: 'rgba(11,12,16,0.8)',
          color: '#33FF33',
          border: '1px solid rgba(51,255,51,0.4)',
          textShadow: '0 0 6px rgba(51,255,51,0.3)',
          backdropFilter: 'blur(4px)',
        }}>
        SKIP ▶▶
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: 'rgba(51,255,51,0.15)' }}>
        <div className="h-full transition-all duration-100"
          style={{ width: `${progress}%`, background: '#33FF33', boxShadow: '0 0 6px rgba(51,255,51,0.5)' }} />
      </div>

      {/* Corner decoration */}
      <div className="absolute top-4 left-4 font-orbitron text-[8px] tracking-widest"
        style={{ color: 'rgba(51,255,51,0.4)' }}>
        TERRA COMPUTE — CINEMATIC
      </div>
    </div>
  );
}
