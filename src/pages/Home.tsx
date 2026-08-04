import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Trophy, 
  Sparkles, 
  CheckCircle, 
  Ticket, 
  Users, 
  MessageSquare, 
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
  TrendingUp,
  Award,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  PiggyBank
} from "lucide-react";

interface Rifa {
  id: number;
  titulo: string;
  descricao: string;
  valorPorNumero: number;
  quantidadeTotal: number;
  status: string;
  dataSorteio: string;
  vendidos: number;
  disponiveis: number;
  imagens: Array<{ url: string; isPrincipal: boolean }>;
  resultado?: string;
  ganhadores?: Array<{ nome: string }>;
}

interface BuyerRank {
  nome: string;
  cidade: string;
  estado: string;
  bilhetes: number;
}

export default function Home() {
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Custom public configs
  const [configs, setConfigs] = useState<any>({
    site_name: "Clube da Sorte",
    logo: "",
    banners: "",
    metrica_participantes_offset: "3485",
    metrica_ganhadores_offset: "24",
    metrica_distribuido_offset: "235000",
  });

  // Dynamic ranking from live backend paid orders
  const [ranking, setRanking] = useState<BuyerRank[]>([]);

  // Rotating banner settings
  const [currentSlide, setCurrentSlide] = useState(0);

  // Load all public data
  useEffect(() => {
    // 1. Fetch configs
    fetch("/api/configuracoes")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setConfigs((prev: any) => ({ ...prev, ...data }));
        }
      })
      .catch((err) => console.error("Error loading branding:", err));

    // 2. Fetch live campaign list
    fetch("/api/rifas")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRifas(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading campaigns:", err);
        setLoading(false);
      });

    // 3. Fetch buyer ranking
    fetch("/api/pedidos/ranking")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRanking(data);
        }
      })
      .catch((err) => console.error("Error loading buyer ranking:", err));
  }, []);

  // Compute fallback / standard banners
  let bannerList: string[] = [
    "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
  ];

  if (configs.banners) {
    try {
      const customBanners = JSON.parse(configs.banners);
      if (Array.isArray(customBanners) && customBanners.length > 0) {
        bannerList = customBanners;
      }
    } catch (e) {}
  }

  // Automatic slide rotation
  useEffect(() => {
    if (bannerList.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerList.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [bannerList.length]);

  const activeRifas = rifas.filter((r) => r.status === "ATIVO");
  const finishedRifas = rifas.filter((r) => r.status !== "ATIVO");

  // Dynamic system-wide stat counting (DB calculations + Admin offsets)
  const totalPaidTicketsCount = rifas.reduce((sum, r) => sum + (r.vendidos || 0), 0);
  const numActiveBuyers = ranking.length;

  const totalParticipantsMetric = parseFloat(configs.metrica_participantes_offset || "0") + numActiveBuyers + (totalPaidTicketsCount > 0 ? Math.round(totalPaidTicketsCount / 4) : 0);
  const totalWinnersMetric = parseFloat(configs.metrica_ganhadores_offset || "0") + finishedRifas.length;
  const totalDistributedMetric = parseFloat(configs.metrica_distribuido_offset || "0") + (totalPaidTicketsCount * 4.5);

  // Standard safe fallback top ranking if live DB query is empty (for onboarding)
  const displayRanking = ranking.length > 0 ? ranking : [
    { nome: "Carlos Oliveira", cidade: "São Paulo", estado: "SP", bilhetes: 240 },
    { nome: "Mariana Souza", cidade: "Belo Horizonte", estado: "MG", bilhetes: 195 },
    { nome: "Ademilson Silveira", cidade: "Curitiba", estado: "PR", bilhetes: 140 },
    { nome: "Priscila Mendes", cidade: "Salvador", estado: "BA", bilhetes: 110 },
  ];

  // Testimonials or custom dynamic feedback
  const depoimentos = [
    {
      nome: "Marcos Vinícius T.",
      cidade: "Sorocaba - SP",
      comentario: "Excelente plataforma! Comprei 5 bilhetes, acompanhei o sorteio ao vivo e ganhei uma Honda CG 160 Cargo. Confiança total!",
      foto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    },
    {
      nome: "Fernanda Silveira G.",
      cidade: "Goiânia - GO",
      comentario: "Sempre compro nas ações. Pix rápido, suporte excelente no WhatsApp e números liberados instantaneamente. Recomendo muito!",
      foto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    }
  ];

  return (
    <div id="home_container" className="space-y-12 font-sans text-slate-200">
      
      {/* 1. HERO PROMO ROTATING ACCENT SLIDESHOW */}
      <section id="banner_slideshow" className="relative rounded-3xl overflow-hidden bg-neutral-950 text-white min-h-[380px] md:min-h-[420px] flex flex-col justify-center p-8 md:p-12 shadow-2xl border border-zinc-800/60">
        {/* Dynamic Slide Background */}
        {bannerList.map((url, index) => (
          <div 
            key={index} 
            className={`absolute inset-0 z-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-35" : "opacity-0"
            }`}
          >
            <img 
              src={url} 
              alt={`Slide Banner ${index}`} 
              className="w-full h-full object-cover grayscale scale-102"
            />
          </div>
        ))}
        {/* Shadow Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/90 to-transparent z-0"></div>

        {/* Content Block */}
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-xs border border-emerald-500/20">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Sua sorte está a um clique no {configs.site_name}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight font-display">
            Ações da Sorte com <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-400">Total Confiabilidade</span>!
          </h1>
          <p className="text-base md:text-lg text-slate-300 font-medium">
            Rifas 100% legalizadas e apuradas via Loteria Federal. Adquira números da sorte via Pix com aprovação em 2 segundos!
          </p>
          
          <div className="flex flex-wrap gap-4 pt-2">
            <a 
              href="#rifas_ativas_section" 
              className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 px-8 py-3.5 rounded-xl font-black transition duration-200 shadow-md shadow-emerald-500/10 flex items-center gap-2.5 cursor-pointer"
            >
              Ver Campanhas Ativas <ArrowRight className="w-5 h-5 text-neutral-950" />
            </a>
            <Link 
              to="/compras" 
              className="bg-[#121217] hover:bg-zinc-900 border border-zinc-800/80 text-slate-350 hover:text-white px-6 py-3.5 rounded-xl font-extrabold text-xs tracking-wider uppercase transition duration-200"
            >
              Meus Bilhetes
            </Link>
          </div>
        </div>

        {/* Slider Controls Indicator */}
        {bannerList.length > 1 && (
          <div className="absolute bottom-6 right-6 z-20 flex gap-2">
            {bannerList.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-3.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === currentSlide ? "bg-emerald-400 w-7" : "bg-white/35 hover:bg-white/60"
                }`}
                title={`Ver Slide ${i + 1}`}
              ></button>
            ))}
          </div>
        )}
      </section>

      {/* 2. PLATFORM STATISTICS COUNTERS (PUBLIC METRICS) */}
      <section id="statistics_grid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="bg-[#131317] p-6 rounded-2xl border border-zinc-805 shadow-xl flex items-center gap-4.5">
          <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-display">
              {totalParticipantsMetric.toLocaleString("pt-BR")}
            </div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400/80 mt-0.5">Participantes Ativos</div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#131317] p-6 rounded-2xl border border-zinc-805 shadow-xl flex items-center gap-4.5">
          <div className="p-4 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-display">
              {totalWinnersMetric.toLocaleString("pt-BR")}
            </div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400/80 mt-0.5">Ganhadores Premiados</div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#131317] p-6 rounded-2xl border border-zinc-805 shadow-xl flex items-center gap-4.5">
          <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-450 text-emerald-400 flex items-center justify-center">
            <PiggyBank className="w-8 h-8" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-display">
              R$ {totalDistributedMetric.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400/80 mt-0.5">Prêmios Distribuídos</div>
          </div>
        </div>
      </section>

      {/* 3. ACTIVE RAFFLES SECTION */}
      <section id="rifas_ativas_section" className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight font-display">🔥 Campanhas da Sorte em Destaque</h2>
          <p className="text-slate-400 text-sm font-semibold">Escolha seu prêmio dos sonhos e participe em segundos!</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-zinc-900/60 animate-pulse h-96 rounded-2xl border border-zinc-805"></div>
            ))}
          </div>
        ) : activeRifas.length === 0 ? (
          <div className="bg-[#131317] border border-zinc-805 p-12 text-center rounded-2xl space-y-3">
            <span className="text-4xl">🎟️</span>
            <h3 className="text-lg font-bold text-slate-300">Nenhuma ação ativa no momento</h3>
            <p className="text-slate-500 text-sm font-semibold">Fique de olho e acompanhe nossos próximos lançamentos!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeRifas.map((rifa) => {
              const total = rifa.quantidadeTotal;
              const vendidos = rifa.vendidos || 0;
              const percentualFormatado = total > 0 ? Math.min(100, Math.round((vendidos / total) * 100)) : 0;
              const principalImg = rifa.imagens?.find((img) => img.isPrincipal)?.url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";

              return (
                <div key={rifa.id} className="bg-[#131317] border border-zinc-805 rounded-2xl overflow-hidden shadow-lg hover:shadow-black/70 hover:border-zinc-750 transition duration-200 flex flex-col h-full group">
                  <div className="relative aspect-video overflow-hidden bg-slate-900">
                    <img 
                      src={principalImg} 
                      alt={rifa.titulo} 
                      className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-emerald-500 text-neutral-950 text-xs font-black px-3 py-1.5 rounded-full uppercase shadow-lg">
                      ⚡ Ativa
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-md text-emerald-400 text-sm font-black px-3 py-1.5 rounded-xl uppercase border border-zinc-800 shadow-lg font-mono">
                      R$ {rifa.valorPorNumero.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="text-base font-black text-slate-100 font-display leading-snug group-hover:text-emerald-400 transition">
                        {rifa.titulo}
                      </h3>
                      <p className="text-slate-400 text-xs font-semibold line-clamp-2">
                        {rifa.descricao || "Participe da nossa ação da sorte oficial. Compre bilhetes Pix agora!"}
                      </p>
                    </div>

                    {/* Progress details */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-emerald-400 font-black">{percentualFormatado}% vendido</span>
                        <span className="text-slate-400">{total.toLocaleString()} Números</span>
                      </div>
                      <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800/30">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentualFormatado}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-400 pt-1">
                        <span>Livre: {(total - vendidos).toLocaleString()}</span>
                        <span>Apuração: {rifa.dataSorteio ? new Date(rifa.dataSorteio).toLocaleDateString("pt-BR") : "Nas próximas semanas"}</span>
                      </div>
                    </div>

                    <Link 
                      to={`/rifa/${rifa.id}`} 
                      className="w-full text-center bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-neutral-950 font-black py-3 rounded-xl transition duration-150 text-xs uppercase tracking-wider border border-emerald-500/20 flex items-center justify-center gap-1.5 group-hover:bg-emerald-500 group-hover:text-neutral-950 cursor-pointer"
                    >
                      <Ticket className="w-4 h-4" /> Comprar Bilhetes
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. TRANSPARENCY SECTION (COMO FUNCIONA / INFORMAÇÕES DE CONFIANÇA) */}
      <section id="transparency_section" className="bg-[#131317] border border-zinc-805 p-6 md:p-8 rounded-3xl shadow-xl space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 py-1 px-3.5 rounded-full border border-emerald-500/15">
            <ShieldCheck className="w-3.5 h-3.5" /> Segurança & Transparência
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white font-display">Como funciona a apuração?</h2>
          <p className="text-slate-400 text-xs font-semibold leading-relaxed">
            Aqui sua sorte é tratada de forma limpa e transparente. Nós somos um canal homologado com sorteios baseados nas extrações oficiais brasileiras.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-3">
          {/* Box 1 */}
          <div className="bg-[#17171e] p-5 rounded-2xl border border-zinc-800/60 text-center space-y-3.5 hover:border-emerald-500/20 transition">
            <div className="w-11 h-11 bg-emerald-500/10 text-emerald-400 mx-auto rounded-xl flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-wide">Escolha a Ação</h4>
              <p className="text-slate-400 text-[11px] font-medium leading-relaxed">Navegue pelas campanhas ativas e escolha o prêmio que deseja concorrer hoje.</p>
            </div>
          </div>

          {/* Box 2 */}
          <div className="bg-[#17171e] p-5 rounded-2xl border border-zinc-800/60 text-center space-y-3.5 hover:border-emerald-500/20 transition">
            <div className="w-11 h-11 bg-emerald-500/10 text-emerald-400 mx-auto rounded-xl flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-wide">Pague pelo Pix</h4>
              <p className="text-slate-400 text-[11px] font-medium leading-relaxed">A cobrança QR Code ou Copia e Cola é gerada e aprovada instantaneamente em tempo real.</p>
            </div>
          </div>

          {/* Box 3 */}
          <div className="bg-[#17171e] p-5 rounded-2xl border border-zinc-800/60 text-center space-y-3.5 hover:border-emerald-500/20 transition">
            <div className="w-11 h-11 bg-emerald-500/10 text-emerald-400 mx-auto rounded-xl flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-wide">Garanta Seus Bilhetes</h4>
              <p className="text-slate-400 text-[11px] font-medium leading-relaxed">Seus números são atribuídos imediatamente e você pode acompanhá-los na Área do Cliente.</p>
            </div>
          </div>

          {/* Box 4 */}
          <div className="bg-[#17171e] p-5 rounded-2xl border border-zinc-800/60 text-center space-y-3.5 hover:border-emerald-500/20 transition">
            <div className="w-11 h-11 bg-emerald-500/10 text-emerald-400 mx-auto rounded-xl flex items-center justify-center font-bold text-sm">
              4
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-wide">Acompanhe Extração</h4>
              <p className="text-slate-400 text-[11px] font-medium leading-relaxed">Os sorteios são baseados puramente no resultado oficial da extração da Loteria Federal.</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-emerald-500/5 text-emerald-400/90 border border-emerald-500/10 text-xs font-semibold leading-relaxed rounded-2xl flex items-center gap-2 max-w-2xl mx-auto">
          <HeartHandshake className="w-5 h-5 text-emerald-400 shrink-0" />
          <span><strong>Compromisso Clube da Sorte:</strong> Oferecemos infraestrutura de pagamento e entrega protegida. Todos os sorteados recebem sem complicações ou taxas surpresas!</span>
        </div>
      </section>

      {/* 5. BUYERS RANKING & CAROUSEL GRID */}
      <section id="marketing_split" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Buyer ranking */}
        <div className="bg-[#131317] border border-zinc-805 p-6 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white font-display">🏆 Ranking de Compradores</h2>
              <p className="text-slate-400 text-xs font-semibold">Os maiores apoiadores e compradores ativos da semana</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {displayRanking.map((comprador, index) => (
              <div key={index} className="flex items-center justify-between p-3.5 bg-[#17171E] rounded-2xl border border-zinc-800/40 hover:border-zinc-700/60 transition duration-150">
                <div className="flex items-center gap-3 bg-transparent">
                  <div className={`w-8 h-8 font-black text-xs rounded-xl flex items-center justify-center ${
                    index === 0 ? "bg-amber-500/20 text-amber-400 shadow-sm border border-amber-500/30" : 
                    index === 1 ? "bg-slate-850 text-slate-300 border border-slate-700" :
                    index === 2 ? "bg-zinc-800 text-[#ea580c]" : "bg-zinc-900 text-slate-500"
                  }`}>
                    #{index + 1}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-100">{comprador.nome}</h4>
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">{comprador.cidade} - {comprador.estado}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-500/10 text-emerald-400 font-extrabold text-xs px-3.5 py-1.5 rounded-full border border-emerald-500/20">
                    {comprador.bilhetes} Cota{comprador.bilhetes > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Happy Customer review space */}
        <div className="bg-[#131317] border border-zinc-805 p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-6">
          <div className="flex items-center gap-3 bg-transparent">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white font-display">💬 Depoimentos de Ganhadores</h2>
              <p className="text-slate-400 text-xs font-semibold">Quem realizou o sonho com no Clube da Sorte</p>
            </div>
          </div>

          <div className="space-y-5 flex-1 flex flex-col justify-center">
            {depoimentos.map((depo, idx) => (
              <div key={idx} className="space-y-2 border-b border-zinc-800/40 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-3 bg-transparent">
                  <img src={depo.foto} alt={depo.nome} className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/20" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-100 leading-none">{depo.nome}</h4>
                    <span className="text-[10px] font-bold text-slate-500">{depo.cidade}</span>
                  </div>
                  <div className="ml-auto flex text-amber-500 justify-end gap-0.5">
                    {"★".repeat(5)}
                  </div>
                </div>
                <p className="text-xs text-slate-400 italic font-semibold leading-relaxed pl-13">
                  "{depo.comentario}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FINISHED/CLOSED RAFFLES WITH DECLARED WINNERS */}
      <section id="closed_raffles_section" className="space-y-6 pt-2">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight font-display">🏆 Sorteios Recentes & Ganhadores</h2>
          <p className="text-slate-405 text-slate-400 text-sm font-semibold">Consulte quem levou a melhor nas campanhas já encerradas</p>
        </div>

        {loading ? (
          <div className="h-44 bg-zinc-900/60 animate-pulse rounded-2xl border border-zinc-805"></div>
        ) : finishedRifas.length === 0 ? (
          <div className="bg-[#131317] border border-zinc-850 p-8 text-center rounded-2xl">
            <p className="text-slate-400 text-sm font-semibold">Aguardando a conclusão da primeira ação para premiar o primeiro vencedor!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {finishedRifas.map((rifa) => {
              const principalImg = rifa.imagens?.find((i) => i.isPrincipal)?.url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";
              const isFinal = rifa.status === "FINALIZADO";

              return (
                <div key={rifa.id} className="bg-[#131317] border border-zinc-805 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center">
                  <div className="w-full sm:w-1/3 aspect-video sm:aspect-square rounded-xl overflow-hidden bg-slate-900 shrink-0">
                    <img src={principalImg} alt={rifa.titulo} className="w-full h-full object-cover grayscale opacity-90" />
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left bg-transparent">
                    <span className="inline-block bg-zinc-850 text-slate-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {isFinal ? "Finalizado" : "Encerrado"}
                    </span>
                    <h3 className="text-sm font-black text-slate-100 leading-tight font-display">{rifa.titulo}</h3>
                    
                    {isFinal && rifa.resultado ? (
                      <div className="bg-zinc-900/85 border border-zinc-800/60 p-2.5 rounded-xl text-xs space-y-1 shadow-inner">
                        <div className="font-bold text-slate-300 flex items-center justify-center sm:justify-start gap-1">
                          <Trophy className="w-3.5 h-3.5 text-amber-500 inline shrink-0" /> Bilhete Sorteado: <strong className="text-emerald-400 font-black">{rifa.resultado}</strong>
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold text-left line-clamp-1">
                          Ganhador: {rifa.ganhadores?.[0]?.nome || "Pendente de confirmação"}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 font-semibold italic">Apurando números em breve...</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
