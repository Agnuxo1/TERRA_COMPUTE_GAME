import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { Link } from 'react-router-dom';

export default function Methodology() {
  return (
    <Layout>
      <div className="mx-auto max-w-[1440px] px-4 py-16 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Back link */}
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-[13px] text-text-secondary transition-colors hover:text-accent-cyan"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Dashboard
          </Link>

          <h1 className="mb-6 font-display text-4xl font-semibold text-text-primary">
            Methodology
          </h1>

          <div className="panel mb-6">
            <h2 className="mb-4 font-display text-xl font-medium text-text-primary">
              Coming Soon
            </h2>
            <p className="text-[15px] leading-relaxed text-text-secondary">
              The full methodology documentation is being prepared. This page will contain detailed
              explanations of the mathematical model, data sources, parameter justification,
              validation against historical data, and sensitivity analysis.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: 'Simulation Model',
                desc: 'Discrete-time difference equations modeling compute growth, investment allocation, and capability index.',
              },
              {
                title: 'Data Sources',
                desc: 'Epoch AI, Stanford HAI AI Index, IEA energy projections, TSMC financial reports, arXiv research.',
              },
              {
                title: 'Validation',
                desc: 'Historical calibration against GPT-2, GPT-3, GPT-4, and Grok-3 compute estimates.',
              },
              {
                title: 'Parameters',
                desc: 'Sensitivity analysis and justification for all 12 model parameters.',
              },
            ].map((item) => (
              <div key={item.title} className="card">
                <h3 className="mb-2 font-display text-base font-medium text-text-primary">
                  {item.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-text-secondary">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
