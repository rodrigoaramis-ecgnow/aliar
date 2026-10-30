# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estrutura do projeto

Repositório Git próprio (remote: `rodrigoaramis-ecgnow/aliar`, branch `master`), publicado via **GitHub Pages**.

```
[ALIAR] Automação Operacional/
  entendimento/index.html      — LP de Entendimento (mapeamento operacional do lead)
  cadastro/index.html          — LP de Cadastro de empresas (dados contratuais + 4 uploads)
  cadastro/obrigado.html       — Página de agradecimento pós-cadastro
  apps-script-formularios/Code.gs — CÓPIA DE REFERÊNCIA do script "ALIAR - Integração Formulários"
  --- NÃO PERTENCEM A ESTE PROJETO (têm chat próprio) ---
  apps-script/Code.gs          — script do projeto de MÉDICOS. Não editar aqui.
  medicos-cadastro/            — LP de cadastro de médicos (outro projeto)
  medicos-marketplace/         — Book de médicos (outro projeto)
  formulario/                  — Pasta legada (não usar, não commitar)
```

URLs publicadas:
- Entendimento: https://rodrigoaramis-ecgnow.github.io/aliar/entendimento/
- Cadastro (empresa): https://rodrigoaramis-ecgnow.github.io/aliar/cadastro/

> **Importante:** os arquivos HTML contêm logos em base64 e ultrapassam 200 KB. Sempre use `Read` antes de qualquer `Edit`. Para alterações em blocos grandes, prefira scripts com `str.replace` ou `re.sub`.

Todos os arquivos são **single-file** (HTML + CSS + JS inline, sem framework, sem build step).

> **Regra de repositório:** o repo `aliar` recebe commits de mais de uma sessão (médicos). Antes de `push`, rodar `git fetch` e conferir `git log master..origin/master`. Nunca fazer `git add -A`; adicionar só os arquivos do próprio projeto. Referência do Apps Script deste projeto vive SEMPRE em `apps-script-formularios/` (o caminho `apps-script/` já é de médicos).

---

## Identidade visual (CSS custom properties)

Definidas em `:root` no topo de cada arquivo:

```css
--gold: #8d7a52        --gold-light: #a89877    --gold-dark: #6b5a3e
--border: rgba(141,122,82,0.35)   /* bordas em todos os elementos */
--bg-primary: #0c0a07  --bg-card: #161e2e       --bg-input: #0e1520
```

Títulos de cards (`section-title`, `sec-header`) e bordas de selects usam tom ouro. Labels de campos ficam em branco. Novas LPs devem **copiar o `<head>`/CSS de `cadastro/index.html`** para manter exatamente a mesma cara (header com logos ECGNow + ALIAR, cards, campos, botão, footer).

---

## entendimento/index.html

**Seções:** Identificação → Perfil Decisório → Dados Operacionais → Perfil da Empresa

**CNPJ lookup:** `XMLHttpRequest` → `https://brasilapi.com.br/api/cnpj/v1/{14digitos}`. Dispara em `input`, `paste` e `blur`. Exibe card de confirmação `.cnpj-confirm`. Valores em `#cnpj-razao` e `#cnpj-fantasia`.

**Popup de fabricantes (`fabData`):** objeto JS que mapeia cada exame (`eq-ecg`, `eq-holter`, `eq-mapa`, `eq-ergo`) para label + chips.

**Payload de submit:** `nome`, `email`, `whatsapp`, `cnpj`, `empresa_razao`, `empresa_fantasia`, `area`, `decisao`, `perfil`, `pessoas`, `exames[]`, `telecardio`, `desafios[]`, `expectativa`, volumetria (`ap_ecg`, `vol_ecg`, `eq_ecg`, ...), `timestamp`, `origem: 'aliar-formulario-web'`.

**Envio:** GET `?data=<base64 do JSON>` com `{ mode: 'no-cors' }` (payload pequeno, sem arquivos). **Pós-submit:** oculta o form e exibe `#successBox` inline.

---

## cadastro/index.html (empresas)

**Seções:** Dados da Empresa → Representante Legal (dinâmico) → Responsável Médico → Financeiro / Suporte / Implantação / Enfermagem → Documentos

**CNPJ:** botão "Consultar" → BrasilAPI → auto-preenche razão social, nome fantasia e endereço. **CEP:** botão "Buscar" → `https://brasilapi.com.br/api/cep/v1/{cep8}`.

**Representante Legal dinâmico:** `addRepresentante()` / `removeRepresentante()`, campos `rep_{idx}_campo`. **Botões "Igual a":** `idemCopy(target, source)` com prefixos `rep_0`, `med`, `fin`, `sup`, `imp`, `enf`.

**Uploads (4):** logotipo, cartão CNPJ, contrato social, alteração do contrato. Drag-and-drop + `FileReader` → base64 em `input._b64`, com `input._nome` e `input._tipo`. Limites: imagem 5 MB, PDF 10 MB. Todos opcionais.

**Estrutura do payload** (ATENÇÃO — o `Code.gs` precisa ler exatamente estas chaves):
```
{ empresa: { cnpj, razao_social, tipo_servico, num_funcionarios, vencimento_boleto },
  nome_fantasia,                       // fora de "empresa"
  endereco: { cep, logradouro, numero, complemento, bairro, cidade, estado },
  representantes_legais: [...], responsavel_medico, responsavel_financeiro,
  responsavel_suporte, responsavel_implantacao, responsavel_enfermagem,
  documentos: { logotipo, logotipo_nome, logotipo_tipo, cartao_cnpj, ..., alt_contrato_tipo },
  timestamp, origem: 'aliar-cadastro-contratual' }
```

**Envio (com arquivos):** `fetch(URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify(payload) })`. Validado em produção — o POST chega ao `doPost` com o corpo íntegro. **Pós-submit:** salva logos no `sessionStorage` e redireciona para `obrigado.html`.

---

## Integração Google Drive (Apps Script)

- **Projeto:** "ALIAR - Integração Formulários" (script vinculado a planilha — https://script.google.com/home → "Todos os projetos")
- **URL de implantação:** `https://script.google.com/macros/s/AKfycbz2NhwPbzUfFI5XzJ5mtk9utbqALcQCLdBt3_sS_hafYcpGq-9qPn8Vc6aPdQgijMlx/exec` (hard-coded 1x em cada HTML; ao criar LP nova, declarar `var SCRIPT_URL` uma única vez no topo do `<script>`)
- **Pastas no Drive** (dentro de `[Code] Respostas LP.`):
  - `PASTA_ENTREVISTA = '1_z76Xm_9Jz7guQR4anvEPJnVwjys3IGw'` — https://drive.google.com/drive/folders/1_z76Xm_9Jz7guQR4anvEPJnVwjys3IGw
  - `PASTA_CADASTRO   = '144OpeDuNke782I-NAdSIeCbE23h38j_q'` — https://drive.google.com/drive/folders/144OpeDuNke782I-NAdSIeCbE23h38j_q
- **Funções:** `doGet`, `doPost`, `criarDocEntrevista`, `criarDocCadastro`, `consultarCNPJ`, `salvarArquivoDrive`, `formatarMilhar`, `autorizarPermissoes`, `tc`, `sec`, `linha`
- **Roteamento por `origem`:** `'aliar-formulario-web'` → entrevista; `'aliar-cadastro-contratual'` → cadastro
- **Entrevista:** gera Doc + seção final "DADOS CNPJ (RECEITA FEDERAL)" via BrasilAPI (`UrlFetchApp`), com `try/catch` que escreve o erro no próprio Doc.
- **Cadastro:** gera Doc (Razão Social | Nome Fantasia, CNPJ, Cidade/Estado, endereço...) e salva os 4 arquivos na `PASTA_CADASTRO`, com links no Doc e no e-mail.
- **Todo envio** gera e-mail de alerta para `rodrigo.aramis@ecgnow.com.br`.

### Como atualizar o script (sempre nesta ordem)
1. Editar `apps-script-formularios/Code.gs` neste repo.
2. Colar o arquivo **INTEIRO** no editor do Apps Script (Ctrl+A, apagar, colar). **Nunca colar só uma função** — já substituiu o arquivo todo e derrubou os formulários.
3. Conferir o fim do arquivo: nenhum caractere solto após a última `}` (um "S" solto causou `ReferenceError` e falha em todas as execuções).
4. Se o código passou a usar um serviço novo (`UrlFetchApp`, etc.): selecionar `autorizarPermissoes` no menu ao lado de ▶ Executar, rodar uma vez e aceitar a autorização. Só salvar/implantar NÃO pede essa permissão.
5. Implantar → Gerenciar implantações → editar → **Nova versão** → Implantar. Só salvar não atualiza a URL publicada.
6. Testar. O Doc vai para a pasta certa e o e-mail chega.

### Diagnóstico rápido
- Painel **Execuções** (ícone ▤▶, não o relógio de "Acionadores"). Status "Falha" com duração < 1 s = erro de sintaxe/carga do arquivo.
- O `doGet` devolve o erro como texto. Chamar o `/exec` com `?data=<base64>` via `curl -L` mostra a mensagem exata (cuidado: se funcionar, cria Doc e e-mail reais).
- Doc com ~1 KB parado fora da pasta = função abortou no meio (exceção engolida pelo `try/catch` do `doGet`).
- Conferir sempre que as chaves lidas no `Code.gs` batem com as do payload da LP (o Nome Fantasia/Endereço do cadastro saíam em branco por isso).

---

## APIs externas

| Serviço | Endpoint |
|---------|----------|
| BrasilAPI CNPJ | `https://brasilapi.com.br/api/cnpj/v1/{cnpj14}` |
| BrasilAPI CEP  | `https://brasilapi.com.br/api/cep/v1/{cep8}`   |

---

## Decisões registradas

- **Insights por IA no Doc: NÃO implementar por ora.** Busca automática na web a partir de script sempre tem custo de API (Gemini com busca, Anthropic ou outro); o chat do Claude.ai é assinatura de uso humano, não é acionável por script. Só vale retomar se Rodrigo aceitar custo por consulta.
- **Projetos em chats distintos.** Médicos e Automação Operacional não se misturam.

## Pendências

- **Nova LP: Cadastro de Centrais** (em planejamento — ver abaixo).
- Confirmar se o e-mail de alerta está chegando após as correções (antes nunca chegava; causa não foi isolada).
- Remote `origin` do repo está com token do GitHub embutido na URL → revogar o token e reconfigurar sem credencial (Git Credential Manager).
- Submissões feitas durante a janela em que o script esteve quebrado não são recuperáveis (nada foi gravado); pedir reenvio se houver lead real.
- CRM RD Station: integração dos docs gerados com pipeline de negociação.

---

## Nova LP — Cadastro de Centrais (a construir)

Proposta (confirmar com Rodrigo antes de implementar):
- Pasta `centrais/` com `index.html` + `obrigado.html`, copiando o layout/CSS de `cadastro/`.
- `origem: 'aliar-cadastro-centrais'` e nova função `criarDocCentral(d)` no `Code.gs`, roteada em `doGet`/`doPost`.
- Nova pasta no Drive `Respostas - Centrais ALIAR` (dentro de `[Code] Respostas LP.`) e constante `PASTA_CENTRAIS`.
- Campos: definidos por Rodrigo (diferentes do cadastro de empresas). Se tiver upload, usar o mesmo padrão de base64 + POST do cadastro.
- Fluxo: Rodrigo valida a lista de campos e o layout → implementar LP → atualizar `Code.gs` → colar o arquivo inteiro → Nova versão → teste real.
