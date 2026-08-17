import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Search, 
  Ticket, 
  HelpCircle, 
  CheckCircle2, 
  Clock, 
  XOctagon, 
  ChevronRight,
  User,
  ExternalLink,
  Loader
} from "lucide-react";

interface Order {
  id: number;
  hash: string;
  status: string;
  valorTotal: number;
  createdAt: string;
  comprador: { nome: string; telefone: string };
  itens: Array<{
    numeros: string;
    quantidade: number;
    rifa: { id: number; titulo: string };
  }>;
  cotasPremiadas?: Array<{
    id: number;
    rifaId: number;
    numero: string;
    premio: number;
    status: string;
    pedidoId: number | null;
    compradorId: number | null;
    premiadoEm: string | null;
  }>;
}

export default function ClientArea() {
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      alert("Preencha o campo de busca.");
      return;
    }

    setLoading(true);
    setErrorText("");
    
    fetch(`/api/compras?search=${encodeURIComponent(searchQuery.trim())}`)
      .then((res) => res.json())
      .then((data) => {
        setLoading(false);
        if (data.error) {
          setErrorText(data.error);
          setOrders([]);
        } else {
          setOrders(data);
        }
      })
      .catch((err) => {
        console.error("Erro busca compras:", err);
        setLoading(false);
        setErrorText("Não foi possível encontrar suas compras. Verifique a conexão.");
      });
  };

  return (
    <div id="client_area_wrapper" className="max-w-xl mx-auto space-y-8 pb-16 font-sans text-slate-200">
      {/* Banner introduction details */}
      <section className="text-center space-y-2">
        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <User className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-white font-display">Área do Cliente</h1>
        <p className="text-slate-400 text-xs font-semibold">Consulte seus pedidos, histórico de compras e resgate seus bilhetes da sorte em segundos.</p>
      </section>

      {/* SEARCH CARD FORM */}
      <section className="bg-[#131317] border border-zinc-800/60 p-6 rounded-3xl shadow-lg">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-1 bg-transparent">
            <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest text-slate-400">Pesquise por Telefone, CPF ou Código do Pedido</label>
            <div className="relative">
              <input 
                type="text" 
                required 
                placeholder="Ex: 11999999999, 123.456.789-00 ou PED-..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 p-3.5 pl-11 rounded-2xl text-xs font-semibold text-white outline-hidden tracking-wide"
              />
              <Search className="w-4.5 h-4.5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-850 text-neutral-950 font-black py-3 rounded-2xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 text-xs cursor-pointer duration-150"
          >
            {loading ? (
              <>Buscando compras... <Loader className="w-4 h-4 animate-spin" /></>
            ) : "Buscar Meus Bilhetes"}
          </button>
        </form>
      </section>

      {/* ERROR MSG */}
      {errorText && (
        <div className="p-4 bg-red-500/10 text-red-405 border border-red-500/20 text-xs font-semibold rounded-2xl">
          {errorText}
        </div>
      )}

      {/* RESULTS GRID */}
      {orders !== null && (
        <section className="space-y-4">
          <h3 className="font-black text-white text-sm font-display">Sua Pesquisa de Pedidos ({orders.length})</h3>

          {orders.length === 0 ? (
            <div className="bg-[#131317] border border-zinc-800/60 p-8 text-center rounded-3xl">
              <span className="text-3xl">📭</span>
              <h4 className="text-sm font-bold text-slate-200 mt-3 font-display">Nenhum pedido localizado</h4>
              <p className="text-slate-400 text-xs mt-1">Gostaria de participar das ações? Vá para a página inicial e selecione uma das ações ativas!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const isPaid = order.status === "PAGO";
                const isPending = order.status === "PENDENTE";
                const isCancelled = order.status === "CANCELADO";
                const item = order.itens?.[0];
                const listNumeros = item?.numeros.split(",") || [];
                const cotasPremiadas = order.cotasPremiadas || [];

                const totalPremios = cotasPremiadas.reduce(
                  (total, cota) => total + cota.premio,
                  0
                );

                return (
                  <div key={order.id} className="bg-[#131317] border border-zinc-800/60 rounded-3xl p-5 shadow-lg space-y-4 hover:border-zinc-700/60 transition duration-150">
                    <div className="flex justify-between items-start border-b border-zinc-800/60 pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500">PEDIDO: <strong className="text-slate-200 font-extrabold">{order.hash}</strong></span>
                        <h4 className="font-extrabold text-xs text-[#F59E0B] font-display mt-0.5">{item?.rifa?.titulo || "Ação Promocional"}</h4>
                      </div>
                      <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full border ${
                        isPaid ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                        isCancelled ? "bg-red-500/10 border-red-500/30 text-red-400" :
                        "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-405">
                      <div>
                        <span className="text-slate-500 uppercase text-[9px] block">Data do Pedido:</span>
                        <strong className="block text-slate-200 font-bold mt-0.5">{new Date(order.createdAt).toLocaleDateString("pt-BR")}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase text-[9px] block">Total Adquirido:</span>
                        <strong className="block text-slate-200 font-bold mt-0.5">R$ {order.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </div>
                    </div>

                    <div className="space-y-1 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-805">
                      <span className="block text-[9px] uppercase font-bold text-slate-500">Seus Bilhetes ({listNumeros.length})</span>
                      <div className="flex flex-wrap gap-1 font-mono pt-1">
                        {listNumeros.slice(0, 15).map((num) => (
                          <span key={num} className="bg-zinc-950 border border-zinc-800/60 text-[10px] font-bold px-1.5 py-0.5 rounded text-slate-300">
                            {num}
                          </span>
                        ))}
                        {listNumeros.length > 15 && (
                          <span className="text-[10px] font-bold text-emerald-400 pl-1 self-center">
                            +{listNumeros.length - 15} mais
                          </span>
                        )}
                      </div>
                    </div>

                    {isPaid && cotasPremiadas.length > 0 && (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🎉</span>
                          <div>
                            <h5 className="text-sm font-black text-amber-300">
                              Parabéns! Você ganhou!
                            </h5>
                            <p className="text-[10px] font-semibold text-amber-200/70">
                              Este pedido possui {cotasPremiadas.length}{" "}
                              {cotasPremiadas.length === 1
                                ? "Cota Premiada"
                                : "Cotas Premiadas"}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {cotasPremiadas.map((cota) => (
                            <div
                              key={cota.id}
                              className="flex items-center justify-between bg-zinc-950/60 border border-amber-500/20 rounded-xl px-3 py-2.5"
                            >
                              <div>
                                <span className="block text-[9px] uppercase font-bold text-slate-500">
                                  Número Premiado
                                </span>

                                <strong className="block font-mono text-sm font-black text-white">
                                  {cota.numero}
                                </strong>
                              </div>

                              <div className="text-right">
                                <span className="block text-[9px] uppercase font-bold text-slate-500">
                                  Prêmio
                                </span>

                                <strong className="block text-sm font-black text-emerald-400">
                                  R$ {cota.premio.toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </strong>
                              </div>
                            </div>
                          ))}
                        </div>

                        {cotasPremiadas.length > 1 && (
                          <div className="border-t border-amber-500/20 pt-3 flex items-center justify-between">
                            <span className="text-[10px] uppercase font-black text-amber-200/70">
                              Total em prêmios
                            </span>

                            <strong className="text-base font-black text-emerald-400">
                              R$ {totalPremios.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </strong>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-2">
                      <Link 
                        to={`/checkout/${order.hash}`}
                        className="w-full text-center bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-slate-350 hover:text-white font-extrabold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 duration-150"
                      >
                        {isPending ? "Pagar PIX agora" : "Ver Fatura / Receber Comprovante"} <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
