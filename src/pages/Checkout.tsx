import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { 
  CheckCircle, 
  Clock, 
  Copy, 
  CreditCard, 
  QrCode, 
  AlertCircle, 
  ChevronLeft,
  XCircle,
  TrendingUp,
  Download,
  Flame,
  Check
} from "lucide-react";

interface Pedido {
  id: number;
  hash: string;
  status: string; // PENDENTE, PAGO, CANCELADO
  valorTotal: number;
  pixCopiaCola: string;
  pixQrCode: string;
  expiracaoPix: string;
  comprador: { nome: string; telefone: string; cidade: string; estado: string; cpf?: string };
  itens: Array<{
    id: number;
    numeros: string;
    quantidade: number;
    rifa: { titulo: string; id: number };
  }>;
}

export default function Checkout() {
  const { hash } = useParams<{ hash: string }>();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");

  useEffect(() => {
    if (!hash) return;

    const fetchPedido = () => {
      fetch(`/api/pedidos/${hash}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setPedido(data);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Erro ao carregar pedido:", err);
          setLoading(false);
        });
    };

    fetchPedido();

    // Setup Socket.IO listener for payment updates
    const socket = io();
    socket.emit("join-rifa", String(pedido?.itens?.[0]?.rifa?.id || ""));
    
    socket.on("payment-confirmed", (data: { pedidoHash: string }) => {
      if (data.pedidoHash === hash) {
        setPedido((prev) => prev ? { ...prev, status: "PAGO" } : null);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [hash, pedido?.itens?.[0]?.rifa?.id]);

  // Expiration Clock Countdown calculation ticker
  useEffect(() => {
    if (!pedido || pedido.status !== "PENDENTE") return;

    const interval = setInterval(() => {
      const expiration = new Date(pedido.expiracaoPix).getTime();
      const now = new Date().getTime();
      const diff = expiration - now;

      if (diff <= 0) {
        setPedido((prev) => prev ? { ...prev, status: "CANCELADO" } : null);
        setTimeRemaining("EXPIRADO");
        clearInterval(interval);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pedido]);

  const handleCopyCode = () => {
    if (!pedido?.pixCopiaCola) return;
    navigator.clipboard.writeText(pedido.pixCopiaCola);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Clock className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-slate-400 font-bold text-sm">Carregando dados da fatura...</span>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="bg-red-950/20 p-6 rounded-2xl max-w-md mx-auto text-center my-12 border border-red-500/30 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h3 className="text-lg font-black text-red-405">Pedido não encontrado</h3>
        <p className="text-red-300 text-sm">Verifique se o código do pedido fornecido na URL está correto.</p>
        <button onClick={() => navigate("/")} className="bg-zinc-900 border border-zinc-800 text-slate-350 hover:text-white font-bold py-2.5 px-6 rounded-xl text-sm transition font-sans">
          Voltar para Home
        </button>
      </div>
    );
  }

  const isPago = pedido.status === "PAGO";
  const isCancelado = pedido.status === "CANCELADO";
  const item = pedido.itens?.[0];
  const listNumeros = item?.numeros.split(",") || [];

  return (
    <div id="checkout_wrapper" className="max-w-2xl mx-auto space-y-8 pb-16 font-sans">
      {/* Back button */}
      <button 
        onClick={() => navigate(`/rifa/${item?.rifa?.id || ""}`)}
        className="flex items-center gap-1.5 text-slate-400 hover:text-white font-semibold text-xs transition"
      >
        <ChevronLeft className="w-4 h-4" /> Voltar para a Rifa
      </button>

      {/* STATUS BANNER JUMBOTRON */}
      <section className={`p-6 rounded-3xl border text-center space-y-3 relative overflow-hidden ${
        isPago ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
        isCancelado ? "bg-red-500/10 border-red-500/30 text-red-400" :
        "bg-amber-500/10 border-amber-500/30 text-amber-400"
      }`}>
        <div className="relative z-10 space-y-1.5">
          {isPago ? (
            <>
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <h2 className="text-xl font-black font-display">Pagamento Aprovado com Sucesso!</h2>
              <p className="text-xs text-slate-300 font-semibold">Seus números já estão reservados e homologados de forma oficial em nosso sistema.</p>
            </>
          ) : isCancelado ? (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto" />
              <h2 className="text-sm font-black uppercase tracking-widest font-display">Reserva Cancelada / Expirada</h2>
              <p className="text-xs text-slate-405 font-semibold">O tempo limite para compensação do PIX expirou. Seus bilhetes foram liberados de volta para o público.</p>
            </>
          ) : (
            <>
              <Clock className="w-12 h-12 text-amber-505 text-amber-500 mx-auto animate-spin" style={{ animationDuration: "12s" }} />
              <h2 className="text-xl font-black font-display">Aguardando Pagamento</h2>
              <p className="text-xs text-slate-305 font-semibold text-slate-300">Sua reserva está garantida! Faça o pagamento PIX antes que o tempo se esgote.</p>
              
              {/* Count countdown */}
              <div className="inline-block bg-amber-550 bg-amber-500 text-neutral-950 font-mono text-base font-black px-4 py-1.5 rounded-full mt-3 shadow-xs">
                {timeRemaining || "Calculando..."}
              </div>
            </>
          )}
        </div>
      </section>

      {/* DETAILS ORDER COMPROMISE GRID */}
      <section className="bg-[#131317] border border-zinc-800/60 rounded-3xl p-6 shadow-lg space-y-6">
        <div className="border-b border-zinc-800/60 pb-4">
          <h3 className="font-black text-white text-base font-display">📄 Resumo da Aquisição</h3>
          <p className="text-slate-400 text-xs font-semibold mt-0.5">Código da Reserva: <strong className="text-slate-300">{pedido.hash}</strong></p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-350">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Rifa</span>
            <span className="text-emerald-400 text-sm font-black mt-0.5 block">{item?.rifa?.titulo || "Ação Promocional"}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Comprador</span>
            <span className="text-slate-100 text-base font-bold mt-0.5 block">{pedido.comprador.nome}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Telefone</span>
            <span className="text-slate-303 mt-0.5 block">{pedido.comprador.telefone}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Cidade / Estado</span>
            <span className="text-slate-303 mt-0.5 block">{pedido.comprador.cidade} - {pedido.comprador.estado}</span>
          </div>
        </div>

        {/* Selected tickets visual representation */}
        <div className="space-y-2 border-t border-zinc-800/60 pt-4">
          <span className="block text-[10px] uppercase font-bold text-slate-500">Bilhetes Escolhidos ({pedido.itens?.[0]?.quantidade || 0} nrs)</span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {listNumeros.map((num) => (
              <span 
                key={num}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-black border tracking-tight ${
                  isPago ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                  isCancelado ? "bg-[#1B1B22] border-zinc-800 text-slate-500" :
                  "bg-amber-500/10 border-amber-500/25 text-amber-400"
                }`}
              >
                {num}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/50 pt-4">
          <span className="text-xs text-slate-400 font-bold">Total Arrecadado:</span>
          <span className="text-xl font-black text-white">
            R$ {pedido.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </section>

      {/* COPIA COLA PIX PAYLOAD INFO SCREEN */}
      {!isPago && !isCancelado && (
        <section className="bg-[#131317] border border-zinc-800/60 shadow-lg rounded-3xl p-6 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="font-black text-white text-lg flex items-center justify-center gap-1.5 font-display">
              <QrCode className="w-5 h-5 text-emerald-400" /> Pague via Pix QR Code ou Copia e Cola
            </h3>
            <p className="text-slate-400 text-xs font-semibold">Abra o aplicativo de seu banco parceiro, selecione pagar via PIX e aponte a câmera para o QR code ou cole o código abaixo.</p>
          </div>

          <div className="flex justify-center bg-white w-fit mx-auto p-4 rounded-3xl shadow-sm">
            {pedido.pixQrCode ? (
              <img src={pedido.pixQrCode} alt="PIX QR Code" className="w-48 h-48" />
            ) : (
              <div className="bg-zinc-900 p-8 h-48 w-48 text-center rounded-2xl">Aguardando QR...</div>
            )}
          </div>

          {/* Copiar e colar code block */}
          <div className="space-y-2">
            <span className="block text-xs font-black text-slate-400 uppercase">Copia e Cola PIX</span>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={pedido.pixCopiaCola || "Gerando chave do banco..."}
                className="w-full bg-zinc-900/60 border border-zinc-805 p-3.5 rounded-xl font-mono text-[10px] font-semibold text-slate-300 select-all outline-hidden"
              />
              <button 
                onClick={handleCopyCode}
                className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black p-3.5 rounded-xl transition duration-150 shrink-0 flex items-center gap-1 shadow-md shadow-emerald-500/10 text-xs"
              >
                {copied ? (
                  <Check className="w-4.5 h-4.5 text-neutral-950" />
                ) : (
                  <>
                    <Copy className="w-4.5 h-4.5 text-neutral-950" /> Copiar
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* PIX aguardando confirmação automática */}
{!isPago && !isCancelado && (
  <section className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl">
    <p className="text-center text-slate-300 text-sm font-semibold">
      Após efetuar o pagamento via PIX, a confirmação ocorrerá automaticamente em alguns segundos.
    </p>

    <p className="text-center text-emerald-400 text-xs font-bold mt-2">
      Não feche esta página até a confirmação do pagamento.
    </p>
  </section>
)}
               

      {/* COMPROVANTE RECEIPT BUTTON FOR COMPLETED PAYMENTS */}
      {isPago && (
        <section className="text-center pt-2">
          <button 
            onClick={() => window.print()}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-405 hover:text-emerald-350 border border-emerald-500/20 font-extrabold text-xs py-3.5 px-8 rounded-xl transition duration-150 inline-flex items-center gap-2.5 shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-400" /> Imprimir Comprovante de Transação
          </button>
        </section>
      )}
    </div>
  );
}
