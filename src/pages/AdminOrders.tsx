import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  CheckCircle,
  XCircle, 
  HelpCircle, 
  AlertCircle,
  Loader,
  Coins,
  Ticket,
  DollarSign
} from "lucide-react";

interface Order {
  id: number;
  hash: string;
  status: string; // PENDENTE, PAGO, CANCELADO
  valorTotal: number;
  createdAt: string;
  comprador: { nome: string; telefone: string; cidade: string; estado: string };
  itens: Array<{
    numeros: string;
    quantidade: number;
    rifa: { titulo: string };
  }>;
}

interface Buyer {
  id: number;
  nome: string;
  telefone: string;
  cidade: string;
  estado: string;
  cpf?: string;
  totalGasto: number;
  quantidadeDeCompras: number;
}

export default function AdminOrders({ token }: { token: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingBuyers, setLoadingBuyers] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<"ORDERS" | "BUYERS">("ORDERS");

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  const fetchOrders = () => {
    setLoadingOrders(true);
    let url = "/api/admin/pedidos";
    const params = [];
    if (statusFilter) params.push(`status=${statusFilter}`);
    if (searchFilter) params.push(`search=${encodeURIComponent(searchFilter)}`);
    if (params.length > 0) url += `?${params.join("&")}`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setOrders(data);
        }
        setLoadingOrders(false);
      })
      .catch((err) => {
        console.error("Erro orders:", err);
        setLoadingOrders(false);
      });
  };

  const fetchBuyers = () => {
    setLoadingBuyers(true);
    fetch("/api/admin/compradores", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBuyers(data);
        }
        setLoadingBuyers(false);
      })
      .catch((err) => {
        console.error("Erro buyers:", err);
        setLoadingBuyers(false);
      });
  };

  useEffect(() => {
    if (activeTab === "ORDERS") {
      fetchOrders();
    } else {
      fetchBuyers();
    }
  }, [activeTab, statusFilter, token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  // Manually Approve order
  const handleApprove = (orderId: number) => {
    if (!confirm("Confirmar baixa bancária manual para este pedido?")) return;
    
    fetch(`/api/admin/pedidos/${orderId}/aprovar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          fetchOrders();
          alert("Pedido baixado com sucesso! Ganhadores notificados.");
        } else {
          alert(`Falha: ${data.error}`);
        }
      })
      .catch((err) => console.error(err));
  };

  // Manually Cancel order
  const handleCancel = (orderId: number) => {
    if (!confirm("Revogar reserva e cancelar pedido?")) return;
    
    fetch(`/api/admin/pedidos/${orderId}/cancelar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          fetchOrders();
        } else {
          alert(`Falha: ${data.error}`);
        }
      })
      .catch((err) => console.error(err));
  };

  return (
    <div id="admin_orders_directory" className="space-y-6">
      {/* NAVIGATION TABS SECTION */}
      <section className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-1.5">
            <Users className="w-7 h-7 text-indigo-655" /> Compras & Banco de Clientes
          </h1>
          <p className="text-slate-500 text-xs font-semibold">Consulte pedidos pendentes de compensação, libere números manualmente, ou analise o cadastro unificado de compradores.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 shrink-0">
          <button 
            onClick={() => setActiveTab("ORDERS")}
            className={`py-2 px-5 font-black text-xs rounded-xl transition ${
              activeTab === "ORDERS" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Pedidos Recebidos
          </button>
          <button 
            onClick={() => setActiveTab("BUYERS")}
            className={`py-2 px-5 font-black text-xs rounded-xl transition ${
              activeTab === "BUYERS" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Clientes Cadastrados
          </button>
        </div>
      </section>

      {/* VIEW 1: ORDERS CONTROLLER */}
      {activeTab === "ORDERS" && (
        <div className="space-y-6">
          {/* Filters Form panel */}
          <section className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs flex flex-wrap gap-4 items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-sm w-full">
              <input 
                type="text" 
                placeholder="Busque por Comprador ou PED-..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-205 p-2.5 rounded-xl text-xs font-semibold outline-hidden"
              />
              <button type="submit" className="bg-slate-900 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition">
                Buscar
              </button>
            </form>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-extrabold text-slate-650"
            >
              <option value="">Filtro: Todos os status</option>
              <option value="PENDENTE">PENDENTES DE PIX</option>
              <option value="PAGO">BAIXADOS / PAGOS</option>
              <option value="CANCELADO">CANCELADOS / LIBERADOS</option>
            </select>
          </section>

          {/* Orders Listing */}
          <section className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs overflow-x-auto">
            {loadingOrders ? (
              <div className="text-center py-12"><Loader className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></div>
            ) : orders.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-semibold italic">Nenhum pedido localizado para os critérios informados.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-black uppercase text-[10px]">
                    <th className="py-3 px-4">Pedido / Data</th>
                    <th className="py-3 px-4">Cliente / Contato</th>
                    <th className="py-3 px-4">Ação / Números Adquiridos</th>
                    <th className="py-3 px-4">Arrecadado</th>
                    <th className="py-3 px-4 text-center">Fatura status / Controle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-705 font-semibold">
                  {orders.map((order) => {
                    const item = order.itens?.[0];
                    const listNumeros = item?.numeros.split(",") || [];
                    const isPendente = order.status === "PENDENTE";

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <strong className="text-slate-800 text-sm font-extrabold">{order.hash}</strong>
                            <span className="text-[10px] text-slate-400 block">{new Date(order.createdAt).toLocaleString("pt-BR")}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          <div className="space-y-0.5">
                            <span className="text-sm font-extrabold">{order.comprador.nome}</span>
                            <span className="text-[10px] text-slate-400 block">{order.comprador.telefone} ({order.comprador.cidade} - {order.comprador.estado})</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 max-w-sm">
                            <span className="text-indigo-700 text-xs font-black block">{item?.rifa?.titulo || "Ação Promocional"}</span>
                            <div className="flex flex-wrap gap-0.5 font-mono">
                              {listNumeros.slice(0, 10).map((num) => (
                                <span key={num} className="bg-slate-100 border border-slate-200 text-[10px] px-1 rounded font-bold text-slate-650">
                                  {num}
                                </span>
                              ))}
                              {listNumeros.length > 10 && (
                                <span className="text-[10px] font-bold text-indigo-600 pl-1">
                                  +{listNumeros.length - 10} mais
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <strong className="text-slate-800 text-sm">R$ {order.valorTotal.toFixed(2)}</strong>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex gap-2.5 items-center justify-center">
                            <span className={`text-[9px] uppercase font-black px-2.5 py-1 rounded-full border ${
                              order.status === "PAGO" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                              order.status === "CANCELADO" ? "bg-red-50 border-red-200 text-red-700" :
                              "bg-amber-50 border-amber-200 text-amber-700"
                            }`}>
                              {order.status}
                            </span>
                            
                            {isPendente && (
                              <div className="flex gap-1.5 pl-1.5 border-l border-slate-100">
                                <button 
                                  onClick={() => handleApprove(order.id)}
                                  title="Baixar Manual (Aprovar)"
                                  className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg border border-emerald-100 transition"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleCancel(order.id)}
                                  title="Liberar Cotas (Cancelar)"
                                  className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg border border-red-100 transition"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      {/* VIEW 2: BUYERS DIRECTORY CRM */}
      {activeTab === "BUYERS" && (
        <section className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs overflow-x-auto">
          {loadingBuyers ? (
            <div className="text-center py-12"><Loader className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></div>
          ) : buyers.length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-semibold italic">Nenhum cliente cadastrado ainda.</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-black uppercase text-[10px]">
                  <th className="py-3 px-4">Comprador</th>
                  <th className="py-3 px-4">Telefone</th>
                  <th className="py-3 px-4">CPF</th>
                  <th className="py-3 px-4 text-center">Ações Feitas</th>
                  <th className="py-3 px-4">Arrecadação do Cliente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
                {buyers.map((buyer) => (
                  <tr key={buyer.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-sm text-slate-800 leading-snug">{buyer.nome}</h4>
                        <span className="text-[10px] text-slate-400 block">{buyer.cidade} - {buyer.estado}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-650">{buyer.telefone}</td>
                    <td className="py-3 px-4 text-slate-650">{buyer.cpf || "Não informado"}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-indigo-50 border border-indigo-100/50 text-indigo-700 font-extrabold px-2.5 py-1 rounded-full text-[10px] uppercase">
                        {buyer.quantidadeDeCompras} compras pagas
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600 text-sm">
                      R$ {buyer.totalGasto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
