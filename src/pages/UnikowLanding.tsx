import { useState, useEffect, useRef, useCallback } from 'react'
import { Moon, Sun, Check, Minus, ArrowRight, MessageCircle } from 'lucide-react'

// ─── Theme tokens ────────────────────────────────────────────────────────────
const LIGHT: Record<string, string> = {
  '--bg': '#ffffff', '--bg-alt': '#fafafb', '--bg-elev': '#ffffff',
  '--text': '#0a0a0b', '--text-2': '#5b5f66', '--text-3': '#9aa0a8', '--text-4': '#8a8d93',
  '--border': 'rgba(10,10,11,.08)', '--border-strong': 'rgba(10,10,11,.12)',
  '--hairline': 'rgba(10,10,11,.06)', '--chip-bg': '#f4f4f5', '--chip-text': '#41444b',
  '--field-bg': '#ffffff', '--field-border': 'rgba(10,10,11,.12)',
  '--nav-bg': 'rgba(255,255,255,.72)', '--glass-bg': 'rgba(255,255,255,.6)',
  '--grain': 'rgba(10,10,11,.035)', '--blob1': 'rgba(150,156,166,.28)', '--blob2': 'rgba(120,126,138,.22)',
  '--logo-grad': 'linear-gradient(100deg,#33363c 0%,#9aa0a8 32%,#56595f 56%,#c4c8cf 78%,#3d4046 100%)',
  '--shadow-card': '0 1px 2px rgba(0,0,0,.03),0 30px 60px -42px rgba(0,0,0,.22)',
  '--btn-bg': '#0a0a0b', '--btn-text': '#ffffff', '--ghost-bg': '#ffffff', '--ghost-hover': '#fafafa',
  '--panel-bg': 'linear-gradient(170deg,#16181d,#0a0a0b)', '--panel-text': '#ffffff',
  '--panel-text-2': '#b6b8bd', '--panel-text-3': '#7d8189',
  '--panel-chip': 'rgba(255,255,255,.08)', '--panel-chip-text': '#e4e5e7',
  '--panel-check-bg': '#ffffff', '--panel-check-fg': '#0a0a0b',
  '--panel-glow': 'rgba(196,200,207,.16)', '--panel-badge-bg': '#ffffff', '--panel-badge-text': '#0a0a0b',
  '--neg-bg': '#fafafb', '--neg-text': '#86888d',
  '--neg-icon-bg': 'rgba(10,10,11,.06)', '--neg-icon-line': '#9aa0a8',
  '--fab-bg': 'linear-gradient(145deg,#1d1f24,#0a0a0b)', '--fab-icon': '#ffffff',
  '--fab-dot': '#0a0a0b', '--fab-pulse': '#6b6f76', '--accent': '#6b6f76',
}

const DARK: Record<string, string> = {
  '--bg': '#08090b', '--bg-alt': '#0c0d10', '--bg-elev': '#131419',
  '--text': '#f4f5f7', '--text-2': '#a4a8af', '--text-3': '#6e727a', '--text-4': '#80848c',
  '--border': 'rgba(255,255,255,.09)', '--border-strong': 'rgba(255,255,255,.17)',
  '--hairline': 'rgba(255,255,255,.06)', '--chip-bg': 'rgba(255,255,255,.06)', '--chip-text': '#c9cbcf',
  '--field-bg': 'rgba(255,255,255,.03)', '--field-border': 'rgba(255,255,255,.14)',
  '--nav-bg': 'rgba(10,11,13,.72)', '--glass-bg': 'rgba(255,255,255,.04)',
  '--grain': 'rgba(255,255,255,.04)', '--blob1': 'rgba(150,160,180,.16)', '--blob2': 'rgba(120,130,150,.13)',
  '--logo-grad': 'linear-gradient(100deg,#c4c8cf 0%,#ffffff 30%,#8d9099 56%,#e8eaee 78%,#aeb2b9 100%)',
  '--shadow-card': '0 1px 2px rgba(0,0,0,.5),0 30px 60px -42px rgba(0,0,0,.8)',
  '--btn-bg': '#f4f5f7', '--btn-text': '#0a0a0b', '--ghost-bg': 'rgba(255,255,255,.04)',
  '--ghost-hover': 'rgba(255,255,255,.09)',
  '--panel-bg': 'linear-gradient(170deg,#ffffff,#eceef1)', '--panel-text': '#0a0a0b',
  '--panel-text-2': '#41444b', '--panel-text-3': '#6b6f76',
  '--panel-chip': 'rgba(10,10,11,.06)', '--panel-chip-text': '#2b2d31',
  '--panel-check-bg': '#0a0a0b', '--panel-check-fg': '#ffffff',
  '--panel-glow': 'rgba(150,160,180,.2)', '--panel-badge-bg': '#0a0a0b', '--panel-badge-text': '#ffffff',
  '--neg-bg': 'rgba(255,255,255,.025)', '--neg-text': '#80848c',
  '--neg-icon-bg': 'rgba(255,255,255,.07)', '--neg-icon-line': '#6e727a',
  '--fab-bg': 'linear-gradient(145deg,#f4f5f7,#d9dbdf)', '--fab-icon': '#0a0a0b',
  '--fab-dot': '#f4f5f7', '--fab-pulse': '#9aa0a8', '--accent': '#6b6f76',
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface BriefState {
  empresa: string; tipo: string; objetivo: string; paginas: string
  colores: string; referencias: string; funcionalidades: string[]
  presupuesto: string; fecha: string
}

const WA_NUM = '50684987918'
const WA_CTA_MSG = 'Hola, me interesa desarrollar una página web con UNIKOW. Me gustaría recibir más información.'

function waHref(msg: string) {
  return `https://wa.me/${WA_NUM}?text=${encodeURIComponent(msg)}`
}

// ─── Pill button ─────────────────────────────────────────────────────────────
function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="transition-all duration-200"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '10px 16px', borderRadius: '999px', fontSize: '13.5px', fontWeight: 500,
        cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '.01em',
        border: `1px solid ${selected ? 'var(--text)' : 'var(--field-border)'}`,
        background: selected ? 'var(--text)' : 'var(--field-bg)',
        color: selected ? 'var(--bg)' : 'var(--chip-text)',
      }}
    >
      {label}
    </button>
  )
}

// ─── Check icon ──────────────────────────────────────────────────────────────
function CheckMark({ panel }: { panel?: boolean }) {
  return (
    <span style={{
      flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
      background: panel ? 'var(--panel-check-bg)' : 'var(--text)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Check size={10} color={panel ? 'var(--panel-check-fg)' : 'var(--bg)'} strokeWidth={2.5} />
    </span>
  )
}

function MinusMark() {
  return (
    <span style={{
      flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
      background: 'var(--neg-icon-bg)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Minus size={9} color="var(--neg-icon-line)" strokeWidth={2} />
    </span>
  )
}

// ─── useReveal ───────────────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]')
    const reveal = (el: HTMLElement) => {
      const d = parseInt(el.dataset.delay ?? '0', 10)
      el.style.transitionDelay = `${d}ms`
      if (el.dataset.fill) { el.style.height = '100%' }
      else { el.style.opacity = '1'; el.style.transform = 'none' }
    }
    if (!('IntersectionObserver' in window)) { els.forEach(reveal); return }
    const io = new IntersectionObserver(
      (entries) => entries.forEach(en => { if (en.isIntersecting) { reveal(en.target as HTMLElement); io.unobserve(en.target) } }),
      { threshold: 0.12, rootMargin: '0px 0px -7% 0px' }
    )
    els.forEach(el => io.observe(el))
    const timer = setTimeout(() => {
      els.forEach(el => { if (getComputedStyle(el).opacity === '0') reveal(el) })
    }, 2800)
    return () => { io.disconnect(); clearTimeout(timer) }
  }, [])
}

// ─── useParallax ─────────────────────────────────────────────────────────────
function useParallax() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'))
    if (!els.length) return
    let ticking = false
    const upd = () => {
      const y = window.scrollY
      els.forEach(el => {
        const s = parseFloat(el.dataset.speed ?? '0.1')
        el.style.transform = `translate3d(0,${y * s}px,0)`
      })
      ticking = false
    }
    const onScroll = () => { if (!ticking) { requestAnimationFrame(upd); ticking = true } }
    window.addEventListener('scroll', onScroll, { passive: true })
    upd()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
}

// ─── Logo animation ───────────────────────────────────────────────────────────
function useLogoAnimation(theme: 'light' | 'dark') {
  const textRef = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  const runLogo = useCallback(() => {
    const text = textRef.current; const canvas = canvasRef.current
    if (!text || !canvas) return
    cancelAnimationFrame(rafRef.current)
    const wrap = text.parentElement!
    const rect = wrap.getBoundingClientRect()
    if (!rect.width) { setTimeout(() => runLogo(), 300); return }
    const dark = theme === 'dark'
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr
    canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px'
    const ctx = canvas.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const tRect = text.getBoundingClientRect()
    const offX = tRect.left - rect.left, textW = tRect.width
    const padX = textW * 0.10
    const startX = offX + padX, runW = textW - padX * 1.8
    const topY = tRect.top - rect.top, h = tRect.height, baseY = topY + h * 0.58

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { text.style.clipPath = 'none'; return }

    let particles: { x: number; y: number; vx: number; vy: number; life: number; size: number; g: number; shade: number }[] = []
    const dur = 2500, ease = (t: number) => 1 - Math.pow(1 - t, 3)
    let start: number | null = null
    text.style.clipPath = 'inset(0 100% 0 0)'

    const step = (ts: number) => {
      if (!start) start = ts
      const t = Math.min((ts - start) / dur, 1), e = ease(t)
      text.style.clipPath = `inset(0 ${(1 - e) * 100}% 0 0)`
      const penX = startX + e * runW
      if (t < 1) {
        for (let i = 0; i < 6; i++) {
          const shade = dark ? (Math.random() < 0.3 ? 245 : 175) : (Math.random() < 0.28 ? 195 : 70)
          particles.push({ x: penX + (Math.random() - .5) * 10, y: baseY + (Math.random() - .5) * h * .42, vx: (Math.random() - .5) * .7 - .15, vy: (Math.random() - .5) * .9 - .35, life: 1, size: Math.random() * 2.1 + .4, g: Math.random() * .035 + .015, shade })
        }
      }
      ctx.clearRect(0, 0, rect.width, rect.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life -= .013
        ctx.globalAlpha = Math.max(p.life, 0) * .72
        ctx.fillStyle = `rgb(${p.shade},${p.shade},${Math.min(p.shade + 8, 255)})`
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.283); ctx.fill()
      })
      ctx.globalAlpha = 1
      particles = particles.filter(p => p.life > 0)
      if (t < 1) {
        ctx.globalAlpha = .55; ctx.fillStyle = dark ? '#d6d9de' : '#9aa0a8'
        ctx.beginPath(); ctx.arc(penX, baseY, 2.6, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1
        rafRef.current = requestAnimationFrame(step)
      } else if (particles.length) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        text.style.clipPath = 'none'; ctx.clearRect(0, 0, rect.width, rect.height)
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }, [theme])

  useEffect(() => {
    const run = () => runLogo()
    if (document.fonts?.ready) document.fonts.ready.then(() => setTimeout(run, 140))
    else setTimeout(run, 500)
    return () => cancelAnimationFrame(rafRef.current)
  }, [runLogo])

  return { textRef, canvasRef, runLogo }
}

// ─── Custom cursor ────────────────────────────────────────────────────────────
function useCursor() {
  useEffect(() => {
    if (!window.matchMedia?.('(hover:hover) and (pointer:fine)').matches) return
    const ring = document.createElement('div')
    ring.style.cssText = 'position:fixed;left:0;top:0;width:30px;height:30px;border:1.5px solid var(--text);opacity:0;border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);mix-blend-mode:difference;transition:width .25s ease,height .25s ease,background .25s ease,opacity .3s ease;'
    document.body.appendChild(ring)
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, shown = false
    let raf = 0
    const move = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; if (!shown) { shown = true; ring.style.opacity = '.6' } }
    window.addEventListener('mousemove', move)
    const loop = () => { rx += (mx - rx) * .18; ry += (my - ry) * .18; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; raf = requestAnimationFrame(loop) }
    loop()
    const over = (e: MouseEvent) => { if ((e.target as Element)?.closest?.('a,button,input,textarea')) { ring.style.width = '54px'; ring.style.height = '54px'; ring.style.background = 'rgba(128,128,128,.25)' } }
    const out = (e: MouseEvent) => { if ((e.target as Element)?.closest?.('a,button,input,textarea')) { ring.style.width = '30px'; ring.style.height = '30px'; ring.style.background = 'transparent' } }
    document.addEventListener('mouseover', over); document.addEventListener('mouseout', out)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', move)
      document.removeEventListener('mouseover', over)
      document.removeEventListener('mouseout', out)
      ring.remove()
    }
  }, [])
}

// ─── Main component ───────────────────────────────────────────────────────────
export function UnikowLanding() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return (localStorage.getItem('unikow-theme') as 'light' | 'dark') ?? 'dark' } catch { return 'dark' }
  })
  const [brief, setBrief] = useState<BriefState>({
    empresa: '', tipo: '', objetivo: '', paginas: '',
    colores: '', referencias: '', funcionalidades: [], presupuesto: '', fecha: '',
  })

  const tokens = theme === 'dark' ? DARK : LIGHT
  const cssVars = Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, v])) as React.CSSProperties

  const toggleTheme = () => {
    setTheme(t => { const n = t === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('unikow-theme', n) } catch {} return n })
  }

  const { textRef, canvasRef, runLogo } = useLogoAnimation(theme)
  useReveal()
  useParallax()
  useCursor()

  // Brief helpers
  const OBJETIVOS = ['Vender más', 'Generar confianza', 'Captar clientes', 'Mostrar mi portafolio']
  const PAGINAS = ['1 página', '2–5 páginas', '6–10 páginas', 'Más de 10']
  const PRESUP = ['Esencial', 'Profesional', 'Avanzado', 'A definir juntos']
  const FUNCS = ['Formularios', 'Blog', 'Tienda / Pagos', 'Reservas', 'Multidioma', 'Panel admin', 'Automatizaciones', 'Integraciones']

  const setField = (field: keyof BriefState, val: string) =>
    setBrief(b => ({ ...b, [field]: b[field as keyof BriefState] === val ? '' : val }))
  const toggleFunc = (val: string) =>
    setBrief(b => ({ ...b, funcionalidades: b.funcionalidades.includes(val) ? b.funcionalidades.filter(x => x !== val) : [...b.funcionalidades, val] }))

  const filled = ['empresa', 'tipo', 'objetivo', 'paginas', 'colores', 'referencias', 'presupuesto', 'fecha']
    .filter(k => brief[k as keyof BriefState] && String(brief[k as keyof BriefState]).trim()).length + (brief.funcionalidades.length ? 1 : 0)

  const briefMsg = [
    'Hola UNIKOW, quiero solicitar una cotización.', '',
    `Empresa: ${brief.empresa || 'Por definir'}`,
    `Tipo de negocio: ${brief.tipo || 'Por definir'}`,
    `Objetivo: ${brief.objetivo || 'Por definir'}`,
    `Páginas: ${brief.paginas || 'Por definir'}`,
    `Colores: ${brief.colores || 'Por definir'}`,
    `Referencias: ${brief.referencias || 'Por definir'}`,
    `Funcionalidades: ${brief.funcionalidades.length ? brief.funcionalidades.join(', ') : 'Por definir'}`,
    `Presupuesto: ${brief.presupuesto || 'Por definir'}`,
    `Entrega: ${brief.fecha || 'Por definir'}`,
  ].join('\n')

  const summaryRows = [
    { label: 'Empresa', value: brief.empresa || '—' },
    { label: 'Tipo', value: brief.tipo || '—' },
    { label: 'Objetivo', value: brief.objetivo || '—' },
    { label: 'Páginas', value: brief.paginas || '—' },
    { label: 'Colores', value: brief.colores || '—' },
    { label: 'Referencias', value: brief.referencias || '—' },
    { label: 'Funciones', value: brief.funcionalidades.length ? brief.funcionalidades.join(', ') : '—' },
    { label: 'Presupuesto', value: brief.presupuesto || '—' },
    { label: 'Entrega', value: brief.fecha || '—' },
  ]

  const steps = [
    { n: '01', title: 'Descubrimiento', desc: 'Entendemos tu negocio, tus objetivos y a quién quieres llegar.' },
    { n: '02', title: 'Estrategia', desc: 'Definimos estructura, mensaje y la mejor ruta hacia el resultado.' },
    { n: '03', title: 'Diseño', desc: 'Creamos una identidad visual moderna, clara y memorable.' },
    { n: '04', title: 'Desarrollo', desc: 'Construimos un sitio rápido, sólido y optimizado en cada detalle.' },
    { n: '05', title: 'Lanzamiento', desc: 'Publicamos, medimos y te acompañamos en el crecimiento.' },
  ]

  return (
    <div
      style={{
        ...cssVars,
        fontFamily: "'General Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        color: 'var(--text)', background: 'var(--bg)', width: '100%', overflowX: 'hidden', position: 'relative',
        WebkitFontSmoothing: 'antialiased', textRendering: 'optimizeLegibility',
      } as React.CSSProperties}
    >
      {/* Global styles */}
      <style>{`
        #uni-root ::selection { background: var(--text); color: var(--bg); }
        @keyframes uni-pulse { 0% { transform: scale(.92); opacity: .55; } 70% { opacity: 0; } 100% { transform: scale(2.3); opacity: 0; } }
        @keyframes uni-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-26px); } }
        [data-reveal] { opacity: 0; transform: translateY(28px); transition: opacity .9s cubic-bezier(.16,.84,.44,1), transform .9s cubic-bezier(.16,.84,.44,1); }
        [data-fill] { height: 0; transition: height 1.5s cubic-bezier(.4,0,.1,1); }
        .uni-btn-primary { display: inline-flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; color: var(--btn-text); background: var(--btn-bg); padding: 16px 28px; border-radius: 13px; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,.16), 0 14px 30px -12px rgba(0,0,0,.45); transition: transform .22s ease, box-shadow .22s ease; }
        .uni-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 2px 4px rgba(0,0,0,.16), 0 22px 44px -16px rgba(0,0,0,.5); }
        .uni-btn-ghost { display: inline-flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; color: var(--text); background: var(--ghost-bg); padding: 16px 28px; border-radius: 13px; text-decoration: none; border: 1px solid var(--border-strong); transition: transform .22s ease, border-color .22s ease, background .22s ease; }
        .uni-btn-ghost:hover { transform: translateY(-2px); border-color: var(--text); background: var(--ghost-hover); }
        .uni-card { padding: 34px 30px; border: 1px solid var(--border); border-radius: 20px; background: var(--bg-elev); box-shadow: var(--shadow-card); transition: transform .3s ease, border-color .3s ease; }
        .uni-card:hover { transform: translateY(-6px); border-color: var(--border-strong); }
        .uni-input { width: 100%; padding: 14px 16px; border: 1px solid var(--field-border); border-radius: 12px; font-size: 16px; color: var(--text); background: var(--field-bg); outline: none; transition: border-color .2s, box-shadow .2s; font-family: inherit; }
        .uni-input:focus { border-color: var(--text); box-shadow: 0 0 0 4px var(--hairline); }
        .uni-input::placeholder { color: var(--text-3); }
        @media (prefers-reduced-motion: reduce) { [data-reveal] { opacity: 1 !important; transform: none !important; } [data-fill] { height: 100% !important; } }
      `}</style>

      {/* ─── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 24,
        padding: 'clamp(14px,2vh,20px) clamp(20px,5vw,56px)',
        background: 'var(--nav-bg)', backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid var(--hairline)',
      }}>
        <a href="#top" style={{ fontFamily: "'Kaushan Script', cursive", fontSize: 28, lineHeight: 1, color: 'var(--text)', textDecoration: 'none' }}>Unikow</a>
        <div className="flex items-center gap-4 md:gap-6">
          <a href="#servicios" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)', textDecoration: 'none' }} className="hidden sm:block">Servicios</a>
          <a href="#proceso" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)', textDecoration: 'none' }} className="hidden sm:block">Proceso</a>
          <a href="#brief" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)', textDecoration: 'none' }} className="hidden sm:block">Brief</a>
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 11, border: '1px solid var(--border-strong)', background: 'var(--bg-elev)', color: 'var(--text)', cursor: 'pointer', transition: 'transform .2s ease, border-color .2s ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--text)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)' }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <a href={waHref(WA_CTA_MSG)} target="_blank" rel="noopener"
            className="uni-btn-primary" style={{ padding: '10px 18px', fontSize: 14, borderRadius: 10 }}>
            Cotizar
          </a>
        </div>
      </nav>

      {/* ─── HERO ────────────────────────────────────────────── */}
      <header id="top" style={{
        position: 'relative', minHeight: '92vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: 'clamp(48px,9vh,120px) clamp(20px,5vw,56px) clamp(60px,9vh,110px)', overflow: 'hidden',
      }}>
        <div data-parallax data-speed="0.10" style={{ position: 'absolute', top: '-12%', left: '-8%', width: 'min(60vw,780px)', height: 'min(60vw,780px)', background: 'radial-gradient(circle at 35% 35%,var(--blob1),transparent 62%)', filter: 'blur(14px)', pointerEvents: 'none' }} />
        <div data-parallax data-speed="-0.06" style={{ position: 'absolute', bottom: '-18%', right: '-10%', width: 'min(58vw,760px)', height: 'min(58vw,760px)', background: 'radial-gradient(circle at 60% 60%,var(--blob2),transparent 60%)', filter: 'blur(16px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(var(--grain) 1px,transparent 1px)', backgroundSize: '26px 26px', maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%,#000,transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%,#000,transparent 80%)', pointerEvents: 'none' }} />

        <div data-reveal style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10, padding: '7px 16px', border: '1px solid var(--border-strong)', borderRadius: 999, background: 'var(--glass-bg)', backdropFilter: 'blur(6px)', marginBottom: 'clamp(26px,5vh,46px)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-2)' }}>Identidad digital premium</span>
        </div>

        <div
          data-reveal
          onClick={runLogo}
          title="Click para reescribir"
          style={{ position: 'relative', display: 'inline-block', margin: '0 auto', cursor: 'pointer' }}
        >
          <span
            ref={textRef}
            style={{
              display: 'inline-block',
              fontFamily: "'Kaushan Script', cursive",
              fontWeight: 400,
              fontSize: 'clamp(78px,16vw,210px)',
              lineHeight: 1, padding: '0 .12em',
              background: 'var(--logo-grad)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              clipPath: 'inset(0 100% 0 0)',
            }}
          >Unikow</span>
          <canvas ref={canvasRef} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
        </div>

        <h1
          data-reveal data-delay="120"
          style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 'clamp(30px,5vw,58px)', lineHeight: 1.04, letterSpacing: '-.02em', maxWidth: '16ch', margin: 'clamp(18px,3vh,30px) auto 0', textWrap: 'balance' } as React.CSSProperties}
        >
          Tu identidad digital vale más de lo que imaginas.
        </h1>

        <p data-reveal data-delay="220" style={{ fontSize: 'clamp(16px,1.6vw,19px)', lineHeight: 1.6, color: 'var(--text-2)', maxWidth: '60ch', margin: '22px auto 0', textWrap: 'pretty' } as React.CSSProperties}>
          Ayudo a negocios, marcas y profesionales a construir experiencias digitales modernas mediante páginas web diseñadas para transmitir confianza, autoridad y crecimiento.
        </p>

        <div data-reveal data-delay="320" className="flex flex-wrap gap-3 justify-center" style={{ marginTop: 'clamp(28px,4vh,40px)' }}>
          <a href={waHref(WA_CTA_MSG)} target="_blank" rel="noopener" className="uni-btn-primary">Solicitar Cotización</a>
          <a href="#brief" className="uni-btn-ghost">Completar Brief</a>
        </div>

        <p data-reveal data-delay="420" style={{ marginTop: 'clamp(30px,5vh,52px)', fontSize: 13, fontWeight: 500, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          Tu identidad del futuro, ahora
        </p>
      </header>

      {/* ─── POR QUÉ ─────────────────────────────────────────── */}
      <GrowthChartSection />

      {/* ─── SERVICIOS ───────────────────────────────────────── */}
      <section id="servicios" style={{ padding: 'clamp(80px,13vh,170px) clamp(20px,5vw,56px)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div data-reveal className="flex items-center gap-3" style={{ marginBottom: 22 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--accent)' }}>Servicios</span>
            <span style={{ flex: 1, maxWidth: 80, height: 1, background: 'var(--accent)', opacity: .4 }} />
          </div>
          <h2 data-reveal style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 'clamp(28px,4vw,52px)', lineHeight: 1.06, letterSpacing: '-.02em', maxWidth: '20ch', textWrap: 'balance' } as React.CSSProperties}>
            Soluciones a la medida de tu ambición.
          </h2>

          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', marginTop: 'clamp(48px,7vh,80px)' }}>
            {/* Plan 01 */}
            <ServiceCard
              delay="0"
              plan="Plan 01"
              title="Landing Page"
              desc="Una página, un objetivo claro. Perfecta para empezar con fuerza."
              tags={['Negocios pequeños', 'Emprendedores', 'Portafolios']}
              includes={['Información principal', 'Diseño profesional', 'Optimización móvil']}
              waHref={waHref(WA_CTA_MSG)}
            />
            {/* Plan 02 — featured */}
            <div
              data-reveal data-delay="100"
              style={{
                display: 'flex', flexDirection: 'column', padding: '34px 30px',
                border: '1px solid var(--border-strong)', borderRadius: 24,
                background: 'var(--panel-bg)', color: 'var(--panel-text)',
                boxShadow: '0 30px 70px -34px rgba(0,0,0,.55)', position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: '-30%', right: '-20%', width: '60%', height: '80%', background: 'radial-gradient(circle,var(--panel-glow),transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: 18, right: 18, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--panel-badge-text)', background: 'var(--panel-badge-bg)', padding: '5px 11px', borderRadius: 999 }}>Más elegido</div>
              <div style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 500, fontSize: 13, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--panel-text-3)' }}>Plan 02</div>
              <h3 style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 26, marginTop: 14, letterSpacing: '-.01em' }}>Sitio Web Corporativo</h3>
              <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.6, color: 'var(--panel-text-2)' }}>Tu marca completa, con todo lo necesario para crecer con autoridad.</p>
              <div style={{ marginTop: 24, fontSize: 12, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--panel-text-3)' }}>Ideal para</div>
              <div className="flex flex-wrap gap-2 mt-3">
                {['Empresas', 'Marcas en crecimiento'].map(t => (
                  <span key={t} style={{ fontSize: 13, color: 'var(--panel-chip-text)', padding: '6px 12px', borderRadius: 999, background: 'var(--panel-chip)' }}>{t}</span>
                ))}
              </div>
              <div style={{ marginTop: 24, fontSize: 12, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--panel-text-3)' }}>Incluye</div>
              <div className="flex flex-col gap-3 mt-3" style={{ flex: 1 }}>
                {['Varias secciones', 'Navegación avanzada', 'Formularios integrados'].map(item => (
                  <div key={item} className="flex items-center gap-3" style={{ fontSize: 14.5, color: 'var(--panel-text-2)' }}>
                    <CheckMark panel />{item}
                  </div>
                ))}
              </div>
              <a href={waHref(WA_CTA_MSG)} target="_blank" rel="noopener"
                style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: 'var(--panel-check-fg)', textDecoration: 'none', padding: '13px 18px', borderRadius: 11, background: 'var(--panel-check-bg)', transition: 'transform .2s ease' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = '')}
              >
                Solicitar cotización <ArrowRight size={16} />
              </a>
            </div>
            {/* Plan 03 */}
            <ServiceCard
              delay="200"
              plan="Plan 03"
              title="Desarrollo a Medida"
              desc="Software hecho para tu operación: potente, escalable y único."
              tags={['Plataformas', 'Sistemas internos', 'Apps web']}
              includes={['Funcionalidades avanzadas', 'Bases de datos', 'Paneles administrativos', 'Automatizaciones']}
              waHref={waHref(WA_CTA_MSG)}
            />
          </div>
        </div>
      </section>

      {/* ─── PROCESO ─────────────────────────────────────────── */}
      <section id="proceso" style={{ padding: 'clamp(80px,13vh,170px) clamp(20px,5vw,56px)', background: 'var(--bg-alt)', borderTop: '1px solid var(--hairline)' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <div data-reveal className="flex items-center gap-3" style={{ marginBottom: 22 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--accent)' }}>Proceso</span>
            <span style={{ flex: 1, maxWidth: 80, height: 1, background: 'var(--accent)', opacity: .4 }} />
          </div>
          <h2 data-reveal style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 'clamp(28px,4vw,52px)', lineHeight: 1.06, letterSpacing: '-.02em', maxWidth: '16ch', textWrap: 'balance' } as React.CSSProperties}>
            Un proceso claro, de la idea al lanzamiento.
          </h2>
          <div style={{ position: 'relative', marginTop: 'clamp(48px,7vh,80px)', paddingLeft: 8 }}>
            <div style={{ position: 'absolute', left: 31, top: 10, bottom: 42, width: 2, background: 'var(--border)' }} />
            <div data-reveal data-fill="1" style={{ position: 'absolute', left: 31, top: 10, width: 2, background: 'linear-gradient(180deg,var(--text),var(--accent))' }} />
            {steps.map((s, i) => (
              <div key={s.n} data-reveal data-delay={String(i * 100)} style={{ position: 'relative', display: 'flex', gap: 26, paddingBottom: i < steps.length - 1 ? 42 : 0 }}>
                <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-elev)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 16, color: 'var(--text)', boxShadow: '0 4px 14px -6px rgba(0,0,0,.2)', zIndex: 1 }}>{s.n}</div>
                <div style={{ paddingTop: 4 }}>
                  <h3 style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 21, letterSpacing: '-.01em' }}>{s.title}</h3>
                  <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)', maxWidth: '52ch' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPARATIVA ─────────────────────────────────────── */}
      <section style={{ padding: 'clamp(80px,13vh,170px) clamp(20px,5vw,56px)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div data-reveal className="flex items-center gap-3" style={{ marginBottom: 22 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--accent)' }}>La diferencia</span>
            <span style={{ flex: 1, maxWidth: 80, height: 1, background: 'var(--accent)', opacity: .4 }} />
          </div>
          <h2 data-reveal style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 'clamp(28px,4vw,52px)', lineHeight: 1.06, letterSpacing: '-.02em', maxWidth: '18ch', textWrap: 'balance' } as React.CSSProperties}>
            Lo que cambia cuando das el paso.
          </h2>
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', marginTop: 'clamp(48px,7vh,72px)' }}>
            <div data-reveal style={{ padding: '36px 34px', border: '1px solid var(--border)', borderRadius: 24, background: 'var(--neg-bg)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Sin sitio web</div>
              <div className="flex flex-col gap-5 mt-6">
                {['Menos confianza', 'Menor conversión', 'Presencia digital limitada', 'Te encuentran por casualidad'].map(item => (
                  <div key={item} className="flex items-center gap-4" style={{ fontSize: 16, color: 'var(--neg-text)' }}>
                    <MinusMark />{item}
                  </div>
                ))}
              </div>
            </div>
            <div data-reveal data-delay="120" style={{ padding: '36px 34px', border: '1px solid var(--border-strong)', borderRadius: 24, background: 'var(--panel-bg)', color: 'var(--panel-text)', boxShadow: '0 30px 70px -34px rgba(0,0,0,.5)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-30%', right: '-15%', width: '55%', height: '75%', background: 'radial-gradient(circle,var(--panel-glow),transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ fontFamily: "'Kaushan Script', cursive", fontSize: 22, color: 'var(--panel-text)', marginBottom: 24 }}>Unikow</div>
              <div className="flex flex-col gap-5">
                {['Más autoridad', 'Mayor conversión', 'Presencia digital sólida', 'Experiencia que enamora'].map(item => (
                  <div key={item} className="flex items-center gap-4" style={{ fontSize: 16, color: 'var(--panel-text)' }}>
                    <CheckMark panel />{item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BRIEF ───────────────────────────────────────────── */}
      <section id="brief" style={{ padding: 'clamp(80px,13vh,170px) clamp(20px,5vw,56px)', background: 'var(--bg-alt)', borderTop: '1px solid var(--hairline)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div data-reveal className="flex items-center gap-3" style={{ marginBottom: 22 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--accent)' }}>Brief inteligente</span>
            <span style={{ flex: 1, maxWidth: 80, height: 1, background: 'var(--accent)', opacity: .4 }} />
          </div>
          <h2 data-reveal style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 'clamp(28px,4vw,52px)', lineHeight: 1.06, letterSpacing: '-.02em', maxWidth: '18ch', textWrap: 'balance' } as React.CSSProperties}>
            Cuéntame tu proyecto en un minuto.
          </h2>
          <p data-reveal style={{ marginTop: 16, fontSize: 17, lineHeight: 1.6, color: 'var(--text-2)', maxWidth: '60ch' }}>
            Responde unas preguntas y genero un resumen estructurado, listo para enviarme por WhatsApp con un solo toque.
          </p>

          <div className="flex flex-wrap gap-12 mt-16 items-start" style={{ marginTop: 'clamp(40px,6vh,64px)', gap: 'clamp(28px,4vw,56px)' }}>
            {/* Form */}
            <div data-reveal style={{ flex: '1 1 400px', minWidth: 0 }}>
              <BriefField label="Nombre de la empresa">
                <input className="uni-input" type="text" placeholder="Ej. Estudio Aurora" value={brief.empresa} onChange={e => setBrief(b => ({ ...b, empresa: e.target.value }))} />
              </BriefField>
              <BriefField label="Tipo de negocio">
                <input className="uni-input" type="text" placeholder="Ej. Clínica, restaurante, consultora…" value={brief.tipo} onChange={e => setBrief(b => ({ ...b, tipo: e.target.value }))} />
              </BriefField>
              <BriefField label="Objetivo principal del sitio">
                <div className="flex flex-wrap gap-2">
                  {OBJETIVOS.map(v => <Pill key={v} label={v} selected={brief.objetivo === v} onClick={() => setField('objetivo', v)} />)}
                </div>
              </BriefField>
              <BriefField label="Cantidad aproximada de páginas">
                <div className="flex flex-wrap gap-2">
                  {PAGINAS.map(v => <Pill key={v} label={v} selected={brief.paginas === v} onClick={() => setField('paginas', v)} />)}
                </div>
              </BriefField>
              <BriefField label="Colores preferidos">
                <input className="uni-input" type="text" placeholder="Ej. negro, blanco y dorado" value={brief.colores} onChange={e => setBrief(b => ({ ...b, colores: e.target.value }))} />
              </BriefField>
              <BriefField label="Referencias visuales">
                <input className="uni-input" type="text" placeholder="Pega enlaces o describe estilos que te gustan" value={brief.referencias} onChange={e => setBrief(b => ({ ...b, referencias: e.target.value }))} />
              </BriefField>
              <BriefField label="Funcionalidades deseadas">
                <div className="flex flex-wrap gap-2">
                  {FUNCS.map(v => <Pill key={v} label={v} selected={brief.funcionalidades.includes(v)} onClick={() => toggleFunc(v)} />)}
                </div>
              </BriefField>
              <BriefField label="Presupuesto aproximado">
                <div className="flex flex-wrap gap-2">
                  {PRESUP.map(v => <Pill key={v} label={v} selected={brief.presupuesto === v} onClick={() => setField('presupuesto', v)} />)}
                </div>
              </BriefField>
              <BriefField label="Fecha deseada de entrega" last>
                <input className="uni-input" type="text" placeholder="Ej. en 3 semanas / antes de septiembre" value={brief.fecha} onChange={e => setBrief(b => ({ ...b, fecha: e.target.value }))} />
              </BriefField>
            </div>

            {/* Summary card */}
            <div data-reveal data-delay="120" style={{ flex: '1 1 320px', position: 'sticky', top: 88 }}>
              <div style={{ border: '1px solid var(--border-strong)', borderRadius: 24, background: 'var(--bg-elev)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
                <div style={{ padding: '24px 26px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 17 }}>Tu resumen</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>{filled}/9</div>
                </div>
                <div style={{ padding: '8px 26px 18px' }}>
                  {summaryRows.map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--hairline)' }}>
                      <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-4)' }}>{row.label}</span>
                      <span style={{ textAlign: 'right', fontSize: 14, color: 'var(--text)', fontWeight: 500, wordBreak: 'break-word' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '0 26px 26px' }}>
                  <a href={waHref(briefMsg)} target="_blank" rel="noopener"
                    className="uni-btn-primary"
                    style={{ width: '100%', justifyContent: 'center', borderRadius: 13, gap: 10 }}
                  >
                    <MessageCircle size={18} />
                    Enviar por WhatsApp
                  </a>
                  <p style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-3)', textAlign: 'center' }}>
                    Se abrirá WhatsApp con tu resumen ya redactado, listo para enviar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(90px,15vh,190px) clamp(20px,5vw,56px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div data-parallax data-speed="0.06" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(80vw,900px)', height: 'min(80vw,900px)', background: 'radial-gradient(circle,var(--blob1),transparent 62%)', pointerEvents: 'none' }} />
        <h2 data-reveal style={{ position: 'relative', fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 'clamp(32px,5.5vw,66px)', lineHeight: 1.03, letterSpacing: '-.025em', maxWidth: '16ch', margin: '0 auto', textWrap: 'balance' } as React.CSSProperties}>
          Tu identidad del futuro, ahora.
        </h2>
        <p data-reveal data-delay="120" style={{ position: 'relative', margin: '22px auto 0', fontSize: 'clamp(16px,1.6vw,19px)', lineHeight: 1.6, color: 'var(--text-2)', maxWidth: '52ch' }}>
          Construyamos juntos una presencia digital que genere confianza desde el primer segundo.
        </p>
        <div data-reveal data-delay="220" className="flex flex-wrap gap-4 justify-center" style={{ position: 'relative', marginTop: 36 }}>
          <a href={waHref(WA_CTA_MSG)} target="_blank" rel="noopener" className="uni-btn-primary">Solicitar Cotización</a>
          <a href="#brief" className="uni-btn-ghost">Completar Brief</a>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: 'clamp(48px,8vh,80px) clamp(20px,5vw,56px) 40px', background: 'var(--bg-alt)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 32 }}>
          <div style={{ maxWidth: 340 }}>
            <div style={{ fontFamily: "'Kaushan Script', cursive", fontSize: 34, lineHeight: 1, color: 'var(--text)' }}>Unikow</div>
            <p style={{ marginTop: 14, fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-2)' }}>Tu identidad del futuro, ahora. Diseño y desarrollo web premium para marcas que quieren destacar.</p>
          </div>
          <div className="flex flex-wrap gap-12" style={{ gap: 'clamp(32px,5vw,72px)' }}>
            <FooterCol title="Contacto" links={[
              { label: 'WhatsApp', href: waHref(WA_CTA_MSG), external: true },
              { label: 'aporras.rpr@gmail.com', href: 'mailto:aporras.rpr@gmail.com' },
            ]} />
            <FooterCol title="Redes" links={[
              { label: 'Instagram', href: '#' },
              { label: 'LinkedIn', href: '#' },
            ]} />
            <FooterCol title="Empezar" links={[
              { label: 'Completar Brief', href: '#brief' },
              { label: 'Solicitar Cotización', href: waHref(WA_CTA_MSG), external: true },
            ]} />
          </div>
        </div>
        <div style={{ maxWidth: 1180, margin: '48px auto 0', paddingTop: 24, borderTop: '1px solid var(--hairline)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>© 2026 UNIKOW. Todos los derechos reservados.</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Diseñado y desarrollado con intención.</span>
        </div>
      </footer>

      {/* ─── FLOATING WA ─────────────────────────────────────── */}
      <a
        href={waHref(WA_CTA_MSG)}
        target="_blank" rel="noopener"
        aria-label="Cotiza por WhatsApp"
        style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 60, width: 60, height: 60, borderRadius: '50%', background: 'var(--fab-bg)', boxShadow: '0 14px 36px -10px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'transform .25s ease' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = '')}
      >
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--fab-pulse)', animation: 'uni-pulse 2.6s ease-out infinite' }} />
        <MessageCircle size={26} color="var(--fab-icon)" fill="var(--fab-icon)" />
      </a>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ServiceCard({ delay, plan, title, desc, tags, includes, waHref: href }: {
  delay: string; plan: string; title: string; desc: string
  tags: string[]; includes: string[]; waHref: string
}) {
  return (
    <div data-reveal data-delay={delay} className="uni-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 500, fontSize: 13, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{plan}</div>
      <h3 style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 26, marginTop: 14, letterSpacing: '-.01em' }}>{title}</h3>
      <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)' }}>{desc}</p>
      <div style={{ marginTop: 24, fontSize: 12, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Ideal para</div>
      <div className="flex flex-wrap gap-2 mt-3">
        {tags.map(t => <span key={t} style={{ fontSize: 13, color: 'var(--chip-text)', padding: '6px 12px', borderRadius: 999, background: 'var(--chip-bg)' }}>{t}</span>)}
      </div>
      <div style={{ marginTop: 24, fontSize: 12, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Incluye</div>
      <div className="flex flex-col gap-3 mt-3" style={{ flex: 1 }}>
        {includes.map(item => (
          <div key={item} className="flex items-center gap-3" style={{ fontSize: 14.5, color: 'var(--text)' }}>
            <CheckMark />{item}
          </div>
        ))}
      </div>
      <a href={href} target="_blank" rel="noopener"
        style={{ marginTop: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: 'var(--text)', textDecoration: 'none', padding: '13px 18px', borderRadius: 11, border: '1px solid var(--border-strong)', transition: 'background .25s ease, color .25s ease' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--text)'; (e.currentTarget as HTMLElement).style.color = 'var(--bg)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
      >
        Solicitar cotización <ArrowRight size={16} />
      </a>
    </div>
  )
}

function BriefField({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : 26 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 10 }}>{label}</label>
      {children}
    </div>
  )
}

// ─── Growth Chart Section ─────────────────────────────────────────────────────
function GrowthChartSection() {
  const ref = useRef<HTMLElement>(null)
  const [animated, setAnimated] = useState(false)
  const reduced = useRef(
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    const el = ref.current; if (!el) return
    if (reduced.current) { setAnimated(true); return }
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setAnimated(true); io.disconnect() } },
      { threshold: 0.18, rootMargin: '0px 0px -40px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const ease = 'cubic-bezier(0.23, 1, 0.32, 1)'
  const dur = reduced.current ? '0ms' : '1900ms'
  const areaDur = reduced.current ? '0ms' : '2000ms'
  const textDelay = reduced.current ? '0ms' : '900ms'
  const textDur = reduced.current ? '150ms' : '700ms'
  const dotDelay = reduced.current ? '0ms' : '1650ms'

  // Chart path — exponential-style growth curve, SVG viewBox 0 0 800 260
  // Area: x 50–760, y chart space: 30 (top) – 220 (baseline)
  const linePath = 'M 50,218 C 130,215 185,208 250,196 C 330,181 385,165 455,140 C 525,115 580,91 640,68 C 690,49 720,38 760,28'
  const areaPath = `${linePath} L 760,228 L 50,228 Z`

  // Y-axis grid values
  const gridLines = [
    { y: 55,  label: '75%' },
    { y: 105, label: '50%' },
    { y: 155, label: '25%' },
    { y: 218, label: '0%'  },
  ]

  // X-axis labels (6 evenly spaced)
  const xLabels = ['Ene', 'Mar', 'May', 'Jul', 'Sep', 'Nov']

  return (
    <section
      ref={ref}
      style={{ position: 'relative', padding: 'clamp(80px,13vh,170px) clamp(20px,5vw,56px)', background: 'var(--bg-alt)', borderTop: '1px solid var(--hairline)' }}
    >
      {/* pulse keyframe for the peak dot */}
      <style>{`
        @keyframes chart-dot-pulse {
          0%   { transform: scale(1);   opacity: .7; }
          70%  { transform: scale(2.8); opacity: 0; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .chart-line  { transition: none !important; }
          .chart-area  { transition: none !important; }
          .chart-quote { transition: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* Section label */}
        <div data-reveal className="flex items-center gap-3" style={{ marginBottom: 22 }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--accent)' }}>Por qué importa</span>
          <span style={{ flex: 1, maxWidth: 80, height: 1, background: 'var(--accent)', opacity: .4 }} />
        </div>

        {/* Two-column: quote left, chart right */}
        <div
          className="flex flex-wrap items-center"
          style={{ gap: 'clamp(40px,6vw,96px)', marginTop: 'clamp(36px,5vh,64px)' }}
        >
          {/* Quote */}
          <div
            className="chart-quote"
            style={{
              flex: '1 1 260px', maxWidth: '38ch',
              opacity: animated ? 1 : 0,
              transform: animated ? 'translateY(0)' : 'translateY(20px)',
              transition: `opacity ${textDur} ${ease} ${textDelay}, transform ${textDur} ${ease} ${textDelay}`,
              willChange: 'opacity, transform',
            }}
          >
            <blockquote
              style={{
                fontFamily: "'Clash Display', sans-serif",
                fontWeight: 600,
                fontSize: 'clamp(22px,2.8vw,36px)',
                lineHeight: 1.15,
                letterSpacing: '-.025em',
                color: 'var(--text)',
                margin: 0,
                textWrap: 'balance',
              } as React.CSSProperties}
            >
              Mayor visibilidad y profesionalidad para los clientes se traduce en mejores ventas para los negocios.
            </blockquote>

            {/* Green accent bar */}
            <div style={{
              marginTop: 28,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              opacity: animated ? 1 : 0,
              transition: `opacity ${textDur} ${ease} calc(${textDelay} + 120ms)`,
            }}>
              <span style={{ display: 'inline-block', width: 28, height: 3, borderRadius: 999, background: '#22c55e' }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-3)', letterSpacing: '.04em' }}>Crecimiento con identidad digital</span>
            </div>
          </div>

          {/* Chart */}
          <div style={{ flex: '2 1 360px', minWidth: 0 }}>
            <svg
              viewBox="0 0 800 270"
              aria-hidden="true"
              style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="gfGreenArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#22c55e" stopOpacity="0.22" />
                  <stop offset="85%"  stopColor="#22c55e" stopOpacity="0.03" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0"    />
                </linearGradient>
                <linearGradient id="gfGreenLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#16a34a" />
                  <stop offset="100%" stopColor="#4ade80" />
                </linearGradient>
                <filter id="gfGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Grid lines + Y labels */}
              {gridLines.map(({ y, label }) => (
                <g key={y}>
                  <line x1="50" y1={y} x2="770" y2={y} stroke="var(--hairline)" strokeWidth="1" strokeDasharray="4 6" />
                  <text x="42" y={y + 4} textAnchor="end" fontSize="10.5" fill="var(--text-3)"
                    fontFamily="'General Sans', sans-serif">{label}</text>
                </g>
              ))}

              {/* Baseline */}
              <line x1="50" y1="228" x2="770" y2="228" stroke="var(--border)" strokeWidth="1" />

              {/* X labels */}
              {xLabels.map((label, i) => (
                <text
                  key={label}
                  x={50 + i * (720 / 5)}
                  y="248"
                  textAnchor="middle"
                  fontSize="10.5"
                  fill="var(--text-3)"
                  fontFamily="'General Sans', sans-serif"
                >{label}</text>
              ))}

              {/* Area fill — scaleX from left edge (transform, GPU-only) */}
              <g
                className="chart-area"
                style={{
                  transformBox: 'fill-box',
                  transformOrigin: 'left center',
                  transform: animated ? 'scaleX(1)' : 'scaleX(0)',
                  transition: `transform ${areaDur} ${ease}`,
                  willChange: 'transform',
                }}
              >
                <path d={areaPath} fill="url(#gfGreenArea)" />
              </g>

              {/* Line — stroke-dashoffset reveal (pathLength=1, layout-free) */}
              <path
                className="chart-line"
                d={linePath}
                fill="none"
                stroke="url(#gfGreenLine)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={animated ? 0 : 1}
                filter="url(#gfGlow)"
                style={{
                  transition: `stroke-dashoffset ${dur} ${ease}`,
                  willChange: 'stroke-dashoffset',
                }}
              />

              {/* Peak dot */}
              <g style={{ opacity: animated ? 1 : 0, transition: `opacity 200ms ease ${dotDelay}` }}>
                {/* Pulse ring */}
                <circle cx="760" cy="28" r="7" fill="none" stroke="#22c55e" strokeWidth="1.5"
                  style={{ transformOrigin: '760px 28px', animation: animated ? 'chart-dot-pulse 2.4s ease-out infinite' : 'none' }} />
                {/* Solid dot */}
                <circle cx="760" cy="28" r="4.5" fill="#4ade80" />
                <circle cx="760" cy="28" r="2.5" fill="#ffffff" />
              </g>

              {/* "Con Unikow" label near peak */}
              <g style={{ opacity: animated ? 1 : 0, transition: `opacity 300ms ease calc(${dotDelay} + 80ms)` }}>
                <rect x="670" y="6" width="82" height="18" rx="4" fill="var(--bg-elev)" stroke="var(--border-strong)" strokeWidth="1" />
                <text x="711" y="18.5" textAnchor="middle" fontSize="10" fontWeight="600" fill="#4ade80"
                  fontFamily="'General Sans', sans-serif">Con Unikow</text>
              </g>

              {/* "Antes" label at start */}
              <g style={{ opacity: animated ? 1 : 0, transition: `opacity 300ms ease ${dotDelay}` }}>
                <circle cx="50" cy="218" r="4" fill="var(--text-3)" />
                <text x="56" y="213" fontSize="10" fontWeight="500" fill="var(--text-3)"
                  fontFamily="'General Sans', sans-serif">Antes</text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string; external?: boolean }[] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 14 }}>{title}</div>
      <div className="flex flex-col gap-3">
        {links.map(l => (
          <a key={l.label} href={l.href} target={l.external ? '_blank' : undefined} rel={l.external ? 'noopener' : undefined}
            style={{ fontSize: 14.5, color: 'var(--text-2)', textDecoration: 'none', transition: 'color .2s ease' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
          >{l.label}</a>
        ))}
      </div>
    </div>
  )
}
