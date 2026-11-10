# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estrutura do projeto

Repositório Git próprio (remote: `rodrigoaramis-ecgnow/aliar`, branch `master`), publicado via **GitHub Pages**.

```
[ALIAR] Automação Operacional/
  entendimento/index.html      — LP de Entendimento (mapeamento operacional do lead)
  cadastro/index.html          — LP de Cadastro de empresas (dados contratuais + 4 uploads)
  cadastro/obrigado.html       — Página de agradecimento pós-cadastro
  centrais/index.html          — LP de Cadastro de Centrais (contratante + N centrais com prévia/prioridade)
  centrais/obrigado.html       — Cópia de cadastro/obrigado.html
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
- Cadastro de Centrais: https://rodrigoaramis-ecgnow.github.io/aliar/centrais/

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

## centrais/index.html (centrais de laudos — várias por envio)

**Contexto de negócio:** quem preenche é a **contratante** (empresa do médico laudista); cada **central** é um cliente dela. Um envio = 1 contratante + N centrais, em ordem de prioridade de implantação. Cada central tem pessoas e logotipo próprios.

Layout: lista lateral `#savedPanel` (centrais salvas, com miniatura da logo + nome fantasia + cidade; sticky no desktop, vira faixa no topo < 1100 px) + formulário. Grade compacta de 12 colunas (`.grid-12` + `.c-N`; no celular 1 coluna, `.m-6` meia largura). Montada a partir do `<head>`/CSS/header/footer de `cadastro/` + tabela de volumetria e popup `fabData` do `entendimento/`. Blocos numerados na tela:

1. **Empresa contratante** (uma vez) — `ct_cnpj` (consulta BrasilAPI automática), `ct_razao` (obrigatório), `ct_fantasia` (opcional). Só referência: nomeia a pasta do cliente no Drive e aparece no topo de cada Doc.
2. **Dados da Central** — CNPJ (consulta **automática** ao completar 14 dígitos e no `blur`; botão "Consultar" como reserva), Razão Social, Nome Fantasia, endereço (CEP busca sozinho só se a pessoa alterar o CEP), Tipo de Serviço.
3. **Exames e Volumetria** — `ex-*`; linha da tabela liberada ao marcar (`setExame`). Obrigatório: ≥ 1 exame e, em cada exame marcado, `ap-*`, `vol-*` **e marca** (`eq-*`, erro no `eq-*-trigger`).
4. **Pessoas envolvidas na implantação** — cards `pes_{idx}_campo`, "Responsável por" (`FUNCOES`, exibido em **ordem alfabética** com "Outro" por último → `pes_{idx}_funcao_outro`). "Igual a" só entre pessoas da **mesma** central. Regra: **≥ 1 "Responsável implantação" por central**.
5. **Logotipo desta central** — opcional, imagem até 5 MB (base64).
6. **Prévia** — cartões simples (Prioridade N, logo, nome fantasia, cidade/UF) com ↑↓, Editar e Remover. **A ordem só é ajustada aqui.** Botão "Confirmar e enviar".

**Fluxo (JS):** array `centrais` (ordem = prioridade) e `editando` (índice ou `null`). "Salvar e adicionar outra central" → `salvarCentral()` valida contratante + central, guarda e `limparCentral()`. "Revisar e enviar" → salva (se houver algo na tela) e `mostrarPrevia()`. Editar (lista lateral ou prévia) → `preencherCentral()` restaura tudo, inclusive a logo (`input._b64` + `preview.src`). `beforeunload` avisa se fechar a página com centrais não enviadas (não há rascunho salvo).

**Payload** (o `Code.gs` lê exatamente estas chaves):
```
{ contratante: { cnpj, razao_social, nome_fantasia },
  centrais: [{
    prioridade,                                   // 1 = primeira a implantar
    central:  { cnpj, razao_social, nome_fantasia, tipo_servico },
    endereco: { cep, logradouro, numero, complemento, bairro, cidade, estado },
    exames: ['ECG','Holter',...],
    ap_ecg, vol_ecg, eq_ecg, ...                  // mesmas chaves do entendimento, só dos exames marcados
    pessoas: [{ funcao, nome, nascimento, email, celular }],   // "Outro" → funcao = texto digitado
    logotipo: { b64, nome, tipo } | null }],
  timestamp, origem: 'aliar-cadastro-centrais' }
```

**Envio:** POST `text/plain` no-cors, `SCRIPT_URL` declarada 1x no topo do `<script>`. Só a partir da Prévia (Enter no editor não envia). Redireciona para `obrigado.html`.

> Teste local: `npx serve` remove o `.html` e a barra final (`/centrais`), então o redirecionamento local cai em `/obrigado` (404). No GitHub Pages (`/aliar/centrais/`) funciona normal. Para testar sem gerar Doc, interceptar `window.fetch` no console.

---

## Integração Google Drive (Apps Script)

- **Projeto:** "ALIAR - Integração Formulários" (script vinculado a planilha — https://script.google.com/home → "Todos os projetos")
- **URL de implantação:** `https://script.google.com/macros/s/AKfycbz2NhwPbzUfFI5XzJ5mtk9utbqALcQCLdBt3_sS_hafYcpGq-9qPn8Vc6aPdQgijMlx/exec` (hard-coded 1x em cada HTML; ao criar LP nova, declarar `var SCRIPT_URL` uma única vez no topo do `<script>`)
- **Pastas no Drive** (dentro de `[Code] Respostas LP.`):
  - `PASTA_ENTREVISTA = '1_z76Xm_9Jz7guQR4anvEPJnVwjys3IGw'` — https://drive.google.com/drive/folders/1_z76Xm_9Jz7guQR4anvEPJnVwjys3IGw
  - `PASTA_CADASTRO   = '144OpeDuNke782I-NAdSIeCbE23h38j_q'` — https://drive.google.com/drive/folders/144OpeDuNke782I-NAdSIeCbE23h38j_q
  - `PASTA_CENTRAIS_NOME = 'Respostas - Centrais ALIAR'` — sem ID fixo: `obterPastaCentrais()` procura a pasta com esse nome ao lado da `PASTA_CADASTRO` e cria no 1º envio. Dentro dela, `obterPastaCliente()` usa/cria uma pasta por contratante: "<Nome> — <CNPJ>" (reaproveita pelos 14 dígitos do CNPJ no fim do nome). Não renomear essas pastas no Drive (perde o CNPJ do fim → o script cria outra). Pasta das Centrais: https://drive.google.com/drive/folders/1GSrBzTpkbD9JFoFhul80-zlRiJiDYY7w
- **Funções:** `doGet`, `doPost`, `criarDocEntrevista`, `criarDocCadastro`, `criarDocsCentrais`, `criarDocCentral`, `criarResumoImplantacao`, `obterPastaCentrais`, `obterPastaCliente`, `consultarCNPJ`, `salvarArquivoDrive`, `formatarMilhar`, `autorizarPermissoes`, `tc`, `sec`, `linha`
- **Roteamento por `origem`:** `'aliar-formulario-web'` → entrevista; `'aliar-cadastro-contratual'` → cadastro; `'aliar-cadastro-centrais'` → `criarDocsCentrais` (em `doGet` e `doPost`)
- **Centrais:** `criarDocsCentrais` gera **1 Doc por central** na pasta do cliente: "P<prioridade> — <fantasia> — <data>", com Contratante e "Prioridade X de N" no topo + seções 1–4 (dados, volumetria só dos exames marcados, pessoas com função, link do logotipo). Logo salva na mesma pasta como `P<n>_<fantasia>_logotipo_<data>`. **Com 2+ centrais**, `criarResumoImplantacao` gera também "00 — Resumo de Implantação — <contratante> — <data>" (Doc em A4 deitado, para o time de implantação): contratante/CNPJ/data/total + tabela Prioridade · Central (+CNPJ) · Cidade/UF · Exames (volume/mês) · Responsável implantação (nome, celular, e-mail) · link "Abrir Doc". Um resumo novo a cada envio. Com 1 central não gera. **Sem e-mail**. Aceita também o formato antigo (1 central sem `centrais[]`). Não usa serviço novo.
- **Teste local do Code.gs:** dá para rodar com Node simulando DocumentApp/DriveApp/MailApp e o payload capturado da LP — confere as chaves sem gerar Doc real.
- **Entrevista:** gera Doc + seção final "DADOS CNPJ (RECEITA FEDERAL)" via BrasilAPI (`UrlFetchApp`), com `try/catch` que escreve o erro no próprio Doc.
- **Cadastro:** gera Doc (Razão Social | Nome Fantasia, CNPJ, Cidade/Estado, endereço...) e salva os 4 arquivos na `PASTA_CADASTRO`, com links no Doc.
- **Nenhum formulário envia e-mail de alerta** (removido em 09/11/2026 a pedido do Rodrigo: nunca chegava e não é necessário — os clientes avisam). `MailApp` e `EMAIL_ALERTA` saíram do `Code.gs`; não recolocar sem pedido.

### Como atualizar o script (sempre nesta ordem)
1. Editar `apps-script-formularios/Code.gs` neste repo.
2. Colar o arquivo **INTEIRO** no editor do Apps Script (Ctrl+A, apagar, colar). **Nunca colar só uma função** — já substituiu o arquivo todo e derrubou os formulários.
3. Conferir o fim do arquivo: nenhum caractere solto após a última `}` (um "S" solto causou `ReferenceError` e falha em todas as execuções).
4. Se o código passou a usar um serviço novo (`UrlFetchApp`, etc.): selecionar `autorizarPermissoes` no menu ao lado de ▶ Executar, rodar uma vez e aceitar a autorização. Só salvar/implantar NÃO pede essa permissão.
5. Implantar → **Gerenciar implantações** (NUNCA "Nova implantação") → na coluna "Ativo", selecionar a implantação cujo App da Web contém `AKfycbz2NhwPbzUf…Mlx` → lápis → Versão: **Nova versão** → Implantar. Só salvar não atualiza a URL publicada. Em 10/11/2026 a Versão 19 foi parar numa implantação extra (`AKfycbxJft6…Okc7-E`) e as LPs continuaram no código antigo — sempre conferir o código da implantação.
6. Testar. O Doc vai para a pasta certa.

### Diagnóstico rápido
- Painel **Execuções** (ícone ▤▶, não o relógio de "Acionadores"). Status "Falha" com duração < 1 s = erro de sintaxe/carga do arquivo.
- O `doGet` devolve o erro como texto. Chamar o `/exec` com `?data=<base64>` via `curl -L` mostra a mensagem exata (cuidado: se funcionar, cria Doc real).
- Doc "Central ALIAR — Central — <data>" com seções vazias na raiz da pasta das Centrais = o `/exec` ainda roda a versão **antiga** do script (anterior às várias centrais). Conferir se o editor tem `criarDocsCentrais` e se a implantação usada pela LP foi para Nova versão.
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

- **Cadastro de Centrais (várias por envio):** concluído e testado em produção (10/11/2026, Versão 19 do script): pasta "Teste Dr Ficticio — 11.222.333/0001-81" com P1/P2 + logos (dados de teste, podem ser apagados junto com os Docs "Central ALIAR — …" soltos na pasta das Centrais).
- Remote `origin` já reconfigurado sem token (09/11/2026, login via Git Credential Manager). Falta só revogar o token antigo em https://github.com/settings/tokens.
- Submissões feitas durante a janela em que o script esteve quebrado não são recuperáveis (nada foi gravado); pedir reenvio se houver lead real.
- CRM RD Station: integração dos docs gerados com pipeline de negociação.

