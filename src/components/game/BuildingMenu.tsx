import { useState } from 'react';
import { useGame, buildings, getScaledBuildingCost } from '../../App';
import { play } from '../../hooks/useSound';
import { isVideoPlayed, markVideoPlayed, getVideoUrl } from '../../hooks/useVideo';
import VideoPlayer from './VideoPlayer';

interface BuildingCategory {
  key: string;
  label: string;
  color: string;
}

const categories: BuildingCategory[] = [
  { key: 'population', label: 'POPULATION', color: '#22C55E' },
  { key: 'economy', label: 'ECONOMY', color: '#FFB84D' },
  { key: 'education', label: 'EDUCATION', color: '#7B61FF' },
  { key: 'compute', label: 'COMPUTE', color: '#00F0FF' },
  { key: 'energy', label: 'ENERGY', color: '#FF8C42' },
  { key: 'production', label: 'PRODUCTION', color: '#8A8D9A' },
  { key: 'defense', label: 'DEFENSE', color: '#FF477E' },
  { key: 'telecom', label: 'TELECOM', color: '#00E5FF' },
];

const buildingCardMap: Record<string, string> = {
  housing: '/assets/cards/build-housing.png', farm: '/assets/cards/build-farm.png',
  factory: '/assets/cards/build-factory.png', hospital: '/assets/cards/build-hospital.png',
  school: '/assets/cards/build-school.png', market: '/assets/cards/build-market.png',
  seaport: '/assets/cards/build-seaport.png', lab: '/assets/cards/build-lab.png',
  uni: '/assets/cards/build-uni.png', mainframe: '/assets/cards/build-mainframe.png',
  super: '/assets/cards/build-super.png', datacenter: '/assets/cards/build-datacenter.png',
  gpucluster: '/assets/cards/build-gpucluster.png', aifactory: '/assets/cards/build-aifactory.png',
  chipfab: '/assets/cards/build-chipfab.png', coal: '/assets/cards/build-coal.png',
  nuclear: '/assets/cards/build-nuclear.png', solar: '/assets/cards/build-solar.png',
  defense: '/assets/cards/build-defense.png', satellite: '/assets/cards/build-satellite.png',
};

// ═══════════════════════════════════════════════════════════════════════════════
//  UNLOCK REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════════════════

const buildingReqs: Record<string, { phase?: number; minEducation?: number; minEnergyStable?: number; minCompute?: number; year?: number }> = {
  housing: {}, farm: {}, hospital: {}, school: {}, coal: {},
  factory: { phase: 2 }, market: { phase: 2 }, seaport: { phase: 2 }, nuclear: { phase: 2 }, lab: { phase: 2 }, mainframe: { phase: 2 },
  uni: { phase: 3, minEducation: 40 }, super: { phase: 3 }, solar: { phase: 3 }, chipfab: { phase: 3 },
  datacenter: { phase: 4, minCompute: 1e12 },
  gpucluster: { phase: 5, minCompute: 1e15 }, aifactory: { phase: 5, minCompute: 1e15 }, defense: { phase: 3, minEducation: 40 },
  satellite: { phase: 6, minCompute: 1e18 },
};

const phaseNames: Record<number, string> = {
  1: 'Foundations',
  2: 'Industrial Era',
  3: 'Knowledge Era',
  4: 'Digital Age',
  5: 'AI Era',
  6: 'Singularity',
};

function getCurrentPhase(state: { year: number; compute: number; education: number }): { phase: number; name: string } {
  const y = state.year;
  const c = state.compute;
  const e = state.education;
  if (y >= 2020 && c >= 1e18) return { phase: 6, name: phaseNames[6] };
  if (y >= 2010 && c >= 1e15) return { phase: 5, name: phaseNames[5] };
  if (y >= 1995 && c >= 1e12) return { phase: 4, name: phaseNames[4] };
  if (y >= 1975 && (e >= 40 || c >= 1e9)) return { phase: 3, name: phaseNames[3] };
  if (y >= 1965) return { phase: 2, name: phaseNames[2] };
  return { phase: 1, name: phaseNames[1] };
}

function isBuildingUnlocked(bId: string, state: { year: number; compute: number; education: number }): boolean {
  const req = buildingReqs[bId];
  if (!req) return true;
  const phase = getCurrentPhase(state).phase;
  if (req.phase && phase < req.phase) return false;
  if (req.minEducation && state.education < req.minEducation) return false;
  if (req.minCompute && state.compute < req.minCompute) return false;
  if (req.year && state.year < req.year) return false;
  return true;
}

function formatUnlockReq(bId: string): string {
  const req = buildingReqs[bId];
  if (!req) return '';
  const parts: string[] = [];
  if (req.phase) parts.push(`Phase ${req.phase}: ${phaseNames[req.phase] || ''}`);
  if (req.minEducation) parts.push(`Education >= ${req.minEducation}`);
  if (req.minCompute) parts.push(`Compute >= ${req.minCompute >= 1e18 ? (req.minCompute / 1e18).toFixed(0) + 'EF' : req.minCompute >= 1e15 ? (req.minCompute / 1e15).toFixed(0) + 'PF' : req.minCompute >= 1e12 ? (req.minCompute / 1e12).toFixed(0) + 'TF' : req.minCompute >= 1e9 ? (req.minCompute / 1e9).toFixed(0) + 'GF' : req.minCompute + 'F'}`);
  if (req.year) parts.push(`Year ${req.year}`);
  return parts.join(' | ');
}

function fmtPeopleMillions(n: number): string {
  if (Math.abs(n) >= 1) return `${n.toFixed(n >= 10 ? 0 : 1)}M`;
  return `${Math.round(n * 1000)}K`;
}

function calculateROI(b: typeof buildings[0], state: { compute: number; algorithmicEfficiency: number; gdp: number }): string {
  if (b.category === 'compute' && b.compute > 0) {
    const effectiveCompute = b.compute * state.algorithmicEfficiency;
    const pct = (effectiveCompute / Math.max(state.compute, 1)) * 100;
    return `+${pct < 0.01 && pct > 0 ? pct.toFixed(2) : pct >= 100 ? pct.toFixed(0) : pct.toFixed(1)}% compute`;
  }
  if (b.category === 'energy' && b.energyProduce > 0) {
    return `+${b.energyProduce} TWh`;
  }
  if (b.category === 'economy' && b.outputAmount > 0) {
    return `+$${b.outputAmount}B/y economy`;
  }
  if (b.category === 'population') {
    if (b.workersProvided > 0) return `+${fmtPeopleMillions(b.workersProvided)} housing`;
    if (b.outputAmount > 0 && b.id === 'farm') return `feeds ~${fmtPeopleMillions(b.outputAmount)}`;
  }
  if (b.category === 'education' && b.compute > 0) {
    return `+${b.compute >= 1e9 ? (b.compute / 1e9).toFixed(0) + 'G' : b.compute >= 1e6 ? (b.compute / 1e6).toFixed(0) + 'M' : b.compute}F`;
  }
  if (b.category === 'production' && b.outputAmount > 0) {
    return `+${b.outputAmount} materials/tick`;
  }
  if (b.category === 'defense') {
    return `+${b.outputAmount} safety now`;
  }
  if (b.category === 'telecom') {
    return `+${b.outputAmount}% data gen`;
  }
  return '';
}

export default function BuildingMenu() {
  const { state, dispatch } = useGame();
  const [energyWarning, setEnergyWarning] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [pendingBuild, setPendingBuild] = useState<string | null>(null);

  const currentPhase = getCurrentPhase(state);

  const handleBuild = (bId: string) => {
    const b = buildings.find(x => x.id === bId);
    const owned = state.buildings.find(x => x.type === bId)?.count || 0;
    const scaledCost = getScaledBuildingCost(bId, owned);
    if (!b || state.gdp < scaledCost) return;
    // Check energy requirement
    if (b.energyUse > 0 && state.energy < b.energyUse) {
      setEnergyWarning(`⚠ Insufficient energy for ${b.name}! Build power plants first.`);
      play('alert');
      // Auto-dismiss after 3 seconds
      setTimeout(() => setEnergyWarning(null), 3000);
      return;
    }
    setEnergyWarning(null);
    play('build');

    const videoId = `build-${bId}`;
    if (!isVideoPlayed(videoId)) {
      markVideoPlayed(videoId);
      setVideoSrc(getVideoUrl(videoId));
      setPendingBuild(bId);
    } else {
      dispatch({ type: 'BUILD', buildingId: bId });
    }
  };

  const handleVideoComplete = () => {
    setVideoSrc(null);
    if (pendingBuild) {
      dispatch({ type: 'BUILD', buildingId: pendingBuild });
      setPendingBuild(null);
    }
  };

  const handleClose = () => {
    play('click');
    dispatch({ type: 'CLOSE_OVERLAY' });
  };

  return (
    <div className="h-full flex flex-col" style={{
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 shrink-0" style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-elevated)',
      }}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-orbitron text-xs font-bold" style={{ color: 'var(--green)' }}>CONSTRUCTION</h2>
            <span className="font-orbitron text-[7px] px-1 py-0.5 rounded" style={{
              background: 'var(--cyan-dim)',
              color: 'var(--cyan)',
              border: '1px solid var(--cyan)',
            }}>
              PHASE {currentPhase.phase}: {currentPhase.name.toUpperCase()}
            </span>
          </div>
          <p className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>
            Budget: {state.gdp >= 1e6 ? '$'+(state.gdp/1e6).toFixed(1)+'M' : '$'+Math.floor(state.gdp)+'B'}
            {' | '}Workers: {fmtPeopleMillions(state.employed)}
          </p>
        </div>
        <button onClick={handleClose}
          className="px-2 py-0.5 rounded font-mono-data text-[9px]"
          style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid var(--rose)' }}>
          ✕
        </button>
      </div>

      {/* Energy Warning */}
      {energyWarning && (
        <div className="shrink-0 px-2 py-1 font-mono-data text-[8px]" style={{
          background: 'rgba(255, 140, 66, 0.15)',
          borderBottom: '1px solid #FF8C42',
          color: '#FF8C42',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }}>
          {energyWarning}
        </div>
      )}

      {/* Building list - grouped by category */}
      <div className="flex-1 overflow-auto p-1.5" style={{ minHeight: 0 }}>
        <div className="flex flex-col gap-3">
          {categories.map(cat => {
            const catBuildings = buildings.filter(b => b.category === cat.key);
            if (catBuildings.length === 0) return null;

            return (
              <div key={cat.key}>
                {/* Category header */}
                <div className="flex items-center gap-1 mb-1.5 px-0.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />
                  <span className="font-orbitron text-[7px] tracking-wider" style={{ color: cat.color }}>
                    {cat.label}
                  </span>
                </div>

                {/* Buildings in this category - card style */}
                <div className="flex flex-col gap-1.5">
                  {catBuildings.map(b => {
                    const owned = state.buildings.find(x => x.type === b.id);
                    const count = owned?.count || 0;
                    const scaledCost = getScaledBuildingCost(b.id, count);
                    const canAfford = state.gdp >= scaledCost;
                    const yearOk = state.year >= b.yearRequired;
                    const unlocked = isBuildingUnlocked(b.id, state);
                    const hasEnoughEnergy = b.energyUse === 0 || state.energy >= b.energyUse;
                    const cardImg = buildingCardMap[b.id];
                    const roiText = calculateROI(b, state);
                    const isEnergyBlocked = b.energyUse > 0 && !hasEnoughEnergy;
                    const clickable = yearOk && canAfford && unlocked && hasEnoughEnergy;

                    return (
                      <button
                        key={b.id}
                        onClick={() => clickable ? handleBuild(b.id) : play('alert')}
                        className="relative flex items-end rounded overflow-hidden text-left transition-all hover:brightness-120 hover:scale-[1.02]"
                        style={{
                          height: unlocked ? '96px' : '80px',
                          border: `2px solid ${isEnergyBlocked ? '#FF8C42' : clickable ? cat.color + '66' : unlocked ? cat.color + '33' : 'var(--border)'}`,
                          opacity: unlocked ? 1 : 0.45,
                          cursor: clickable ? 'pointer' : 'not-allowed',
                          boxShadow: isEnergyBlocked ? '0 2px 8px rgba(255, 140, 66, 0.2)' : clickable ? `0 2px 8px ${cat.color}22` : 'none',
                          filter: unlocked ? 'none' : 'brightness(0.3)',
                        }}
                      >
                        {/* Card background */}
                        <div className="absolute inset-0" style={{
                          backgroundImage: `url(${cardImg})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          filter: clickable ? 'brightness(0.5) saturate(0.9)' : unlocked ? 'brightness(0.35) saturate(0.6)' : 'brightness(0.3) saturate(0.4) grayscale(0.5)',
                          transition: 'filter 0.2s ease',
                        }} />
                        {/* Dark overlay */}
                        <div className="absolute inset-0" style={{
                          background: clickable
                            ? `linear-gradient(to top, ${cat.color}33 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 100%)`
                            : isEnergyBlocked
                              ? 'linear-gradient(to top, rgba(255, 140, 66, 0.2) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 100%)'
                              : 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 100%)',
                        }} />

                        {/* Lock overlay for locked buildings */}
                        {!unlocked && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ background: 'rgba(0,0,0,0.4)' }}>
                            <span className="text-lg" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }}>🔒</span>
                            <span className="font-mono-data text-[6px] mt-0.5 px-1.5 py-0.5 rounded" style={{
                              background: 'rgba(0,0,0,0.6)',
                              color: '#FF8C42',
                              textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                              border: '1px solid rgba(255, 140, 66, 0.3)',
                              maxWidth: '95%',
                              textAlign: 'center',
                              lineHeight: '1.3',
                            }}>
                              Requires: {formatUnlockReq(b.id)}
                            </span>
                          </div>
                        )}

                        {/* Content */}
                        <div className="relative z-10 w-full p-1.5">
                          {/* Name row */}
                          <div className="flex items-center justify-between">
                            <span className="font-orbitron text-[9px] font-bold tracking-wider truncate" style={{
                              color: '#FFFFFF',
                              textShadow: `0 1px 3px rgba(0,0,0,0.9), 0 0 4px ${cat.color}66`,
                            }}>
                              {b.name.toUpperCase()}
                            </span>
                            {count > 0 && (
                              <span className="font-mono-data text-[8px] px-1 rounded shrink-0" style={{
                                background: cat.color + '44', color: '#FFF',
                                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                border: `1px solid ${cat.color}66`,
                              }}>
                                x{count}
                              </span>
                            )}
                          </div>
                          {/* Stats row */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            <span className="font-mono-data text-[8px] font-bold" style={{
                              color: canAfford ? '#00E5A0' : '#FF477E',
                              textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                            }}>
                              ${scaledCost >= 1e6 ? (scaledCost/1e6).toFixed(0)+'M' : scaledCost}B
                            </span>
                            {b.energyUse > 0 && (
                              <span className="font-mono-data text-[7px]" style={{ color: '#FFB84D', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                                ⚡-{b.energyUse}
                              </span>
                            )}
                            {b.energyProduce > 0 && (
                              <span className="font-mono-data text-[7px]" style={{ color: '#00E5A0', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                                ⚡+{b.energyProduce}
                              </span>
                            )}
                            {b.compute > 0 && (
                              <span className="font-mono-data text-[7px]" style={{ color: '#00F0FF', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                                {b.compute >= 1e15 ? (b.compute/1e15).toFixed(0)+'P' : b.compute >= 1e12 ? (b.compute/1e12).toFixed(0)+'T' : b.compute >= 1e9 ? (b.compute/1e9).toFixed(0)+'G' : (b.compute/1e6).toFixed(0)+'M'}F
                              </span>
                            )}
                            {b.workersNeeded > 0 && (
                              <span className="font-mono-data text-[7px]" style={{ color: '#FFFFFFAA', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                                👤{b.workersNeeded >= 1000 ? (b.workersNeeded/1000).toFixed(0)+'K' : b.workersNeeded}
                              </span>
                            )}
                          </div>
                          {/* ROI row */}
                          {roiText && unlocked && (
                            <div className="mt-0.5">
                              <span className="font-mono-data text-[6px]" style={{
                                color: cat.color + 'CC',
                                textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                              }}>
                                {roiText}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {videoSrc && (
        <VideoPlayer src={videoSrc} onComplete={handleVideoComplete} />
      )}
    </div>
  );
}
