export type UserRole = "admin" | "editor" | "agente";

export type QuestionType =
  | "texto"
  | "numero"
  | "data"
  | "opcao_unica"
  | "opcao_multipla"
  | "geoponto"
  | "foto";

export interface Secretaria {
  id: string;
  nome: string;
  sigla: string;
}

export interface Form {
  id: string;
  secretaria_id: string | null;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  secretarias?: Pick<Secretaria, "nome" | "sigla"> | null;
}

export interface Question {
  id: string;
  form_id: string;
  titulo: string;
  tipo: QuestionType;
  opcoes: string[];
  obrigatoria: boolean;
  ordem: number;
  ativo: boolean;
}

export interface Entrevista {
  id: string;
  form_id: string;
  agente_id: string;
  pessoa_id: string | null;
  status: "em_andamento" | "concluida";
  latitude: number | null;
  longitude: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Answer {
  question_id: string;
  valor: unknown;
}

export interface FormComSecretaria extends Form {
  secretarias: Pick<Secretaria, "nome" | "sigla"> | null;
}

export interface EntrevistaComForm extends Entrevista {
  forms: Pick<Form, "id" | "nome"> | null;
  pessoas?: { nome: string; foto_url: string | null } | null;
}

export interface EntrevistaComFormEAgente extends EntrevistaComForm {
  profiles: Pick<{ id: string; full_name: string }, "full_name"> | null;
}

export interface FormComSecretariaId extends Form {
  secretaria_id: string;
}

export type QuerVoltarEstado = "sim" | "nao" | "nao_sabe";

export interface Pessoa {
  id: string;
  nome: string;
  cpf: string | null;
  idade: number | null;
  sexo: "M" | "F" | "Outro" | null;
  quer_voltar_estado: QuerVoltarEstado | null;
  estado_origem: string | null;
  tem_doenca: boolean;
  doenca: string | null;
  raca_cor: string | null;
  identidade_genero: string | null;
  orientacao_sexual: string | null;
  ra: string | null;
  latitude: number;
  longitude: number;
  observacoes: string | null;
  foto_url: string | null;
  created_at: string;
}


