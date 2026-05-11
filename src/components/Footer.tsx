import { motion } from 'framer-motion';

const sources = [
  { name: 'Epoch AI', desc: 'Compute Trends' },
  { name: 'Stanford HAI', desc: 'AI Index Report' },
  { name: 'IEA', desc: 'Energy Projections' },
  { name: 'arXiv', desc: 'Research Papers' },
  { name: 'WSTS', desc: 'Semiconductor Data' },
];

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="border-t border-border bg-void"
    >
      <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          {/* Left: Data Sources */}
          <div>
            <div className="label-text mb-3">Data Sources</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {sources.map((s) => (
                <div key={s.name} className="flex flex-col">
                  <span className="text-[13px] text-text-primary">{s.name}</span>
                  <span className="text-[11px] text-text-tertiary">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Center: Disclaimer */}
          <div className="max-w-sm">
            <p className="text-[13px] leading-relaxed text-text-tertiary">
              This simulation is for educational and research purposes. Projections are
              based on extrapolation of current trends and should not be interpreted as
              predictions. All models are wrong, some are useful.
            </p>
          </div>

          {/* Right: Status */}
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-green pulse-dot" />
            <span className="data-text text-[11px] text-text-secondary">
              Built with real data. All projections are estimates.
            </span>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
