import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Props {
  onLogin: () => void;
  onSignUp: () => void;
}

const FEATURES = [
  {
    title: "Visao consolidada da familia",
    body: "Veja receitas, despesas, metas e saldo em uma leitura simples, sem trocar de planilha nem montar relatorio manual.",
    accent: "#3B82F6",
  },
  {
    title: "Importacao com IA",
    body: "Envie PDF ou CSV do banco e deixe a classificacao inicial pronta em segundos, com revisao antes de salvar.",
    accent: "#14B8A6",
  },
  {
    title: "Carteiras e cartoes no mesmo lugar",
    body: "Acompanhe conta corrente, dinheiro, poupanca e cartoes com contexto real de saldo e movimentacao.",
    accent: "#F59E0B",
  },
  {
    title: "Metas que avisam cedo",
    body: "Limites por categoria e alertas ajudam a agir antes do fim do mes virar surpresa.",
    accent: "#EF4444",
  },
];

const JOURNEY = [
  {
    step: "Acordar sabendo o que importa",
    body: "Na abertura do painel, a familia enxerga saldo, pendencias e categorias mais pesadas sem precisar investigar varias telas.",
    tag: "Manha",
  },
  {
    step: "Registrar ou importar sem friccao",
    body: "Uma nova compra entra manualmente em segundos. Faturas e extratos podem ser importados com ajuda da IA quando o volume cresce.",
    tag: "Dia a dia",
  },
  {
    step: "Fechar o mes com contexto",
    body: "Graficos, metas, parcelas e comparacoes mostram onde houve melhora, excesso ou risco para o proximo ciclo.",
    tag: "Fechamento",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Entre com Google",
    body: "Comece rapido com autenticacao simples e perfil pronto para organizar categorias, metas e compartilhamento.",
  },
  {
    n: "02",
    title: "Monte sua estrutura",
    body: "Cadastre contas, categorias e pessoas da familia para refletir a rotina real do seu dinheiro.",
  },
  {
    n: "03",
    title: "Acompanhe e ajuste",
    body: "Use os dashboards, importacao e assistente para revisar gastos, corrigir rumos e manter previsibilidade.",
  },
];

const STATS = [
  { label: "Saldo projetado", value: "R$ 12.480", tone: "#14B8A6" },
  { label: "Contas pendentes", value: "3", tone: "#F59E0B" },
  { label: "Metas ativas", value: "8", tone: "#3B82F6" },
];

const TIMELINE = [
  { label: "Mercado", amount: "-R$ 486", tone: "#3B82F6" },
  { label: "Salario", amount: "+R$ 6.200", tone: "#14B8A6" },
  { label: "Cartao principal", amount: "-R$ 1.920", tone: "#F59E0B" },
  { label: "Lazer", amount: "-R$ 318", tone: "#EF4444" },
];

const CATEGORY_BARS = [
  { label: "Casa", value: 72, tone: "#3B82F6" },
  { label: "Mercado", value: 58, tone: "#14B8A6" },
  { label: "Transporte", value: 36, tone: "#F59E0B" },
  { label: "Lazer", value: 22, tone: "#EF4444" },
];

function NoiseBg() {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.025, pointerEvents: "none" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" />
    </svg>
  );
}

function MiniBars() {
  const bars = [30, 48, 42, 64, 52, 58, 66, 54, 71, 62, 76, 68];
  return (
    <svg viewBox="0 0 260 92" style={{ width: "100%", height: 92 }}>
      {bars.map((height, index) => (
        <rect
          key={index}
          x={index * 21 + 2}
          y={92 - height}
          width={14}
          height={height}
          rx={4}
          fill={index === 8 ? "#14B8A6" : index > 8 ? "rgba(59,130,246,0.55)" : "rgba(255,255,255,0.12)"}
        />
      ))}
    </svg>
  );
}

function HeroDashboard() {
  return (
    <div className="hero-shell" style={{ position: "relative" }}>
      <div
        className="floating-panel panel-a"
        style={{
          position: "absolute",
          top: -24,
          right: -12,
          width: 180,
          padding: "1rem",
          borderRadius: 18,
          background: "rgba(7, 14, 32, 0.84)",
          border: "1px solid rgba(148, 163, 184, 0.16)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 24px 60px rgba(2, 6, 23, 0.34)",
          zIndex: 3,
        }}
      >
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: "rgba(226,232,240,0.42)", marginBottom: 10 }}>
          Alertas do mes
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#E2E8F0" }}>Mercado</span>
            <span style={{ fontSize: 12, color: "#F59E0B", fontWeight: 700 }}>84%</span>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{ width: "84%", height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #F59E0B, #FB923C)" }} />
          </div>
          <p style={{ fontSize: 12, color: "rgba(226,232,240,0.55)", lineHeight: 1.5 }}>
            Reta final do limite. Vale revisar as proximas compras.
          </p>
        </div>
      </div>

      <div
        className="floating-panel panel-b"
        style={{
          position: "absolute",
          left: -18,
          bottom: 28,
          width: 210,
          padding: "1rem",
          borderRadius: 18,
          background: "rgba(7, 14, 32, 0.84)",
          border: "1px solid rgba(148, 163, 184, 0.16)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 24px 60px rgba(2, 6, 23, 0.34)",
          zIndex: 3,
        }}
      >
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: "rgba(226,232,240,0.42)", marginBottom: 10 }}>
          Fluxo semanal
        </p>
        <div style={{ display: "flex", alignItems: "end", gap: 8, height: 80 }}>
          {[32, 58, 45, 74, 52, 66, 81].map((item, index) => (
            <div key={index} style={{ flex: 1, height: `${item}%`, borderRadius: 10, background: index === 6 ? "#3B82F6" : "rgba(255,255,255,0.13)" }} />
          ))}
        </div>
      </div>

      <div
        className="hero-card"
        style={{
          position: "relative",
          background: "linear-gradient(180deg, rgba(15,23,42,0.88) 0%, rgba(2,6,23,0.96) 100%)",
          border: "1px solid rgba(148,163,184,0.18)",
          borderRadius: 28,
          padding: "1.4rem",
          backdropFilter: "blur(18px)",
          boxShadow: "0 30px 100px rgba(2,6,23,0.5)",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top right, rgba(59,130,246,0.16), transparent 42%)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.2rem", position: "relative", zIndex: 1 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(248,113,113,0.7)" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(245,158,11,0.7)" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(20,184,166,0.7)" }} />
          <div
            style={{
              marginLeft: 12,
              flex: 1,
              height: 28,
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
            }}
          >
            <span style={{ fontSize: 11, color: "rgba(226,232,240,0.36)", letterSpacing: 1, fontFamily: "'DM Mono', monospace" }}>
              app.finanly.com.br/familia
            </span>
          </div>
        </div>

        <div className="hero-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14, position: "relative", zIndex: 1 }}>
          {STATS.map((item) => (
            <div
              key={item.label}
              style={{
                padding: "1rem",
                borderRadius: 18,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.1, color: "rgba(226,232,240,0.42)", marginBottom: 8 }}>
                {item.label}
              </p>
              <p style={{ fontSize: 24, fontWeight: 800, color: item.tone, letterSpacing: -0.6 }}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1.35fr 0.95fr", gap: 14, position: "relative", zIndex: 1 }}>
          <div
            style={{
              padding: "1.1rem",
              borderRadius: 22,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.1, color: "rgba(226,232,240,0.42)" }}>
                  Despesas dos ultimos meses
                </p>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#E2E8F0", marginTop: 4 }}>Tendencia controlada</p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#14B8A6",
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(20,184,166,0.12)",
                  border: "1px solid rgba(20,184,166,0.2)",
                }}
              >
                -12% vs anterior
              </span>
            </div>
            <MiniBars />
          </div>

          <div
            style={{
              padding: "1.1rem",
              borderRadius: 22,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "grid",
              gap: 12,
            }}
          >
            <div>
              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.1, color: "rgba(226,232,240,0.42)", marginBottom: 10 }}>
                Categorias em foco
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                {CATEGORY_BARS.map((item) => (
                  <div key={item.label} style={{ display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ fontSize: 13, color: "#E2E8F0" }}>{item.label}</span>
                      <span style={{ fontSize: 12, color: "rgba(226,232,240,0.54)" }}>{item.value}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ width: `${item.value}%`, height: "100%", borderRadius: 999, background: item.tone }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

            <div>
              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.1, color: "rgba(226,232,240,0.42)", marginBottom: 10 }}>
                Ultimos movimentos
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {TIMELINE.map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 13, color: "#CBD5E1" }}>{item.label}</span>
                    <span style={{ fontSize: 13, color: item.tone, fontWeight: 700 }}>{item.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onLogin, onSignUp }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-chip", { y: 24, opacity: 0, duration: 0.7, ease: "power3.out", delay: 0.05 });
      gsap.from(".hero-title", { y: 40, opacity: 0, duration: 0.95, ease: "power4.out", delay: 0.16 });
      gsap.from(".hero-copy", { y: 28, opacity: 0, duration: 0.8, ease: "power3.out", delay: 0.34 });
      gsap.from(".hero-actions", { y: 24, opacity: 0, duration: 0.8, ease: "power3.out", delay: 0.5 });
      gsap.from(".hero-note", { y: 20, opacity: 0, duration: 0.75, ease: "power3.out", delay: 0.62 });
      gsap.from(".hero-card", {
        y: 70,
        opacity: 0,
        duration: 1.05,
        ease: "power4.out",
        delay: 0.38,
        rotateX: 8,
        transformPerspective: 900,
      });
      gsap.from(".floating-panel", {
        y: 24,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.86,
      });
      gsap.to(".panel-a", {
        y: -10,
        duration: 2.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".panel-b", {
        y: 10,
        duration: 2.9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".reveal-section").forEach((section) => {
        const items = section.querySelectorAll(".reveal-item");
        gsap.from(items, {
          y: 36,
          opacity: 0,
          duration: 0.85,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 78%",
          },
        });
      });
    });

    return () => ctx.revert();
  }, []);

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

  const S = {
    page: {
      fontFamily: "'Sora', 'Helvetica Neue', sans-serif",
      background: "#03111F",
      color: "#F8FAFC",
      overflowX: "hidden" as const,
    },
    header: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      padding: "0 2rem",
      display: "flex",
      alignItems: "center",
      alignJustify: "center",
      background: scrolled ? "rgba(3,17,31,0.82)" : "transparent",
      backdropFilter: scrolled ? "blur(18px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(148,163,184,0.12)" : "1px solid transparent",
      transition: "all 0.25s ease",
    },
    logo: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      cursor: "pointer",
    },
    logoMark: {
      width: 38,
      height: 38,
      borderRadius: 12,
      background: "linear-gradient(135deg, #3B82F6 0%, #14B8A6 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      fontSize: 18,
      color: "#fff",
      boxShadow: "0 12px 28px rgba(59,130,246,0.3)",
    },
    logoText: {
      fontSize: 20,
      fontWeight: 800,
      letterSpacing: -0.5,
      color: "#F8FAFC",
    },
    navLink: {
      background: "none",
      border: "none",
      color: "rgba(226,232,240,0.68)",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      padding: 0,
      transition: "color 0.2s ease",
      fontFamily: "inherit",
    },
    btnGhost: {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(148,163,184,0.12)",
      color: "#E2E8F0",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      padding: "10px 16px",
      borderRadius: 999,
      transition: "all 0.2s ease",
      fontFamily: "inherit",
    },
    btnPrimary: {
      background: "linear-gradient(135deg, #3B82F6 0%, #14B8A6 100%)",
      border: "none",
      color: "#fff",
      fontSize: 15,
      fontWeight: 800,
      cursor: "pointer",
      padding: "13px 24px",
      borderRadius: 999,
      transition: "all 0.2s ease",
      fontFamily: "inherit",
      boxShadow: "0 18px 42px rgba(20,184,166,0.22)",
    },
    btnSecondary: {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(148,163,184,0.18)",
      color: "#F8FAFC",
      fontSize: 15,
      fontWeight: 700,
      cursor: "pointer",
      padding: "13px 24px",
      borderRadius: 999,
      transition: "all 0.2s ease",
      fontFamily: "inherit",
      backdropFilter: "blur(10px)",
    },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }
        :root { scroll-behavior: smooth; }

        .nav-link:hover { color: #F8FAFC !important; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 24px 50px rgba(20,184,166,0.28) !important; }
        .btn-secondary:hover { background: rgba(255,255,255,0.08) !important; }
        .btn-ghost:hover { background: rgba(255,255,255,0.08) !important; }
        .feature-card, .journey-card, .step-card {
          transition: transform 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease;
        }
        .feature-card:hover, .journey-card:hover, .step-card:hover {
          transform: translateY(-6px);
          border-color: rgba(148,163,184,0.24) !important;
          box-shadow: 0 24px 60px rgba(2, 6, 23, 0.24);
        }
        .mobile-btn { display: none; }
        .mobile-menu {
          position: fixed;
          top: 70px;
          left: 0;
          right: 0;
          z-index: 98;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.35rem 1.5rem 1.5rem;
          background: rgba(3,17,31,0.95);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(148,163,184,0.12);
        }
        .marquee-wrap {
          overflow: hidden;
          white-space: nowrap;
          width: 100%;
          mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
        }
        .marquee-inner {
          display: inline-flex;
          gap: 2.5rem;
          will-change: transform;
        }
        .marquee-item {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          color: rgba(226,232,240,0.44);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 12px;
          font-weight: 700;
        }
        .marquee-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(20,184,166,0.65);
          flex-shrink: 0;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid rgba(59,130,246,0.22);
          background: rgba(59,130,246,0.08);
          color: #93C5FD;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .chip-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #14B8A6;
          box-shadow: 0 0 0 6px rgba(20,184,166,0.12);
        }
        .gradient-title {
          background: linear-gradient(135deg, #F8FAFC 0%, #93C5FD 48%, #99F6E4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        @media (max-width: 960px) {
          .desktop-nav, .desktop-actions { display: none !important; }
          .mobile-btn { display: block !important; }
          .hero-layout { grid-template-columns: 1fr !important; gap: 3rem !important; }
          .hero-shell { max-width: 100%; }
          .floating-panel { display: none !important; }
          .feature-grid { grid-template-columns: 1fr 1fr !important; }
          .journey-grid { grid-template-columns: 1fr !important; }
          .step-grid { grid-template-columns: 1fr !important; }
        }

        @media (max-width: 760px) {
          .hero-title { font-size: clamp(2.9rem, 11vw, 4.6rem) !important; letter-spacing: -1.6px !important; }
          .hero-section { padding: 120px 1.25rem 70px !important; }
          .feature-grid, .step-grid { grid-template-columns: 1fr !important; }
          .hero-stats, .hero-grid { grid-template-columns: 1fr !important; }
          .hero-card { padding: 1rem !important; border-radius: 22px !important; }
          .section-wrap { padding-left: 1.25rem !important; padding-right: 1.25rem !important; }
          .footer-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
        }
      `}</style>

      <div style={S.page}>
        <header style={S.header}>
          <div className="max-w-295 w-full flex justify-between h-17.5 items-center" style={{margin: "0 auto"}}>
            <div style={S.logo} onClick={onLogin}>
              <div style={S.logoMark}>F</div>
              <span style={S.logoText}>Finanly</span>
            </div>

            <nav className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 28 }}>
              {[
                ["recursos", "Recursos"],
                ["rotina", "Rotina"],
                ["como-funciona", "Como funciona"],
              ].map(([id, label]) => (
                <button key={id} className="nav-link" style={S.navLink} onClick={() => scrollTo(id)}>
                  {label}
                </button>
              ))}
            </nav>

            <div className="desktop-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button className="btn-ghost" style={S.btnGhost} onClick={onLogin}>Entrar</button>
              <button className="btn-primary" style={{ ...S.btnPrimary, padding: "15px 30px", fontSize: 16 }} onClick={onSignUp}>
                  Criar minha conta
                </button>
            </div>

            <button
              className="mobile-btn"
              style={{ background: "none", border: "none", color: "#F8FAFC", fontSize: 24, cursor: "pointer" }}
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Abrir menu"
            >
              {menuOpen ? "×" : "☰"}
            </button>

          </div>
        </header>

        {menuOpen && (
          <div className="mobile-menu">
            {[
              ["recursos", "Recursos"],
              ["rotina", "Rotina"],
              ["como-funciona", "Como funciona"],
            ].map(([id, label]) => (
              <button
                key={id}
                style={{ ...S.navLink, textAlign: "left", fontSize: 16, color: "#E2E8F0" }}
                onClick={() => scrollTo(id)}
              >
                {label}
              </button>
            ))}
            <button className="btn-primary" style={{ ...S.btnPrimary, padding: "15px 30px", fontSize: 16 }} onClick={onSignUp}>
                  Criar minha conta
                </button>
          </div>
        )}

        <section
          ref={heroRef}
          className="hero-section"
          style={{
            position: "relative",
            minHeight: "100vh",
            padding: "128px 2rem 88px",
            overflow: "hidden",
            background:
              "radial-gradient(circle at 18% 18%, rgba(59,130,246,0.16), transparent 28%), radial-gradient(circle at 82% 20%, rgba(20,184,166,0.14), transparent 26%), linear-gradient(180deg, #03111F 0%, #06182A 52%, #08131E 100%)",
          }}
        >
          <NoiseBg />

          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "70px 70px",
              maskImage: "linear-gradient(180deg, rgba(0,0,0,0.55), transparent 88%)",
              pointerEvents: "none",
            }}
          />

          <div
            className="hero-layout"
            style={{
              maxWidth: 1180,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "0.95fr 1.05fr",
              gap: "2.5rem",
              alignItems: "center",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div>
              <div className="hero-chip chip">
                <span className="chip-dot" />
                Gestao financeira para a vida real
              </div>

              <h1
                className="hero-title"
                style={{
                  fontSize: "clamp(3.2rem, 5.5vw, 4.5rem)",
                  lineHeight: 0.98,
                  letterSpacing: -2.4,
                  fontWeight: 800,
                  marginTop: "1.35rem",
                  maxWidth: 620,
                }}
              >
                Menos caos no fim do mes. <span className="gradient-title">Mais clareza para decidir juntos.</span>
              </h1>

              <p
                className="hero-copy"
                style={{
                  marginTop: "1.5rem",
                  maxWidth: 540,
                  fontSize: 18,
                  lineHeight: 1.75,
                  color: "rgba(226,232,240,0.7)",
                }}
              >
                O Finanly junta importacao com IA, visao de contas, metas e acompanhamento familiar em uma interface feita para o dia a dia.
              </p>

              <div className="hero-actions" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: "2rem" }}>
                <button className="btn-primary" style={{ ...S.btnPrimary, padding: "15px 30px", fontSize: 16 }} onClick={onSignUp}>
                  Criar minha conta
                </button>
                <button className="btn-secondary" style={{ ...S.btnSecondary, padding: "15px 30px", fontSize: 16 }} onClick={() => scrollTo("rotina")}>
                  Ver rotina de uso
                </button>
              </div>

              <div className="hero-note" style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: "1.4rem" }}>
                {[
                  "Sem planilhas para manter",
                  "Importacao assistida por IA",
                  "Feito para uso individual e familiar",
                ].map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(226,232,240,0.58)", fontSize: 14 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: "#14B8A6", flexShrink: 0 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <HeroDashboard />
          </div>
        </section>

        <div
          style={{
            borderTop: "1px solid rgba(148,163,184,0.08)",
            borderBottom: "1px solid rgba(148,163,184,0.08)",
            padding: "18px 0",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div className="marquee-wrap">
            <div className="marquee-inner">
              {[
                "Controle mensal",
                "Importacao inteligente",
                "Resumo anual",
                "Categorias personalizadas",
                "Carteiras e cartoes",
                "Metas e limites",
                "Compartilhamento familiar",
                "Assistente financeiro",
                "Controle mensal",
                "Importacao inteligente",
                "Resumo anual",
                "Categorias personalizadas",
                "Carteiras e cartoes",
                "Metas e limites",
                "Compartilhamento familiar",
                "Assistente financeiro",
              ].map((item, index) => (
                <span className="marquee-item" key={index}>
                  <span className="marquee-dot" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <section id="recursos" className="reveal-section section-wrap" style={{ padding: "7rem 2rem", background: "#071523", position: "relative", overflow: "hidden" }}>
          <NoiseBg />
          <div style={{ maxWidth: 1120, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div className="reveal-item" style={{ maxWidth: 680, marginBottom: "3.2rem" }}>
              <div className="chip">
                <span className="chip-dot" />
                Recursos principais
              </div>
              <h2 style={{ fontSize: "clamp(2.1rem, 4vw, 3.4rem)", lineHeight: 1.05, letterSpacing: -1.5, fontWeight: 800, marginTop: "1.1rem" }}>
                Uma base forte para organizar o dinheiro sem criar atrito.
              </h2>
              <p style={{ marginTop: "1rem", maxWidth: 560, color: "rgba(226,232,240,0.64)", fontSize: 17, lineHeight: 1.7 }}>
                O produto foi desenhado para ser rapido nas tarefas repetidas e claro nas decisoes mais importantes.
              </p>
            </div>

            <div className="feature-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="feature-card reveal-item"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(148,163,184,0.14)",
                    borderRadius: 22,
                    padding: "1.5rem",
                    minHeight: 250,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at top right, ${feature.accent}22 0%, transparent 42%)`, pointerEvents: "none" }} />
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: `${feature.accent}1F`,
                      border: `1px solid ${feature.accent}44`,
                      marginBottom: "1rem",
                    }}
                  >
                    <div style={{ width: 14, height: 14, borderRadius: 999, background: feature.accent }} />
                  </div>
                  <h3 style={{ fontSize: 18, lineHeight: 1.28, fontWeight: 700, color: "#F8FAFC", marginBottom: 12, maxWidth: 220 }}>
                    {feature.title}
                  </h3>
                  <p style={{ fontSize: 14, lineHeight: 1.72, color: "rgba(226,232,240,0.62)" }}>
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="rotina" className="reveal-section section-wrap" style={{ padding: "7rem 2rem", background: "#05111D", position: "relative", overflow: "hidden" }}>
          <NoiseBg />
          <div
            style={{
              position: "absolute",
              top: 120,
              right: "-8%",
              width: 420,
              height: 420,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ maxWidth: 1120, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div className="reveal-item" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, maxWidth: 720, marginBottom: "3rem" }}>
              <div className="chip">
                <span className="chip-dot" />
                Nova secao
              </div>
              <h2 style={{ fontSize: "clamp(2.1rem, 4vw, 3.3rem)", lineHeight: 1.05, letterSpacing: -1.4, fontWeight: 800 }}>
                Como o app entra na rotina da casa.
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.72, color: "rgba(226,232,240,0.64)", maxWidth: 640 }}>
                Em vez de ser uma pagina bonita que voce abre uma vez, a ideia aqui e servir como ponto de consulta e ajuste constante durante a semana.
              </p>
            </div>

            <div className="journey-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {JOURNEY.map((item, index) => (
                <div
                  key={item.step}
                  className="journey-card reveal-item"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(148,163,184,0.14)",
                    borderRadius: 24,
                    padding: "1.55rem",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px 12px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      background: index === 0 ? "rgba(59,130,246,0.12)" : index === 1 ? "rgba(20,184,166,0.12)" : "rgba(245,158,11,0.12)",
                      color: index === 0 ? "#93C5FD" : index === 1 ? "#99F6E4" : "#FCD34D",
                    }}
                  >
                    {item.tag}
                  </div>
                  <h3 style={{ marginTop: "1rem", fontSize: 20, lineHeight: 1.2, fontWeight: 700, color: "#F8FAFC", minHeight: 72 }}>
                    {item.step}
                  </h3>
                  <p style={{ marginTop: "0.8rem", color: "rgba(226,232,240,0.62)", lineHeight: 1.72, fontSize: 14 }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="reveal-section section-wrap" style={{ padding: "7rem 2rem", background: "#071523", position: "relative", overflow: "hidden" }}>
          <NoiseBg />
          <div style={{ maxWidth: 1120, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div className="reveal-item" style={{ maxWidth: 660, marginBottom: "3rem" }}>
              <div className="chip">
                <span className="chip-dot" />
                Como funciona
              </div>
              <h2 style={{ fontSize: "clamp(2.1rem, 4vw, 3.3rem)", lineHeight: 1.05, letterSpacing: -1.4, fontWeight: 800, marginTop: "1.1rem" }}>
                Rapido para comecar, util para continuar usando.
              </h2>
            </div>

            <div className="step-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {STEPS.map((item) => (
                <div
                  key={item.n}
                  className="step-card reveal-item"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(148,163,184,0.14)",
                    borderRadius: 24,
                    padding: "1.6rem",
                    minHeight: 240,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#14B8A6", letterSpacing: 1.5, fontFamily: "'DM Mono', monospace" }}>
                    {item.n}
                  </div>
                  <h3 style={{ marginTop: "1rem", fontSize: 22, lineHeight: 1.15, fontWeight: 700, color: "#F8FAFC", maxWidth: 240 }}>
                    {item.title}
                  </h3>
                  <p style={{ marginTop: "0.85rem", fontSize: 14, lineHeight: 1.75, color: "rgba(226,232,240,0.62)" }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="reveal-section section-wrap" style={{ padding: "7rem 2rem", background: "#03111F", position: "relative", overflow: "hidden" }}>
          <NoiseBg />
          <div
            style={{
              maxWidth: 980,
              margin: "0 auto",
              padding: "3rem",
              borderRadius: 30,
              background: "linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(20,184,166,0.1) 100%)",
              border: "1px solid rgba(148,163,184,0.16)",
              position: "relative",
              zIndex: 1,
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top right, rgba(255,255,255,0.12), transparent 35%)", pointerEvents: "none" }} />
            <div className="reveal-item" style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
              <div className="chip" style={{ margin: "0 auto" }}>
                <span className="chip-dot" />
                Comece hoje
              </div>
              <h2 style={{ marginTop: "1.2rem", fontSize: "clamp(2.2rem, 4vw, 3.5rem)", lineHeight: 1.05, letterSpacing: -1.4, fontWeight: 800 }}>
                Sua familia merece um painel que ajuda de verdade.
              </h2>
              <p style={{ margin: "1rem auto 0", maxWidth: 580, color: "rgba(226,232,240,0.68)", fontSize: 17, lineHeight: 1.72 }}>
                Entre, conecte sua rotina financeira e comece a enxergar o mes com menos ruido e mais previsibilidade.
              </p>
              <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, marginTop: "2rem" }}>
                <button className="btn-primary reveal-item" style={{ ...S.btnPrimary, padding: "16px 34px", fontSize: 16 }} onClick={onSignUp}>
                  Criar conta gratis
                </button>
                <button className="btn-secondary reveal-item" style={{ ...S.btnSecondary, padding: "16px 34px", fontSize: 16 }} onClick={onLogin}>
                  Ja tenho conta
                </button>
              </div>
            </div>
          </div>
        </section>

        <footer style={{ background: "#020C16", borderTop: "1px solid rgba(148,163,184,0.1)", padding: "4rem 2rem 2rem" }}>
          <div className="footer-grid" style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: "3rem" }}>
            <div>
              <div style={{ ...S.logo, marginBottom: "1rem" }}>
                <div style={S.logoMark}>F</div>
                <span style={S.logoText}>Finanly</span>
              </div>
              <p style={{ maxWidth: 320, color: "rgba(226,232,240,0.48)", lineHeight: 1.75, fontSize: 14 }}>
                Gestao financeira pensada para familias que querem menos improviso e mais clareza no dia a dia.
              </p>
            </div>

            <div>
              <p style={{ color: "rgba(226,232,240,0.34)", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: "1rem" }}>
                Navegacao
              </p>
              {[
                ["recursos", "Recursos"],
                ["rotina", "Rotina"],
                ["como-funciona", "Como funciona"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  style={{ ...S.navLink, display: "block", marginBottom: 12, color: "rgba(226,232,240,0.52)" }}
                  onClick={() => scrollTo(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div>
              <p style={{ color: "rgba(226,232,240,0.34)", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: "1rem" }}>
                Acesso
              </p>
              <button style={{ ...S.navLink, display: "block", marginBottom: 12, color: "rgba(226,232,240,0.52)" }} onClick={onLogin}>
                Entrar
              </button>
              <button style={{ ...S.navLink, display: "block", marginBottom: 12, color: "rgba(226,232,240,0.52)" }} onClick={onSignUp}>
                Criar conta
              </button>
            </div>
          </div>

          <div
            style={{
              maxWidth: 1120,
              margin: "2.5rem auto 0",
              paddingTop: "1.5rem",
              borderTop: "1px solid rgba(148,163,184,0.08)",
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
              color: "rgba(226,232,240,0.28)",
              fontSize: 13,
            }}
          >
            <span>© 2026 Finanly. Todos os direitos reservados.</span>
            <span>Feito para clareza, rotina e controle real.</span>
          </div>
        </footer>
      </div>
    </>
  );
}
