import { useEffect } from 'react';
import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  useEffect(() => {
    let lenis: unknown;
    const initLenis = async () => {
      try {
        const Lenis = (await import('lenis')).default;
        const instance = new Lenis({
          lerp: 0.08,
          smoothWheel: true,
        });
        lenis = instance;
        const raf = (time: number) => {
          instance.raf(time);
          requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);
      } catch {
        // Lenis not available, skip
      }
    };
    initLenis();
    return () => {
      if (lenis && typeof (lenis as { destroy?: () => void }).destroy === 'function') {
        (lenis as { destroy: () => void }).destroy();
      }
    };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-void text-text-primary">
      <Navbar />
      <main className="pt-12">{children}</main>
      <Footer />
    </div>
  );
}
