import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Ticket, 
  Home as HomeIcon, 
  Search, 
  ShieldAlert, 
  Smartphone,
  LayoutDashboard,
  Settings,
  Users,
  Menu,
  ChevronRight,
  LogOut,
  Sparkles
} from "lucide-react";

import Home from "./pages/Home";
import RaffleDetails from "./pages/RaffleDetails";
import Checkout from "./pages/Checkout";
import ClientArea from "./pages/ClientArea";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRaffles from "./pages/AdminRaffles";
import AdminOrders from "./pages/AdminOrders";
import AdminUsers from "./pages/AdminUsers";
import AdminConfig from "./pages/AdminConfig";
import Terms from "./pages/Terms";

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(localStorage.getItem("admin_token") || "");
  const [configs, setConfigs] = useState<any>({
    site_name: "Clube da Sorte",
    cor_principal: "#4f46e5",
    whatsapp: "5511999999999"
  });

  // Load site variables
  useEffect(() => {
    fetch("/api/configuracoes")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setConfigs(data);
        }
      })
      .catch((err) => console.error("Erro ao carregar configurações gerais:", err));
  }, []);

  const handleAdminLogout = () => {
    localStorage.removeItem("admin_token");
    setToken("");
    navigate("/");
  };

  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-slate-200 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      
      {/* 1. MASTER RESPONSIVE APP NAVBAR HEADER */}
      <header className="bg-[#111116]/95 backdrop-blur bg-opacity-95 border-b border-zinc-800/70 sticky top-0 z-40 shadow-lg shadow-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex justify-between items-center">
          {/* Logo Brand */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500 rounded-xl text-neutral-950 shadow-md shadow-emerald-500/20">
              <Ticket className="w-5.5 h-5.5" />
            </div>
            <span className="text-lg font-black tracking-tight text-white uppercase">
              {configs.site_name}
            </span>
          </Link>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-black uppercase text-slate-400 tracking-wide">
            <Link to="/" className="hover:text-emerald-400 transition flex items-center gap-1.5 py-1">
              <HomeIcon className="w-4 h-4 text-slate-500" /> Início
            </Link>
            <Link to="/compras" className="hover:text-emerald-400 transition flex items-center gap-1.5 py-1">
              <Search className="w-4 h-4 text-slate-500" /> Meus Bilhetes
            </Link>
            <Link to="/admin" className="hover:text-emerald-400 transition flex items-center gap-1.5 py-1 text-slate-500">
              <ShieldAlert className="w-4 h-4 text-slate-500" /> Painel Admin
            </Link>
          </nav>

          {/* Right Header action */}
          <div className="flex gap-3">
            <Link 
              to="/compras" 
              className="bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:text-neutral-950 hover:border-emerald-500 text-emerald-400 py-2.5 px-5 rounded-xl font-extrabold text-xs tracking-wider uppercase transition duration-200"
            >
              Consultar Meus Pedidos
            </Link>
          </div>
        </div>

        {/* 2. ADMIN ACTIONS NAV SUBBAR (Shown only when logged inside admin rooms) */}
        {token && isAdminRoute && (
          <div className="bg-[#17171E] border-t border-zinc-800/60 text-slate-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex justify-between items-center text-xs font-black uppercase tracking-wider overflow-x-auto gap-4">
              <div className="flex gap-4 sm:gap-6 shrink-0 py-1">
                <Link to="/admin" className="hover:text-emerald-400 transition flex items-center gap-1.5 font-bold">
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" /> Resumo
                </Link>
                <Link to="/admin/rifas" className="hover:text-emerald-400 transition flex items-center gap-1.5 font-bold">
                  <Ticket className="w-4 h-4 text-emerald-400" /> Gerenciar Rifas
                </Link>
                <Link to="/admin/pedidos" className="hover:text-emerald-400 transition flex items-center gap-1.5 font-bold">
                  <Users className="w-4 h-4 text-emerald-400" /> Pedidos & Clientes
                </Link>
                <Link
                  to="/admin/users"
                  className="hover:text-emerald-400 transition flex items-center gap-1.5 font-bold"
                  >
                  <Users className="w-4 h-4 text-emerald-400" />
                  Usuários
                </Link>
                <Link to="/admin/config" className="hover:text-emerald-400 transition flex items-center gap-1.5 font-bold">
                  <Settings className="w-4 h-4 text-emerald-400" /> Ajustes Logo/PIX
                </Link>
              </div>

              <button 
                onClick={handleAdminLogout}
                className="hover:text-red-300 text-red-400 transition flex items-center gap-1.5 uppercase shrink-0"
                title="Sair do painel administrador"
              >
                Logout <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 3. MAIN DYNAMIC BODY SECTION */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rifa/:id" element={<RaffleDetails />} />
          <Route path="/checkout/:hash" element={<Checkout />} />
          <Route path="/compras" element={<ClientArea />} />
          <Route path="/termos" element={<Terms />} />
          
          {/* Admin routes */}
          <Route path="/admin" element={<AdminDashboard token={token} setToken={setToken} />} />
          <Route path="/admin/rifas" element={token ? <AdminRaffles token={token} /> : <AdminDashboard token={token} setToken={setToken} />} />
          <Route path="/admin/pedidos" element={token ? <AdminOrders token={token} /> : <AdminDashboard token={token} setToken={setToken} />} />
          <Route
              path="/admin/users"
              element={
                token
                  ? <AdminUsers token={token} />
                  : <AdminDashboard token={token} setToken={setToken} />
              }
          />
          <Route path="/admin/config" element={token ? <AdminConfig token={token} /> : <AdminDashboard token={token} setToken={setToken} />} />
        </Routes>
      </main>

      {/* 4. MASTER SITE FOOTER */}
      <footer className="bg-slate-900 text-white mt-auto py-12 border-t border-slate-850">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Ticket className="w-6 h-6 text-indigo-500" />
              <span className="text-base font-extrabold tracking-tight uppercase">{configs.site_name}</span>
            </div>
            <p className="text-slate-400 text-xs font-semibold leading-relaxed">
              Sistema de rifas online de altíssima confiabilidade. Registrado e automatizado utilizando o melhor das integrações PIX e atualizações em tempo real.
            </p>
          </div>
          
          <div>
            <h4 className="font-extrabold text-xs text-indigo-400 uppercase tracking-widest mb-4">Acesso Rápido</h4>
            <div className="grid grid-cols-1 gap-2 text-xs font-semibold text-slate-300">
              <Link to="/" className="hover:text-white transition">Início</Link>
              <Link to="/compras" className="hover:text-white transition">Consultar Bilhetes</Link>
              <Link to="/admin" className="hover:text-white transition">Painel Administrativo</Link>
              <Link to="/termos" className="hover:text-[#34d399] transition underline">Termos e Isenção</Link>
            </div>
          </div>

          <div>
            <h4 className="font-extrabold text-xs text-indigo-400 uppercase tracking-widest mb-4">Contato & Suporte</h4>
            <p className="text-slate-400 text-xs font-semibold mb-4 leading-relaxed">Dúvidas com compras ou aprovações? Entre em contato agora com nosso atendimento no WhatsApp.</p>
            <a 
              href={`https://wa.me/${configs.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-5 rounded-xl transition inline-flex items-center gap-2"
            >
              <Smartphone className="w-4.5 h-4.5" /> Falar no WhatsApp
            </a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-slate-800 text-center text-slate-500 text-[11px] font-semibold">
          &copy; {new Date().getFullYear()} {configs.site_name}. Desenvolvido para máxima fidelidade e performance. Todos os direitos reservados.
        </div>
      </footer>

      {/* FLOATING WHATSAPP BUTTON */}
      <a 
        href={`https://wa.me/${configs.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-full shadow-2xl z-55 transition-transform hover:scale-110 flex items-center justify-center border border-emerald-400/30"
        title="Fale Conosco no WhatsApp"
      >
        <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.253 5.264.001 11.73.001c3.126 0 6.07 1.21 8.285 3.419 2.21 2.21 3.419 5.158 3.417 8.287-.006 6.475-5.267 11.727-11.73 11.727-2.001 0-3.974-.51-5.713-1.48L0 24zm6.59-4.846c1.6.95 3.1 1.45 4.96 1.455 5.395 0 9.774-4.364 9.779-9.739.002-2.6-1.01-5.043-2.853-6.883-1.832-1.841-4.275-2.854-6.879-2.854-5.399 0-9.782 4.365-9.788 9.742a9.66 9.66 0 001.44 4.887l-.95 3.473 3.593-.943z"/>
        </svg>
      </a>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Layout />
    </HashRouter>
  );
}
