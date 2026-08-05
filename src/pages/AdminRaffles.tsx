import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Copy, 
  Award, 
  Edit3, 
  Image as ImageIcon, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  Ticket,
  Calendar,
  Layers,
  ChevronDown,
  Loader,
  Play
} from "lucide-react";

interface Rifa {
  id: number;
  titulo: string;
  descricao: string;
  regulamento: string;
  valorPorNumero: number;
  quantidadeTotal: number;
  status: string; // ATIVO, ENCERRADO, FINALIZADO
  metodoSorteio: string; // LOTERIA_FEDERAL, MANUAL, AUTOMATICO
  resultado: string | null;
  dataSorteio: string;
  vendidos: number;
  reservados: number;
}

export default function AdminRaffles({ token }: { token: string }) {
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states (Create & Update)
  const [showRifaForm, setShowRifaForm] = useState(false);
  const [editingRifaId, setEditingRifaId] = useState<number | null>(null);
  
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [regulamento, setRegulamento] = useState("");
  const [valorPorNumero, setValorPorNumero] = useState("1.00");
  const [quantidadeTotal, setQuantidadeTotal] = useState("1000");
  const [dataSorteio, setDataSorteio] = useState("");
  const [metodoSorteio, setMetodoSorteio] = useState("AVULSO");
  const [imagensInput, setImagensInput] = useState("");

  // Form states (Combos)
  const [showComboForm, setShowComboForm] = useState(false);
  const [comboRifaId, setComboRifaId] = useState<number | null>(null);
  const [comboNome, setComboNome] = useState("");
  const [comboQuantidade, setComboQuantidade] = useState("10");
  const [comboDesconto, setComboDesconto] = useState("15");

  // Lista de combos da rifa selecionada
  const [combos, setCombos] = useState<any[]>([]);

  // Combo em edição
  const [editingComboId, setEditingComboId] = useState<number | null>(null);

  // Form states (Draw/Sorteio)
  const [showDrawForm, setShowDrawForm] = useState(false);
  const [drawRifaId, setDrawRifaId] = useState<number | null>(null);
  const [drawMetodo, setDrawMetodo] = useState("AUTOMATICO");
  const [winnerNumberManual, setWinnerNumberManual] = useState("");
  const [drawing, setDrawing] = useState(false);

  const fetchRifas = () => {
    fetch("/api/rifas")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRifas(data);
        }
        setLoading(false);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchRifas();
  }, []);

  const fetchCombos = (rifaId: number) => {
  fetch(`/api/admin/rifas/${rifaId}/combos`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data)) {
        setCombos(data);
      } else {
        setCombos([]);
      }
    })
    .catch((err) => {
      console.error(err);
      setCombos([]);
    });
};

const handleEditCombo = (combo: any) => {
  setEditingComboId(combo.id);

  setComboNome(combo.nome);

  setComboQuantidade(String(combo.quantidade));

  setComboDesconto(String(combo.desconto));
};


const handleDeleteCombo = async (comboId: number) => {
  if (!confirm("Deseja realmente excluir este combo?")) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/combos/${comboId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    // Se estava editando este combo, limpa o formulário
    if (editingComboId === comboId) {
      setEditingComboId(null);
      setComboNome("");
      setComboQuantidade("10");
      setComboDesconto("15");
    }

    // Atualiza a lista
    if (comboRifaId) {
      fetchCombos(comboRifaId);
    }

  } catch (err) {
    console.error(err);
    alert("Erro ao excluir o combo.");
  }
};

  const resetRifaFields = () => {
    setEditingRifaId(null);
    setTitulo("");
    setDescricao("");
    setRegulamento("");
    setValorPorNumero("1.00");
    setQuantidadeTotal("1000");
    setDataSorteio("");
    setMetodoSorteio("AVULSO");
    setImagensInput("");
  };

  // Submit new or updated raffle
  const handleSubmitRifa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !valorPorNumero || !quantidadeTotal) return;

    const payload = {
      titulo,
      descricao,
      regulamento,
      valorPorNumero: parseFloat(valorPorNumero),
      quantidadeTotal: parseInt(quantidadeTotal),
      dataSorteio: dataSorteio || undefined,
      metodoSorteio,
      imagensUrls: imagensInput ? imagensInput.split(",").map((s) => s.trim()).filter(Boolean) : [],
    };

    const url = editingRifaId ? `/api/admin/rifas/${editingRifaId}` : "/api/admin/rifas";
    const method = editingRifaId ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert(`Erro nos dados da rifa: ${data.error}`);
        } else {
          setShowRifaForm(false);
          resetRifaFields();
          fetchRifas();
        }
      })
      .catch((err) => console.error(err));
  };

  // Trigger editing fill
  const handleEditClick = (rifa: Rifa) => {
    setEditingRifaId(rifa.id);
    setTitulo(rifa.titulo);
    setDescricao(rifa.descricao);
    setRegulamento(rifa.regulamento);
    setValorPorNumero(String(rifa.valorPorNumero));
    setQuantidadeTotal(String(rifa.quantidadeTotal));
    setDataSorteio(rifa.dataSorteio ? rifa.dataSorteio.split("T")[0] : "");
    setMetodoSorteio(rifa.metodoSorteio);
    setImagensInput(""); // Keep clean or ignore
    setShowRifaForm(true);
  };

  // Duplicate a raffle quick action
  const handleDuplicate = (rifaId: number) => {
    if (!confirm("Tem certeza que gostaria de duplicar esta ação sorteio?")) return;
    fetch(`/api/admin/rifas/${rifaId}/duplicar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(() => {
        fetchRifas();
      })
      .catch((err) => console.error(err));
  };

  // Delete raffle
  const handleDelete = (rifaId: number) => {
    if (!confirm("Aviso! Deletar esta rifa excluirá permanentemente todos os pedidos e números comprados vinculados de forma irreversível. Prosseguir?")) return;
    fetch(`/api/admin/rifas/${rifaId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(() => {
        fetchRifas();
      })
      .catch((err) => console.error(err));
  };

  // Submit promo Combo setup
  const handleSubmitCombo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comboRifaId || !comboNome || !comboQuantidade || !comboDesconto) return;

    const payload = {
      rifaId: comboRifaId,
      nome: comboNome,
      quantidade: parseInt(comboQuantidade),
      desconto: parseFloat(comboDesconto),
    };

    const url = editingComboId
      ? `/api/admin/combos/${editingComboId}`
      : "/api/admin/combos";

    const method = editingComboId
      ? "PUT"
      : "POST";

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert(`Erro: ${data.error}`);
        } else {
          setEditingComboId(null);
          setComboNome("");
          setComboQuantidade("10");
          setComboDesconto("15");
          fetchCombos(comboRifaId!);
          alert(
            editingComboId
              ? "Combo atualizado com sucesso!"
              : "Combo promocional criado com sucesso!"
          );
        }
      })
      .catch((err) => console.error(err));
  };

  // Trigger Sorteio / Draw
  const handleExecuteDraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawRifaId) return;

    setDrawing(true);
    const payload = {
      metodo: drawMetodo,
      numeroVencedorManual: winnerNumberManual || undefined,
    };

    fetch(`/api/admin/rifas/${drawRifaId}/sortear`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        setDrawing(false);
        if (data.error) {
          alert(`Erro na apuração: ${data.error}`);
        } else {
          setShowDrawForm(false);
          setWinnerNumberManual("");
          fetchRifas();
          alert(`Sorteio homologado! O número vencedor apurado foi: ${data.winningNumber}. Ganhador oficial: ${data.winner.nome}`);
        }
      })
      .catch((err) => {
        console.error("Erro sorteio request:", err);
        setDrawing(false);
      });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <Loader className="w-8 h-8 animate-spin text-slate-700" />
        <span className="text-slate-500 font-bold text-sm">Carregando ações cadastradas...</span>
      </div>
    );
  }

  return (
    <div id="rifas_manager_portal" className="space-y-6">
      {/* HEADER SECTION */}
      <section className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Ticket className="w-7 h-7 text-indigo-650" /> Planejador de Rifas & Ganhadores
          </h1>
          <p className="text-slate-500 text-xs font-semibold">Crie sorteios, defina combos, visualize o andamento financeiro e execute apurações aleatórias ou manuais via Loteria Federal.</p>
        </div>
        
        <button 
          onClick={() => { resetRifaFields(); setShowRifaForm(true); }}
          className="bg-indigo-655 hover:bg-indigo-700 text-white font-black text-xs py-3 px-5 rounded-2xl transition flex items-center gap-2 shadow-md shadow-indigo-600/10 shrink-0"
        >
          <Plus className="w-4 h-4" /> Criar Nova Rifa
        </button>
      </section>

      {/* RAFFLE ACTIONS TABLE LIST */}
      <section className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
              <th className="py-3 px-4">Identidade da Rifa</th>
              <th className="py-3 px-4">Valor / Cotas</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Vendas (Pagas)</th>
              <th className="py-3 px-4 text-center">Ações de Controle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
            {rifas.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-400 italic">Nenhuma ação cadastrada. Clique em "+" para começar!</td>
              </tr>
            ) : (
              rifas.map((rifa) => {
                const totalCotas = rifa.quantidadeTotal;
                const paid = rifa.vendidos || 0;
                const ratioPct = Math.round((paid / totalCotas) * 100);

                return (
                  <tr key={rifa.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-sm text-slate-850 leading-snug">{rifa.titulo}</h4>
                        <span className="text-[10px] text-slate-400 italic block">ID: #{rifa.id} | Apuração: {rifa.metodoSorteio}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <strong className="text-slate-800 text-sm">R$ {rifa.valorPorNumero.toFixed(2)}</strong>
                        <span className="text-slate-400 text-[10px] block">{totalCotas.toLocaleString()} bilhetes</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full border ${
                        rifa.status === "ATIVO" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                        rifa.status === "FINALIZADO" ? "bg-indigo-50 border-indigo-200 text-indigo-700" :
                        "bg-slate-100 border-slate-200 text-slate-550"
                      }`}>
                        {rifa.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex justify-between font-bold text-[10px]">
                          <span className="text-slate-500">{paid} cotas</span>
                          <span className="text-indigo-600">{ratioPct}%</span>
                        </div>
                        <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${ratioPct}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2.5 justify-center items-center">
                        {/* Edit details */}
                        <button 
                          onClick={() => handleEditClick(rifa)}
                          title="Editar Rifa"
                          className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Duplicate */}
                        <button 
                          onClick={() => handleDuplicate(rifa.id)}
                          title="Duplicar Rifa"
                          className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Setup Combos */}
                        {rifa.status === "ATIVO" && (
                          <button 
                            onClick={() => {
                                setComboRifaId(rifa.id);

                                setEditingComboId(null);

                                setComboNome("");

                                setComboQuantidade("10");

                                setComboDesconto("15");

                                fetchCombos(rifa.id);

                                setShowComboForm(true);
                            }}
                            title="Vincular Combo Promocional"
                            className="px-2.5 py-1 text-[10px] bg-amber-50 text-amber-700 font-extrabold rounded-lg border border-amber-100 transition hover:bg-amber-100"
                          >
                            + Combo
                          </button>
                        )}

                        {/* Execute Sorteio Draw */}
                        {rifa.status === "ATIVO" && (
                          <button 
                            onClick={() => { setDrawRifaId(rifa.id); setWinnerNumberManual(""); setDrawMetodo("AUTOMATICO"); setShowDrawForm(true); }}
                            title="Realizar Sorteio Vencedor"
                            className="px-2.5 py-1 text-[10px] bg-indigo-55 text-indigo-700 font-extrabold rounded-lg border border-indigo-100 transition hover:bg-indigo-600 hover:text-white"
                          >
                            <Play className="w-3 h-3 inline mr-1" /> Sortear
                          </button>
                        )}

                        {/* Outcome winner code */}
                        {rifa.status === "FINALIZADO" && (
                          <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100">
                            🏆 {rifa.resultado || "Pendente"}
                          </span>
                        )}

                        {/* Delete */}
                        <button 
                          onClick={() => handleDelete(rifa.id)}
                          title="Excluir Rifa"
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* MODAL / DRAWER FORM FOR RIFA CREATION */}
      {showRifaForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white px-8 py-7">
              <h3 className="text-2xl font-extrabold tracking-tight">{editingRifaId ? "Editar Ação da Sorte" : "Criar Nova Ação da Sorte"}</h3>
              <p className="text-slate-200 text-sm mt-2">Preencha os dados e configure as cotas limites de aquisição.</p>
            </div>

            <form onSubmit={handleSubmitRifa} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase">Título da Rifa *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: Chevrolet Camaro 2.0 Turbo 2022"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold focus:border-indigo-650 inline-block text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-500 uppercase">Valor por Número (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required 
                    placeholder="0.50"
                    value={valorPorNumero}
                    onChange={(e) => setValorPorNumero(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-center text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-500 uppercase">Quantidade Total de Cotas *</label>
                 <input
  type="number"
  min="10"
  step="1"
  required
  placeholder="Ex: 350"
  value={quantidadeTotal}
  onChange={(e) => setQuantidadeTotal(e.target.value)}
  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-extrabold text-center text-slate-900"
/>

<span className="text-[10px] text-slate-400 font-semibold">
  Informe qualquer quantidade. Ex: 350, 750, 1500, 5000...
</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-500 uppercase">Data Prevista do Sorteio</label>
                  <input 
                    type="date" 
                    value={dataSorteio}
                    onChange={(e) => setDataSorteio(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-500 uppercase">Método Padrão de Sorteio</label>
                  <select 
                    value={metodoSorteio}
                    onChange={(e) => setMetodoSorteio(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-extrabold text-center text-slate-900"
                  >
                    <option value="AUTOMATICO">SISTEMA AUTOMÁTICO (RANDOM ADQUIRIDO)</option>
                    <option value="LOTERIA_FEDERAL">LOTERIA FEDERAL (INDICAÇÃO EXTRAÇÃO)</option>
                    <option value="MANUAL">SORTEIO MANUAL (SELEÇÃO DA COTAS)</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase">URLs Imagens Galeria (Separadas por Vírgula)</label>
                  <input 
                    type="text" 
                    placeholder="https://images.unsplash.com/url1, https://images.unsplash.com/url2"
                    value={imagensInput}
                    onChange={(e) => setImagensInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-[10px] font-mono outline-hidden text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold block">Deixe em branco para usar uma imagem padrão premium Unsplash.</span>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase">Descrição da Ação</label>
                  <textarea 
                    rows={3}
                    placeholder="Destaque as principais características..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-900"
                  ></textarea>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase">Regulamento / Condições Extra</label>
                  <textarea 
                    rows={2}
                    placeholder="A data de sorteio está pré-agendada..."
                    value={regulamento}
                    onChange={(e) => setRegulamento(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-900"
                  ></textarea>
                </div>

                {/* Terms of Use Validation Agreement for Creators */}
                <div className="p-4 bg-amber-500/5 sm:col-span-2 rounded-2xl border border-amber-500/20 flex items-start gap-3 mt-1 text-slate-600 text-[11px] leading-relaxed">
                  <input
                    type="checkbox"
                    id="agreeCreatorTerms"
                    required
                    className="mt-0.5 accent-indigo-600 rounded cursor-pointer size-4"
                  />
                  <label htmlFor="agreeCreatorTerms" className="cursor-pointer select-none text-slate-600 font-semibold leading-relaxed">
                    Declaro que li e concordo com os <a href="#/termos" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-black underline hover:text-indigo-500">Termos para Criadores</a>. Estou integralmente ciente de que o software Clube da Sorte é apenas a ferramenta tecnológica de hospedagem, e que sou única, cível, civil e penalmente responsável por obter alvarás/autorizações, processar os pagamentos recebidos, realizar os sorteios com lisura e garantir a efetiva entrega dos prêmios aos ganhadores.
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowRifaForm(false)}
                  className="flex-1 py-3 text-slate-500 hover:bg-slate-100 font-extrabold border border-slate-200 rounded-xl transition text-xs"
                >
                  Voltar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-slate-900 hover:bg-indigo-600 hover:text-white text-white font-extrabold rounded-xl transition text-xs py-3"
                >
                  {editingRifaId ? "Salvar Alterações" : "Lançar Ação Sorteio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL / DRAWER FORM FOR COMBO DESIGN */}
      {showComboForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-amber-500 text-white p-6 space-y-1">
              <h3 className="text-lg font-black">Instalar Combo Promocional</h3>
              <p className="text-amber-100 text-xs font-semibold">Ofereça descontos progressivos na compra de pacotes!</p>
            </div>

            <form onSubmit={handleSubmitCombo} className="p-6 space-y-4">
              {combos.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">
                      Combos já cadastrados
                    </h4>

                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {combos.map((combo: any) => (
                        <div
                          key={combo.id}
                          className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-all duration-200 ${
                            editingComboId === combo.id
                              ? "border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-200/40"
                              : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">

                                <div className="font-bold text-slate-800">
                                    {combo.nome}
                                </div>

                                {editingComboId === combo.id && (
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black tracking-wide uppercase">
                                        Editando
                                    </span>
                                )}

                            </div>

                            <div className="text-xs text-slate-500">
                              {combo.quantidade} números • {combo.desconto}% OFF
                            </div>
                          </div>

                          <div className="flex gap-2 items-center">

                            <button
                                type="button"
                                onClick={() => handleEditCombo(combo)}
                                className={`transition ${
                                  editingComboId === combo.id
                                      ? "text-indigo-700 scale-110"
                                      : "text-indigo-600 hover:text-indigo-800"
                              }`}
                              >
                                <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                                type="button"
                                onClick={() => handleDeleteCombo(combo.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                            </button>

                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                )}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-500 uppercase">Nome Amigável do Desconto</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Super Pack de 10 Cotas (15% Off)"
                  value={comboNome}
                  onChange={(e) => setComboNome(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-500 uppercase">Qtd de Números</label>
                  <input 
                    type="number" 
                    required 
                    value={comboQuantidade}
                    onChange={(e) => setComboQuantidade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-center font-extrabold text-xs text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-500 uppercase">Desconto (%)</label>
                  <input 
                    type="number" 
                    required 
                    value={comboDesconto}
                    onChange={(e) => setComboDesconto(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-center font-extrabold text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowComboForm(false)}
                  className="
flex-1
py-3
bg-slate-200
hover:bg-slate-300
text-slate-800
font-extrabold
border
border-slate-300
rounded-xl
transition
duration-200
text-xs
shadow-sm
"
                >
                  Cancelar
                </button>
                <button
                    type="submit"
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl transition text-xs py-3"
                  >
                    {editingComboId ? "Salvar Alterações" : "Ativar Promoção"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL / DRAWER FORM FOR THE DRAW CRUST */}
      {showDrawForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-indigo-600 text-white p-6 space-y-1">
              <h3 className="text-lg font-black flex items-center gap-1.5"><Award className="w-5 h-5 text-amber-400" /> Realizar Sorteio</h3>
              <p className="text-indigo-100 text-xs font-semibold">Apure o número premiado e determine o ganhador oficial desta ação.</p>
            </div>

            <form onSubmit={handleExecuteDraw} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-500 uppercase">Modalidade de Sorteio</label>
                <select 
                  value={drawMetodo}
                  onChange={(e) => setDrawMetodo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-extrabold text-center"
                >
                  <option value="AUTOMATICO">SISTEMA ELETRÔNICO (ALEATORIZAR ENTRE COTAS PAGAS)</option>
                  <option value="MANUAL">MANUAL / LOTERIA FEDERAL (INDICAÇÃO FÍSICA)</option>
                </select>
              </div>

              {drawMetodo === "MANUAL" && (
                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-500 uppercase">Número Premiado Extraído *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: 456"
                    value={winnerNumberManual}
                    onChange={(e) => setWinnerNumberManual(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-center font-black text-base focus:border-indigo-600 font-mono tracking-wider outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold block text-center mt-1">O sistema buscará qual comprador adquiriu este número exato de forma oficial!</span>
                </div>
              )}

              {drawMetodo === "AUTOMATICO" && (
                <div className="p-3.5 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-101 text-[11px] font-semibold space-y-1">
                  <p>O algoritmo buscará todos os bilhetes catalogados com status <strong>PAGO</strong> para esta ação e selecionará eletronicamente o vencedor de forma auditável.</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowDrawForm(false)}
                  className="flex-1 py-3 text-slate-500 hover:bg-slate-100 font-extrabold border border-slate-200 rounded-xl transition text-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={drawing}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-extrabold rounded-xl transition text-xs py-3 shadow-lg shadow-indigo-600/10"
                >
                  {drawing ? "Apurando cotas..." : "Finalizar & Homologar Sorteio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
