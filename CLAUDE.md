# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estrutura do projeto

```
[ALIAR] Automação Operacional/
  LP - Entrevista/
    index.html        — Formulário de mapeamento operacional (lead)
  LP - Cadastro/
    cadastro.html     — Formulário contratual (dados cadastrais completos)
    obrigado.html     — Página de agradecimento pós-cadastro
  formulario/         — Pasta legada (não usar — versão anterior dos arquivos)
```

> **Importante:** os arquivos HTML contêm logos em base64 e ultrapassam 200 KB. Sempre use `Read` antes de qualquer `Edit`. Para alterações em blocos grandes, prefira scripts Python com `str.replace` ou `re.sub`.

Todos os arquivos são **single-file** (HTML + CSS + JS inline, sem framework, sem build step). Abertos diretamente pelo navegador via `file://`.

---

## Identidade visual (CSS custom properties)

Definidas em `:root` no topo de cada arquivo:

```css
--gold: #8d7a52        --gold-light: #a89877    --gold-dark: #6b5a3e
--border: rgba(141,122,82,0.35)   /* bordas em todos os elementos */
--bg-primary: #0c0a07  --bg-card: #161e2e       --bg-input: #0e1520
```

Títulos de cards (`section-title`, `sec-header`) e bordas de selects usam tom ouro. Labels de campos ficam em branco.

---

## LP - Entrevista / index.html

**Seções:** Identificação → Perfil Decisório → Dados Operacionais → Perfil da Empresa

**CNPJ lookup:** `XMLHttpRequest` → `https://brasilapi.com.br/api/cnpj/v1/{14digitos}`. Dispara em `input`, `paste` e `blur`. Exibe card de confirmação `.cnpj-confirm` ao lado do campo. Os valores de razão social e nome fantasia ficam nos elementos `#cnpj-razao` e `#cnpj-fantasia`.

**Popup de fabricantes (`fabData`):** objeto JS que mapeia cada exame (`eq-ecg`, `eq-holter`, `eq-mapa`, `eq-ergo`) para label + lista de chips. Alterar fabricantes = editar apenas esse objeto.

**Volumetria:** tabela com 4 colunas — Exame | Qtd. Aparelhos | Qtd. Exames/Mês | Marca dos Aparelhos.

**Payload de submit** inclui: `nome`, `email`, `whatsapp`, `cnpj`, `empresa_razao`, `empresa_fantasia`, `area`, `decisao`, `perfil`, `pessoas`, `exames[]`, `telecardio`, `desafios[]`, `expectativa`, campos de volumetria (`ap_ecg`, `vol_ecg`, `eq_ecg`, etc.), `timestamp`, `origem: 'aliar-formulario-web'`.

**Pós-submit:** oculta o form, exibe `#successBox` inline (não redireciona).

---

## LP - Cadastro / cadastro.html

**Seções:** Dados da Empresa → Representante Legal (dinâmico) → Responsável Médico → Financeiro / Suporte / Implantação / Enfermagem → Documentos

**CNPJ:** paste + botão "Consultar" → BrasilAPI → auto-preenche razão social, nome fantasia e endereço completo.

**CEP:** botão "Buscar" → `https://brasilapi.com.br/api/cep/v1/{cep8digitos}` → preenche logradouro, bairro, cidade, estado.

**Representante Legal dinâmico:** `addRepresentante()` / `removeRepresentante()`. Campos com padrão `rep_{idx}_campo`.

**Botões "Igual a":** `idemCopy(target, source)` copia nome/nascimento/email/celular entre prefixos. Prefixos: `rep_0`, `med`, `fin`, `sup`, `imp`, `enf`.

**Responsável Médico:** campos exclusivos `med_crm` e `med_crm_uf`. Layout da linha usa `.three-col` (`grid-template-columns: 2fr 1fr 1fr; grid-column: 1 / -1`).

**Uploads:** drag-and-drop + FileReader → base64 em `input._b64`. Campos: logotipo, cartão CNPJ, contrato social, alteração contrato social. ⚠️ Os binários são **removidos** do payload antes do envio (substituídos por `'(arquivo enviado)'`) para não estourar o limite de URL. Upload real de arquivos para o Drive só funcionará quando as LPs estiverem hospedadas em servidor.

**Pós-submit:** salva logos no `sessionStorage` e redireciona para `obrigado.html`.

---

## Integração Google Drive (Apps Script)

Os formulários enviam dados via **GET** com payload JSON em base64 na URL:

```javascript
const _enc = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
fetch(SCRIPT_URL + '?data=' + encodeURIComponent(_enc), { mode: 'no-cors' });
```

**Por que GET e não POST:** o endpoint `/exec` do Apps Script retorna HTTP 302, que browsers convertem POST→GET perdendo o body. Com GET o redirect é transparente.

**Apps Script:**
- **URL:** `https://script.google.com/macros/s/AKfycbz2NhwPbzUfFI5XzJ5mtk9utbqALcQCLdBt3_sS_hafYcpGq-9qPn8Vc6aPdQgijMlx/exec`
- **Projeto:** "ALIAR - Integração Formulários" (script vinculado a planilha — acessar via script.google.com → Todos os projetos)
- **Pastas no Drive:**
  - `PASTA_ENTREVISTA = '1_z76Xm_9Jz7guQR4anvEPJnVwjys3IGw'`
  - `PASTA_CADASTRO   = '144OpeDuNke782I-NAdSIeCbE23h38j_q'`
- **Funções:** `doGet` (principal), `doPost` (fallback), `criarDocEntrevista`, `criarDocCadastro`, `sec`, `linha`
- **Roteamento:** campo `origem` — `'aliar-formulario-web'` → entrevista, `'aliar-cadastro-contratual'` → cadastro
- **Naming dos docs:** `empresa_fantasia || empresa_razao || cnpj || nome`
- Após qualquer alteração no script, reimplantar como **Nova versão** em Implantar → Gerenciar implantações

---

## APIs externas

| Serviço | Endpoint |
|---------|----------|
| BrasilAPI CNPJ | `https://brasilapi.com.br/api/cnpj/v1/{cnpj14}` |
| BrasilAPI CEP  | `https://brasilapi.com.br/api/cep/v1/{cep8}`   |

---

## Próximos passos previstos

- **Hospedagem:** publicar LPs (Netlify ou servidor) para obter URL pública compartilhável com clientes e habilitar upload real de arquivos ao Drive
- **CRM RD Station:** integração dos docs gerados com pipeline de negociação
- **Webhook Make.com:** automações pós-preenchimento
