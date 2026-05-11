import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Navbar() {
  return (
    <motion.header
      initial={{ y: -48 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 h-12 border-b border-border"
      style={{ backgroundColor: 'rgba(10, 11, 14, 0.8)', backdropFilter: 'blur(16px)' }}
    >
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 lg:px-8">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="6" cy="10" r="3" stroke="#00F0FF" strokeWidth="1.5" />
            <circle cx="14" cy="6" r="2.5" stroke="#00F0FF" strokeWidth="1.5" />
            <circle cx="14" cy="14" r="2.5" stroke="#00F0FF" strokeWidth="1.5" />
            <line x1="8.5" y1="8.5" x2="12" y2="6.8" stroke="#00F0FF" strokeWidth="1" />
            <line x1="8.5" y1="11.5" x2="12" y2="13.2" stroke="#00F0FF" strokeWidth="1" />
          </svg>
          <span className="label-text text-text-primary">
            AGI TRAJECTORY
            <span className="text-accent-cyan"> SIM</span>
          </span>
        </Link>

        {/* Center: Live status */}
        <div className="hidden items-center gap-2 md:flex">
          <span className="h-2 w-2 rounded-full bg-accent-green pulse-dot" />
          <span className="label-text">LIVE MODEL</span>
        </div>

        {/* Right: Methodology link */}
        <Link
          to="/methodology"
          className="text-[13px] text-text-secondary transition-colors duration-150 hover:text-accent-cyan"
        >
          Methodology
        </Link>
      </div>
    </motion.header>
  );
}
