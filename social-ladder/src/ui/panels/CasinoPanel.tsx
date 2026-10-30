import { useRef, useState } from 'react';
import { decimal, money } from '../../core/bignum';
import { CASINO } from '../../data/casino';
import { STATUS_MIN, statusReqMult } from '../../data/social';
import type { RouletteResult, ScratchResult } from '../../game/engine';
import { audio } from '../../audio/audio';
import { fx } from '../../fx/FxLayer';
import { FX, reducedMotion } from '../../fx/intensity';
import { t, type StringKey } from '../../i18n';
import { celebrate } from '../components/Celebration';
import { flyToCash } from '../components/FxOverlay';
import { useEngine } from '../hooks';

/** European wheel order, clockwise from 0. */
const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const SEG = 360 / WHEEL.length;
const WHEEL_BG = `conic-gradient(from ${-SEG / 2}deg, ${WHEEL.map((n, i) => `${n === 0 ? '#1fa34a' : RED.has(n) ? '#d62a2a' : '#15172a'} ${i * SEG}deg ${(i + 1) * SEG}deg`).join(', ')})`;

const SCRATCH_TEXT: Record<string, StringKey> = {
  nothing: 'scratchNothing',
  refund: 'scratchRefund',
  triple: 'scratchTriple',
  status: 'scratchStatus',
  jackpot: 'scratchJackpot',
  fine: 'scratchFine',
};

function centerOf(el: Element | null): [number, number] {
  const r = el?.getBoundingClientRect();
  return r ? [r.left + r.width / 2, r.top + r.height / 2] : [window.innerWidth / 2, window.innerHeight / 2];
}

/** Celebrates (or mourns) a casino result at an element. */
function casinoFx(el: Element | null, win: boolean, big: boolean, title: string, reduced: boolean) {
  const [x, y] = centerOf(el);
  fx.reduced = reduced;
  if (win) {
    fx.burst(x, y, { count: big ? 90 : 36, colors: [FX.gold, FX.goldLight, FX.green, FX.white], speed: [90, big ? 380 : 240], size: 4, glow: 0.7, stars: 0.5, life: 1.1, gravity: 220 });
    fx.ring(x, y, FX.gold, big ? 160 : 90, 0.5, 5);
    flyToCash(x, y, big ? 14 : 6);
    if (big) {
      fx.flash(FX.gold, 0.35, 420);
      celebrate({ kind: 'rare', kicker: t('casino'), title, still: reduced });
      audio.fanfare();
    } else audio.coin();
  } else {
    fx.burst(x, y, { count: 18, colors: ['#555a7a', '#2a2e4a', FX.red], speed: [40, 120], size: 3, glow: 0, life: 0.8, gravity: 80 });
    audio.denied();
  }
}

export function CasinoPanel() {
  const engine = useEngine();
  const s = engine.state;
  const reduced = reducedMotion(s.settings);
  const open = engine.casinoOpen();

  return (
    <div className="panel casino">
      <div className="panel-head">
        <h2>{t('casino')}</h2>
        <span className="muted">{t('casinoWarn', { mult: decimal(statusReqMult(s.status - CASINO.statusCost), 2) })}</span>
      </div>
      {!open ? <p className="casino-banned">{t('casinoBanned', { min: STATUS_MIN })}</p> : (
        <>
          <ScratchCard reduced={reduced} />
          <Roulette reduced={reduced} />
        </>
      )}
    </div>
  );
}

function ScratchCard({ reduced }: { reduced: boolean }) {
  const engine = useEngine();
  const [card, setCard] = useState<ScratchResult | null>(null);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const scratching = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const price = engine.scratchPrice();
  const afford = engine.state.money.gte(price);

  const finish = (c: ScratchResult) => {
    setDone(true);
    engine.settleCasino();
    const win = c.payout.gt(0);
    casinoFx(ref.current, win || c.prize === 'status', c.prize === 'jackpot', t(SCRATCH_TEXT[c.prize], { amount: money(c.payout) }), reduced);
  };
  const reveal = (i: number) => {
    if (!card || done || revealed[i]) return;
    const next = revealed.slice();
    next[i] = true;
    setRevealed(next);
    audio.click(1, false, 0.6);
    if (next.every(Boolean)) finish(card);
  };
  const buy = () => {
    const c = engine.playScratch();
    if (!c) return;
    setCard(c);
    setRevealed(Array(9).fill(false));
    setDone(false);
    audio.purchase(0);
  };

  return (
    <section className="casino-game">
      <h3>{t('scratchTitle')}</h3>
      <p className="hint">{t('scratchDesc', { price: money(price) })}</p>
      {card && (
        <div ref={ref} className={`scratch ${done ? `done prize-${card.prize}` : ''}`} onPointerDown={() => (scratching.current = true)} onPointerUp={() => (scratching.current = false)} onPointerLeave={() => (scratching.current = false)}>
          {card.grid.map((sym, i) => (
            <button key={i} className={`scratch-cell ${revealed[i] ? 'open' : ''}`} onPointerDown={() => reveal(i)} onPointerEnter={() => scratching.current && reveal(i)} aria-label={revealed[i] ? sym : '?'}>
              <span>{revealed[i] ? sym : '?'}</span>
            </button>
          ))}
        </div>
      )}
      {card && !done && (
        <button className="btn" onClick={() => { setRevealed(Array(9).fill(true)); finish(card); }}>{t('scratchAll')}</button>
      )}
      {card && done && <p className={`casino-result ${card.payout.gt(0) || card.prize === 'status' ? 'win' : 'lose'}`}>{t(SCRATCH_TEXT[card.prize], { amount: money(card.payout) })}</p>}
      {(!card || done) && (
        <button className="btn primary" disabled={!afford} onClick={buy}>{t('scratchBuy', { price: money(price) })}</button>
      )}
    </section>
  );
}

function Roulette({ reduced }: { reduced: boolean }) {
  const engine = useEngine();
  const [bet, setBet] = useState<'red' | 'black' | number>('red');
  const [num, setNum] = useState(7);
  const [stakeIdx, setStakeIdx] = useState(0);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<RouletteResult | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const fraction = CASINO.stakes[stakeIdx];
  const stake = engine.rouletteStake(fraction);

  const spin = () => {
    const r = engine.spinRoulette(bet === 'red' || bet === 'black' ? bet : num, fraction);
    if (!r) return;
    setResult(null);
    setSpinning(true);
    // Land the winning segment under the pointer at the top, after several turns.
    const target = 360 - WHEEL.indexOf(r.n) * SEG;
    const turns = reduced ? 0 : 5;
    setAngle((a) => a - (a % 360) + turns * 360 + target);
    window.setTimeout(() => {
      setSpinning(false);
      setResult(r);
      engine.settleCasino();
      casinoFx(ref.current, r.win, r.win && typeof bet === 'number', t('rouletteWin', { n: r.n, amount: money(r.payout) }), reduced);
    }, reduced ? 200 : 3300);
    audio.event();
  };

  const resultText = result ? (result.win ? t('rouletteWin', { n: result.n, amount: money(result.payout) }) : t('rouletteLose', { n: result.n, stake: money(result.stake) }) + (result.n === 0 && typeof bet !== 'number' ? ` ${t('rouletteZero')}` : '')) : '';

  return (
    <section className="casino-game">
      <h3>{t('rouletteTitle')}</h3>
      <p className="hint">{t('rouletteDesc')}</p>
      <div className="roulette" ref={ref}>
        <div className="roulette-pointer" />
        <div className="roulette-wheel" style={{ background: WHEEL_BG, transform: `rotate(${angle}deg)`, transition: spinning && !reduced ? 'transform 3.2s cubic-bezier(0.15, 0.85, 0.2, 1)' : 'none' }}>
          {WHEEL.map((n, i) => (
            <span key={n} className="roulette-num" style={{ transform: `rotate(${i * SEG}deg) translateY(-84px)` }}>{n}</span>
          ))}
          <div className="roulette-hub" />
        </div>
      </div>
      {result && <p className={`casino-result ${result.win ? 'win' : 'lose'}`}>{resultText}</p>}
      <div className="roulette-bets subtabs">
        <button className={bet === 'red' ? 'on bet-red' : 'bet-red'} onClick={() => setBet('red')}>{t('red')} ×2</button>
        <button className={bet === 'black' ? 'on bet-black' : 'bet-black'} onClick={() => setBet('black')}>{t('black')} ×2</button>
        <button className={typeof bet === 'number' ? 'on' : ''} onClick={() => setBet(num)}>{t('number')} ×36</button>
        {typeof bet === 'number' && (
          <select value={num} onChange={(e) => { const n = Number(e.target.value); setNum(n); setBet(n); }} aria-label={t('number')}>
            {Array.from({ length: 37 }, (_, n) => <option key={n} value={n}>{n}</option>)}
          </select>
        )}
      </div>
      <div className="roulette-bets subtabs">
        <span className="muted">{t('stake')}:</span>
        {CASINO.stakes.map((f, i) => (
          <button key={f} className={stakeIdx === i ? 'on' : ''} onClick={() => setStakeIdx(i)}>{Math.round(f * 100)}%</button>
        ))}
      </div>
      <button className="btn primary" disabled={spinning || stake.lt(1)} onClick={spin}>{t('spin', { stake: money(stake) })}</button>
    </section>
  );
}
