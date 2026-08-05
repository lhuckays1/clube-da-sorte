import { UserPlus, Pencil, X } from "lucide-react";

interface UserFormModalProps {
  open: boolean;
  editing: boolean;

  nome: string;
  setNome: (value: string) => void;

  email: string;
  setEmail: (value: string) => void;

  senha: string;
  setSenha: (value: string) => void;

  confirmarSenha: string;
  setConfirmarSenha: (value: string) => void;

  onClose: () => void;
  onSubmit: () => void;
}

export default function UserFormModal({
  open,
  editing,

  nome,
  setNome,

  email,
  setEmail,

  senha,
  setSenha,

  confirmarSenha,
  setConfirmarSenha,

  onClose,
  onSubmit,
}: UserFormModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">

        {/* Header */}

        <div
          className={`px-6 py-5 border-b flex items-center justify-between ${
            editing
              ? "bg-indigo-50 border-indigo-100"
              : "bg-amber-50 border-amber-100"
          }`}
        >
          <div className="flex items-center gap-3">

            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                editing
                  ? "bg-indigo-600 text-white"
                  : "bg-amber-500 text-white"
              }`}
            >
              {editing ? (
                <Pencil className="w-5 h-5" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
            </div>

            <div>

              <h2 className="text-lg font-black text-slate-800">
                {editing ? "Editar Usuário" : "Novo Usuário"}
              </h2>

              <p className="text-xs font-semibold text-slate-500">
                {editing
                  ? "Atualize os dados do usuário."
                  : "Cadastre um novo usuário administrador."}
              </p>

            </div>

          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>

        </div>

        {/* Conteúdo */}

        <div className="p-6 space-y-5">

          {/* Nome */}

          <div>

            <label className="block mb-2 text-sm font-bold text-slate-700">
              Nome
            </label>

            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-white text-slate-800 font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              placeholder="Digite o nome completo"
            />

          </div>

          {/* Email */}

          <div>

            <label className="block mb-2 text-sm font-bold text-slate-700">
              E-mail
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-white text-slate-800 font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              placeholder="usuario@email.com"
            />

          </div>

          {/* Senha */}

          {!editing && (
            <>
              <div>

                <label className="block mb-2 text-sm font-bold text-slate-700">
                  Senha
                </label>

                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-white text-slate-800 font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  placeholder="Digite a senha"
                />

              </div>

              <div>

                <label className="block mb-2 text-sm font-bold text-slate-700">
                  Confirmar Senha
                </label>

                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-white text-slate-800 font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  placeholder="Confirme a senha"
                />

              </div>
            </>
          )}

        </div>

        {/* Footer */}

        <div className="border-t bg-slate-50 px-6 py-5 flex gap-3">

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-extrabold transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onSubmit}
            className={`flex-1 py-3 rounded-xl font-extrabold text-white transition ${
              editing
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            {editing ? "Salvar Alterações" : "Criar Usuário"}
          </button>

        </div>

      </div>

    </div>
  );
}