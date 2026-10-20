// Code-split screens can fail to download (flaky network, a redeploy while the tab was open).
// lazyRetry() retries the import before giving up; ChunkBoundary shows a way out instead of a blank page.
import { Component, lazy, type ComponentType, type ReactNode } from 'react';
import { t } from '../i18n';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    for (let i = 0; ; i++) {
      try { return await factory(); } catch (e) {
        if (i >= 2) throw e;
        await new Promise(r => setTimeout(r, 800 * (i + 1)));
      }
    }
  });
}

interface Props { children: ReactNode; onSkip?: () => void; skipLabel?: string }

export default class ChunkBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" style={{ background: 'rgba(5,6,8,0.92)' }}>
        <div className="max-w-sm w-full rounded-lg p-4 flex flex-col gap-3 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--amber)' }}>
          <span className="font-orbitron text-sm font-bold" style={{ color: 'var(--amber)' }}>{t('TRANSMISSION LOST')}</span>
          <span className="font-rajdhani text-[14px]" style={{ color: 'var(--text-secondary)' }}>{t('Part of the game could not be downloaded. Check the connection and try again.')}</span>
          <div className="flex gap-2 justify-center">
            {this.props.onSkip && (
              <button onClick={() => { this.setState({ failed: false }); this.props.onSkip?.(); }} className="font-mono-data text-[11px] px-4 py-2 rounded" style={{ color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}>
                {this.props.skipLabel ?? t('SKIP')}
              </button>
            )}
            <button onClick={() => window.location.reload()} className="font-mono-data text-[11px] px-4 py-2 rounded" style={{ color: '#050608', background: 'var(--amber)' }}>{t('RELOAD')}</button>
          </div>
        </div>
      </div>
    );
  }
}
