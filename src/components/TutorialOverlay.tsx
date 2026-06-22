import { useLayoutEffect, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { TutorialStep } from '../hooks/useTutorial';

// ── Positioning ───────────────────────────────────────────────────────────────

const CARD_W     = 316;
const CARD_H_EST = 210;
const VEIL_PAD   =  10; // px of clear space around the target

interface Rect { top: number; left: number; width: number; height: number; }
interface CardPos { top?: number; bottom?: number; left?: number; right?: number; }

function placeCard(rect: Rect, ww: number, wh: number): CardPos {
  const spaceBelow = wh - (rect.top + rect.height + VEIL_PAD);
  const spaceAbove = rect.top - VEIL_PAD;
  const leftEdge   = Math.max(12, Math.min(rect.left - VEIL_PAD, ww - CARD_W - 12));

  if (spaceBelow >= CARD_H_EST)  return { top:  rect.top + rect.height + VEIL_PAD + 10, left: leftEdge };
  if (spaceAbove >= CARD_H_EST)  return { top:  rect.top - VEIL_PAD - CARD_H_EST - 10, left: leftEdge };

  // Fallback: right side
  const topEdge = Math.max(12, Math.min(rect.top, wh - CARD_H_EST - 12));
  if (rect.left + rect.width + VEIL_PAD + CARD_W < ww)
    return { top: topEdge, left: rect.left + rect.width + VEIL_PAD + 10 };

  return { top: topEdge, left: Math.max(12, rect.left - CARD_W - 10) };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  steps:       TutorialStep[];
  currentStep: number;
  total:       number;
  onNext:      () => void;
  onPrev:      () => void;
  onSkip:      () => void;
}

export function TutorialOverlay({ steps, currentStep, total, onNext, onPrev, onSkip }: Props) {
  const step        = steps[currentStep];
  const [rect,    setRect]    = useState<Rect | null>(null);
  const [cardPos, setCardPos] = useState<CardPos>({});
  const [visible, setVisible] = useState(false);
  const prevEl    = useRef<Element | null>(null);

  // Resolve target element, measure, position card
  useLayoutEffect(() => {
    setVisible(false);

    const measure = () => {
      const el = step.target
        ? document.querySelector(`[data-tut="${step.target}"]`)
        : null;

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }

      // Give scroll time to settle, then measure
      setTimeout(() => {
        if (el) {
          const r = el.getBoundingClientRect();
          const newRect = { top: r.top, left: r.left, width: r.width, height: r.height };
          setRect(newRect);
          setCardPos(placeCard(newRect, window.innerWidth, window.innerHeight));
        } else {
          setRect(null);
          setCardPos({
            top:  Math.max(12, window.innerHeight / 2 - CARD_H_EST / 2),
            left: Math.max(12, window.innerWidth  / 2 - CARD_W    / 2),
          });
        }
        requestAnimationFrame(() => setVisible(true));
      }, el ? 320 : 0);
    };

    measure();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Recalculate on resize
  useEffect(() => {
    const handler = () => {
      const el = step.target ? document.querySelector(`[data-tut="${step.target}"]`) : null;
      if (el) {
        const r = el.getBoundingClientRect();
        const newRect = { top: r.top, left: r.left, width: r.width, height: r.height };
        setRect(newRect);
        setCardPos(placeCard(newRect, window.innerWidth, window.innerHeight));
      }
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [step.target]);

  // Cleanup ref on unmount
  useEffect(() => {
    return () => { prevEl.current = null; };
  }, []);

  const vP = VEIL_PAD;
  const spotTop    = rect ? rect.top    - vP : 0;
  const spotLeft   = rect ? rect.left   - vP : 0;
  const spotWidth  = rect ? rect.width  + vP * 2 : 0;
  const spotHeight = rect ? rect.height + vP * 2 : 0;

  return createPortal(
    <div className="tut-root" aria-modal="true" role="dialog">
      {/* ── Spotlight veil: 4 panels + glow ring ── */}
      {rect ? (
        <>
          <div className="tut-veil" style={{ top: 0, left: 0, right: 0, height: Math.max(0, spotTop) }} />
          <div className="tut-veil" style={{ top: spotTop + spotHeight, left: 0, right: 0, bottom: 0 }} />
          <div className="tut-veil" style={{ top: spotTop, left: 0, width: Math.max(0, spotLeft), height: spotHeight }} />
          <div className="tut-veil" style={{ top: spotTop, left: spotLeft + spotWidth, right: 0, height: spotHeight }} />
          <div className="tut-glow" style={{ top: spotTop, left: spotLeft, width: spotWidth, height: spotHeight }} />
        </>
      ) : (
        <div className="tut-veil tut-veil--full" />
      )}

      {/* ── Floating card ── */}
      <div
        className={`tut-card${visible ? ' tut-card--in' : ''}`}
        style={{ ...cardPos, width: CARD_W }}
      >
        {/* Step dots */}
        <div className="tut-dots" aria-label={`Paso ${currentStep + 1} de ${total}`}>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`tut-dot${i === currentStep ? ' tut-dot--active' : i < currentStep ? ' tut-dot--done' : ''}`}
            />
          ))}
        </div>

        <p className="tut-step-label">{currentStep + 1} / {total}</p>
        <h3 className="tut-card__title">{step.title}</h3>
        <p  className="tut-card__body">{step.body}</p>

        <div className="tut-card__footer">
          <button className="tut-btn tut-btn--skip" onClick={onSkip}>Omitir</button>
          <div className="tut-card__nav">
            {currentStep > 0 && (
              <button className="tut-btn tut-btn--prev" onClick={onPrev}>← Anterior</button>
            )}
            <button className="tut-btn tut-btn--next" onClick={onNext}>
              {currentStep === total - 1 ? '¡Listo!' : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
