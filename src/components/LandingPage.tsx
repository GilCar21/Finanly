import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  onLogin: () => void;
  onSignUp: () => void;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    num: "01",
    title: "Dashboard em tempo real",
    body: "Visualize receitas, despesas e saldo numa interface limpa e interativa. Gráficos mensais e anuais gerados automaticamente.",
    accent: "#3B82F6",
  },
  {
    num: "02",
    title: "IA que importa faturas",
    body: "Arraste um PDF ou CSV de qualquer banco. Nossa IA categoriza cada transação sem esforço manual da sua parte.",
    accent: "#8B5CF6",
  },
  {
    num: "03",
    title: "Finanças em família",
    body: "Até 5 membros com visão individual e coletiva. Cada um vê o que é seu e o que é de todos, com transparência total.",
    accent: "#10B981",
  },
  {
    num: "04",
    title: "Metas e alertas",
    body: "Crie limites por categoria e receba alertas quando estiver próximo. Chega de surpresas no fim do mês.",
    accent: "#F59E0B",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Crie sua conta",
    body: "Cadastro com Google em menos de 30 segundos. Sem formulários longos, sem burocracia.",
  },
  {
    n: "2",
    title: "Importe seus dados",
    body: "Arraste o PDF ou CSV do seu banco. A IA reconhece e categoriza tudo automaticamente.",
  },
  {
    n: "3",
    title: "Tome o controle",
    body: "Veja para onde vai cada centavo. Defina metas e acompanhe seu progresso dia a dia.",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function useGsapReveal(
  selector: string,
  options?: { y?: number; stagger?: number; delay?: number; start?: string }
) {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(selector, {
        y: options?.y ?? 60,
        opacity: 0,
        duration: 0.9,
        stagger: options?.stagger ?? 0.12,
        delay: options?.delay ?? 0,
        ease: "power3.out",
        scrollTrigger: {
          trigger: selector,
          start: options?.start ?? "top 82%",
        },
      });
    });
    return () => ctx.revert();
  }, []);
}

// ─── Noise SVG background (inline) ───────────────────────────────────────────
const NoiseBg = () => (
  <svg
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04, pointerEvents: "none" }}
    xmlns="http://www.w3.org/2000/svg"
  >
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" />
  </svg>
);

// ─── MINI CHART SVG ───────────────────────────────────────────────────────────
const MiniChart = () => {
  const bars = [45, 70, 55, 90, 65, 80, 100, 72, 88, 60, 95, 78];
  return (
    <svg viewBox="0 0 240 64" style={{ width: "100%", height: 64 }}>
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 20 + 2}
          y={64 - h * 0.6}
          width={14}
          height={h * 0.6}
          rx={3}
          fill={i === 8 ? "#3B82F6" : "rgba(255,255,255,0.15)"}
        />
      ))}
    </svg>
  );
};

// ─── HERO DASHBOARD CARD ──────────────────────────────────────────────────────
const HeroDashboard = () => (
  <div
    className="hero-card"
    style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 20,
      padding: "2rem",
      backdropFilter: "blur(16px)",
      maxWidth: 720,
      margin: "0 auto",
    }}
  >
    {/* Browser chrome */}
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.5rem" }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,80,80,0.5)" }} />
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,180,0,0.5)" }} />
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(50,220,100,0.5)" }} />
      <div
        style={{
          flex: 1,
          marginLeft: 16,
          background: "rgba(255,255,255,0.07)",
          borderRadius: 100,
          height: 22,
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
        }}
      >
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", letterSpacing: 1 }}>
          app.finanly.com.br
        </span>
      </div>
    </div>

    {/* Stat row */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
      {[
        { label: "Receitas", val: "R$ 8.240", color: "#10B981" },
        { label: "Despesas", val: "R$ 5.680", color: "#F87171" },
        { label: "Saldo", val: "R$ 2.560", color: "#3B82F6" },
      ].map((s) => (
        <div
          key={s.label}
          style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            padding: "1rem",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
            {s.label}
          </p>
          <p style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "'DM Mono', monospace" }}>{s.val}</p>
        </div>
      ))}
    </div>

    {/* Chart area */}
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        padding: "1rem",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>
          Gastos — últimos 12 meses
        </p>
        <span
          style={{
            fontSize: 10,
            padding: "3px 10px",
            borderRadius: 100,
            background: "rgba(59,130,246,0.15)",
            color: "#60A5FA",
            border: "1px solid rgba(59,130,246,0.3)",
          }}
        >
          Mensal
        </span>
      </div>
      <MiniChart />
    </div>

    {/* Category rows */}
    <div style={{ marginTop: 16 }}>
      {[
        { name: "Mercado", pct: 62, color: "#3B82F6" },
        { name: "Transporte", pct: 28, color: "#8B5CF6" },
        { name: "Lazer", pct: 14, color: "#10B981" },
      ].map((c) => (
        <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", width: 80, flexShrink: 0 }}>{c.name}</span>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 100, height: 6, overflow: "hidden" }}>
            <div style={{ width: `${c.pct}%`, height: "100%", background: c.color, borderRadius: 100 }} />
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", width: 30, textAlign: "right" }}>
            {c.pct}%
          </span>
        </div>
      ))}
    </div>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function LandingPage({ onLogin, onSignUp }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  // ── Header scroll
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // ── Hero entrance
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-badge", { y: 20, opacity: 0, duration: 0.7, ease: "power3.out", delay: 0.15 });
      gsap.from(".hero-h1", { y: 50, opacity: 0, duration: 1, ease: "power4.out", delay: 0.3 });
      gsap.from(".hero-sub", { y: 30, opacity: 0, duration: 0.8, ease: "power3.out", delay: 0.55 });
      gsap.from(".hero-ctas", { y: 24, opacity: 0, duration: 0.8, ease: "power3.out", delay: 0.72 });
      gsap.from(".hero-card", {
        y: 80,
        opacity: 0,
        duration: 1.1,
        ease: "power4.out",
        delay: 0.9,
        rotateX: 8,
        transformPerspective: 800,
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  // ── Features scroll reveal
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".feat-head", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: ".feat-head", start: "top 82%" },
      });
      gsap.from(".feat-card", {
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.13,
        ease: "power3.out",
        scrollTrigger: { trigger: ".feat-card", start: "top 85%" },
      });
    });
    return () => ctx.revert();
  }, []);

  // ── Steps scroll reveal
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".step-head", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: ".step-head", start: "top 82%" },
      });
      gsap.from(".step-item", {
        x: -50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.18,
        ease: "power3.out",
        scrollTrigger: { trigger: ".step-item", start: "top 82%" },
      });
      // Connector line draw
      gsap.from(".step-line", {
        scaleY: 0,
        transformOrigin: "top center",
        duration: 1.2,
        ease: "power2.inOut",
        scrollTrigger: { trigger: ".step-line", start: "top 80%" },
      });
    });
    return () => ctx.revert();
  }, []);

  // ── CTA section reveal
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".cta-content", {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: ".cta-content", start: "top 80%" },
      });
    });
    return () => ctx.revert();
  }, []);

  // ── Horizontal marquee scroll speed
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(".marquee-inner", {
        x: "-50%",
        duration: 24,
        ease: "none",
        repeat: -1,
      });
    });
    return () => ctx.revert();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const S = {
    page: {
      fontFamily: "'Sora', 'Helvetica Neue', sans-serif",
      background: "#020617",
      color: "#f8fafc",
      overflowX: "hidden" as const,
    },
    header: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      padding: "0 2rem",
      height: 64,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      transition: "all 0.3s",
      background: scrolled ? "rgba(2,6,23,0.85)" : "transparent",
      backdropFilter: scrolled ? "blur(20px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
    },
    logo: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      cursor: "pointer",
    },
    logoMark: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      fontSize: 18,
      color: "#fff",
      letterSpacing: -0.5,
      boxShadow: "0 0 20px rgba(59,130,246,0.4)",
    },
    logoText: {
      fontSize: 20,
      fontWeight: 800,
      letterSpacing: -0.5,
      color: "#f8fafc",
    },
    navLink: {
      background: "none",
      border: "none",
      color: "rgba(255,255,255,0.65)",
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      padding: "4px 0",
      transition: "color 0.2s",
      fontFamily: "inherit",
    },
    btnGhost: {
      background: "none",
      border: "none",
      color: "rgba(255,255,255,0.75)",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      padding: "8px 16px",
      borderRadius: 100,
      transition: "all 0.2s",
      fontFamily: "inherit",
    },
    btnPrimary: {
      background: "linear-gradient(135deg, #3B82F6, #2563EB)",
      border: "none",
      color: "#fff",
      fontSize: 15,
      fontWeight: 700,
      cursor: "pointer",
      padding: "12px 28px",
      borderRadius: 100,
      boxShadow: "0 4px 24px rgba(59,130,246,0.35)",
      transition: "all 0.2s",
      fontFamily: "inherit",
      letterSpacing: -0.2,
    },
    btnOutline: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.12)",
      color: "#fff",
      fontSize: 15,
      fontWeight: 600,
      cursor: "pointer",
      padding: "12px 28px",
      borderRadius: 100,
      transition: "all 0.2s",
      fontFamily: "inherit",
      backdropFilter: "blur(8px)",
    },
  };

  return (
    <>
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { overflow-x: hidden; }

        :root { scroll-behavior: smooth; }

        .nav-link:hover { color: #fff !important; }
        .btn-ghost:hover { background: rgba(255,255,255,0.08) !important; color: #fff !important; }
        .btn-primary:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 8px 32px rgba(59,130,246,0.5) !important; }
        .btn-outline:hover { background: rgba(255,255,255,0.10) !important; }
        .feat-card:hover { transform: translateY(-6px); box-shadow: 0 20px 60px rgba(0,0,0,0.4) !important; }
        .feat-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }

        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .desktop-actions { display: none !important; }
          .mobile-btn { display: block !important; }
          .hero-h1 { font-size: clamp(2.8rem, 9vw, 5rem) !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
        }

        .mobile-btn { display: none; }

        .mobile-menu {
          position: fixed;
          top: 64px;
          left: 0;
          right: 0;
          background: rgba(2,6,23,0.97);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding: 1.5rem 2rem;
          z-index: 99;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .marquee-wrap {
          overflow: hidden;
          white-space: nowrap;
          width: 100%;
          mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
        }

        .marquee-inner {
          display: inline-flex;
          gap: 3rem;
        }

        .marquee-item {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .marquee-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          flex-shrink: 0;
        }

        .gradient-text {
          background: linear-gradient(135deg, #93C5FD 0%, #C4B5FD 50%, #6EE7B7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .glow-blue {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(59,130,246,0.18) 0%, transparent 70%);
          pointer-events: none;
        }

        .tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.25);
          color: #93C5FD;
          margin-bottom: 1.5rem;
        }

        .tag-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3B82F6;
        }
      `}</style>

      <div style={S.page}>
        {/* ── HEADER ────────────────────────────────────────────────── */}
        <header style={S.header}>
          <div style={S.logo} onClick={onLogin}>
            <div style={S.logoMark}>F</div>
            <span style={S.logoText}>Finanly</span>
          </div>

          <nav className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {[["recursos", "Recursos"], ["como-funciona", "Como funciona"]].map(([id, label]) => (
              <button key={id} className="nav-link" style={S.navLink} onClick={() => scrollTo(id)}>
                {label}
              </button>
            ))}
          </nav>

          <div className="desktop-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn-ghost" style={S.btnGhost} onClick={onLogin}>Entrar</button>
            <button className="btn-primary" style={S.btnPrimary} onClick={onSignUp}>Começar grátis</button>
          </div>

          <button
            className="mobile-btn"
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 8 }}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <line x1="3" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="15" x2="19" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </header>

        {menuOpen && (
          <div className="mobile-menu">
            {[["recursos", "Recursos"], ["como-funciona", "Como funciona"]].map(([id, label]) => (
              <button key={id} style={{ ...S.navLink, color: "rgba(255,255,255,0.75)", fontSize: 16 }} onClick={() => scrollTo(id)}>
                {label}
              </button>
            ))}
            <button style={S.btnPrimary} onClick={onSignUp}>Começar grátis</button>
          </div>
        )}

        {/* ── HERO ──────────────────────────────────────────────────── */}
        <section
          ref={heroRef}
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "120px 2rem 80px",
            position: "relative",
            overflow: "hidden",
            background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.15) 0%, transparent 70%)",
          }}
        >
          <NoiseBg />

          {/* Glows */}
          <div className="glow-blue" style={{ width: 700, height: 700, top: "10%", left: "50%", transform: "translateX(-50%)" }} />
          <div className="glow-blue" style={{ width: 400, height: 400, bottom: "5%", left: "15%", background: "radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)" }} />

          {/* Grid lines */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
              backgroundSize: "64px 64px",
              pointerEvents: "none",
            }}
          />

          {/* Content */}
          <div style={{ maxWidth: 860, width: "100%", textAlign: "center", position: "relative", zIndex: 2 }}>
            <div className="hero-badge tag">
              <div className="tag-dot" />
              Gestão financeira com IA para famílias
            </div>

            <h1
              className="hero-h1"
              style={{
                fontSize: "clamp(3.5rem, 8vw, 5.5rem)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: -2,
                marginBottom: "1.5rem",
                color: "#f8fafc",
              }}
            >
              Suas finanças,{" "}
              <span className="gradient-text">finalmente sob controle</span>
            </h1>

            <p
              className="hero-sub"
              style={{
                fontSize: "clamp(1rem, 2vw, 1.2rem)",
                color: "rgba(248,250,252,0.55)",
                maxWidth: 560,
                margin: "0 auto 2.5rem",
                lineHeight: 1.7,
              }}
            >
              Importe faturas automaticamente, veja para onde vai cada centavo e tome decisões financeiras melhores — juntos como família.
            </p>

            <div
              className="hero-ctas"
              style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: "4rem" }}
            >
              <button className="btn-primary" style={{ ...S.btnPrimary, padding: "14px 36px", fontSize: 16 }} onClick={onSignUp}>
                Experimentar grátis
                <span style={{ marginLeft: 8 }}>→</span>
              </button>
              <button className="btn-outline" style={{ ...S.btnOutline, padding: "14px 36px", fontSize: 16 }} onClick={() => scrollTo("como-funciona")}>
                Como funciona
              </button>
            </div>

            <HeroDashboard />
          </div>
        </section>

        {/* ── MARQUEE ───────────────────────────────────────────────── */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.05)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            padding: "20px 0",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div className="marquee-wrap">
            <div className="marquee-inner">
              {[
                "Dashboard Inteligente",
                "IA que aprende",
                "Importação automática",
                "Finanças em família",
                "Metas e alertas",
                "Segurança bancária",
                "Relatórios avançados",
                "Categorização automática",
                // ─ duplicate for seamless loop ─
                "Dashboard Inteligente",
                "IA que aprende",
                "Importação automática",
                "Finanças em família",
                "Metas e alertas",
                "Segurança bancária",
                "Relatórios avançados",
                "Categorização automática",
              ].map((t, i) => (
                <span key={i} className="marquee-item">
                  <span className="marquee-dot" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── FEATURES ──────────────────────────────────────────────── */}
        <section
          id="recursos"
          style={{ padding: "8rem 2rem", background: "#030a1a", position: "relative", overflow: "hidden" }}
        >
          <NoiseBg />
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            {/* Section heading */}
            <div className="feat-head" style={{ textAlign: "center", marginBottom: "4rem" }}>
              <div className="tag" style={{ margin: "0 auto 1.5rem" }}>
                <div className="tag-dot" />
                Recursos
              </div>
              <h2
                style={{
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  fontWeight: 800,
                  letterSpacing: -1.5,
                  color: "#f8fafc",
                  lineHeight: 1.1,
                  marginBottom: "1rem",
                }}
              >
                Tudo que sua família precisa
              </h2>
              <p style={{ color: "rgba(248,250,252,0.45)", fontSize: 17, maxWidth: 500, margin: "0 auto" }}>
                Ferramentas poderosas para simplificar o controle financeiro do dia a dia.
              </p>
            </div>

            {/* Feature grid */}
            <div
              className="features-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
              }}
            >
              {FEATURES.map((f) => (
                <div
                  key={f.num}
                  className="feat-card"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 20,
                    padding: "2rem",
                    position: "relative",
                    overflow: "hidden",
                    cursor: "default",
                  }}
                >
                  {/* Accent top border */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: f.accent,
                      opacity: 0.6,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 40,
                      fontWeight: 800,
                      color: "rgba(255,255,255,0.05)",
                      fontFamily: "'DM Mono', monospace",
                      position: "absolute",
                      top: 16,
                      right: 20,
                      lineHeight: 1,
                    }}
                  >
                    {f.num}
                  </span>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `${f.accent}22`,
                      border: `1px solid ${f.accent}44`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "1.25rem",
                    }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: f.accent }} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc", marginBottom: 10, lineHeight: 1.3 }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: 14, color: "rgba(248,250,252,0.45)", lineHeight: 1.65 }}>{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
        <section
          id="como-funciona"
          style={{
            padding: "8rem 2rem",
            background: "#020617",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <NoiseBg />

          {/* Decorative arc */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              right: "-10%",
              width: 600,
              height: 600,
              borderRadius: "50%",
              border: "1px solid rgba(59,130,246,0.08)",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              right: "-18%",
              width: 800,
              height: 800,
              borderRadius: "50%",
              border: "1px solid rgba(59,130,246,0.05)",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ maxWidth: 760, margin: "0 auto", position: "relative", zIndex: 2 }}>
            {/* Heading */}
            <div className="step-head" style={{ marginBottom: "4rem" }}>
              <div className="tag">
                <div className="tag-dot" />
                Como funciona
              </div>
              <h2
                style={{
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  fontWeight: 800,
                  letterSpacing: -1.5,
                  color: "#f8fafc",
                  lineHeight: 1.1,
                }}
              >
                Simples como deve ser
              </h2>
            </div>

            {/* Steps */}
            <div style={{ position: "relative" }}>
              {/* Vertical connector */}
              <div
                className="step-line"
                style={{
                  position: "absolute",
                  left: 22,
                  top: 48,
                  bottom: 48,
                  width: 1,
                  background: "linear-gradient(to bottom, rgba(59,130,246,0.5), rgba(139,92,246,0.5), rgba(16,185,129,0.5))",
                }}
              />

              {STEPS.map((s, i) => (
                <div
                  key={s.n}
                  className="step-item"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 1fr",
                    gap: "1.5rem",
                    alignItems: "flex-start",
                    marginBottom: i < STEPS.length - 1 ? "3rem" : 0,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {/* Number circle */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: i === 0 ? "#3B82F6" : i === 1 ? "#8B5CF6" : "#10B981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 16,
                      color: "#fff",
                      flexShrink: 0,
                      boxShadow: `0 0 20px ${i === 0 ? "rgba(59,130,246,0.4)" : i === 1 ? "rgba(139,92,246,0.4)" : "rgba(16,185,129,0.4)"}`,
                    }}
                  >
                    {s.n}
                  </div>

                  {/* Text */}
                  <div style={{ paddingTop: 8 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc", marginBottom: 8, letterSpacing: -0.3 }}>
                      {s.title}
                    </h3>
                    <p style={{ fontSize: 16, color: "rgba(248,250,252,0.5)", lineHeight: 1.65 }}>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────── */}
        <section
          style={{
            padding: "8rem 2rem",
            background: "#030a1a",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <NoiseBg />

          {/* Glow */}
          <div
            className="glow-blue"
            style={{
              width: 800,
              height: 400,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "radial-gradient(ellipse, rgba(59,130,246,0.15) 0%, transparent 70%)",
            }}
          />

          <div
            className="cta-content"
            style={{
              maxWidth: 680,
              margin: "0 auto",
              textAlign: "center",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "1.5rem 2rem",
                background: "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.2)",
                borderRadius: 24,
                marginBottom: "2rem",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "#60A5FA", textTransform: "uppercase", letterSpacing: 2 }}>
                14 dias grátis · sem cartão
              </span>
            </div>

            <h2
              style={{
                fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
                fontWeight: 800,
                letterSpacing: -1.5,
                color: "#f8fafc",
                lineHeight: 1.1,
                marginBottom: "1.5rem",
              }}
            >
              Pronto para transformar as finanças da sua família?
            </h2>

            <p style={{ fontSize: 18, color: "rgba(248,250,252,0.5)", marginBottom: "2.5rem", lineHeight: 1.65 }}>
              Comece agora gratuitamente. Sem cartão de crédito. Sem complicação.
            </p>

            <button
              className="btn-primary"
              style={{ ...S.btnPrimary, padding: "16px 48px", fontSize: 17 }}
              onClick={onSignUp}
            >
              Começar agora — é grátis
            </button>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────── */}
        <footer
          style={{
            background: "#020617",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            padding: "4rem 2rem",
          }}
        >
          <div
            className="footer-grid"
            style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "4rem" }}
          >
            <div>
              <div style={{ ...S.logo, marginBottom: "1rem" }}>
                <div style={S.logoMark}>F</div>
                <span style={S.logoText}>Finanly</span>
              </div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", maxWidth: 280, lineHeight: 1.7 }}>
                Gestão financeira inteligente para famílias. Simplifique o controle do seu dinheiro.
              </p>
            </div>

            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: 2, marginBottom: "1rem" }}>
                Produto
              </p>
              {["Recursos", "Como funciona", "Preços"].map((l) => (
                <button
                  key={l}
                  onClick={() => scrollTo(l.toLowerCase().replace(/ /g, "-"))}
                  style={{ ...S.navLink, display: "block", marginBottom: 10, color: "rgba(255,255,255,0.4)" }}
                >
                  {l}
                </button>
              ))}
            </div>

            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: 2, marginBottom: "1rem" }}>
                Legal
              </p>
              {["Termos de uso", "Privacidade"].map((l) => (
                <a
                  key={l}
                  href="#"
                  style={{ display: "block", fontSize: 14, color: "rgba(255,255,255,0.4)", textDecoration: "none", marginBottom: 10, transition: "color 0.2s" }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#fff")}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.4)")}
                >
                  {l}
                </a>
              ))}
            </div>
          </div>

          <div
            style={{
              maxWidth: 1100,
              margin: "3rem auto 0",
              paddingTop: "2rem",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>© 2026 Finanly. Todos os direitos reservados.</p>
            <div style={{ display: "flex", gap: 16 }}>
              {["🌐", "🔒", "🛡️"].map((icon, i) => (
                <span
                  key={i}
                  style={{ fontSize: 16, opacity: 0.3, cursor: "pointer", transition: "opacity 0.2s" }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = "0.7")}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = "0.3")}
                >
                  {icon}
                </span>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}