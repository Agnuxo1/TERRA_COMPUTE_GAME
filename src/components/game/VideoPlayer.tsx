import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  src: string;
  onComplete: () => void;
}

/**
 * Full-screen cinematic video player.
 * Dark background shown immediately. Video plays when ready.
 * Falls back to onComplete if video fails or takes too long.
 */
export default function VideoPlayer({ src, onComplete }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);

  const finish = () => {
    if (!doneRef.current) {
      doneRef.current = true;
      onComplete();
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) {
      finish();
      return;
    }

    doneRef.current = false;

    const onPlay = () => {
      // Try unmuting after playback starts
      if (v.muted) {
        v.muted = false;
        v.play().catch(() => {});
      }
    };

    const onEnd = () => finish();

    const onErr = () => {
      // Small delay in case it's transient
      setTimeout(() => finish(), 50);
    };

    const onTime = () => {
      if (v.duration > 0) {
        setProgress((v.currentTime / v.duration) * 100);
      }
    };

    v.addEventListener('playing', onPlay);
    v.addEventListener('ended', onEnd);
    v.addEventListener('error', onErr);
    v.addEventListener('timeupdate', onTime);

    // Start playback (muted first to satisfy browser autoplay policy)
    v.muted = true;
    const p = v.play();
    if (p) {
      p.catch(() => {
        // Keep muted and try again
        v.play().catch(() => finish());
      });
    }

    // Hard fallback: close after 15s max
    const t = setTimeout(() => finish(), 15000);

    return () => {
      clearTimeout(t);
      v.removeEventListener('playing', onPlay);
      v.removeEventListener('ended', onEnd);
      v.removeEventListener('error', onErr);
      v.removeEventListener('timeupdate', onTime);
    };
  }, [src]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: '#000' }}
    >
      <video
        ref={videoRef}
        src={src}
        preload="auto"
        playsInline
        className="w-full h-full object-contain"
      />

      {/* Skip button */}
      <button
        onClick={finish}
        className="absolute bottom-6 right-6 px-4 py-2 rounded font-orbitron text-[10px] font-bold tracking-wider transition-all hover:brightness-125 hover:scale-105"
        style={{
          background: 'rgba(11,12,16,0.8)',
          color: '#33FF33',
          border: '1px solid rgba(51,255,51,0.4)',
          textShadow: '0 0 6px rgba(51,255,51,0.3)',
          backdropFilter: 'blur(4px)',
        }}
      >
        SKIP ▶▶
      </button>

      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: 'rgba(51,255,51,0.15)' }}
      >
        <div
          className="h-full transition-all duration-100"
          style={{
            width: `${progress}%`,
            background: '#33FF33',
            boxShadow: '0 0 6px rgba(51,255,51,0.5)',
          }}
        />
      </div>

      {/* Corner branding */}
      <div
        className="absolute top-4 left-4 font-orbitron text-[8px] tracking-widest"
        style={{ color: 'rgba(51,255,51,0.4)' }}
      >
        TERRA COMPUTE — CINEMATIC
      </div>
    </div>
  );
}
