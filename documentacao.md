# DF-Legal — Documentação do Projeto

Sistema web de **levantamento de pessoas em situação de rua no Distrito Federal** ("Monitora DF"), com entrevistas feitas por agentes no celular, vinculadas a cidadãos, com mapa georreferenciado e painel de acompanhamento.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (PostgreSQL + Auth + Storage) · react-leaflet/OpenStreetMap · deploy no Vercel.

**Plataforma:** 100% mobile-first (telas otimizadas para uso no celular do agente, com áreas seguras e limites de largura).

---

## 1. Visão geral do fluxo

```
Agente entra (CPF + senha)
        ↓
Escolhe um formulário da secretaria
        ↓
Vincula a um cidadão (busca existente OU cadastra novo)
        ↓
Responde as perguntas do formulário (uma por vez, no celular)
        ↓
Conclui a entrevista → vira um registro georreferenciado
        ↓
Dados visíveis no Mapa, no Painel e (futuramente) no ArcGIS
```

---

## 2. Funcionalidades por perfil

### 2.1 Agente (campo)

- **Login por CPF + senha.**
- **Nova entrevista** sempre vinculada a um cidadão:
  - Busca por nome ou CPF, com filtros de **RA**, **quer voltar** e **tem doença**.
  - **Alerta de duplicidade**: ao cadastrar, o sistema consulta o banco e avisa se já existe cidadão com o **mesmo CPF** ou **nome parecido** (tolerante a acentos e erros de digitação, ex.: "Joao Grillo" encontra "João Grilo"). O agente pode *usar o registro existente*, *cadastrar mesmo assim* ou *continuar digitando*.
- **Cadastro de novo cidadão**:
  - Foto (câmera ou galeria), nome, CPF, idade, sexo, se quer voltar ao estado de origem (e de onde), se possui doença (qual), observações.
  - **Ponto no mapa**: inicia onde o agente está (geolocalização), o agente move o pin se necessário; a **RA é detectada automaticamente** pelo ponto (reverse geocoding).
- **Formulário dinâmico** (perguntas definidas por cada secretaria):
  - Tipos: texto, número, data, opção única, opção múltipla, geoponto (marcar no mapa) e **foto**.
  - Uma pergunta por vez no celular, com barra de progresso.
  - "Próxima", "Voltar", salvar rascunho a qualquer momento, e na última pergunta **Concluir**.
- **Minhas entrevistas**: lista com nome do cidadão, foto, status (em andamento / concluída); pode excluir entrevistas **em andamento** que criou.
- **Mapa** (todos os agentes): ver pontos dos cidadãos e quem **já foi entrevistado** (badge verde com a quantidade). Ao clicar no ponto: dados do cidadão, navegação **Waze/Google Maps** e as **entrevistas concluídas** com as respostas.
  - Regra de privacidade: para o agente que **não fez** a entrevista, o **nome do agente autor** e as entrevistas **em andamento** ficam ocultos (só admin, editor e o próprio autor veem).

### 2.2 Editor (coordenador da secretaria)

- Tudo que o agente vê, mais:
- **Gerenciar perguntas** dos formulários da **própria secretaria** (criar, editar, reordenar, ativar/desativar).
- Ver entrevistas da própria secretaria no Painel.

### 2.3 Admin

- Tudo dos demais, mais:
- **Usuários**: criar, editar perfil (nome, CPF, telefone, papel, secretaria) e desativar.
- **Secretarias**: criar.
- **Formulários**: criar e ativar/desativar.
- **Painel completo** com filtros por status, data, secretaria e agente.
- **Admin master** (secretaria DF-LEGAL ou admin sem secretaria): enxerga **todas** as secretarias, formulários e entrevistas.

---

## 3. Modelo de dados (PostgreSQL / Supabase)

### 3.1 Tabelas principais (`public`)

| Tabela | Finalidade | Campos principais |
|---|---|---|
| `secretarias` | Órgãos | `nome`, `sigla` |
| `profiles` | Perfil do usuário (1:1 com auth) | `id`→`auth.users`, `full_name`, `secretaria_id`, `role` (admin/editor/agente), `cpf`, `telefone` |
| `forms` | Formulários de cada secretaria | `secretaria_id`, `nome`, `descricao`, `ativo` |
| `questions` | Perguntas do formulário | `form_id`, `titulo`, `tipo`, `opcoes` (jsonb), `obrigatoria`, `ordem`, `ativo` |
| `entrevistas` | Uma entrevista preenchida | `form_id`, `agente_id`, `pessoa_id`, `status` (em_andamento/concluida), `latitude`, `longitude`, `observacoes`, `created_at`, `updated_at` |
| `answers` | Respostas (1 linha por pergunta) | `entrevista_id`, `question_id`, `valor` (jsonb), unique(`entrevista_id`,`question_id`) |
| `pessoas` | Cidadãos levantados | `nome`, `cpf` (**único** quando preenchido), `idade`, `sexo`, `quer_voltar_estado`, `estado_origem`, `tem_doenca`, `doenca`, `ra`, `latitude`, `longitude`, `observacoes`, `foto_url` |

### 3.2 Armazenamento

- **Bucket `fotos`** (Supabase Storage, público): fotos dos cidadãos e respostas do tipo "foto".
- **Coordenadas** armazenadas como `latitude`/`longitude` (WGS84) em `pessoas` e `entrevistas`.

### 3.3 Segurança (RLS — Row Level Security)

Toda a leitura/escrita é limitada por política no banco, nunca confiando só no front:

- **Formulários/perguntas/secretarias**: leitura para qualquer autenticado; escrita só admin (perguntas também editor da secretaria).
- **Entrevistas/respostas**: agente só das próprias; editor/admin da secretaria; **master** todas. Inserção exige `agente_id = auth.uid()`; exclusão só de em andamento.
- **Pessoas**: leitura para qualquer autenticado; agentes podem cadastrar e editar (inserção/atualização autenticada); **CPF único** (índice único parcial).
- **Funções auxiliares** (`app_role`, `is_master`, `entrevistas_do_cidadao`, `contagem_entrevistas_cidadaos`) usam `security definer` para regras consistentes no banco.

---

## 4. Login e perfis de acesso

1. O usuário digita **CPF** (com máscara) e **senha**.
2. O sistema chama a função `user_email_by_cpf(cpf)` no banco, que resolve o **e-mail** do usuário pelo CPF.
3. Autentica com e-mail + senha (`Supabase Auth`, JWT).
4. O papel (`admin`/`editor`/`agente`) vem do perfil, e o middleware protege as rotas — usuário não logado é redirecionado ao login.

**Criação de usuários:** feita pelo admin (nome, CPF, telefone, papel, secretaria). A senha inicial é definida na criação e o usuário pode trocá-la.

**Hierarquia de visibilidade:**
- Agente → só o que ele criou.
- Editor → tudo da própria secretaria.
- Admin → tudo da própria secretaria.
- Admin master (DF-LEGAL ou sem secretaria) → tudo.

---

## 5. Como funcionam as perguntas criadas pelos editores

1. Cada **formulário** pertence a uma **secretaria**.
2. O **editor** (ou admin) acessa **Gerenciar Perguntas**, escolhe o formulário e cadastra as perguntas.
3. Cada pergunta tem: título, **tipo** (`texto`, `numero`, `data`, `opcao_unica`, `opcao_multipla`, `geoponto`, `foto`), opções (para escolha), obrigatoriedade, **ordem** e status ativo.
4. As permissões garantem que o editor **só altere perguntas dos formulários da própria secretaria** (o admin altera todas).
5. No momento da entrevista, o app monta o formulário automaticamente: busca as perguntas **ativas do formulário, em ordem**, e renderiza o campo correspondente a cada tipo.
6. A resposta é salva em `answers` como JSON (`valor`), vinculada à pergunta e à entrevista — assim **novas perguntas valem imediatamente para entrevistas futuras** sem alteração de código, e respostas antigas continuam legíveis.

---

## 6. Auditoria

**Estado atual:**
- Colunas `created_at` / `updated_at` em todas as tabelas.
- Exclusão de entrevista em andamento pelo próprio agente (única operação destrutiva do fluxo normal).
- Logs de login já existem no Supabase (`auth.audit_log_entries`), mas não são expostos no app.

**Recomendado (evolução):**
- Tabela `audit_log` (quem, quando, qual tabela/linha, operação, dados antes/depois em JSON, IP e user-agent) alimentada por triggers.
- **Versionamento de respostas** (histórico de edições de `answers`).
- Tela de **Auditoria** para admin (filtro por usuário, data e tabela).
- Anexar `source`/`sync` às entrevistas para rastrear origem (app x ArcGIS).

---

## 7. Possíveis evoluções

1. **Modo offline/PWA** (trabalhar sem internet no campo e sincronizar depois).
2. **Exportação/relatórios** (CSV/PDF/Excel) por secretaria e período.
3. **Notificações** para agentes (novas pessoas cadastradas, pendências).
4. **Fotos com validação de rosto** / biometria para reduzir duplicidade.
5. **App do cidadão** (acompanhar seu processo de retorno).
6. **Geoestatísticas** (mapas de calor, densidade por RA).
7. **Multissecretaria com workflow** (encaminhamento entre órgãos).
8. **Integração com ArcGIS Server** (item 8) e outras bases oficiais (CadÚnico, SUAS).
9. **Duplicidade automática** (cadastro em lote + match por CPF/nome no banco).

---

## 8. Integração com PostgreSQL próprio + ArcGIS Server

### 8.1 PostgreSQL próprio (fora do Supabase)

O projeto **já roda em PostgreSQL** (o Supabase é Postgres). Para apontar para um banco Postgres próprio ou para o geodatabase do ArcGIS, é preciso:

1. **Dump do schema**: usar as migrations em `supabase/migrations/` (`00001` a `00010`) como base — são SQL puro e portáveis.
2. **Substituir os conectores**:
   - O código usa `@supabase/supabase-js` (cliente) e `@supabase/ssr` (auth). Para um Postgres puro, trocar por `pg`/`Postgres.js` + JWT próprio, ou manter um proxy.
   - Recomenda-se manter o Supabase como origem e **replicar/sincronizar** para o Postgres/ArcGIS (menos risco), ou migrar de vez trocando a camada de dados.
3. **Geometria**: adicionar coluna `geometry` (PostGIS `POINT`, SRID 4326 ou 3857) em `pessoas` e `entrevistas` para consumo no ArcGIS, mantendo `latitude`/`longitude` sincronizadas (trigger que calcula a geometria a partir das coordenadas).
4. **Campos de integração**: adicionar `arcgis_objectid bigint`, `arcgis_globalid uuid`, `source text` (ex.: `'app'`, `'arcgis'`) e `sincronizado_at timestamptz` para idempotência e rastreabilidade do sincronismo.

### 8.2 Publicação no ArcGIS Server

1. Criar um **Enterprise Geodatabase** (ArcGIS) sobre o Postgres desejado ou publicar **feature layers** a partir das tabelas/views:
   - Camada **Pessoas** (pontos): dados do cidadão + coordenadas.
   - Camada **Entrevistas** (pontos ou tabela relacionada): status, respostas, agente.
   - Ativar **attachments** para fotos (ou manter no Storage e guardar a URL no atributo).
2. Publicar como **Feature Service REST** (SRID Web Mercator 3857 ou 4326 conforme a organização).

### 8.3 Integração via API REST do ArcGIS (receber + devolver dados)

Duas direções, executadas por scripts/workers (Vercel Cron, GitHub Actions ou serviço ETL):

**A) Receber dados do levantamento já existente no ArcGIS → app**

```
ArcGIS Feature Service
   │  GET /FeatureServer/{id}/0/query
   │    ?where=1=1&outFields=*&outSR=4326&resultOffset=..&resultRecordCount=2000&f=json
   ▼
Script de ingestão (Node/Python)
   ├─ Converte Web Mercator → WGS84 (lat/lng)
   ├─ Mapeia campos ArcGIS → schema do app (pessoas/entrevistas/answers)
   ├─ Upsert por CPF (pessoas) e por globalid/objectid (entrevistas)
   └─ Marca source='arcgis' + sincronizado_at
   ▼
Banco do app (pessoas/entrevistas)
```

**B) Devolver as novas informações das entrevistas do app → ArcGIS**

```
Banco do app (pessoas/entrevistas/answers)
   │  SELECT ... WHERE sincronizado_at IS NULL OU updated_at > ultima_sync
   ▼
Script de exportação (Node/Python)
   ├─ Gera features GeoJSON (4326 → 3857)
   ├─ INSERT = addFeatures / UPDATE = updateFeatures
   ├─ Controla por arcgis_objectid (criado) e arcgis_globalid (atualizado)
   └─ Registra sincronizado_at
   ▼
ArcGIS Feature Service (update/delete)
```

**Checklist técnico:**
- Credenciais do ArcGIS (OAuth 2.0 **client credentials** ou **API key**) em variáveis de ambiente do Vercel (nunca no código/git).
- **Agendamento**: `vercel.json` com `crons` (ex.: a cada 1h) ou GitHub Actions.
- **Idempotência**: nunca duplicar ao re-executar (usar CPF único + globalid).
- **Logs e auditoria** do sincronismo (tabela `sync_log`).
- **Prova de conceito recomendada**: começar apenas com a camada de Pessoas e um script bidirecional antes de evoluir para entrevistas/answers.

---

## 9. Rotas do app

| Rota | Descrição |
|---|---|
| `/login` | Login por CPF + senha |
| `/` | Início (menu por papel) |
| `/entrevistas` | Minhas entrevistas |
| `/entrevistas/nova` | Vincular/cadastrar cidadão e iniciar entrevista |
| `/entrevistas/[id]` | Formulário de entrevista (preencher/visualizar) |
| `/mapa` | Mapa de pessoas e entrevistas |
| `/painel` | Painel de acompanhamento (filtros/status) |
| `/gerenciar-perguntas` | Perguntas por formulário (editor/admin) |
| `/admin` | Admin: usuários, secretarias, formulários |

---

## 10. Migrations (ordem de execução)

| Migration | Conteúdo |
|---|---|
| `00001_init.sql` | Schema base, RLS, seed de secretarias/formulários |
| `00002_pessoas.sql` | Tabela pessoas + RLS + seed de 10 cidadãos fictícios |
| `00003_perfis.sql` | CPF/telefone no perfil + trigger |
| `00004_login_cpf.sql` | Função `user_email_by_cpf` + normalização de CPF |
| `00005_delete_entrevista.sql` | Exclusão de entrevista em andamento |
| `00006_master_rls.sql` | Admin master (DF-LEGAL) vê tudo |
| `00007_fotos.sql` | Foto do cidadão + tipo de pergunta foto + bucket storage |
| `00008_vincular_cidadao.sql` | `pessoa_id` na entrevista + permissões de cadastro de pessoas |
| `00009_cpf_unico.sql` | Índice único de CPF em pessoas |
| `00010_mapa_visibilidade.sql` | RPCs de visibilidade de entrevistas no mapa |
