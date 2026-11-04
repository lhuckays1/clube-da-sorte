import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, LoaderCircle, MessageSquare, Star, X } from "lucide-react";

type Status = "PENDENTE" | "APROVADO" | "REJEITADO";

interface Testimonial {
  id: number;
  nomePublico: string;
  mensagem: string;
  avaliacao: number;
  status: Status;
  createdAt: string;
  revisadoEm: string | null;
}

export default function AdminTestimonials({ token, onPendingCountChange }: { token: string; onPendingCountChange?: (count: number) => void }) {
  const [status, setStatus] = useState<Status>("PENDENTE");
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/depoimentos?status=${status}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar os depoimentos");
      setItems(Array.isArray(data) ? data : []);
      if (status === "PENDENTE") onPendingCountChange?.(Array.isArray(data) ? data.length : 0);
    } catch (error: any) {
      setFeedback(error.message || "Não foi possível carregar os depoimentos");
    } finally {
      setLoading(false);
    }
  }, [status, token, onPendingCountChange]);

  useEffect(() => { void loadItems(); }, [loadItems]);

  const review = async (item: Testimonial, nextStatus: "APROVADO" | "REJEITADO") => {
    setBusyId(item.id);
    setFeedback("");
    try {
      const response = await fetch(`/api/admin/depoimentos/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível atualizar o depoimento");
      await loadItems();
      setFeedback(nextStatus === "APROVADO" ? "Depoimento aprovado e publicado." : "Depoimento rejeitado.");
    } catch (error: any) {
      setFeedback(error.message || "Não foi possível atualizar o depoimento");
    } finally {
      setBusyId(null);
    }
  };

  const tabs: Array<{ value: Status; label: string }> = [
    { value: "PENDENTE", label: "Pendentes" },
    { value: "APROVADO", label: "Aprovados" },
    { value: "REJEITADO", label: "Rejeitados" },
  ];

  return (
    <section className="space-y-6 text-slate-200">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Moderação</p>
          <h1 className="mt-1 text-3xl font-black text-white">Depoimentos</h1>
          <p className="mt-2 text-sm text-slate-400">Cada comentário está ligado a um pedido pago e só aparece no site após aprovação.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-300">
          <Clock3 className="h-4 w-4" /> {status === "PENDENTE" ? `${items.length} aguardando revisão` : `Exibindo ${tabs.find((tab) => tab.value === status)?.label.toLowerCase()}`}
        </div>
      </header>

      <div className="flex gap-2 border-b border-zinc-800">
        {tabs.map((tab) => (
          <button key={tab.value} type="button" onClick={() => setStatus(tab.value)} className={`border-b-2 px-4 py-3 text-sm font-extrabold transition ${status === tab.value ? "border-emerald-400 text-emerald-300" : "border-transparent text-slate-500 hover:text-slate-200"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {feedback && <p role="status" className="rounded-xl border border-zinc-800 bg-[#131317] px-4 py-3 text-sm text-emerald-300">{feedback}</p>}

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-[#131317] p-12 text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" /> Carregando depoimentos...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-[#131317] p-12 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-slate-500" />
          <p className="mt-3 font-bold text-white">Nenhum depoimento {status === "PENDENTE" ? "aguardando revisão" : status === "APROVADO" ? "aprovado" : "rejeitado"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-zinc-800 bg-[#131317] p-5 shadow-xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold text-white">{item.nomePublico} <span className="ml-2 text-xs font-semibold text-emerald-400">Compra confirmada</span></p>
                  <p className="mt-1 text-xs text-slate-500">Enviado em {new Date(item.createdAt).toLocaleString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-1 text-amber-400" aria-label={`${item.avaliacao} de 5 estrelas`}>
                  {Array.from({ length: item.avaliacao }, (_, index) => <Star key={index} className="h-4 w-4 fill-current" />)}
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{item.mensagem}</p>
              {status === "PENDENTE" && (
                <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-zinc-800 pt-4">
                  <button disabled={busyId === item.id} type="button" onClick={() => void review(item, "REJEITADO")} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 px-4 py-2.5 text-sm font-extrabold text-rose-300 hover:bg-rose-500/10 disabled:opacity-60">
                    {busyId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Rejeitar
                  </button>
                  <button disabled={busyId === item.id} type="button" onClick={() => void review(item, "APROVADO")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-neutral-950 hover:bg-emerald-400 disabled:opacity-60">
                    {busyId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprovar e publicar
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
