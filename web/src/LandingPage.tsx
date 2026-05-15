import { useMemo, useState } from "react";

type LandingPageProps = {
  logoSrc: string;
  healthStatus: "checking" | "ok" | "error";
};

const landingFeatures = [
  {
    icon: "🤖",
    title: "Inteligência Artificial",
    text: "Analise editais, documentos e contratos em segundos com nosso assistente de IA especializado em gestão pública."
  },
  {
    icon: "🔄",
    title: "Sincronização Automática",
    text: "Dados atualizados em tempo real do Transferegov, FNS e SIMEC. Esqueça as consultas manuais e planilhas."
  },
  {
    icon: "📅",
    title: "Gestão de Prazos",
    text: "Alertas inteligentes para vigências, prestações de contas e prazos críticos. Nunca mais perca uma data."
  },
  {
    icon: "📑",
    title: "Documentação Inteligente",
    text: "Geração de documentos, templates e repositório centralizado com busca avançada por IA."
  },
  {
    icon: "🎫",
    title: "Central de Tickets",
    text: "Fluxo de atendimento integrado com ingestão automática de e-mails para organizar todas as demandas."
  },
  {
    icon: "📱",
    title: "Acesso Mobile",
    text: "Acompanhe sua carteira de convênios de qualquer lugar com nosso aplicativo dedicado."
  }
];

const landingPlans = [
  {
    name: "Start",
    price: "R$ 1.490",
    suffix: "/mês",
    description: "Ideal para pequenas prefeituras e equipes que estão começando a se organizar.",
    items: ["Gestão de Instrumentos", "Alertas de Vigência", "Até 5 usuários", "Suporte via Email"],
    cta: "Começar agora",
    featured: false
  },
  {
    name: "Profissional",
    price: "R$ 2.990",
    suffix: "/mês",
    description: "O plano mais completo para consultorias e prefeituras de médio porte.",
    items: ["Tudo do Start", "Integração Transferegov/FNS", "Assistente de IA Básico", "Gestão de Tickets"],
    cta: "Assinar plano Pro",
    featured: true
  },
  {
    name: "Enterprise",
    price: "R$ 5.990",
    suffix: "/mês",
    description: "Para grandes operações que exigem o máximo de automação e controle.",
    items: ["Tudo do Profissional", "IA Ilimitada", "API Customizada", "Gerente de conta dedicado"],
    cta: "Falar com consultor",
    featured: false
  }
];

export default function LandingPage({ logoSrc, healthStatus }: LandingPageProps) {
  const [leadNome, setLeadNome] = useState("");
  const [leadOrgao, setLeadOrgao] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadMensagem, setLeadMensagem] = useState("");

  const leadHref = useMemo(() => {
    const subject = "Interesse no GestConv 360";
    const body = [
      `Nome: ${leadNome || "-"}`,
      `Órgão/Empresa: ${leadOrgao || "-"}`,
      `Email: ${leadEmail || "-"}`,
      "",
      "Mensagem:",
      leadMensagem || "-"
    ].join("\n");
    return `mailto:comercial@gestconv360.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [leadEmail, leadMensagem, leadNome, leadOrgao]);

  return (
    <div className="landing-page-v3">
      <style>{`
        .landing-page-v3 {
          --primary-gradient: linear-gradient(135deg, #113451 0%, #0f4f72 100%);
          --accent-gradient: linear-gradient(135deg, #1d7a7d 0%, #2d6f9b 100%);
          color: #113451;
          font-family: 'Space Grotesk', sans-serif;
        }
        .v3-hero {
          padding: 80px 20px;
          text-align: center;
          background: #f8fbfe;
          border-bottom: 1px solid #e1e9f1;
        }
        .v3-badge {
          display: inline-block;
          padding: 6px 16px;
          background: #e1f0f0;
          color: #1d7a7d;
          border-radius: 99px;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 24px;
        }
        .v3-title {
          font-size: clamp(2.5rem, 5vw, 4rem);
          line-height: 1.1;
          max-width: 900px;
          margin: 0 auto 24px;
          font-family: 'Source Serif 4', serif;
        }
        .v3-subtitle {
          font-size: 1.25rem;
          color: #4e647b;
          max-width: 700px;
          margin: 0 auto 40px;
        }
        .v3-cta-group {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .v3-btn-primary {
          background: var(--primary-gradient);
          color: white;
          padding: 16px 32px;
          border-radius: 12px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 10px 20px rgba(15, 79, 114, 0.2);
          transition: transform 0.2s;
        }
        .v3-btn-secondary {
          background: white;
          color: #113451;
          padding: 16px 32px;
          border-radius: 12px;
          font-weight: 700;
          text-decoration: none;
          border: 1px solid #e1e9f1;
          transition: background 0.2s;
        }
        .v3-section {
          padding: 100px 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .v3-section-title {
          text-align: center;
          margin-bottom: 60px;
        }
        .v3-section-title h2 {
          font-size: 2.5rem;
          margin-bottom: 16px;
        }
        .v3-grid-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 32px;
        }
        .v3-feature-card {
          padding: 32px;
          background: white;
          border-radius: 24px;
          border: 1px solid #e1e9f1;
          transition: all 0.3s;
        }
        .v3-feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.05);
        }
        .v3-feature-icon {
          font-size: 40px;
          margin-bottom: 20px;
          display: block;
        }
        .v3-ai-banner {
          background: var(--primary-gradient);
          color: white;
          padding: 60px;
          border-radius: 32px;
          display: flex;
          align-items: center;
          gap: 40px;
          margin-top: 40px;
          overflow: hidden;
          position: relative;
        }
        .v3-ai-content h2 { color: white; margin-bottom: 20px; }
        .v3-pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }
        .v3-price-card {
          background: white;
          padding: 40px;
          border-radius: 24px;
          border: 1px solid #e1e9f1;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .v3-price-card.featured {
          border: 2px solid #1d7a7d;
          transform: scale(1.05);
          z-index: 2;
        }
        .v3-featured-badge {
          position: absolute;
          top: -15px;
          left: 50%;
          transform: translateX(-50%);
          background: #1d7a7d;
          color: white;
          padding: 4px 16px;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 700;
        }
        .v3-price-value {
          font-size: 3rem;
          font-weight: 700;
          margin: 20px 0;
        }
        .v3-price-value span { font-size: 1rem; color: #4e647b; }
        .v3-price-list {
          list-style: none;
          padding: 0;
          margin: 30px 0;
          flex-grow: 1;
        }
        .v3-price-list li {
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .v3-price-list li::before { content: "✓"; color: #1d7a7d; font-weight: bold; }
        
        @media (max-width: 768px) {
          .v3-ai-banner { flex-direction: column; padding: 40px 20px; }
          .v3-price-card.featured { transform: scale(1); }
        }
      `}</style>

      {/* Navbar */}
      <nav style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
        <img src={logoSrc} alt="GestConv 360" style={{ height: '130px', width: 'auto', objectFit: 'contain' }} />
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: healthStatus === 'ok' ? '#1d7a7d' : '#9b2c2c' }}>
            ● API {healthStatus === 'ok' ? 'Online' : 'Offline'}
          </span>
          <a href="/" style={{ textDecoration: 'none', color: '#113451', fontWeight: 600 }}>Entrar</a>
          <a href="#contato" className="v3-btn-primary" style={{ padding: '10px 20px' }}>Demonstração</a>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="v3-hero">
        <span className="v3-badge">Gestão Pública 4.0</span>
        <h1 className="v3-title">Transforme Convênios em Resultados com Inteligência Artificial.</h1>
        <p className="v3-subtitle">
          A plataforma definitiva para prefeituras e assessorias sincronizarem Transferegov, FNS e SIMEC, 
          eliminando planilhas e riscos de perda de prazos.
        </p>
        <div className="v3-cta-group">
          <a href="#contato" className="v3-btn-primary">Agendar Demonstração Gratuita</a>
          <a href="#recursos" className="v3-btn-secondary">Conhecer Recursos</a>
        </div>
        
        <div style={{ marginTop: '60px', opacity: 0.6, fontSize: '14px' }}>
          Confiado por prefeituras e órgãos em todo o Brasil
        </div>
      </header>

      {/* Features Section */}
      <section id="recursos" className="v3-section">
        <div className="v3-section-title">
          <h2>Tudo o que você precisa para uma gestão 360°.</h2>
          <p>Uma suite completa de ferramentas desenhadas para a rotina do gestor de convênios.</p>
        </div>
        
        <div className="v3-grid-features">
          {landingFeatures.map(f => (
            <div key={f.title} className="v3-feature-card">
              <span className="v3-feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p style={{ color: '#4e647b', lineHeight: 1.6 }}>{f.text}</p>
            </div>
          ))}
        </div>

        {/* AI Highlight Banner */}
        <div className="v3-ai-banner">
          <div className="v3-ai-content">
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '4px', fontSize: '12px' }}>EXCLUSIVO</span>
            <h2>Assistente de Inteligência Artificial</h2>
            <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
              Chega de ler editais de 100 páginas. Nossa IA extrai prazos, requisitos e obrigações 
              automaticamente para você. É como ter um consultor jurídico disponível 24h.
            </p>
            <a href="#contato" style={{ color: 'white', fontWeight: 700, marginTop: '20px', display: 'inline-block' }}>Ver IA em ação →</a>
          </div>
          <div style={{ fontSize: '120px', opacity: 0.2, position: 'absolute', right: '-20px', bottom: '-20px' }}>🤖</div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="v3-section" style={{ background: '#f8fbfe', maxWidth: '100%' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="v3-section-title">
            <h2>Planos sob medida para o seu desafio.</h2>
            <p>Seja você uma pequena prefeitura ou uma grande assessoria de gestão.</p>
          </div>

          <div className="v3-pricing-grid">
            {landingPlans.map(plan => (
              <div key={plan.name} className={`v3-price-card ${plan.featured ? 'featured' : ''}`}>
                {plan.featured && <span className="v3-featured-badge">MAIS POPULAR</span>}
                <h3 style={{ margin: 0 }}>{plan.name}</h3>
                <p style={{ fontSize: '14px', color: '#4e647b', margin: '10px 0' }}>{plan.description}</p>
                <div className="v3-price-value">{plan.price}<span>{plan.suffix}</span></div>
                <ul className="v3-price-list">
                  {plan.items.map(item => <li key={item}>{item}</li>)}
                </ul>
                <a href="#contato" className={plan.featured ? 'v3-btn-primary' : 'v3-btn-secondary'} style={{ textAlign: 'center' }}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contato" className="v3-section">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '60px', alignItems: 'center' }}>
          <div>
            <h2>Pronto para profissionalizar sua gestão?</h2>
            <p style={{ fontSize: '1.2rem', color: '#4e647b', marginBottom: '30px' }}>
              Agende uma conversa com nossos especialistas e descubra como o GestConv 360 
              pode economizar tempo e evitar a perda de recursos para o seu município.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <span style={{ fontSize: '24px' }}>📞</span>
                <div>
                  <strong>Atendimento Comercial</strong><br/>
                  <span style={{ color: '#4e647b' }}>comercial@gestconv360.com</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <span style={{ fontSize: '24px' }}>🏢</span>
                <div>
                  <strong>Sede</strong><br/>
                  <span style={{ color: '#4e647b' }}>Gestão Digital para Municípios</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '40px' }}>
            <h3 style={{ marginBottom: '24px' }}>Solicitar Proposta</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <input 
                value={leadNome} onChange={(e) => setLeadNome(e.target.value)}
                placeholder="Nome completo" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e1e9f1' }} 
              />
              <input 
                value={leadOrgao} onChange={(e) => setLeadOrgao(e.target.value)}
                placeholder="Prefeitura ou Empresa" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e1e9f1' }} 
              />
              <input 
                value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)}
                placeholder="E-mail profissional" type="email" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e1e9f1' }} 
              />
              <textarea 
                value={leadMensagem} onChange={(e) => setLeadMensagem(e.target.value)}
                placeholder="Como podemos ajudar?" rows={4} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e1e9f1', resize: 'none' }} 
              />
              <a href={leadHref} className="v3-btn-primary" style={{ textAlign: 'center' }}>Enviar Mensagem</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '60px 20px', borderTop: '1px solid #e1e9f1', textAlign: 'center', background: '#f8fbfe' }}>
        <img src={logoSrc} alt="GestConv 360" style={{ height: '30px', opacity: 0.5, marginBottom: '20px' }} />
        <p style={{ color: '#4e647b', fontSize: '14px' }}>
          © 2026 GestConv 360 - Inteligência em Gestão de Convênios.<br/>
          Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
