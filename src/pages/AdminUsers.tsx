import UserFormModal from "../components/admin/users/UserFormModal";
import PasswordModal from "../components/admin/users/PasswordModal";
import DeleteUserDialog from "../components/admin/users/DeleteUserDialog";
import { useEffect, useMemo, useState } from "react";
import {
  UserPlus,
  Search,
  Pencil,
  KeyRound,
  Trash2,
  Loader,
  User,
  Mail,
  Calendar,
} from "lucide-react";

interface Usuario {
  id: number;
  nome: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminUsers({ token }: { token: string }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showUserModal, setShowUserModal] = useState(false);

  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [nome, setNome] = useState("");

  const [email, setEmail] = useState("");

  const [senha, setSenha] = useState("");

  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [passwordUserId, setPasswordUserId] = useState<number | null>(null);

  const [passwordUserName, setPasswordUserName] = useState("");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);

  const [deleteUserName, setDeleteUserName] = useState("");

  const fetchUsuarios = () => {
    setLoading(true);

    fetch("/api/admin/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUsuarios(data);
        } else {
          setUsuarios([]);
        }
      })
      .catch((err) => {
        console.error(err);
        setUsuarios([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleSubmitUser = async () => {

        if (!nome.trim()) {
            alert("Informe o nome.");
            return;
        }

        if (!email.trim()) {
            alert("Informe o e-mail.");
            return;
        }

        if (editingUserId === null) {

            if (!senha) {
                alert("Informe uma senha.");
                return;
            }

            if (senha !== confirmarSenha) {
                alert("As senhas não conferem.");
                return;
            }

        }

        try {

            const url =
                editingUserId === null
                    ? "/api/admin/users"
                    : `/api/admin/users/${editingUserId}`;

            const method =
                editingUserId === null
                    ? "POST"
                    : "PUT";

            const body =
                editingUserId === null
                    ? {
                        nome,
                        email,
                        senha,
                    }
                    : {
                        nome,
                        email,
                    };

            const response = await fetch(url, {

                method,

                headers: {

                    Authorization: `Bearer ${token}`,

                    "Content-Type": "application/json",

                },

                body: JSON.stringify(body),

            });

            const json = await response.json();

            if (!response.ok) {

                alert(json.error || "Erro ao salvar usuário.");

                return;

            }

            fetchUsuarios();

            setShowUserModal(false);

            setEditingUserId(null);

            setNome("");

            setEmail("");

            setSenha("");

            setConfirmarSenha("");

        } catch (err) {

            console.error(err);

            alert("Erro ao comunicar com o servidor.");

        }

    };


  const handleChangePassword = async () => {

    if (!passwordUserId) return;

    if (!senha.trim()) {
        alert("Informe a nova senha.");
        return;
    }

    if (senha !== confirmarSenha) {
        alert("As senhas não conferem.");
        return;
    }

    try {

        const response = await fetch(
        `/api/admin/users/${passwordUserId}/password`,
        {
            method: "PATCH",
            headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            senha,
            }),
        }
        );

        const json = await response.json();

        if (!response.ok) {
        alert(json.error || "Erro ao alterar senha.");
        return;
        }

        setShowPasswordModal(false);

        setPasswordUserId(null);

        setPasswordUserName("");

        setSenha("");

        setConfirmarSenha("");

        alert("Senha alterada com sucesso!");

    } catch (err) {

        console.error(err);

        alert("Erro ao comunicar com o servidor.");

    }

    };


  const handleDeleteUser = async () => {

    if (!deleteUserId) return;

    try {

        const response = await fetch(
            `/api/admin/users/${deleteUserId}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const json = await response.json();

        if (!response.ok) {

            alert(json.error || "Erro ao excluir usuário.");

            return;

        }

        fetchUsuarios();

        setShowDeleteDialog(false);

        setDeleteUserId(null);

        setDeleteUserName("");

        alert("Usuário excluído com sucesso!");

    } catch (err) {

        console.error(err);

        alert("Erro ao comunicar com o servidor.");

    }

   };

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const texto = search.toLowerCase();

      return (
        u.nome.toLowerCase().includes(texto) ||
        u.email.toLowerCase().includes(texto)
      );
    });
  }, [usuarios, search]);

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}

      <section className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">

        <div>

          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <User className="w-7 h-7 text-indigo-600" />
            Gerenciamento de Usuários
          </h1>

          <p className="text-slate-500 text-xs font-semibold">
            Cadastre, edite e gerencie os usuários administrativos do sistema.
          </p>

        </div>

        <button
                onClick={() => {

                    setEditingUserId(null);

                    setNome("");

                    setEmail("");

                    setSenha("");

                    setConfirmarSenha("");

                    setShowUserModal(true);

                }}
                className="bg-amber-500 hover:bg-amber-600 text-white font-black px-5 py-3 rounded-xl flex items-center gap-2 transition"
            >
                <UserPlus className="w-4 h-4"/>

                Novo Usuário
            </button>

      </section>

      {/* Pesquisa */}

      <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">

        <div className="relative">

          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            placeholder="Pesquisar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold outline-none focus:border-indigo-500"
          />

        </div>

      </section>

      {/* Lista */}

      <section className="space-y-4">

        {loading ? (

          <div className="bg-white rounded-3xl border border-slate-200 p-10 flex justify-center">

            <Loader className="w-8 h-8 animate-spin text-slate-500" />

          </div>

        ) : usuariosFiltrados.length === 0 ? (

          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">

            <User className="w-10 h-10 mx-auto text-slate-300 mb-4" />

            <h3 className="font-black text-slate-700">
              Nenhum usuário encontrado
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              Tente alterar sua pesquisa.
            </p>

          </div>

        ) : (

          usuariosFiltrados.map((usuario) => (

            <div
              key={usuario.id}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition"
            >

              <div className="flex justify-between items-center">

                <div className="space-y-2">

                  <div className="flex items-center gap-2">

                    <User className="w-4 h-4 text-indigo-600" />

                    <span className="font-black text-slate-800">
                      {usuario.nome}
                    </span>

                  </div>

                  <div className="flex items-center gap-2 text-slate-600 text-sm">

                    <Mail className="w-4 h-4" />

                    {usuario.email}

                  </div>

                  <div className="flex items-center gap-2 text-slate-400 text-xs">

                    <Calendar className="w-4 h-4" />

                    Criado em{" "}
                    {new Date(usuario.createdAt).toLocaleDateString("pt-BR")}

                  </div>

                </div>

                <div className="flex gap-3">

                    {/* Editar */}

                    <button
                        onClick={() => {

                        setEditingUserId(usuario.id);

                        setNome(usuario.nome);

                        setEmail(usuario.email);

                        setSenha("");

                        setConfirmarSenha("");

                        setShowUserModal(true);

                        }}
                        className="p-2 rounded-xl hover:bg-indigo-50 text-indigo-600 transition"
                        title="Editar"
                    >
                        <Pencil className="w-5 h-5" />
                    </button>

                    {/* Alterar Senha */}

                    <button
                        onClick={() => {

                        setPasswordUserId(usuario.id);

                        setPasswordUserName(usuario.nome);

                        setSenha("");

                        setConfirmarSenha("");

                        setShowPasswordModal(true);

                        }}
                        className="p-2 rounded-xl hover:bg-amber-50 text-amber-600 transition"
                        title="Alterar senha"
                    >
                        <KeyRound className="w-5 h-5" />
                    </button>

                    {/* Excluir */}

                    <button
                            onClick={() => {

                                setDeleteUserId(usuario.id);

                                setDeleteUserName(usuario.nome);

                                setShowDeleteDialog(true);

                            }}
                            className="p-2 rounded-xl hover:bg-red-50 text-red-600 transition"
                            title="Excluir"
                        >
                            <Trash2 className="w-5 h-5" />
                    </button>

                    </div>

              </div>

            </div>

          ))

        )}

      </section>

      <UserFormModal
  open={showUserModal}
  editing={editingUserId !== null}

  nome={nome}
  setNome={setNome}

  email={email}
  setEmail={setEmail}

  senha={senha}
  setSenha={setSenha}

  confirmarSenha={confirmarSenha}
  setConfirmarSenha={setConfirmarSenha}

  onClose={() => {
    setShowUserModal(false);
  }}

  onSubmit={handleSubmitUser}
/>

<PasswordModal
  open={showPasswordModal}

  nome={passwordUserName}

  senha={senha}
  setSenha={setSenha}

  confirmarSenha={confirmarSenha}
  setConfirmarSenha={setConfirmarSenha}

  onClose={() => {

    setShowPasswordModal(false);

    setPasswordUserId(null);

    setPasswordUserName("");

    setSenha("");

    setConfirmarSenha("");

  }}

  onSubmit={handleChangePassword}
/>

<DeleteUserDialog
    open={showDeleteDialog}

    nome={deleteUserName}

    onClose={() => {

        setShowDeleteDialog(false);

        setDeleteUserId(null);

        setDeleteUserName("");

    }}

    onConfirm={handleDeleteUser}
/>

    </div>
  );
}