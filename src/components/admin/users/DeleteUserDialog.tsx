import { TriangleAlert, Trash2, X } from "lucide-react";

interface DeleteUserDialogProps {
  open: boolean;

  nome: string;

  onClose: () => void;

  onConfirm: () => void;
}

export default function DeleteUserDialog({
  open,
  nome,
  onClose,
  onConfirm,
}: DeleteUserDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">

      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-6 py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600 text-white">
              <Trash2 className="h-5 w-5" />
            </div>

            <div>

              <h2 className="text-lg font-black text-slate-800">
                Excluir Usuário
              </h2>

              <p className="text-xs font-semibold text-slate-500">
                Esta ação é permanente.
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

          <div className="flex justify-center">

            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <TriangleAlert className="h-10 w-10 text-red-600" />
            </div>

          </div>

          <div className="text-center">

            <h3 className="text-xl font-black text-slate-800">
              Confirmar exclusão
            </h3>

            <p className="mt-3 text-slate-600">
              Deseja realmente excluir o usuário:
            </p>

            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">

              <span className="text-lg font-black text-red-700">
                {nome}
              </span>

            </div>

          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">

            <div className="flex items-start gap-3">

              <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-600 flex-shrink-0" />

              <div>

                <p className="text-sm font-bold text-slate-700">
                  Atenção
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Esta operação não poderá ser desfeita.
                  O usuário perderá imediatamente o acesso ao sistema.
                </p>

              </div>

            </div>

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
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 py-3 font-extrabold text-white transition hover:bg-red-700"
          >
            Excluir Usuário
          </button>

        </div>

      </div>

    </div>
  );
}