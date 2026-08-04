import { useState, useEffect } from "react";
import { 
  Save, 
  Settings, 
  Globe, 
  Palette, 
  CreditCard, 
  Clock, 
  PhoneCall, 
  Instagram, 
  Send,
  Loader,
  CheckCircle2,
  Trash2,
  Plus,
  Image as ImageIcon,
  Gift,
  Trophy,
  UserPlus
} from "lucide-react";

interface Winner {
  id: number;
  rifaId: number;
  nome: string;
  cidade: string;
  estado: string;
  numeroPremiado: string;
  fotoPremioUrl: string;
  fotoEntregaUrl: string;
  depoimento: string;
  dataSorteio: string;
  rifa?: { titulo: string };
}

interface Coupon {
  codigo: string;
  descontoPct: number;
}

interface Rifa {
  id: number;
  titulo: string;
}

export default function AdminConfig({ token }: { token: string }) {
  const [activeTab, setActiveTab] = useState<"geral" | "banners" | "cupons" | "ganhadores">("geral");
  const [loadingGet, setLoadingGet] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");

  // Configuration settings state
  const [siteName, setSiteName] = useState("");
  const [logo, setLogo] = useState("");
  const [banner, setBanner] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [telegram, setTelegram] = useState("");
  const [tempoReserva, setTempoReserva] = useState("15");
  const [corPrincipal, setCorPrincipal] = useState("#4f46e5");
  const [corSecundaria, setCorSecundaria] = useState("#10b981");
  const [gatewayAtivo, setGatewayAtivo] = useState("MOCK");

  // Rotating banners state
  const [bannersList, setBannersList] = useState<string[]>([]);
  const [newBannerUrl, setNewBannerUrl] = useState("");

  // Promo coupons state
  const [cuponsList, setCuponsList] = useState<Coupon[]>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponPct, setNewCouponPct] = useState(10);

  // Winners logs states
  const [winners, setWinners] = useState<Winner[]>([]);
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [loadingWinners, setLoadingWinners] = useState(true);

  // New winner form inputs state
  const [winRifaId, setWinRifaId] = useState("");
  const [winNome, setWinNome] = useState("");
  const [winCidade, setWinCidade] = useState("");
  const [winEstado, setWinEstado] = useState("");
  const [winNumero, setWinNumero] = useState("");
  const [winFotoPremio, setWinFotoPremio] = useState("");
  const [winFotoEntrega, setWinFotoEntrega] = useState("");
  const [winDepoimento, setWinDepoimento] = useState("");

  // Load configuration set & items
  useEffect(() => {
    // 1. Fetch configs
    fetch("/api/configuracoes")
      .then((res) => res.json())
      .then((data) => {
        setSiteName(data.site_name || "Clube da Sorte");
        setLogo(data.logo || "");
        setBanner(data.banner || "");
        setWhatsapp(data.whatsapp || "");
        setInstagram(data.instagram || "");
        setTelegram(data.telegram || "");
        setTempoReserva(String(data.tempo_reserva || "15"));
        setCorPrincipal(data.cor_principal || "#4f46e5");
        setCorSecundaria(data.cor_secundaria || "#10b981");
        setGatewayAtivo(data.gateway_ativo || "MOCK");

        if (data.banners) {
          try {
            const list = JSON.parse(data.banners);
            if (Array.isArray(list)) setBannersList(list);
          } catch (e) {}
        }

        if (data.cupons_promo) {
          try {
            const list = JSON.parse(data.cupons_promo);
            if (Array.isArray(list)) setCuponsList(list);
          } catch (e) {}
        }
        setLoadingGet(false);
      })
      .catch((err) => {
        console.error("Erro configurações Admin:", err);
        setLoadingGet(false);
      });

    // 2. Fetch list of campaigns for winners mapping selection
    fetch("/api/rifas")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRifas(data);
      })
      .catch((err) => console.error("Erro ao carregar rifas:", err));

    // 3. Fetch winners logs list
    fetchWinners();
  }, []);

  const fetchWinners = () => {
    setLoadingWinners(true);
    fetch("/api/ganhadores")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setWinners(data);
        setLoadingWinners(false);
      })
      .catch((err) => {
        console.error("Erro ao buscar ganhadores:", err);
        setLoadingWinners(false);
      });
  };

  // Persists dynamic configurations to server
  const persistConfigKey = (key: string, value: string) => {
    return fetch("/api/admin/configuracoes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ [key]: value }),
    }).then((res) => res.json());
  };

  // Adds banner slide to dynamic home slider listings
  const handleAddBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerUrl.trim()) return;

    const updated = [...bannersList, newBannerUrl.trim()];
    setBannersList(updated);
    setNewBannerUrl("");

    persistConfigKey("banners", JSON.stringify(updated))
      .then(() => triggerAlert("Banner rotativo adicionado com sucesso!"))
      .catch((err) => console.error(err));
  };

  // Removes a banner slide link
  const handleRemoveBanner = (index: number) => {
    const updated = bannersList.filter((_, i) => i !== index);
    setBannersList(updated);

    persistConfigKey("banners", JSON.stringify(updated))
      .then(() => triggerAlert("Banner rotativo deletado da listagem."))
      .catch((err) => console.error(err));
  };

  // Adds Promo Code to platform config
  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCouponCode.trim().toUpperCase();
    if (!code) return;

    if (cuponsList.some((c) => c.codigo === code)) {
      alert("Este cupom já se encontra cadastrado!");
      return;
    }

    const updated = [...cuponsList, { codigo: code, descontoPct: newCouponPct }];
    setCuponsList(updated);
    setNewCouponCode("");
    setNewCouponPct(10);

    persistConfigKey("cupons_promo", JSON.stringify(updated))
      .then(() => triggerAlert(`Cupom promocional ${code} gravado!`))
      .catch((err) => console.error(err));
  };

  // Removes Coupon code from list
  const handleRemoveCoupon = (code: string) => {
    const updated = cuponsList.filter((c) => c.codigo !== code);
    setCuponsList(updated);

    persistConfigKey("cupons_promo", JSON.stringify(updated))
      .then(() => triggerAlert("Cupom promocional removido da plataforma."))
      .catch((err) => console.error(err));
  };

  // Registers manual Winner to action campaign
  const handleAddWinner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!winRifaId || !winNome || !winNumero) {
      alert("Por favor, preencha Rifa correlacionada, nome e número premiado!");
      return;
    }

    const payload = {
      rifaId: winRifaId,
      nome: winNome,
      cidade: winCidade,
      estado: winEstado,
      numeroPremiado: winNumero,
      fotoPremioUrl: winFotoPremio,
      fotoEntregaUrl: winFotoEntrega,
      depoimento: winDepoimento,
    };

    fetch("/api/admin/ganhadores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert(`Erro ao salvar ganhador: ${data.error}`);
        } else {
          triggerAlert("Ganhador catalogado com sucesso!");
          // Reset fields
          setWinRifaId("");
          setWinNome("");
          setWinCidade("");
          setWinEstado("");
          setWinNumero("");
          setWinFotoPremio("");
          setWinFotoEntrega("");
          setWinDepoimento("");
          fetchWinners();
        }
      })
      .catch((err) => console.error(err));
  };

  // Deletes winner catalog entry
  const handleDeleteWinner = (winnerId: number) => {
    if (!confirm("Deseja realmente remover este registro de ganhador?")) return;

    fetch(`/api/admin/ganhadores/${winnerId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(() => {
        triggerAlert("Registro de ganhador excluído.");
        fetchWinners();
      })
      .catch((err) => console.error(err));
  };

  // Save General configs logic
  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    const payload = {
      site_name: siteName,
      logo,
      banner,
      whatsapp,
      instagram,
      telegram,
      tempo_reserva: tempoReserva,
      cor_principal: corPrincipal,
      cor_secundaria: corSecundaria,
      gateway_ativo: gatewayAtivo,
    };

    fetch("/api/admin/configuracoes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        setSaving(false);
        if (!data.error) {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        } else {
          alert(`Erro ao salvar configurações: ${data.error}`);
        }
      })
      .catch((err) => {
        console.error("Erro ao salvar:", err);
        setSaving(false);
      });
  };

  const triggerAlert = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(""), 3500);
  };

  if (loadingGet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3 font-sans">
        <Loader className="w-8 h-8 animate-spin text-slate-700" />
        <span className="text-slate-500 font-bold text-sm block">Acessando central de diretrizes de marca...</span>
      </div>
    );
  }

  return (
    <div id="configs_portal_wrapper" className="max-w-5xl mx-auto space-y-6 pb-16 font-sans">
      
      {/* HEADER SECTION */}
      <section className="space-y-1">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Settings className="w-7 h-7 text-indigo-650 text-indigo-600" /> Diretrizes & Central de Ajustes
        </h1>
        <p className="text-slate-500 text-xs font-semibold">Customize as credenciais de pagamento por gateway PIX, mídias integradas, cupons de desconto, banners e registro de ganhadores.</p>
      </section>

      {/* TABS SELECTOR */}
      <div className="flex border-b border-slate-100 gap-1 overflow-x-auto pb-1 bg-white p-2 rounded-2xl">
        <button 
          onClick={() => setActiveTab("geral")}
          className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg transition duration-150 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "geral" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Globe className="w-4 h-4" /> Layout & Geral
        </button>
        <button 
          onClick={() => setActiveTab("banners")}
          className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg transition duration-150 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "banners" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <ImageIcon className="w-4 h-4" /> Banners Rotativos
        </button>
        <button 
          onClick={() => setActiveTab("cupons")}
          className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg transition duration-150 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "cupons" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Gift className="w-4 h-4" /> Cupons de Desconto
        </button>
        <button 
          onClick={() => setActiveTab("ganhadores")}
          className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg transition duration-150 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "ganhadores" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Trophy className="w-4 h-4" /> Gestão de Ganhadores
        </button>
      </div>

      {/* ALERTS POPUPS */}
      {success && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Configurações administrativas consolidadas no banco de dados com segurança!</span>
        </div>
      )}

      {alertMsg && (
        <div className="p-3.5 bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-extrabold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-indigo-650 text-indigo-600 shrink-0" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* TAB 1: SITE CONFIGS & GATEWAYS */}
      {activeTab === "geral" && (
        <form onSubmit={handleSaveGeneral} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Branding form */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4">
              <h3 className="font-extrabold text-xs uppercase text-indigo-650 text-indigo-600 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Globe className="w-4 h-4" /> Identidade Visual & Site
              </h3>

              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-550 uppercase">Nome da Aplicação</label>
                <input 
                  type="text" 
                  required 
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-550 uppercase">URL do Logotipo (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="https://..."
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-550 uppercase">Hero Banner Principal Geral</label>
                <input 
                  type="text" 
                  placeholder="https://images.unsplash.com/photo-..."
                  value={banner}
                  onChange={(e) => setBanner(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            </div>

            {/* Design tones branding */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4">
              <h3 className="font-extrabold text-xs uppercase text-indigo-650 text-indigo-600 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Palette className="w-4 h-4" /> Design & Paleta de Cores
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-550 uppercase">Cor Principal</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={corPrincipal}
                      onChange={(e) => setCorPrincipal(e.target.value)}
                      className="w-10 h-10 border border-slate-200 rounded-lg shrink-0 cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={corPrincipal}
                      onChange={(e) => setCorPrincipal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-mono font-bold text-slate-700 uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-550 uppercase">Cor Secundária</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={corSecundaria}
                      onChange={(e) => setCorSecundaria(e.target.value)}
                      className="w-10 h-10 border border-slate-200 rounded-lg shrink-0 cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={corSecundaria}
                      onChange={(e) => setCorSecundaria(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-mono font-bold text-slate-700 uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 font-medium leading-relaxed">
                <Clock className="w-5 h-5 text-indigo-500 shrink-0" />
                <span>O seletor de paletas altera os tons visuais das páginas estáticas do Clube da Sorte.</span>
              </div>
            </div>

            {/* Channels configuration */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4">
              <h3 className="font-extrabold text-xs uppercase text-indigo-650 text-indigo-600 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <PhoneCall className="w-4 h-4" /> Mídias & Suporte WhatsApp
              </h3>

              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-550 uppercase">Canal WhatsApp Suporte *</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Ex: 5511999999999"
                    className="w-full bg-slate-50 border border-slate-200 p-3 pl-10 rounded-xl text-xs font-semibold text-slate-800 outline-hidden focus:bg-white"
                  />
                  <PhoneCall className="w-4 h-4 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-550 uppercase">Instagram (Username)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="clube_da_sorte"
                    className="w-full bg-slate-50 border border-slate-200 p-3 pl-10 rounded-xl text-xs font-semibold text-slate-800 outline-hidden focus:bg-white"
                  />
                  <Instagram className="w-4 h-4 text-pink-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-550 uppercase">Canal Telegram (Link)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="https://t.me/seu_grupo"
                    className="w-full bg-slate-50 border border-slate-200 p-3 pl-10 rounded-xl text-xs font-semibold text-slate-800 outline-hidden focus:bg-white"
                  />
                  <Send className="w-4 h-4 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Holds and Gateways routing */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4">
              <h3 className="font-extrabold text-xs uppercase text-indigo-650 text-indigo-600 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <CreditCard className="w-4 h-4" /> Pagamentos & Gateway Pix
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-550 uppercase">Tempo Reserva (Min)</label>
                  <input 
                    type="number" 
                    required 
                    value={tempoReserva}
                    onChange={(e) => setTempoReserva(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-center text-slate-850 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-550 uppercase">Ambiente Gateway</label>
                  <select 
                    value={gatewayAtivo}
                    onChange={(e) => setGatewayAtivo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-850"
                  >
                    <option value="MOCK">MOCK (SANDBOX TESTES)</option>
                    <option value="MERCADO_PAGO">MERCADO PAGO (PROD)</option>
                    <option value="ASAAS">ASAAS (PROD)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-[10px] text-amber-900 font-semibold leading-relaxed">
                <span>O faturamento fictício está ativo por padrão no faturamento experimental. Chaves produtivas reais em Mercado Pago ou Asaas podem ser configuradas pela aba de gateways dedicados.</span>
              </div>
            </div>
          </div>

          {/* SUBMIT */}
          <section className="text-center pt-2">
            <button 
              type="submit" 
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-750 disabled:bg-indigo-300 text-white font-black text-xs py-3.5 px-10 rounded-xl transition duration-150 inline-flex items-center gap-1.5 shadow-lg shadow-indigo-600/10 cursor-pointer uppercase tracking-wider"
            >
              {saving ? (
                <>Gravando diretrizes... <Loader className="w-4 h-4 animate-spin" /></>
              ) : (
                <>
                  <Save className="w-4.5 h-4.5" /> Gravar Configurações Gerais
                </>
              )}
            </button>
          </section>
        </form>
      )}

      {/* TAB 2: ROTATING BANNERS LINK MANAGER */}
      {activeTab === "banners" && (
        <section className="space-y-6">
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4">
            <h3 className="font-extrabold text-xs uppercase text-indigo-600 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <ImageIcon className="w-4.5 h-4.5" /> Adicionar Novo Slide Banner
            </h3>
            
            <form onSubmit={handleAddBanner} className="flex gap-2">
              <input 
                type="url" 
                required
                placeholder="https://images.unsplash.com/... (URL de imagem válida)"
                value={newBannerUrl}
                onChange={(e) => setNewBannerUrl(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white outline-hidden"
              />
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-6 py-2.5 rounded-xl transition flex items-center gap-1 uppercase tracking-wider cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" /> Adicionar Banner
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4">
            <h3 className="font-extrabold text-xs uppercase text-slate-700 flex items-center gap-1.5 border-b border-offset pb-1">
              Banners Ativos do Carrossel ({bannersList.length})
            </h3>

            {bannersList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-2xl">
                Nenhum banner personalizado. A página principal utilizará os slides de imagem padrão.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bannersList.map((url, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-150 rounded-2xl overflow-hidden p-4 space-y-3 flex flex-col justify-between">
                    <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-slate-200">
                      <img src={url} alt={`Banner ${idx}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                      <span className="text-[10px] text-slate-500 font-mono truncate flex-1">{url}</span>
                      <button 
                        type="button"
                        onClick={() => handleRemoveBanner(idx)}
                        className="p-2 border border-red-200 bg-red-50 text-red-650 hover:bg-red-100 rounded-lg shrink-0 transition text-red-600 cursor-pointer"
                        title="Deletar slide"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 3: PROMO COUPONS MANAGER */}
      {activeTab === "cupons" && (
        <section className="space-y-6">
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4">
            <h3 className="font-extrabold text-xs uppercase text-indigo-650 text-indigo-600 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Gift className="w-4.5 h-4.5" /> Criar Novo Cupom Promocional
            </h3>

            <form onSubmit={handleAddCoupon} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase">Código do Cupom</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: SORTEMAXIMA"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-mono font-bold text-slate-800 uppercase focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase">Percentual de Desconto (%)</label>
                <input 
                  type="number" 
                  required
                  min={1}
                  max={100}
                  value={newCouponPct}
                  onChange={(e) => setNewCouponPct(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-extrabold text-center text-slate-800 focus:bg-white"
                />
              </div>

              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-750 text-white font-black text-xs py-3.5 px-6 rounded-xl transition flex items-center justify-center gap-1 uppercase tracking-wider cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" /> Habilitar Cupom
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4">
            <h3 className="font-extrabold text-xs text-slate-700 uppercase border-b border-slate-100 pb-2">
              Cupons de Desconto Ativos ({cuponsList.length})
            </h3>

            {cuponsList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-2xl">
                Nenhum cupom promocional ativo na plataforma.
              </div>
            ) : (
              <div className="space-y-2">
                {cuponsList.map((c, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border border-slate-100 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-250 font-bold font-mono text-xs px-3 py-1.5 rounded-lg">
                        {c.codigo}
                      </span>
                      <span className="text-xs font-black text-slate-705 text-slate-700">
                        {c.descontoPct}% de Desconto no checkout
                      </span>
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleRemoveCoupon(c.codigo)}
                      className="p-2 text-red-650 hover:bg-red-50 text-red-650 border border-transparent hover:border-red-200 rounded-xl transition text-red-600 cursor-pointer"
                      title="Deletar cupom"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 4: SYSTEM WINNERS MANAGER */}
      {activeTab === "ganhadores" && (
        <section className="space-y-6">
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4">
            <h2 className="font-extrabold text-xs uppercase text-indigo-650 text-indigo-600 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <UserPlus className="w-4.5 h-4.5" /> Declarar / Registrar Registro de Ganhador
            </h2>

            <form onSubmit={handleAddWinner} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase">Selecione a Rifa *</label>
                  <select 
                    value={winRifaId}
                    onChange={(e) => setWinRifaId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="">-- Escolha uma Campanha --</option>
                    {rifas.map((r) => (
                      <option key={r.id} value={r.id}>{r.titulo} (ID: {r.id})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase">Nome Completo do Vencedor *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ademilson Silveira Filho"
                    value={winNome}
                    onChange={(e) => setWinNome(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase">Cidade de Moradia *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="E.g. Campinas"
                    value={winCidade}
                    onChange={(e) => setWinCidade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase">Estado UF *</label>
                  <input 
                    type="text" 
                    required
                    maxLength={2}
                    placeholder="SP"
                    value={winEstado}
                    onChange={(e) => setWinEstado(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-extrabold uppercase text-center text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase">Número do Bilhete Premiado *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: 0045"
                    value={winNumero}
                    onChange={(e) => setWinNumero(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-mono font-black text-slate-800 tracking-wider text-center focus:bg-white outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase">URL Foto do Prêmio (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="https://..."
                    value={winFotoPremio}
                    onChange={(e) => setWinFotoPremio(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-850 focus:bg-white outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase">URL Foto do Ganhador/Entrega (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="https://..."
                    value={winFotoEntrega}
                    onChange={(e) => setWinFotoEntrega(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-850 focus:bg-white outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase">Depoimento ou Testemunho do Vencedor</label>
                <textarea 
                  rows={2}
                  placeholder="Gostei muito da seriedade do site, recebi o Pix de R$ 50 mil em menos de 1 hora..."
                  value={winDepoimento}
                  onChange={(e) => setWinDepoimento(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-850 focus:bg-white outline-hidden"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3.5 rounded-xl transition flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-white" /> Gravar Registro do Vencedor
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4">
            <h3 className="font-extrabold text-xs text-slate-700 uppercase border-b border-slate-100 pb-2">
              Histórico de Vencedores Cadastrados ({winners.length})
            </h3>

            {loadingWinners ? (
              <div className="flex justify-center p-6 text-slate-500 text-xs">
                <Loader className="w-5 h-5 animate-spin mr-1 text-slate-400" /> Carregando lista...
              </div>
            ) : winners.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-2xl">
                Nenhum ganhador cadastrado.
              </div>
            ) : (
              <div className="space-y-3">
                {winners.map((win) => (
                  <div key={win.id} className="flex justify-between items-center p-4 border border-slate-100 bg-slate-50 rounded-2xl">
                    <div className="space-y-1">
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase">
                        Rifa: {win.rifa?.titulo || `Rifa ID: ${win.rifaId}`}
                      </span>
                      <h4 className="font-extrabold text-xs text-slate-800">
                        {win.nome} ({win.cidade} - {win.estado})
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Cota da Sorte: <strong className="text-emerald-600 font-bold">{win.numeroPremiado}</strong> • Cadastrado em: {new Date(win.dataSorteio).toLocaleDateString("pt-BR")}
                      </p>
                      {win.depoimento && (
                        <p className="text-[11px] font-semibold italic text-slate-500 pl-2 border-l border-zinc-200 mt-1">"{win.depoimento}"</p>
                      )}
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleDeleteWinner(win.id)}
                      className="p-2 border border-red-100 bg-red-50 text-red-650 hover:bg-red-100 rounded-xl transition text-red-600 cursor-pointer inline-flex items-center"
                      title="Remover ganhador"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

    </div>
  );
}
