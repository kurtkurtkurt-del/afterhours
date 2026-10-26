import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Image } from 'expo-image';
import { Asset } from 'expo-asset';
import { useTrack } from '@/audio/useTrack';
import { recordFor, recordThumb } from '@/components/Sleeve';
import { useHere } from '@/data/here';
import { onListenKey, useFront } from '@/lib/front';
import { FRAME, FRAME_FROM } from '@/lib/webFrame';
import { useLang } from '@/i18n';
import { colors, fonts, ground } from '@/theme/tokens';

// What stands beside the app on a computer (owner, 26.10.2026, design A of
// prototypes/desktop-mix.html): on the left the app introduced — the name, one line, the
// stores — and the keys the flow answers to; on the right the night on top of the deck:
// its "who is this?", its preview with the beat, and the city's record turning. Both
// sides take the colour of the top card's photo, laid over the page's own ground, so they
// belong to the page in the light theme and the dark, and the accent is the app's.
// Only on a wide window (lib/webFrame.ts); the phone and narrow windows draw nothing.
const PLAY = 'https://play.google.com/store/apps/details?id=app.afterhours.android';
// before a card is on top (the start page, sign-in): the app's own opening photo gives the colour
const OPENING = Asset.fromModule(require('../../assets/intro/concert.jpg')).uri;

function useWide() {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= FRAME_FROM);
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= FRAME_FROM);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return wide;
}

export default function WebSides() {
  const wide = useWide();
  // the layer the sides draw into, first in the body so it stays under the app's column
  const [host] = useState<HTMLElement | null>(() => {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById('sides');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sides';
      document.body.insertBefore(el, document.body.firstChild);
    }
    return el;
  });
  if (!wide || !host) return null;
  return createPortal(<Sides />, host);
}

const KEYS: [string, 'letgo' | 'keep' | 'ticket' | 'details' | 'listen' | 'undo'][] = [
  ['←', 'letgo'],
  ['→', 'keep'],
  ['↑', 'ticket'],
  ['↓', 'details'],
  ['space', 'listen'],
  ['z', 'undo'],
];

function Sides() {
  const { t, up } = useLang();
  const front = useFront();
  const here = useHere();
  const track = useTrack();
  const [hit, setHit] = useState<string | null>(null);
  const preview = front?.preview ?? null;
  const playing = !!front && track.playing === front.id;
  const toggle = () => {
    if (front && preview) track.play(front.id, { uri: preview.preview_url });
  };
  useEffect(() => onListenKey(toggle));
  // a key pressed lights up for a moment
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', ' ': 'space', z: 'z', Z: 'z' }[e.key];
      if (!k) return;
      setHit(k);
      setTimeout(() => setHit((h) => (h === k ? null : h)), 220);
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);
  // a new card stops the last one's preview
  useEffect(() => () => track.stop(), [front?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const about = front?.about ?? null;
  const record = recordFor(front?.city ?? here.city) ?? recordThumb(null);
  const photo = front?.photo ?? OPENING;
  const side = `calc(50% - ${FRAME / 2}px)`;

  return (
    <div className="ah-sides" aria-hidden={false}>
      <style>{CSS}</style>
      {/* the colour: the page's ground, the top card's photo blurred over it */}
      <div className="ah-ground" />
      {photo ? <div key={photo} className="ah-amb" style={{ backgroundImage: `url("${photo}")` }} /> : null}
      <div className="ah-veil" />

      <section className="ah-side ah-left" style={{ width: side }}>
        <div className="ah-in">
          <div className="ah-logo">
            afterhours<span className="ah-red">.</span>
          </div>
          <div className="ah-line">
            {t('sides.line')}
            <span className="ah-red">.</span>
          </div>
          <p className="ah-body">{t('sides.body')}</p>
          <div className="ah-stores">
            <a className="ah-store" href={PLAY} target="_blank" rel="noopener noreferrer">
              <small>{t('sides.play.small')}</small>
              <b>{t('sides.play.big')}</b>
            </a>
            <span className="ah-store ah-soon">
              <small>{t('sides.ios.small')}</small>
              <b>{t('sides.ios.big')}</b>
            </span>
          </div>
          <div className="ah-keys">
            {KEYS.map(([k, w]) => (
              <span key={k}>
                <kbd className={`${k === '→' ? 'ah-keep' : ''} ${hit === k ? 'ah-hit' : ''}`}>{k}</kbd>
                {t(`sides.key.${w}`)}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="ah-side ah-right" style={{ width: side }}>
        <div className="ah-in">
          {about ? (
            <>
              <div className="ah-mono">{up(about.kicker)}</div>
              <div className="ah-who">{about.name.toLowerCase()}</div>
              {about.who ? <p className="ah-text">{about.who}</p> : null}
              {about.facts.length ? (
                <div className="ah-facts">
                  {about.facts.slice(0, 2).map((f, i) => (
                    <div key={i}>
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      {f}
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : front ? (
            <>
              <div className="ah-mono">{up(t('sides.now'))}</div>
              <div className="ah-who">{front.title.toLowerCase()}</div>
              {front.venue ? <p className="ah-text">{front.venue.toLowerCase()}</p> : null}
            </>
          ) : (
            <p className="ah-text">{t('sides.empty')}</p>
          )}
          {preview ? (
            <div className="ah-np">
              <button className="ah-play" onClick={toggle} type="button">
                <i>{playing ? '❚❚' : '▶'}</i>
                {playing ? t('sides.stop') : t('sides.listen')}
              </button>
              <div className={`ah-eq ${playing ? 'ah-on' : ''}`}>
                {Array.from({ length: 14 }, (_, i) => (
                  <i key={i} style={{ animationDelay: `${((i * 0.13) % 0.9).toFixed(2)}s` }} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {record ? (
          <div className={`ah-rec ${playing ? 'ah-fast' : ''}`}>
            <Image source={record} style={{ position: 'absolute', top: '31%', left: '31%', width: '38%', height: '38%', borderRadius: 999 }} contentFit="cover" />
          </div>
        ) : null}
      </section>
    </div>
  );
}

const CSS = `
.ah-sides { position: fixed; inset: 0; z-index: 0; overflow: hidden; font-family: ${fonts.regular}, system-ui, sans-serif; color: ${colors.paper}; }
.ah-ground { position: absolute; inset: 0; background: ${colors.ink}; }
.ah-amb { position: absolute; inset: -80px; background: center/cover no-repeat; filter: blur(46px) saturate(1.45); transform: scale(1.15); opacity: .78; }
.ah-veil { position: absolute; inset: 0; background: ${ground(0.3)}; }
/* toward the column the page's ground comes back, so the app's edge sits in its own colour */
.ah-veil::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, ${ground(0.55)} calc(50% - ${FRAME / 2 + 40}px), ${ground(0.55)} calc(50% + ${FRAME / 2 + 40}px), transparent 100%); }
.ah-side { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; padding: 0 clamp(24px, 4vw, 64px); overflow: hidden; }
.ah-left { left: 0; }
.ah-right { right: 0; }
.ah-in { position: relative; z-index: 1; width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 16px; }
.ah-red { color: ${colors.spotText}; }
.ah-logo { font-family: ${fonts.logo}; font-size: 24px; letter-spacing: -0.4px; }
.ah-line { font-family: ${fonts.logo}; font-size: clamp(30px, 3.2vw, 46px); line-height: .95; letter-spacing: -0.8px; }
.ah-body { font-size: 14px; line-height: 1.5; opacity: .75; margin: 0; }
.ah-stores { display: flex; gap: 10px; flex-wrap: wrap; }
.ah-store { display: flex; flex-direction: column; line-height: 1.2; padding: 8px 13px; border-radius: 11px; border: 1px solid ${colors.ink3}; background: ${ground(0.35)}; color: inherit; text-decoration: none; font-size: 10px; }
.ah-store b { font-family: ${fonts.semibold}; font-size: 14px; font-weight: normal; }
.ah-store:hover { border-color: ${colors.paper}; }
.ah-soon { opacity: .6; }
.ah-keys { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 10px; padding-top: 16px; border-top: 1px solid ${colors.ink3}; font-size: 12px; opacity: .9; }
.ah-keys span { display: inline-flex; align-items: center; gap: 7px; }
.ah-sides kbd { min-width: 28px; height: 28px; padding: 0 8px; border-radius: 7px; display: inline-grid; place-items: center; font-family: ${fonts.medium}; font-size: 12.5px; color: ${colors.paper}; background: ${ground(0.6)}; box-shadow: inset 0 -2px 0 ${ground(0.9)}, 0 0 0 1px ${colors.ink3}; transition: transform .12s, background .12s, color .12s; }
.ah-sides kbd.ah-keep { background: ${colors.spot}; color: ${colors.onSpot}; box-shadow: inset 0 -2px 0 rgba(0,0,0,.25); }
.ah-sides kbd.ah-hit { transform: translateY(1px); background: ${colors.paper}; color: ${colors.ink}; }
.ah-mono { font-family: ${fonts.jet}; font-size: 10px; letter-spacing: 1.4px; opacity: .65; }
.ah-who { font-family: ${fonts.logo}; font-size: clamp(30px, 3vw, 42px); line-height: 1; letter-spacing: -0.6px; }
.ah-text { font-size: 14px; line-height: 1.55; opacity: .8; margin: 0; }
.ah-facts div { display: grid; grid-template-columns: 26px 1fr; font-size: 13px; line-height: 1.45; opacity: .85; padding: 7px 0; border-top: 1px solid ${colors.ink3}; }
.ah-facts span { font-family: ${fonts.jet}; font-size: 10px; color: ${colors.spotText}; padding-top: 2px; }
.ah-np { display: flex; align-items: center; gap: 14px; margin-top: 4px; }
.ah-play { display: inline-flex; align-items: center; gap: 10px; padding: 6px 15px 6px 6px; border-radius: 99px; border: 1px solid ${colors.ink3}; background: ${ground(0.35)}; color: inherit; font-family: ${fonts.medium}; font-size: 13px; cursor: pointer; }
.ah-play i { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: ${colors.spot}; color: ${colors.onSpot}; font-style: normal; font-size: 9px; }
.ah-eq { display: flex; gap: 2px; align-items: flex-end; height: 18px; }
.ah-eq i { width: 3px; height: 3px; border-radius: 1px; background: ${colors.paper}; opacity: .5; }
.ah-eq.ah-on i { opacity: 1; background: ${colors.spotText}; animation: ah-eq .9s ease-in-out infinite alternate; }
@keyframes ah-eq { from { height: 3px; } to { height: 18px; } }
.ah-rec { position: absolute; right: -90px; bottom: -80px; width: clamp(220px, 22vw, 330px); aspect-ratio: 1; border-radius: 50%; z-index: 0;
  background: radial-gradient(circle, transparent 29%, #0b0a09 30%, #1a1816 31%, #0b0a09 33%, #141210 60%, #0b0a09 61%, #151311 70%, #0b0a09 100%);
  box-shadow: 0 24px 60px rgba(0,0,0,.45); animation: ah-spin 12s linear infinite; }
.ah-rec.ah-fast { animation-duration: 4s; }
@keyframes ah-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .ah-rec, .ah-eq.ah-on i { animation: none; } }
`;
