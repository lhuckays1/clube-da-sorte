import { useState, useEffect, type FormEvent } from "react";
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
  Play,
  Eye
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
  temCotasPremiadas: boolean;
  quantidadeCotasPremiadas: number;
  valorCotaPremiada: number;
}

interface CotaPremiada {
  id: number;
  rifaId: number;
  numero?: string;
  premio: number;
  status: string;
  pedidoId: number | null;
  compradorId: number | null;
  createdAt: string;
  premiadoEm: string | null;
  pedido?: {
    id: number;
    hash: string;
    status: string;
    valorTotal: number;
  } | null;
  comprador?: {
    id: number;
    nome: string;
    telefone?: string;
    cidade?: string;
    estado?: string;
  } | null;
}

export default function AdminRaffles({ token }: { token: string }) {
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Cotas Premiadas - visualização administrativa
  const [showCotasPremiadas, setShowCotasPremiadas] = useState(false);
  const [cotasPremiadasRifa, setCotasPremiadasRifa] = useState<Rifa | null>(null);
  const [cotasPremiadas, setCotasPremiadas] = useState<CotaPremiada[]>([]);
  const [loadingCotasPremiadas, setLoadingCotasPremiadas] = useState(false);

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

  // Form states (Cotas Premiadas)
  const [temCotasPremiadas, setTemCotasPremiadas] = us