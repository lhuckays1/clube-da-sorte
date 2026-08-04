import { useState } from "react";
import { Scale, Users, ShieldAlert, FileText, CheckCircle2, UserCheck, AlertTriangle, AlertCircle } from "lucide-react";

export default function Terms() {
  const [activeTab, setActiveTab] = useState<"user" | "creator">("user");

  return (
    <div className="max-w-4xl mx-auto space-y-8 select-none py-2">
      {/* HEADER SECTION */}
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 mb-1">
          <Scale className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-white font-display uppercase tracking-tight">
          Termos de Uso & Isenção de Responsabilidade
        </h1>
        <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
          O <strong>Clube da Sorte</strong> é uma plataforma exclusiva de intermediação de software. Leia nossos regulamentos e termos de isenção de responsabilidade abaixo.
        </p>
      </div>

      {/* TAB SELECTOR */}
      <div className="flex border-b border-zinc-800 p-1 bg-zinc-950 rounded-2xl max-w-md mx-auto gap-1">
        <button
          onClick={() => setActiveTab("user")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition duration-200 cursor-pointer ${
            activeTab === "user"
              ? "bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/10"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <UserCheck className="w-4 h-4 shrink-0" /> Participantes
        </button>
        <button
          onClick={() => setActiveTab("creator")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition duration-200 cursor-pointer ${
            activeTab === "creator"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4 shrink-0" /> Criadores de Rifa
        </button>
      </div>

      {/* CORE DISMISSAL NOTE */}
      <div className="bg-red-500/5 border border-red-500/15 rounded-3xl p-5 md:p-6 flex items-start gap-4">
        <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl">
          <ShieldAlert className="w-6 h-6 shrink-0 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-black text-white uppercase tracking-wider">Aviso Importante de Isenção de Responsabilidade</h4>
          <p className="text-xs text-slate-400 leading-relaxed font-semibold">
            O Clube da Sorte é <strong>apenas um provedor tecnológico e ferramenta de hospedagem</strong> de campanhas. Não possuímos, não organizamos, não fiscalizamos e não gerenciamos nenhuma das rifas ou ações promocionais divulgadas no sistema. Qualquer transação financeira, entrega de prêmios e regularização legal correm exclusivamente por conta de e entre os participantes e os respectivos criadores.
          </p>
        </div>
      </div>

      {/* CONTENT INNER GRID */}
      {activeTab === "user" ? (
        <div className="bg-[#131118]/80 border border-zinc-800/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-zinc-800/60 pb-4">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-white text-base font-display">Termos para Participantes (Compradores de Bilhetes)</h3>
          </div>

          <div className="space-y-4 text-xs font-semibold text-slate-400 leading-relaxed">
            <p>
              Ao utilizar este site para participar de qualquer ação, sorteio ou adquirir bilhetes (cotas), você declara estar de acordo com os seguintes termos:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Nenhuma Garantia da Plataforma</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  O Clube da Sorte não garante de qualquer forma a entrega do prêmio divulgado, tampouco a precisão, lisura ou legitimidade jurídica da campanha organizada pelo criador.
                </p>
              </div>

              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Transações Diretas</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Todos os pagamentos PIX ou transferências efetuados são processados e recebidos diretamente nos canais e contas do criador da campanha ou de seus parceiros de recebimento. O site não retém, custodia ou gerencia qualquer valor financeiro vindo de compradores.
                </p>
              </div>

              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sobre os Desenhos e Sorteios</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Fica estabelecido que o criador de cada rifa define as regras de apuração (Loteria Federal ou sorteio manual). Cabe unicamente ao comprador verificar se as regras agradam e fiscalizar os resultados diretamente com o organizador.
                </p>
              </div>

              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Resgate de Bilhetes / Extravios</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Em caso de cancelamento da ação, atraso na apuração ou problemas na entrega dos bens, o comprador concorda em acionar diretamente o organizador da rifa cadastrada, renunciando a qualquer pleito judicial ou extrajudicial contra o Clube da Sorte.
                </p>
              </div>
            </div>

            <div className="p-4 bg-zinc-900/40 rounded-2xl border border-zinc-800/60 mt-4">
              <span className="block font-black text-white text-[11px] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500" /> Fiscalização Própria
              </span>
              <p className="text-[11px] text-slate-400">
                Recomendamos fortemente que você participe apenas de ações cujo o organizador/criador seja de sua inteira confiança e conhecimento pessoal, evitando a compra com criadores desconhecidos ou sem referências.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#11131A]/80 border border-zinc-800/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-zinc-800/60 pb-4">
            <Users className="w-5 h-5 text-indigo-400" />
            <h3 className="font-extrabold text-white text-base font-display">Termos para Criadores de Rifa (Organizadores)</h3>
          </div>

          <div className="space-y-4 text-xs font-semibold text-slate-400 leading-relaxed">
            <p>
              Ao utilizar nossa infraestrutura de software para criar campanhas e rifas personalizadas, você assume total e exclusiva responsabilidade cível, criminal e tributária pelos seus atos:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/40 space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Legalização da Campanha</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  O organizador declara que possui e obteve todas as autorizações, alvarás, cadastros e termos de regularização obrigatórios exigidos nos órgãos tributários e federais de sua respectiva jurisdição no país para a realização de sorteios ou rifas.
                </p>
              </div>

              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/40 space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Garantia de Fidelidade</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  O criador da campanha obriga-se irrevogavelmente a honrar com a entrega integral do prêmio estipulado, nas condições publicadas e dentro da legislação vigente, sob pena de responder integralmente por eventuais perdas e danos.
                </p>
              </div>

              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/40 space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Recebimento de Fundos</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Você confessa que as chaves PIX de recebimento fornecidas nos painéis são de sua propriedade direta e que você assume todo o ônus tributário referente às receitas das vendas de cotas ou taxas de devolução, isentando de qualquer ônus o prestador do software.
                </p>
              </div>

              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/40 space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Indenidade Plena</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Em caso de litígio, reclamação de clientes, bloqueios de contas ou fiscalização policial, o criador reitera expressamente que manterá o Clube da Sorte integralmente indene de qualquer tipo de ônus judicial, custo processual ou indenizações de qualquer natureza.
                </p>
              </div>
            </div>

            <div className="p-4 bg-zinc-900/40 rounded-2xl border border-zinc-800/60 mt-4">
              <span className="block font-black text-white text-[11px] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Violação dos Termos
              </span>
              <p className="text-[11px] text-slate-400">
                A criação de campanhas comprovadamente fraudulentas, sem prêmios reais, ou em completo desacordo com a legislação cível levará à imediata exclusão da conta administrativa e do histórico de dados das rifas, sem prejuízo de possíveis notificações e envios de dados cadastrais a órgãos e entidades policiais/investigativas competentes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
