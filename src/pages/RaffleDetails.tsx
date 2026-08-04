import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { 
  Ticket, 
  HelpCircle, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle,
  TrendingUp, 
  Sparkles,
  Info,
  Calendar,
  Gift,
  Coins,
  Loader,
  Percent,
  Sparkle
} from "lucide-react";

interface Rifa {
  id: number;
  titulo: string;
  descricao: string;
  regulamento: string;
  valorPorNumero: number;
  quantidadeTotal: number;
  status: string;
  dataSorteio: string;
  metodoSorteio: string;
  combos: Array<{ id: number; nome: string; quantidade: number; desconto: number; valorFinal: number }>;
  imagens: Array<{ url: string; isPrincipal: boolean }>;
}

export default function RaffleDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rifa, setRifa] = useState<Rifa | null>(null);
  const [takenNumbers, setTakenNumbers] = useState<Record<string, "RESERVADO" | "PAGO">>({});
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState("");
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [manualGridPage, setManualGridPage] = useState(0);
  
  // Custom lucky numbers state
  const [customLuckyQty, setCustomLuckyQty] = useState("");
  
  // Promotional coupons state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [configs, setConfigs] = useState<any>({ cupons_promo: "[]" });

  // Checkout drawer variables
  const [showCheckout, setShowCheckout] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cpf, setCpf] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [errorText, setErrorText] = useState("");

  const ticketsPerPage = 200;

  useEffect(() => {
    if (!id) return;

    // 1. Fetch live details
    fetch(`/api/rifas/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setErrorText(data.error);
        } else {
          setRifa(data);
          const principalImg = data.imagens?.find((img: any) => img.isPrincipal)?.url || data.imagens?.[0]?.url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";
          setActiveImage(principalImg);
        }
      })
      .catch((err) => console.error("Erro detalhes rifa:", err));

    // 2. Fetch live ticket states
    fetch(`/api/rifas/${id}/numbers`)
      .then((res) => res.json())
      .then((data) => {
        if (data.taken) {
          setTakenNumbers(data.taken);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro numeros rifa:", err);
        setLoading(false);
      });

    // 3. Fetch public coupons for simulation/live application
    fetch("/api/configuracoes")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setConfigs((prev: any) => ({ ...prev, ...data }));
        }
      })
      .catch((err) => console.error("Erro ao carregar cupons:", err));

    // 4. Coordinate real-time websocket synchronization
    const socket = io();
    socket.emit("join-rifa", id);

    socket.on("ticket-update", (data: { numbers: string[]; status: "RESERVADO" | "PAGO" | "DISPONIVEL" }) => {
      setTakenNumbers((prev) => {
        const copy = { ...prev };
        data.numbers.forEach((num) => {
          if (data.status === "DISPONIVEL") {
            delete copy[num];
          } else {
            copy[num] = data.status;
          }
        });
        return copy;
      });
    });

    socket.on("raffle-status-update", (data: { rifaId: number; status: string }) => {
      if (Number(data.rifaId) === Number(id)) {
        setRifa((prev) => (prev ? { ...prev, status: data.status } : null));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-sans text-slate-400">
        <Loader className="w-10 h-10 animate-spin text-emerald-400" />
        <span className="text-slate-400 font-semibold text-sm">Carregando detalhes da ação da sorte...</span>
      </div>
    );
  }

  if (!rifa) {
    return (
      <div className="bg-red-950/20 border border-red-500/30 p-8 text-center rounded-2xl max-w-lg mx-auto my-12 space-y-4 font-sans">
        <AlertCircle className="w-12 h-12 text-red-100 mx-auto" />
        <h3 className="text-lg font-black text-red-400 font-display">Ação não encontrada</h3>
        <p className="text-red-300 text-sm">{errorText || "Esta ação pode ter sido finalizada ou editada por administradores."}</p>
        <button onClick={() => navigate("/")} className="bg-zinc-900 border border-zinc-800 hover:text-white text-slate-300 font-bold px-6 py-2 rounded-xl transition cursor-pointer">
          Voltar para Home
        </button>
      </div>
    );
  }

  const formatTicketNum = (num: number) => {
    const totalDigits = rifa.quantidadeTotal.toString().length;
    const padding = Math.max(2, totalDigits - 1);
    return num.toString().padStart(padding, "0");
  };

  // Toggle ticket choice
  const handleToggleManualNumber = (numStr: string) => {
    if (takenNumbers[numStr]) return; // taken
    setSelectedNumbers((prev) =>
      prev.includes(numStr) ? prev.filter((x) => x !== numStr) : [...prev, numStr]
    );
  };

  // Fast allocation buttons
const addQuickTicketsCount = (count: number) => {
  const availableNumbers: string[] = [];

  // Lista todos os números disponíveis
  for (let i = 1; i <= rifa.quantidadeTotal; i++){
    const numStr = formatTicketNum(i);

    if (
      !takenNumbers[numStr] &&
      !selectedNumbers.includes(numStr)
    ) {
      availableNumbers.push(numStr);
    }
  }

  // Embaralhamento Fisher-Yates
  for (let i = availableNumbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [availableNumbers[i], availableNumbers[j]] = [
      availableNumbers[j],
      availableNumbers[i],
    ];
  }

  const selected = availableNumbers.slice(0, count);

  if (selected.length < count) {
    alert(
      `Desculpe! Há apenas ${selected.length} bilhetes disponíveis restando.`
    );
  }

  // Ordena apenas para exibição
  selected.sort((a, b) => Number(a) - Number(b));

  console.log("COMBO ESCOLHIDO:", selected);
  setSelectedNumbers((prev) => [...prev, ...selected]);
};

  // Trigger Custom Input Lucky Numbers Generator
  const handleTriggerCustomLucky = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(customLuckyQty);
    if (isNaN(qty) || qty <= 0) {
      alert("Por favor, informe uma quantidade válida de números da sorte.");
      return;
    }
    addQuickTicketsCount(qty);
    setCustomLuckyQty("");
  };

  // Combo promotion select
  const handleSelectCombo = (qty: number) => {
  const availableNumbers: string[] = [];

  for (let i = 1; i <= rifa.quantidadeTotal; i++) {
    const numStr = formatTicketNum(i);

    if (!takenNumbers[numStr]) {
      availableNumbers.push(numStr);
    }
  }

  for (let i = availableNumbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [availableNumbers[i], availableNumbers[j]] = [
      availableNumbers[j],
      availableNumbers[i],
    ];
  }

  const selected = availableNumbers
    .slice(0, qty)
    .sort((a, b) => Number(a) - Number(b));

  setSelectedNumbers(selected);
};

  // Apply Coupon Promotion Code
  const handleApplyPromoCoupon = () => {
    setCouponError("");
    setAppliedCoupon(null);
    if (!couponInput.trim()) return;

    try {
      const couponSchema = JSON.parse(configs.cupons_promo || "[]");
      if (Array.isArray(couponSchema)) {
        const match = couponSchema.find(
          (c: any) => c.codigo.trim().toUpperCase() === couponInput.trim().toUpperCase()
        );
        if (match) {
          setAppliedCoupon(match);
        } else {
          setCouponError("Código do cupom não localizado.");
        }
      } else {
        setCouponError("Nenhum cupom disponível.");
      }
    } catch (err) {
      setCouponError("Falha na validação do cupom.");
    }
  };

  // Cost calculation
  const totalTicketsCount = selectedNumbers.length;
  let valorFinal = totalTicketsCount * rifa.valorPorNumero;

  // Search matching combo discount
  const matchingCombo = rifa.combos
    .filter((c) => totalTicketsCount >= c.quantidade)
    .reduce((best, current) => (current.quantidade > (best?.quantidade || 0) ? current : best), null as any);

  if (matchingCombo) {
    const countInCombo = Math.floor(totalTicketsCount / matchingCombo.quantidade);
    const remainder = totalTicketsCount % matchingCombo.quantidade;
    valorFinal = (countInCombo * matchingCombo.valorFinal) + (remainder * rifa.valorPorNumero);
  }

  // Apply discount coupon values on pricing
  let originalValue = valorFinal;
  if (appliedCoupon) {
    const discountPct = parseFloat(appliedCoupon.descontoPct || "0");
    if (discountPct > 0 && discountPct <= 100) {
      valorFinal = valorFinal * (1 - discountPct / 100);
    }
  }
  const discountSaved = originalValue - valorFinal;

  // Handle order post checkout submission
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedNumbers.length === 0) {
      alert("Por favor, selecione ao menos 1 bilhete.");
      return;
    }
    if (!nome || !telefone || !cidade || !estado) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    if (!agreeTerms) {
      alert("Por favor, declare que leu e concorda com os Termos de Uso e Isenção de Responsabilidade.");
      return;
    }

    setSubmittingOrder(true);
    fetch("/api/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rifaId: rifa.id,
        numeros: selectedNumbers,
        nome,
        telefone,
        cidade,
        estado,
        cpf: cpf || undefined,
        cupom: appliedCoupon ? appliedCoupon.codigo : undefined,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSubmittingOrder(false);
        if (data.error) {
          alert(`Erro durante a reserva: ${data.error}`);
        } else if (data.hash) {
          navigate(`/checkout/${data.hash}`);
        }
      })
      .catch((err) => {
        console.error("Erro na requisição de reserva:", err);
        setSubmittingOrder(false);
        alert("Ocorreu um erro ao processar seu pedido. Tente novamente.");
      });
  };

  // Dynamically compute progress percentages
  const totalTaken = Object.keys(takenNumbers).length;
  const soldCount = Object.values(takenNumbers).filter((v) => v === "PAGO").length;
  const progressPercent = Math.min(100, Math.round((soldCount / rifa.quantidadeTotal) * 100));

  return (
    <div id="details_grid_wrapper" className="space-y-12 pb-24 font-sans text-slate-200 bg-transparent">
      {/* HEADER SECTION */}
      <section className="bg-[#131317] border border-zinc-805 p-6 rounded-3xl shadow-lg grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Gallery block */}
        <div className="space-y-4">
          <div className="aspect-video bg-zinc-950 rounded-2xl overflow-hidden shadow-md border border-zinc-800">
            <img src={activeImage} alt={rifa.titulo} className="w-full h-full object-cover transition duration-350" />
          </div>
          
          {rifa.imagens && rifa.imagens.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1 bg-transparent">
              {rifa.imagens.map((img, index) => (
                <button 
                  key={index} 
                  onClick={() => setActiveImage(img.url)}
                  className={`relative w-20 aspect-video rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    activeImage === img.url ? "border-emerald-500 scale-95" : "border-zinc-800 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img.url} alt="Galeria" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info detail block */}
        <div className="space-y-5 bg-transparent">
          <div className="space-y-1.5 bg-transparent">
            <span className="inline-block bg-emerald-550/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
              🎟️ Ação 100% Homologada
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight font-display">{rifa.titulo}</h1>
          </div>

          <div className="p-4 bg-zinc-900/40 rounded-2xl border border-zinc-800/60 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wide">Valor do Número</span>
            <span className="text-2xl font-black text-emerald-400 font-display">
              R$ {rifa.valorPorNumero.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="space-y-3 pt-1 bg-transparent">
            <div className="flex justify-between items-center text-xs font-bold text-slate-405 text-slate-400">
              <span>Progresso Realizado:</span>
              <span className="text-emerald-400 font-black">{soldCount.toLocaleString()} de {rifa.quantidadeTotal.toLocaleString()} pagos ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800/80">
              <div className="bg-emerald-550 bg-emerald-505 bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1 bg-transparent">
            <div className="p-3 bg-emerald-500/5 rounded-xl text-center border border-emerald-500/10">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Apurado em</span>
              <span className="text-xs font-extrabold text-emerald-400 flex items-center justify-center gap-1 mt-0.5 font-display">
                <Calendar className="w-3.5 h-3.5" />
                {rifa.dataSorteio ? new Date(rifa.dataSorteio).toLocaleDateString("pt-BR") : "Nas próximas semanas"}
              </span>
            </div>
            <div className="p-3 bg-amber-500/5 rounded-xl text-center border border-amber-500/10">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Metodologia</span>
              <span className="text-xs font-extrabold text-amber-550 text-amber-500 mt-0.5 block uppercase font-display">
                {rifa.metodoSorteio === "LOTERIA_FEDERAL" ? "Fed. Federal" : "Instantâneo"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TICKET PROMOTIONAL COMBOS */}
      {rifa.combos && rifa.combos.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-white font-display">🎁 Compre em Combo & Ganhe Desconto</h2>
            <p className="text-slate-400 text-xs font-semibold">Os descontos de combo são aplicados imediatamente em seu carrinho!</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-transparent">
            {rifa.combos.map((combo) => {
              const valorPorBilhete = combo.valorFinal / combo.quantidade;
              return (
                <button 
                  key={combo.id}
                  onClick={() => handleSelectCombo(combo.quantidade)}
                  className="bg-[#131317] border-2 border-zinc-800 hover:border-emerald-500 p-4 rounded-2xl flex flex-col justify-between items-start text-left hover:shadow-lg transition group duration-150 cursor-pointer"
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="bg-emerald-500/10 text-emerald-400 font-extrabold text-[10px] tracking-wider px-2.5 py-1 rounded-full uppercase border border-emerald-500/20">
                      {combo.nome}
                    </span>
                    <span className="text-3xl font-black text-zinc-900 group-hover:text-emerald-500/10 transition">
                      +{combo.quantidade}
                    </span>
                  </div>
                  <div className="space-y-1.5 mt-4">
                    <div className="text-xs font-bold text-slate-400">Economia Real de <span className="text-emerald-450 font-black">{combo.desconto}% Desc.</span></div>
                    <div className="text-lg font-black text-white font-display">
                      R$ {combo.valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">Apenas R$ {valorPorBilhete.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por unidade!</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. LUCKY NUMBERS SYSTEM (NÚMEROS DA SORTE / SELEÇÃO RÁPIDA ALEATÓRIA) */}
      <section className="bg-[#131317] border border-zinc-850 p-6 rounded-3xl shadow-xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-5 space-y-2">
          <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 py-1 px-3 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-500/15">
            <Sparkle className="w-3 h-3 text-amber-500" /> Sistema Auto Sorte
          </div>
          <h2 className="text-lg font-black text-white font-display">🎰 Seleção Rápida de Números da Sorte</h2>
          <p className="text-slate-400 text-xs font-semibold leading-relaxed">
            Selecione facilmente múltiplas cotas da sorte de forma instantânea e otimizada por nosso algoritmo.
          </p>
        </div>

        <div className="md:col-span-7 space-y-5">
          {/* Preset Buttons Grid */}
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            {[5, 10, 20, 50, 100].map((qty) => (
              <button 
                key={qty}
                onClick={() => addQuickTicketsCount(qty)}
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-805 hover:border-emerald-500 text-slate-200 hover:text-white font-extrabold text-xs py-3 px-4.5 rounded-xl transition duration-150 cursor-pointer uppercase tracking-wider"
              >
                +{qty} Números
              </button>
            ))}
          </div>

          {/* Custom allocation input */}
          <form onSubmit={handleTriggerCustomLucky} className="flex gap-2 max-w-sm">
            <input 
              type="number"
              min="1"
              max="500"
              placeholder="Ex: 15"
              value={customLuckyQty}
              onChange={(e) => setCustomLuckyQty(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-slate-100 font-extrabold text-xs p-3 rounded-xl w-32 outline-hidden text-center"
            />
            <button 
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs px-5 py-3 rounded-xl transition flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer"
            >
              🎰 Adicionar Cotas Aleatórias
            </button>
          </form>
        </div>
      </section>

      {/* RAFFLE DESCRIPTION & REGULATION */}
      <section className="bg-[#131317] border border-zinc-805 p-6 rounded-3xl shadow-lg space-y-4">
        <div>
          <h2 className="text-lg font-black text-white font-display">📋 Regulamento & Descrição</h2>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line font-medium bg-zinc-905 bg-opacity-40 p-4 rounded-xl border border-zinc-800">
          {rifa.descricao || "Esta ação oferece a você a oportunidade de levar prêmios incríveis para casa de forma simples, legalizada e extremamente segura. Garanta já seus bilhetes da sorte!"}
        </p>
        {rifa.regulamento && (
          <div className="border-t border-zinc-800 pt-4 space-y-1.5">
            <h3 className="text-xs font-black text-emerald-400 uppercase flex items-center gap-1">
              <Info className="w-4 h-4 text-emerald-400" /> Regulamento da Ação:
            </h3>
            <p className="text-slate-405 text-slate-400 text-xs leading-relaxed italic">{rifa.regulamento}</p>
          </div>
        )}
      </section>

      {/* MANUAL TICKETS GRID SELECTOR (PAGINATED CHOOSE) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <h2 className="text-lg font-black text-white font-display">🎯 Seleção Manual de Bilhetes de sua Preferência</h2>
            <p className="text-slate-405 text-slate-400 text-xs font-semibold">Exibindo lote de {ticketsPerPage} números por página da ação.</p>
          </div>
          
          {/* Legend block */}
          <div className="flex gap-4 text-xs font-semibold bg-[#131317]/80 p-2.5 border border-zinc-805 rounded-xl text-slate-350">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-zinc-900 border border-zinc-700 rounded inline-block"></span>Livre</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-500 rounded inline-block"></span>Reservado</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded inline-block"></span>Pago</span>
          </div>
        </div>

        {/* Page selector */}
        {rifa.quantidadeTotal > ticketsPerPage && (
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {Array.from({ length: Math.ceil(rifa.quantidadeTotal / ticketsPerPage) }).map((_, idx) => {
              const startNum = idx * ticketsPerPage;
              const endNum = Math.min(rifa.quantidadeTotal, (idx + 1) * ticketsPerPage) - 1;
              return (
                <button 
                  key={idx}
                  onClick={() => setManualGridPage(idx)}
                  className={`py-1.5 px-3.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition cursor-pointer ${
                    manualGridPage === idx ? "bg-emerald-500 text-neutral-950 font-black shadow-xs" : "bg-zinc-900 text-slate-400 hover:bg-zinc-850 hover:text-white"
                  }`}
                >
                  {formatTicketNum(startNum)} - {formatTicketNum(endNum)}
                </button>
              );
            })}
          </div>
        )}

        {/* Tickets Buttons Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 gap-2 bg-[#131317] p-5 rounded-3xl border border-zinc-805">
          {Array.from({ length: Math.min(ticketsPerPage, rifa.quantidadeTotal - (manualGridPage * ticketsPerPage)) }).map((_, index) => {
            const rawIndex = (manualGridPage * ticketsPerPage) + index;
            const numStr = formatTicketNum(rawIndex);
            const status = takenNumbers[numStr];
            const isSelected = selectedNumbers.includes(numStr);

            let bgStyle = "bg-zinc-900 text-slate-300 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-750";
            if (isSelected) {
              bgStyle = "bg-emerald-500 text-neutral-950 scale-95 border border-emerald-400 font-extrabold shadow-md";
            } else if (status === "PAGO") {
              bgStyle = "bg-[#18291F] text-emerald-400 border border-emerald-500/20 font-medium opacity-80 cursor-not-allowed";
            } else if (status === "RESERVADO") {
              bgStyle = "bg-[#2A2016] text-amber-500 border border-amber-500/20 font-medium opacity-80 cursor-not-allowed";
            }

            return (
              <button 
                key={numStr}
                onClick={() => handleToggleManualNumber(numStr)}
                disabled={!!status}
                title={status ? `Número ${numStr} está ${status}` : `Adquirir número ${numStr}`}
                className={`aspect-square sm:p-2 rounded-lg text-xs flex items-center justify-center font-bold tracking-tight transition duration-100 ${bgStyle}`}
              >
                {numStr}
              </button>
            );
          })}
        </div>
      </section>

      {/* FLOAT FLOATER BAR FOOTER COST DISPLAY */}
      {selectedNumbers.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 py-4 px-6 bg-zinc-950/95 text-white backdrop-blur-md shadow-2xl z-40 border-t border-zinc-805 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left space-y-0.5">
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 justify-center md:justify-start">
              <Ticket className="w-4 h-4 text-emerald-400" />
              Você selecionou <strong className="text-white font-bold">{selectedNumbers.length} cotas da sorte</strong>
            </div>
            <div className="text-lg font-black text-emerald-450 text-emerald-400 flex items-center gap-2.5 font-display justify-center md:justify-start">
              R$ {valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {appliedCoupon && (
                <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-400/20 uppercase font-sans">
                  -{appliedCoupon.descontoPct}% Cupom!
                </span>
              )}
              {matchingCombo && !appliedCoupon && (
                <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 uppercase font-sans">
                  Combo Ativado!
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setSelectedNumbers([])}
              className="px-4 py-2 border border-zinc-700 hover:border-zinc-550 text-slate-350 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
            >
              Limpar
            </button>
            <button 
              onClick={() => setShowCheckout(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl transition duration-150 flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              Comprar Agora <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* CHECKOUT DRAW OVERLAY POPUP */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#131317] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-zinc-800 flex flex-col justify-between">
            {/* Header popup info */}
            <div className="bg-zinc-900 border-b border-zinc-800 p-6 space-y-1.5">
              <h3 className="text-lg font-black font-display text-white">Finalizar Identificação do Pedido</h3>
              <p className="text-slate-400 text-xs font-semibold">Preencha seus identificadores abaixo para que seus bilhetes sejam reservados para pagamento.</p>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Nome Completo *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Seu nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-zinc-905 bg-opacity-40 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 p-3 rounded-xl text-xs font-semibold text-white outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">WhatsApp / Celular *</label>
                <input 
                  type="tel" 
                  required 
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full bg-zinc-905 bg-opacity-40 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 p-3 rounded-xl text-xs font-semibold text-white outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Cidade *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Sua cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full bg-zinc-905 bg-opacity-40 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 p-3 rounded-xl text-xs font-semibold text-white outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">UF (Estado) *</label>
                  <input 
                    type="text" 
                    maxLength={2}
                    required 
                    placeholder="UF"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full bg-zinc-905 bg-opacity-40 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 p-3 rounded-xl text-xs font-semibold uppercase text-center text-white outline-hidden"
                  />
                </div>
              </div>

              {/* Dynamic coupon promotional code support */}
              <div className="space-y-1 border-t border-zinc-800/60 pt-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Cupom de Desconto (Opcional)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="E.g. SORTEMAXIMA"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="flex-1 bg-zinc-905 bg-opacity-40 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 p-3 rounded-xl text-xs font-mono font-bold uppercase text-white outline-hidden"
                  />
                  <button 
                    type="button"
                    onClick={handleApplyPromoCoupon}
                    className="bg-emerald-500/10 hover:bg-emerald-550 border border-emerald-500/20 text-emerald-455 text-emerald-400 font-extrabold text-xs px-4 rounded-xl transition cursor-pointer"
                  >
                    Aplicar
                  </button>
                </div>
                {appliedCoupon && (
                  <p className="text-[10px] text-emerald-450 text-emerald-400 font-bold">✓ Cupom {appliedCoupon.codigo.toUpperCase()} Ativo! Você garantiu {appliedCoupon.descontoPct}% de desconto extra.</p>
                )}
                {couponError && (
                  <p className="text-[10px] text-red-400 font-bold">✗ {couponError}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">CPF (Opcional - Necessário para resgate de prêmios)</label>
                <input 
                  type="text" 
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full bg-zinc-905 bg-opacity-40 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 p-3 rounded-xl text-xs font-semibold text-white outline-hidden"
                />
              </div>

              {/* Terms are requested to validate */}
              <div className="p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800 flex items-start gap-2.5 text-slate-400 text-[10.5px] leading-relaxed">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  required
                  className="mt-0.5 accent-emerald-500 rounded cursor-pointer size-4 bg-zinc-950 border-zinc-800"
                />
                <label htmlFor="agreeTerms" className="cursor-pointer select-none">
                  Li e declaro que concordo com os <a href="#/termos" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline hover:text-emerald-300 font-extrabold">Termos de Uso</a>. Reconheço que o Clube da Sorte é puramente o fornecedor tecnológico de faturamento e que o sorteamento e pagamento do prêmio é de única autoridade do organizador.
                </label>
              </div>

              {/* Display Price with applied Coupons */}
              <div className="p-3 bg-[#131713] rounded-xl border border-emerald-500/10 flex justify-between items-center">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">Preço Final do Lote:</span>
                <div className="text-right">
                  {discountSaved > 0 && (
                    <span className="text-[11px] text-slate-500 line-through block font-mono">R$ {originalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  )}
                  <span className="text-base font-black text-white font-mono block">R$ {valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 py-3 text-slate-400 hover:text-white hover:bg-zinc-900 font-bold border border-zinc-805 rounded-xl transition text-xs cursor-pointer"
                >
                  Voltar
                </button>
                <button 
                  type="submit" 
                  disabled={submittingOrder}
                  className="flex-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-805 text-neutral-950 font-black rounded-xl transition text-xs py-3 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  {submittingOrder ? (
                    <>Processando <Loader className="w-4 h-4 animate-spin" /></>
                  ) : "Gerar Pix Cobrança"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
