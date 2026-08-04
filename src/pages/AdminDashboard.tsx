import { useState, useEffect } from "react";
import { 
  Trophy as LucideTrophy, 
  Coins as LucideCoins, 
  CheckCircle as LucideCheck, 
  Clock as LucideClock, 
  Users as LucideUsers, 
  TrendingUp as LucideTrend, 
  Activity as LucideActivity,
  Lock as LucideLock,
  ArrowRight,
  ShieldAlert as LucideShield,
  Loader as LucideLoader
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

interface Stats {
  totalArrecadado: number;
  salesToday: number;
  salesThisMonth: number;
  pedidosPendentes: number;
  pedidosPagos: number;
  totalCompradores: number;
  activeRifasCount: number;
  finishedRifasCount: number;
}

export default function AdminDashboard({ token, setToken }: { token: string; setToken: (t: string) => void }) {
  // Login states
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Stats states
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load admin stats if authenticated
  useEffect(() => {
    if (!token) return;

    fetch("/api/admin/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          // Token expired
          setToken("");
          localStorage.removeItem("admin_token");
        }
        return res.json();
      })
      .then((data) => {
        if (data.metrics) {
          setStats(data.metrics);
        }
        if (data.chartData) {
          setChartData(data.chartData);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro dashboard:", err);
        setLoading(false);
      });
  }, [token, setToken]);

  // Auth handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) return;
    setLoggingIn(true);
    setLoginError("");

    fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    })
      .then((res) => res.json())
      .then((data) => {
        setLoggingIn(false);
        if (data.error) {
          setLoginError(data.error);
        } else if (data.token) {
          localStorage.setItem("admin_token", data.token);
          setToken(data.token);
        }
      })
      .catch((err) => {
        console.error("Erro login:", err);
        setLoggingIn(false);
        setLoginError("E-mail ou senha incorretos ou servidor indisponível.");
      });
  };

  // ==========================================
  // VIEW: AUTHENTICATION CHECK
  // ==========================================
  if (!token) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-xl">
        <div className="bg-slate-900 text-white p-8 text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <LucideLock className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-black">Acesso Administrativo</h2>
          <p className="text-slate-400 text-xs font-semibold">Entre com suas credenciais de produtor para gerenciar as ações</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-4">
          {loginError && (
            <div className="p-3.5 bg-red-50 text-red-700 font-bold text-xs rounded-xl border border-red-100 flex items-start gap-2">
              <LucideShield className="w-4 h-4 text-red-500 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-black text-slate-500 uppercase">E-mail Corporativo</label>
            <input 
              type="email" 
              required
              placeholder="admin@rifas.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 p-3.5 rounded-xl text-xs font-semibold outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-black text-slate-500 uppercase">Senha Administrativa</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 p-3.5 rounded-xl text-xs font-semibold outline-hidden"
            />
          </div>

          <button 
            type="submit" 
            disabled={loggingIn}
            className="w-full bg-slate-900 hover:bg-indigo-600 hover:text-white text-white font-extrabold py-3.5 rounded-xl transition text-xs shadow-md shadow-slate-950/20"
          >
            {loggingIn ? "Acessando sistemas..." : "Confirmar Login"}
          </button>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <LucideLoader className="w-8 h-8 animate-spin text-slate-700" />
        <span className="text-slate-500 font-bold text-sm">Organizando dados administrativos...</span>
      </div>
    );
  }

  return (
    <div id="admin_dashboard_grid" className="space-y-10">
      {/* HEADER PANELS */}
      <section className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <LucideActivity className="w-7 h-7 text-indigo-600" /> Dashboard de Produtor
          </h1>
          <p className="text-slate-500 text-xs font-semibold">Análise de arrecadação financeira, reservas de tickets e métricas de compradores.</p>
        </div>
      </section>

      {/* METRICS ROW CARDS */}
      {stats && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Vendas Hoje */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Faturamento Hoje</span>
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold leading-none">PIX</span>
            </div>
            <div>
              <div className="text-xl font-black">
                R$ {stats.salesToday.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] font-semibold text-slate-400 pt-1">Ganhos de hoje compensados</p>
            </div>
          </div>

          {/* Card 2: Faturamento Mensal */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Arrecadação Mês</span>
              <LucideCoins className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-800">
                R$ {stats.salesThisMonth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] font-semibold text-slate-500 pt-1">Total de vendas acumulado no mês</p>
            </div>
          </div>

          {/* Card 3: Pedidos Pagos */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pedidos Pagos</span>
              <LucideCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-800">
                {stats.pedidosPagos} pedidos
              </div>
              <p className="text-[11px] font-semibold text-slate-500 pt-1">Excluindo pedidos pendentes</p>
            </div>
          </div>

          {/* Card 4: Clientes */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total de Clientes</span>
              <LucideUsers className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-800">
                {stats.totalCompradores} compradores
              </div>
              <p className="text-[11px] font-semibold text-slate-500 pt-1">Clientes cadastrados na base</p>
            </div>
          </div>
        </section>
      )}

      {/* GRAPHICS GRID ROW */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recharts Chart bar */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs lg:col-span-2 space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800">📊 Faturamento Diário (Últimos 7 dias)</h3>
            <p className="text-slate-400 text-[11px] font-semibold">Intervalo de vendas PIX pagas registradas no sistema.</p>
          </div>

          <div className="h-64 pt-2">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold italic">Nenhum dado financeiro para gerar gráficos.</div>
            ) : (
              <ResponsiveContainer width="100%" height="105%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="data" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `R$${val}`} tickLine={false} />
                  <Tooltip 
                    formatter={(val: any) => [`R$ ${val.toFixed(2)}`, "Vendas"]} 
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="vendas" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Dynamic overall stats info metrics list */}
        {stats && (
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-6 flex flex-col justify-between">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5"><LucideTrophy className="w-4 h-4 text-amber-500" /> Saúde do Sistema</h3>
            
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-center py-2 border-b border-slate-50 text-xs font-semibold">
                <span className="text-slate-500">Rifas em Execução</span>
                <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-bold">{stats.activeRifasCount} ativas</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50 text-xs font-semibold">
                <span className="text-slate-500">Sorteios Realizados</span>
                <span className="bg-slate-150 text-slate-700 px-2.5 py-1 rounded-full font-bold">{stats.finishedRifasCount} ações</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50 text-xs font-semibold">
                <span className="text-slate-500">Pedidos Pendentes PIX</span>
                <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-bold">{stats.pedidosPendentes} aguardando</span>
              </div>
              <div className="flex justify-between items-center py-2 text-xs font-semibold">
                <span className="text-slate-500">Faturamento Bancário Acumulado</span>
                <span className="text-emerald-600 font-extrabold text-sm">R$ {stats.totalArrecadado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <p className="text-[10px] font-semibold text-slate-400 text-center uppercase leading-none">Central Administrativa Segura</p>
          </div>
        )}
      </section>
    </div>
  );
}
