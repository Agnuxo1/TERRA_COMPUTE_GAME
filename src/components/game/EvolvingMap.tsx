import { useGame } from '../../App';
import { useEffect, useState, useRef, useCallback } from 'react';
import { playSfx } from '../../hooks/useSound';

// ─── SOUND PATHS ───
function getPlaneSound(year: number): string {
  if (year < 1970) return '/assets/sounds/plane-1960.mp3';
  if (year < 1980) return '/assets/sounds/plane-1970.mp3';
  if (year < 1990) return '/assets/sounds/plane-1980.mp3';
  if (year < 2010) return '/assets/sounds/plane-2000.mp3';
  if (year < 2020) return '/assets/sounds/plane-2010.mp3';
  if (year < 2030) return '/assets/sounds/plane-2020.mp3';
  return '/assets/sounds/plane-2030.mp3';
}
const ROCKET_SOUND = '/assets/sounds/rocket-launch.mp3';
const SATELLITE_SOUND = '/assets/sounds/satellite-beep.mp3';

// ─── SINGLE GLOBE MAP ───
const GLOBE_MAP = '/assets/map-2020.jpg';

// ─── AIR ROUTES: right→left (x decreciente, use NORMAL plane image) ───
const AIR_ROUTES_RL = [
  [{x:52,y:28},{x:46,y:27},{x:40,y:28},{x:34,y:29},{x:28,y:30},{x:22,y:32}],
  [{x:72,y:30},{x:66,y:29},{x:60,y:28},{x:54,y:28}],
  [{x:80,y:32},{x:75,y:30},{x:70,y:28},{x:65,y:27},{x:55,y:28},{x:45,y:28},{x:35,y:28},{x:15,y:28}],
  [{x:82,y:55},{x:78,y:50},{x:74,y:45},{x:70,y:42}],
];

// ─── AIR ROUTES: left→right (x creciente, use MIRROR plane image) ───
const AIR_ROUTES_LR = [
  [{x:22,y:32},{x:28,y:30},{x:34,y:29},{x:40,y:28},{x:46,y:27},{x:52,y:28}],
  [{x:15,y:28},{x:25,y:28},{x:35,y:28},{x:45,y:28},{x:55,y:28},{x:65,y:28},{x:75,y:28}],
  [{x:30,y:55},{x:36,y:52},{x:42,y:50},{x:48,y:48}],
  [{x:55,y:36},{x:60,y:38},{x:65,y:40},{x:70,y:42}],
  [{x:20,y:48},{x:28,y:46},{x:36,y:44},{x:44,y:42}],
  [{x:70,y:42},{x:76,y:44},{x:82,y:46}],
];

// ─── SATELLITE ORBIT PATHS ───
const ORBIT_PATHS = [
  { cx: 50, cy: 50, rx: 35, ry: 20 },
  { cx: 50, cy: 50, rx: 40, ry: 25 },
  { cx: 50, cy: 50, rx: 30, ry: 18 },
  { cx: 50, cy: 50, rx: 45, ry: 22 },
];

// ─── IMAGE PATHS ───
function getPlaneImage(year: number): string {
  if (year < 1970) return '/assets/plane-1960.png';
  if (year < 1980) return '/assets/plane-1970.png';
  if (year < 1990) return '/assets/plane-1980.png';
  if (year < 2000) return '/assets/plane-1990.png';
  if (year < 2010) return '/assets/plane-2000.png';
  if (year < 2020) return '/assets/plane-2010.png';
  if (year < 2030) return '/assets/plane-2020.png';
  return '/assets/plane-2030.png';
}

function getPlaneImageMirror(year: number): string {
  if (year < 1970) return '/assets/plane-1960-mirror.png';
  if (year < 1980) return '/assets/plane-1970-mirror.png';
  if (year < 1990) return '/assets/plane-1980-mirror.png';
  if (year < 2000) return '/assets/plane-1990-mirror.png';
  if (year < 2010) return '/assets/plane-2000-mirror.png';
  if (year < 2020) return '/assets/plane-2010-mirror.png';
  if (year < 2030) return '/assets/plane-2020-mirror.png';
  return '/assets/plane-2030-mirror.png';
}

function getSatelliteImage(year: number): string {
  if (year < 1990) return '/assets/satellite-1960.png';
  if (year < 2030) return '/assets/satellite-2020.png';
  return '/assets/satellite-2030.png';
}

const ROCKET_IMAGE = '/assets/rocket-launch.png';

// ─── TYPES ───
interface Plane {
  id: number;
  route: Array<{x:number;y:number}>;
  progress: number;
  speed: number;
  imgKey: string;
  direction: 'rl' | 'lr';
}

interface Satellite {
  id: number;
  angle: number;
  orbitIdx: number;
  speed: number;
  imgKey: string;
}

interface RocketLaunch {
  id: number;
  progress: number; // 0 = bottom, 1 = top
  x: number;
  speed: number;
}

// ─── ERA FILTER FOR MAP ───
function getEraFilter(year: number): string {
  if (year < 1970) return 'grayscale(1) brightness(0.25) contrast(1.2)';
  if (year < 1980) return 'grayscale(0.9) brightness(0.35) contrast(1.1)';
  if (year < 1990) return 'grayscale(0.5) brightness(0.45) sepia(0.3) saturate(0.6)';
  if (year < 2000) return 'grayscale(0.2) brightness(0.6) saturate(0.8)';
  if (year < 2010) return 'brightness(0.75) saturate(1.0)';
  if (year < 2020) return 'brightness(0.9) saturate(1.1)';
  if (year < 2030) return 'brightness(1.0) saturate(1.2) hue-rotate(5deg)';
  if (year < 2040) return 'brightness(1.1) saturate(1.3) hue-rotate(10deg) drop-shadow(0 0 8px rgba(0,200,255,0.15))';
  return 'brightness(1.2) saturate(1.4) hue-rotate(15deg) drop-shadow(0 0 12px rgba(0,200,255,0.2)) contrast(1.1)';
}

function getEraLabel(year: number): string {
  if (year < 1970) return '1960s — VINTAGE';
  if (year < 1980) return '1970s — COLD WAR';
  if (year < 1990) return '1980s — ATOMIC AGE';
  if (year < 2000) return '1990s — DIGITAL DAWN';
  if (year < 2010) return '2000s — INTERNET';
  if (year < 2020) return '2010s — AI DAWN';
  if (year < 2030) return '2020s — AI RACE';
  if (year < 2040) return '2030s — INTELLIGENCE EXPLOSION';
  return '2040s — POST-ASI';
}

// ─── IMAGE PRELOADER ───
function useImagePreloader(srcs: string[]) {
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const cacheRef = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    srcs.forEach(src => {
      if (cacheRef.current[src]) return;
      const img = new Image();
      img.onload = () => {
        cacheRef.current[src] = img;
        setLoaded(prev => ({ ...prev, [src]: true }));
      };
      img.onerror = () => {
        setLoaded(prev => ({ ...prev, [src]: true })); // don't block on error
      };
      img.src = src;
    });
  }, [srcs]);

  return { loaded, cache: cacheRef.current };
}

export default function EvolvingMap() {
  const { state } = useGame();
  const [planes, setPlanes] = useState<Plane[]>([]);
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [rockets, setRockets] = useState<RocketLaunch[]>([]);
  const [bgLoaded, setBgLoaded] = useState(false);
  const planeIdRef = useRef(0);
  const satIdRef = useRef(0);
  const rocketIdRef = useRef(0);

  const year = state.year;
  const eraFilter = getEraFilter(year);
  const planeImg = getPlaneImage(year);
  const satImg = getSatelliteImage(year);

  // Count satellite buildings for orbit count
  const satBuildingCount = state.buildings.find(b => b.type === 'satellite')?.count || 0;

  // Preload all aircraft (normal + mirror) + satellite + rocket images
  const allImages = [
    '/assets/plane-1960.png', '/assets/plane-1970.png', '/assets/plane-1980.png',
    '/assets/plane-1990.png', '/assets/plane-2000.png', '/assets/plane-2010.png',
    '/assets/plane-2020.png', '/assets/plane-2030.png',
    '/assets/plane-1960-mirror.png', '/assets/plane-1970-mirror.png', '/assets/plane-1980-mirror.png',
    '/assets/plane-1990-mirror.png', '/assets/plane-2000-mirror.png', '/assets/plane-2010-mirror.png',
    '/assets/plane-2020-mirror.png', '/assets/plane-2030-mirror.png',
    '/assets/satellite-1960.png', '/assets/satellite-2020.png', '/assets/satellite-2030.png',
    '/assets/rocket-launch.png',
  ];
  const { cache: imgCache } = useImagePreloader(allImages);

  // Load background map
  useEffect(() => {
    const img = new Image();
    img.onload = () => setBgLoaded(true);
    img.src = GLOBE_MAP;
  }, []);

  // ─── SPAWN PLANES ───
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.paused) return;

      setPlanes(prev => {
        const active = prev.filter(p => p.progress < 1);

        if (active.length < 5 && Math.random() < 0.2) {
          const isLR = Math.random() < 0.5;
          const routes = isLR ? AIR_ROUTES_LR : AIR_ROUTES_RL;
          const route = routes[Math.floor(Math.random() * routes.length)];
          planeIdRef.current++;
          active.push({
            id: planeIdRef.current,
            route,
            progress: 0,
            speed: 0.01 + Math.random() * 0.006,
            imgKey: isLR ? getPlaneImageMirror(year) : getPlaneImage(year),
            direction: isLR ? 'lr' : 'rl',
          });
        }

        return active.map(p => ({
          ...p,
          progress: p.progress + p.speed * (state.speed || 1),
        }));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [state.paused, state.speed, year]);

  // ─── SATELLITE ORBIT ANIMATION ───
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.paused) return;

      setSatellites(prev => {
        // Ensure we have exactly satBuildingCount satellites
        let next = prev.map(s => ({
          ...s,
          angle: s.angle + s.speed * (state.speed || 1),
        }));

        // Add satellites if we have more buildings
        while (next.length < satBuildingCount) {
          satIdRef.current++;
          next.push({
            id: satIdRef.current,
            angle: Math.random() * 360,
            orbitIdx: next.length % ORBIT_PATHS.length,
            speed: 0.3 + Math.random() * 0.2,
            imgKey: satImg,
          });
        }

        // Remove excess satellites (shouldn't normally happen)
        if (next.length > satBuildingCount) {
          next = next.slice(0, satBuildingCount);
        }

        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [state.paused, state.speed, satBuildingCount, satImg]);

  // ─── ROCKET LAUNCH ANIMATION ───
  // When satellite count increases, trigger a rocket launch + sound
  const prevSatCount = useRef(0);
  useEffect(() => {
    if (satBuildingCount > prevSatCount.current) {
      // New satellite purchased! Launch a rocket
      const newCount = satBuildingCount - prevSatCount.current;
      for (let i = 0; i < newCount; i++) {
        rocketIdRef.current++;
        setRockets(prev => [...prev, {
          id: rocketIdRef.current + i,
          progress: 0,
          x: 20 + Math.random() * 60,
          speed: 0.008 + Math.random() * 0.004,
        }]);
      }
      // Play rocket launch sound
      playSfx(ROCKET_SOUND, 0.35);
    }
    prevSatCount.current = satBuildingCount;
  }, [satBuildingCount]);

  // Animate rockets upward
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.paused) return;

      setRockets(prev => {
        return prev
          .map(r => ({ ...r, progress: r.progress + r.speed * (state.speed || 1) }))
          .filter(r => r.progress < 1.2); // let it go a bit past top before removing
      });
    }, 50);

    return () => clearInterval(interval);
  }, [state.paused, state.speed]);

  // ─── POSITION HELPERS ───
  function getPosition(route: Array<{x:number;y:number}>, progress: number): {x:number;y:number} {
    if (route.length < 2) return route[0] || {x:50,y:50};
    const totalSegments = route.length - 1;
    const segProg = progress * totalSegments;
    const idx = Math.min(Math.floor(segProg), totalSegments - 1);
    const t = segProg - idx;
    const a = route[idx], b = route[idx + 1];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function getOrbitPosition(orbitIdx: number, angleDeg: number): {x:number;y:number} {
    const orbit = ORBIT_PATHS[orbitIdx % ORBIT_PATHS.length];
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: orbit.cx + orbit.rx * Math.cos(rad),
      y: orbit.cy + orbit.ry * Math.sin(rad),
    };
  }

  // ─── OCCASIONAL PLANE SOUNDS (soft, rare, era-appropriate) ───
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.paused || planes.length === 0) return;
      // 0.3% chance every 2 seconds = ~1 plane sound per 10 min of real time
      if (Math.random() < 0.003) {
        const sound = getPlaneSound(state.year);
        playSfx(sound, 0.15); // very soft
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [state.paused, state.year, planes.length]);

  // ─── OCCASIONAL SATELLITE BEEP (Sputnik-style, very rare) ───
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.paused || satellites.length === 0) return;
      // 0.15% chance every 3 seconds = ~1 beep per 15-20 min of real time
      if (Math.random() < 0.0015) {
        playSfx(SATELLITE_SOUND, 0.2);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [state.paused, satellites.length]);

  // ─── BUILDING CARD MAP (replacing emojis with card art) ───
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

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#050508' }}>

      {/* Globe map with era filter */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${GLOBE_MAP})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: bgLoaded ? 1 : 0,
          filter: eraFilter,
          transition: 'filter 3s ease, opacity 1s ease',
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: year < 1970
            ? 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.8) 100%)'
            : year < 2000
              ? 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)'
              : 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.3) 100%)',
          transition: 'background 3s ease',
        }}
      />

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(0,240,255,0.015) 50px), repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(0,240,255,0.015) 50px)',
          backgroundSize: '50px 50px',
          opacity: year >= 1990 ? 1 : 0,
          transition: 'opacity 3s ease',
        }}
      />

      {/* ─── SATELLITES IN ORBIT ─── */}
      {satellites.map(s => {
        const pos = getOrbitPosition(s.orbitIdx, s.angle);
        const hasImg = imgCache[s.imgKey];
        return (
          <div
            key={`sat-${s.id}`}
            className="absolute pointer-events-none"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 25,
              width: '36px',
              height: '24px',
            }}
          >
            {hasImg ? (
              <img
                src={s.imgKey}
                alt="satellite"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  filter: year >= 2020 ? 'drop-shadow(0 0 6px rgba(0,200,255,0.6))' : 'none',
                  opacity: 0.85,
                }}
                draggable={false}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0,240,255,0.4), transparent)',
                boxShadow: '0 0 8px rgba(0,240,255,0.3)',
              }} />
            )}
          </div>
        );
      })}

      {/* ─── PLANES WITH REAL IMAGES ─── */}
      {planes.map(p => {
        const pos = getPosition(p.route, p.progress);
        const hasImg = imgCache[p.imgKey];
        return (
          <div
            key={`plane-${p.id}`}
            className="absolute pointer-events-none"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 20,
              width: year >= 2020 ? '40px' : '32px',
              height: year >= 2020 ? '26px' : '22px',
              transition: 'left 0.15s linear, top 0.15s linear',
            }}
          >
            {hasImg ? (
              <img
                src={p.imgKey}
                alt="aircraft"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  filter: year >= 2020
                    ? 'drop-shadow(0 0 4px rgba(0,200,255,0.5))'
                    : year < 1980
                      ? 'brightness(0.8) contrast(1.2)'
                      : 'none',
                }}
                draggable={false}
              />
            ) : (
              // Fallback while loading
              <div style={{
                width: '100%', height: '100%',
                background: 'rgba(200,220,255,0.3)',
                borderRadius: '2px',
                boxShadow: '0 0 4px rgba(200,220,255,0.3)',
              }} />
            )}
          </div>
        );
      })}

      {/* ─── ROCKET LAUNCH ANIMATIONS ─── */}
      {rockets.map(r => {
        const bottom = r.progress * 110; // starts at 0, goes past 100
        const opacity = r.progress > 0.85 ? 1 - (r.progress - 0.85) / 0.35 : 1;
        const hasImg = imgCache[ROCKET_IMAGE];
        return (
          <div
            key={`rocket-${r.id}`}
            className="absolute pointer-events-none"
            style={{
              left: `${r.x}%`,
              bottom: `${-10 + bottom}%`,
              transform: 'translate(-50%, 0)',
              zIndex: 30,
              width: '28px',
              height: '48px',
              opacity,
            }}
          >
            {hasImg ? (
              <img
                src={ROCKET_IMAGE}
                alt="rocket"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
                draggable={false}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(to top, orange, white, transparent)',
                clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
              }} />
            )}
          </div>
        );
      })}

      {/* ─── BUILDING ICONS ON TERRITORIES ─── */}
      {state.buildingIcons.map((icon, i) => {
        const isCompute = ['lab', 'uni', 'mainframe', 'super', 'datacenter', 'gpucluster', 'aifactory'].includes(icon.type);
        const isSatellite = icon.type === 'satellite';
        const cardImg = buildingCardMap[icon.type];
        return (
          <div
            key={`bld-${i}`}
            className="absolute"
            style={{
              left: `${icon.x}%`,
              top: `${icon.y}%`,
              transform: 'translate(-50%, -50%)',
              width: year >= 2030 ? '20px' : year >= 2010 ? '18px' : '16px',
              height: year >= 2030 ? '14px' : year >= 2010 ? '12px' : '11px',
              zIndex: isSatellite ? 26 : 15,
              filter: (isCompute && year >= 2020) || isSatellite
                ? 'drop-shadow(0 0 4px rgba(0,200,255,0.5))'
                : 'none',
              animation: 'building-pop 0.5s ease-out forwards',
              animationDelay: `${i * 0.08}s`,
            }}
          >
            {cardImg ? (
              <img src={cardImg} alt={icon.type} style={{ width: '100%', height: '100%', objectFit: 'contain' }} draggable={false} />
            ) : (
              <div style={{ width: '100%', height: '100%', borderRadius: '2px', background: 'rgba(200,220,255,0.3)' }} />
            )}
          </div>
        );
      })}

      {/* ─── ERA INDICATOR ─── */}
      <div className="absolute top-2 left-[152px] max-md:left-[112px] px-2 py-1 rounded font-orbitron text-[9px] font-bold"
        style={{
          background: year < 1970 ? 'rgba(0,0,0,0.7)' : year < 1990 ? 'rgba(139,119,85,0.4)' : year < 2010 ? 'rgba(0,0,0,0.5)' : 'rgba(0,100,150,0.3)',
          color: year < 1970 ? '#888' : year < 1990 ? '#C4A265' : year < 2000 ? '#00F0FF' : year < 2010 ? '#FFF' : year < 2030 ? '#00E5FF' : '#7B61FF',
          border: `1px solid ${year < 1970 ? '#333' : year < 1990 ? '#C4A26544' : year < 2000 ? '#00F0FF44' : year < 2010 ? '#FFF22' : year < 2030 ? '#00E5FF44' : '#7B61FF44'}`,
          zIndex: 50,
          transition: 'all 3s ease',
        }}>
        {Math.floor(year)} — {getEraLabel(year)}
      </div>

      {/* ─── VEHICLE COUNT (planes only, + satellites) ─── */}
      <div className="absolute bottom-2 left-[152px] max-md:left-[112px] flex items-center gap-2 px-2 py-1 rounded font-mono-data text-[8px]"
        style={{ background: 'rgba(5,5,8,0.7)', color: 'var(--text-tertiary)', border: '1px solid var(--border)', zIndex: 50 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <img src={planeImg} alt="" style={{ width: '16px', height: '10px', objectFit: 'contain', opacity: 0.7 }} />
          {planes.length}
        </span>
        {satellites.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '6px' }}>
            <img src={satImg} alt="" style={{ width: '14px', height: '10px', objectFit: 'contain', opacity: 0.7 }} />
            {satellites.length}
          </span>
        )}
        {rockets.length > 0 && (
          <span style={{ color: 'var(--amber)', marginLeft: '4px' }}>
            🚀 launching...
          </span>
        )}
      </div>

      {/* ─── SATELLITE BONUS INDICATOR ─── */}
      {satellites.length > 0 && (
        <div className="absolute top-2 right-2 px-2 py-1 rounded font-mono-data text-[8px]"
          style={{
            background: 'rgba(0,100,150,0.3)',
            color: '#00E5FF',
            border: '1px solid rgba(0,229,255,0.3)',
            zIndex: 50,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <img src={satImg} alt="" style={{ width: '16px', height: '11px', objectFit: 'contain' }} />
            <span>+{satellites.length * 5}% DATA</span>
          </div>
        </div>
      )}

      {/* ─── FILM GRAIN FOR VINTAGE ─── */}
      {year < 1980 && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
          zIndex: 5,
        }} />
      )}
    </div>
  );
}
