import { KeyRound, X } from "lucide-react";

interface PasswordModalProps {
  open: boolean;

  nome: string;

  senha: string;
  setSenha: (value: string) => void;

  confirmarSenha: string;
  setConfirmarSenha: (value: string) => void;

  onClose: () => void;
  onSubmit: () => void;
}

export default function PasswordModal({
  open,
  nome,

  senha,
  setSenha,

  confirmarSenha,
  setConfirmarSenha,

  onClose,
  onSubmit,
}: PasswordModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">

      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-6 py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white">
              <KeyRound className="h-5 w-5" />
            </div>

            <div>

              <h2 className="text-lg font-black text-slate-800">
                Alterar Senha
              </h2>

              <p className="text-xs font-semibold text-slate-500">
                Defina uma nova senha para o usuário.
              </p>

            </div>

          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 transition hover:bg-white"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>

        </div>

        {/* BODY */}

        <div className="space-y-5 p-6">

          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">

            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Usuário
            </div>

            <div className="mt-1 text-lg font-black text-slate-800">
              {nome}
            </div>

          </div>

          <div>

            <label className="mb-2 block text-sm font-bold text-slate-700">
              Nova Senha
            </label>

            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite a nova senha"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />

          </div>

          <div>

            <label className="mb-2 block text-sm font-bold text-slate-700">
              Confirmar Senha
            </label>

            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Confirme a nova senha"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />

          </div>

        </div>

        {/* FOOTER */}

        <div className="flex gap-3 border-t bg-slate-50 px-6 py-5">

          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-700 py-3 font-extrabold text-white transition hover:bg-slate-800"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onSubmit}
            className="flex-1 rounded-xl bg-amber-500 py-3 font-extrabold text-white transition hover:bg-amber-600"
          >
            Alterar Senha
          </button>

        </div>

      </div>

    </div>
  );
}