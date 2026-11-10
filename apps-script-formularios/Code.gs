const PASTA_ENTREVISTA = '1_z76Xm_9Jz7guQR4anvEPJnVwjys3IGw';
const PASTA_CADASTRO   = '144OpeDuNke782I-NAdSIeCbE23h38j_q';
// Centrais: a pasta é criada automaticamente no 1º envio, ao lado da PASTA_CADASTRO
// (dentro de "[Code] Respostas LP."); dentro dela, uma subpasta por cliente (contratante).
// Nenhum formulário envia e-mail de alerta (removido em 09/11/2026 — nunca chegava e não é necessário).
const PASTA_CENTRAIS_NOME = 'Respostas - Centrais ALIAR';

// ── Title Case: primeira letra de cada palavra em maiúscula (siglas da lista ficam em maiúsculo) ──
const SIGLAS = ['UPA','UBS','UTI','AME','SUS','ECG','MAPA','TI','ME','EPP','EIRELI','SA','S/A','CNPJ','CRM'];
function tc(str) {
  if (!str) return '';
  return String(str).toLowerCase().split(' ').map(function(w) {
    if (SIGLAS.indexOf(w.toUpperCase()) >= 0) return w.toUpperCase();
    return w ? w[0].toUpperCase() + w.slice(1) : w;
  }).join(' ');
}

// ── Texto seguro para nome de arquivo: sem acentos, espaços viram "_" ──
function nomeArquivo(str) {
  return String(str).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\-]+/g, '_');
}

function doGet(e) {
  try {
    var raw   = e.parameter.data || '{}';
    var bytes = Utilities.base64Decode(raw);
    var dados = JSON.parse(Utilities.newBlob(bytes).getDataAsString());
    var tipo  = dados.origem || '';
    if (tipo === 'aliar-formulario-web')           criarDocEntrevista(dados);
    else if (tipo === 'aliar-cadastro-contratual') criarDocCadastro(dados);
    else if (tipo === 'aliar-cadastro-centrais')   criarDocsCentrais(dados);
    return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput('erro: ' + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);
    if (dados.origem === 'aliar-cadastro-contratual')    criarDocCadastro(dados);
    else if (dados.origem === 'aliar-cadastro-centrais') criarDocsCentrais(dados);
    else criarDocEntrevista(dados);
    return ContentService.createTextOutput('OK');
  } catch(err) {
    return ContentService.createTextOutput('Erro: ' + err.message);
  }
}

function criarDocEntrevista(d) {
  const empresa = tc(d.empresa_razao || d.empresa_fantasia || d.nome || 'Lead');
  const titulo  = 'Entrevista ALIAR — ' + empresa + ' — ' + new Date().toLocaleDateString('pt-BR');
  const doc  = DocumentApp.create(titulo);
  const body = doc.getBody();

  body.appendParagraph('ENTREVISTA ALIAR — MAPEAMENTO OPERACIONAL').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Gerado em: ' + new Date().toLocaleString('pt-BR'));
  body.appendHorizontalRule();

  sec(body, 'IDENTIFICAÇÃO');
  linha(body, 'Empresa',   tc(d.empresa_razao || d.empresa_fantasia));
  linha(body, 'CNPJ',      d.cnpj);
  linha(body, 'Nome',      tc(d.nome));
  linha(body, 'E-mail',    d.email);
  linha(body, 'WhatsApp',  d.whatsapp);
  linha(body, 'Área',      tc(d.area));

  sec(body, 'PERFIL DECISÓRIO');
  linha(body, 'Tomador de decisão', tc(d.decisao));
  linha(body, 'Perfil',             tc(d.perfil));
  linha(body, 'Nº funcionários',    d.pessoas);

  sec(body, 'DADOS OPERACIONAIS');
  linha(body, 'Exames realizados', tc((d.exames || []).join(', ')));
  linha(body, 'Telecardiologia',   tc(d.telecardio));

  sec(body, 'VOLUMETRIA E EQUIPAMENTOS');
  const exames = ['ecg','holter','mapa','ergo'];
  const nomes  = {ecg:'ECG', holter:'Holter', mapa:'MAPA', ergo:'T. Ergo'};
  exames.forEach(function(ex) {
    const ap  = d['ap_'+ex]  || '—';
    const vol = d['vol_'+ex] || '—';
    const eq  = tc(d['eq_'+ex]) || '—';
    linha(body, nomes[ex], 'Aparelhos: ' + ap + ' | Exames/mês: ' + vol + ' | Marca: ' + eq);
  });

  sec(body, 'DESAFIOS E EXPECTATIVAS');
  linha(body, 'Desafios',    tc((d.desafios || []).join(', ')));
  linha(body, 'Expectativa', tc(d.expectativa));

  try {
    const cnpjInfo = consultarCNPJ(d.cnpj);
    if (cnpjInfo) {
      sec(body, 'DADOS CNPJ (RECEITA FEDERAL)');
      linha(body, 'Razão Social',          tc(cnpjInfo.razao_social));
      linha(body, 'Nome Fantasia',         tc(cnpjInfo.nome_fantasia));
      linha(body, 'Situação Cadastral',    tc(cnpjInfo.descricao_situacao_cadastral));
      linha(body, 'Data Situação',         cnpjInfo.data_situacao_cadastral);
      linha(body, 'CNAE Principal',        [cnpjInfo.cnae_fiscal, tc(cnpjInfo.cnae_fiscal_descricao)].filter(Boolean).join(' — '));
      linha(body, 'Porte',                 tc(cnpjInfo.descricao_porte));
      linha(body, 'Capital Social',        cnpjInfo.capital_social != null ? 'R$ ' + formatarMilhar(cnpjInfo.capital_social) : '');
      linha(body, 'Município/UF',          [tc(cnpjInfo.municipio), cnpjInfo.uf].filter(Boolean).join('/'));
      linha(body, 'Início de Atividade',   cnpjInfo.data_inicio_atividade);
      if (cnpjInfo.qsa && cnpjInfo.qsa.length) {
        linha(body, 'Sócios', cnpjInfo.qsa.map(function(s) { return tc(s.nome_socio); }).join(', '));
      }
    }
  } catch (errCnpj) {
    Logger.log('Erro na seção CNPJ: ' + errCnpj.toString());
    sec(body, 'DADOS CNPJ (RECEITA FEDERAL)');
    linha(body, 'Erro ao processar', String(errCnpj));
  }

  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(DriveApp.getFolderById(PASTA_ENTREVISTA));
}

function criarDocCadastro(d) {
  const emp     = d.empresa || {};
  const end     = d.endereco || {};
  const empresa = tc(d.nome_fantasia || emp.razao_social || d.cnpj || 'Empresa');
  const titulo  = 'Cadastro ALIAR — ' + empresa + ' — ' + new Date().toLocaleDateString('pt-BR');
  const doc  = DocumentApp.create(titulo);
  const body = doc.getBody();

  body.appendParagraph('CADASTRO ALIAR — DADOS CONTRATUAIS').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Gerado em: ' + new Date().toLocaleString('pt-BR'));
  body.appendHorizontalRule();

  sec(body, 'DADOS DA EMPRESA');

  // Razão Social | Nome Fantasia — na mesma linha
  const cidadeUF   = [tc(end.cidade), (end.estado || '').toUpperCase()].filter(Boolean).join('/');
  const razaoLinha = [tc(emp.razao_social), tc(d.nome_fantasia)].filter(Boolean).join(' | ');
  linha(body, 'Razão Social',      razaoLinha);

  linha(body, 'CNPJ',              emp.cnpj);
  linha(body, 'Cidade/Estado',     cidadeUF);
  linha(body, 'Tipo de Serviço',   tc(emp.tipo_servico));
  linha(body, 'Nº Funcionários',   emp.num_funcionarios);
  linha(body, 'Vencimento Boleto', 'Dia ' + (emp.vencimento_boleto || '—'));
  linha(body, 'Endereço', [tc(end.logradouro), end.numero, tc(end.complemento), tc(end.bairro), tc(end.cidade), (end.estado || '').toUpperCase()].filter(Boolean).join(', '));

  sec(body, 'REPRESENTANTE(S) LEGAL');
  (d.representantes_legais || []).forEach(function(r, i) {
    body.appendParagraph('Representante ' + (i+1)).setBold(true);
    linha(body, 'Nome',       tc(r.nome));
    linha(body, 'Nascimento', r.nascimento);
    linha(body, 'E-mail',     r.email);
    linha(body, 'Celular',    r.celular);
  });

  const responsaveis = [
    { label: 'RESPONSÁVEL MÉDICO',      key: 'responsavel_medico' },
    { label: 'RESPONSÁVEL FINANCEIRO',  key: 'responsavel_financeiro' },
    { label: 'RESPONSÁVEL SUPORTE',     key: 'responsavel_suporte' },
    { label: 'RESPONSÁVEL IMPLANTAÇÃO', key: 'responsavel_implantacao' },
    { label: 'RESPONSÁVEL ENFERMAGEM',  key: 'responsavel_enfermagem' },
  ];
  responsaveis.forEach(function(item) {
    const r = d[item.key];
    if (!r) return;
    sec(body, item.label);
    linha(body, 'Nome',       tc(r.nome));
    linha(body, 'Nascimento', r.nascimento);
    linha(body, 'E-mail',     r.email);
    linha(body, 'Celular',    r.celular);
    if (item.key === 'responsavel_medico') linha(body, 'CRM', (r.crm || '—') + ' — ' + (r.crm_uf || '').toUpperCase());
  });

  // ── DOCUMENTOS — salva cada arquivo enviado (base64) no Drive ──
  const docsInfo = [
    { key: 'logotipo',        label: 'Logotipo',                  mime: 'image/png' },
    { key: 'cartao_cnpj',     label: 'Cartão CNPJ',                mime: 'application/pdf' },
    { key: 'contrato_social', label: 'Contrato Social',            mime: 'application/pdf' },
    { key: 'alt_contrato',    label: 'Alteração Contrato Social',  mime: 'application/pdf' },
  ];
  const documentos = d.documentos || {};
  const docsSalvos = [];
  docsInfo.forEach(function(info) {
    const b64 = documentos[info.key];
    if (!b64) return;
    const url = salvarArquivoDrive(
      b64,
      documentos[info.key + '_nome'] || info.key,
      documentos[info.key + '_tipo'] || info.mime,
      empresa.replace(/[^\w\-]+/g, '_') + '_' + info.key,
      PASTA_CADASTRO
    );
    if (url) docsSalvos.push({ label: info.label, url: url });
  });

  if (docsSalvos.length) {
    sec(body, 'DOCUMENTOS ANEXADOS');
    docsSalvos.forEach(function(item) {
      const p = body.appendParagraph('');
      p.appendText(item.label + ': ').setBold(true);
      p.appendText(item.url).setLinkUrl(item.url);
    });
  }

  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(DriveApp.getFolderById(PASTA_CADASTRO));
}

// ── Centrais: um envio traz a contratante (empresa do médico) + N centrais em ordem de prioridade.
// Gera 1 Doc por central dentro da pasta do cliente (contratante) e, com 2+ centrais,
// um Doc-resumo para o time de implantação. Sem e-mail de alerta.
function criarDocsCentrais(d) {
  // Formato antigo (1 central por envio, sem contratante) continua aceito
  if (!d.centrais) d = { contratante: {}, centrais: [Object.assign({ prioridade: 1 }, d)] };
  const ct    = d.contratante || {};
  const pasta = obterPastaCliente(ct);
  const total = d.centrais.length;
  const links = d.centrais.map(function(c, i) {
    return criarDocCentral(c, ct, c.prioridade || (i + 1), total, pasta);
  });
  if (total >= 2) criarResumoImplantacao(ct, d.centrais, links, pasta);
}

// ── Resumo para o time de implantação: 1 linha por central, na ordem de prioridade ──
function criarResumoImplantacao(ct, centrais, links, pasta) {
  const cliente = tc(ct.nome_fantasia || ct.razao_social || 'Cliente');
  const doc  = DocumentApp.create('00 — Resumo de Implantação — ' + cliente + ' — ' + new Date().toLocaleDateString('pt-BR'));
  const body = doc.getBody();
  body.setPageWidth(842).setPageHeight(595);   // A4 deitado: cabe a tabela
  body.setMarginLeft(36).setMarginRight(36).setMarginTop(36).setMarginBottom(36);

  body.appendParagraph('RESUMO DE IMPLANTAÇÃO — CENTRAIS ALIAR').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  linha(body, 'Contratante',       [tc(ct.razao_social), tc(ct.nome_fantasia)].filter(Boolean).join(' | '));
  linha(body, 'CNPJ',              ct.cnpj);
  linha(body, 'Data do envio',     new Date().toLocaleString('pt-BR'));
  linha(body, 'Total de centrais', String(centrais.length));
  body.appendParagraph('');

  const nomesEx = {ecg:'ECG', holter:'Holter', mapa:'MAPA', ergo:'T. Ergo'};
  const linhas = [['Prioridade', 'Central', 'Cidade/UF', 'Exames (volume/mês)', 'Responsável implantação', 'Doc completo']];
  centrais.forEach(function(c, i) {
    const cen = c.central || {};
    const end = c.endereco || {};
    const exames = ['ecg','holter','mapa','ergo']
      .filter(function(ex) { return c['ap_'+ex] || c['vol_'+ex]; })
      .map(function(ex) { return nomesEx[ex] + ': ' + (c['vol_'+ex] || '—'); }).join('\n');
    const resp = (c.pessoas || [])
      .filter(function(p) { return p.funcao === 'Responsável implantação'; })
      .map(function(p) { return tc(p.nome) + '\n' + (p.celular || '') + '\n' + (p.email || ''); }).join('\n\n');
    linhas.push([
      'P' + (c.prioridade || (i + 1)),
      tc(cen.nome_fantasia || cen.razao_social) + (cen.cnpj ? '\n' + cen.cnpj : ''),
      [tc(end.cidade), (end.estado || '').toUpperCase()].filter(Boolean).join('/'),
      exames || '—',
      resp || '—',
      links[i] ? 'Abrir Doc' : '—'
    ]);
  });

  const tabela = body.appendTable(linhas);
  tabela.getRow(0).editAsText().setBold(true);
  // Larguras (pt, somam a área útil de 770): Prioridade, Central, Cidade/UF, Exames, Responsável, Doc
  [55, 215, 95, 95, 255, 55].forEach(function(w, i) { tabela.setColumnWidth(i, w); });
  for (let r = 1; r < tabela.getNumRows(); r++) {
    if (links[r - 1]) tabela.getCell(r, 5).editAsText().setLinkUrl(links[r - 1]);
  }
  body.appendParagraph('');
  body.appendParagraph('Endereço completo, demais pessoas e logotipo de cada central estão no Doc completo (P1, P2…) desta mesma pasta.').setItalic(true);

  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(pasta);
}

function criarDocCentral(d, ct, prioridade, total, pasta) {
  const c       = d.central || {};
  const end     = d.endereco || {};
  const pessoas = d.pessoas || [];
  const central = tc(c.nome_fantasia || c.razao_social || c.cnpj || 'Central');
  const titulo  = 'P' + prioridade + ' — ' + central + ' — ' + new Date().toLocaleDateString('pt-BR');
  const doc  = DocumentApp.create(titulo);
  const body = doc.getBody();

  body.appendParagraph('CADASTRO DE CENTRAL ALIAR').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  linha(body, 'Contratante', [tc(ct.nome_fantasia || ct.razao_social), ct.cnpj].filter(Boolean).join(' — '));
  linha(body, 'Prioridade de implantação', prioridade + ' de ' + total);
  body.appendParagraph('Gerado em: ' + new Date().toLocaleString('pt-BR'));
  body.appendHorizontalRule();

  sec(body, '1. DADOS DA CENTRAL');
  const cidadeUF = [tc(end.cidade), (end.estado || '').toUpperCase()].filter(Boolean).join('/');
  linha(body, 'Razão Social',    [tc(c.razao_social), tc(c.nome_fantasia)].filter(Boolean).join(' | '));
  linha(body, 'CNPJ',            c.cnpj);
  linha(body, 'Tipo de Serviço', tc(c.tipo_servico));
  linha(body, 'Cidade/Estado',   cidadeUF);
  linha(body, 'Endereço', [tc(end.logradouro), end.numero, tc(end.complemento), tc(end.bairro), tc(end.cidade), (end.estado || '').toUpperCase()].filter(Boolean).join(', '));
  linha(body, 'CEP',             end.cep);

  sec(body, '2. EXAMES E VOLUMETRIA');
  linha(body, 'Exames realizados', (d.exames || []).join(', '));
  const exames = ['ecg','holter','mapa','ergo'];
  const nomes  = {ecg:'ECG', holter:'Holter', mapa:'MAPA', ergo:'T. Ergo'};
  exames.forEach(function(ex) {
    if (!d['ap_'+ex] && !d['vol_'+ex]) return;   // só os exames marcados na LP
    const ap  = d['ap_'+ex]  || '—';
    const vol = d['vol_'+ex] || '—';
    const eq  = tc(d['eq_'+ex]) || '—';
    linha(body, nomes[ex], 'Aparelhos: ' + ap + ' | Exames/mês: ' + vol + ' | Marca: ' + eq);
  });

  sec(body, '3. PESSOAS ENVOLVIDAS NA IMPLANTAÇÃO');
  pessoas.forEach(function(p, i) {
    body.appendParagraph('Pessoa ' + (i+1) + ' — ' + tc(p.funcao)).setBold(true);
    linha(body, 'Nome',       tc(p.nome));
    linha(body, 'Nascimento', p.nascimento);
    linha(body, 'E-mail',     p.email);
    linha(body, 'Celular',    p.celular);
  });

  // ── LOGOTIPO desta central — salvo na pasta do cliente, com prioridade e nome no arquivo ──
  const logo = d.logotipo || {};
  let logoUrl = '';
  if (logo.b64) {
    logoUrl = salvarArquivoDrive(
      logo.b64,
      logo.nome || 'logotipo',
      logo.tipo || 'image/png',
      'P' + prioridade + '_' + nomeArquivo(central) + '_logotipo',
      pasta.getId()
    );
  }
  if (logoUrl) {
    sec(body, '4. LOGOTIPO');
    const p = body.appendParagraph('');
    p.appendText('Logotipo: ').setBold(true);
    p.appendText(logoUrl).setLinkUrl(logoUrl);
  }

  doc.saveAndClose();
  const arquivo = DriveApp.getFileById(doc.getId());
  arquivo.moveTo(pasta);
  return arquivo.getUrl();
}

// ── Pasta das Centrais: procura "Respostas - Centrais ALIAR" ao lado da PASTA_CADASTRO; cria se não existir ──
function obterPastaCentrais() {
  const pai = DriveApp.getFolderById(PASTA_CADASTRO).getParents().next();
  const existentes = pai.getFoldersByName(PASTA_CENTRAIS_NOME);
  return existentes.hasNext() ? existentes.next() : pai.createFolder(PASTA_CENTRAIS_NOME);
}

// ── Pasta do cliente (contratante) dentro da pasta das Centrais: "<Nome> — <CNPJ>".
// Reaproveita a pasta se o mesmo CNPJ enviar de novo (compara só os dígitos do fim do nome).
function obterPastaCliente(ct) {
  const raiz    = obterPastaCentrais();
  const digitos = String(ct.cnpj || '').replace(/\D/g, '');
  if (digitos) {
    const pastas = raiz.getFolders();
    while (pastas.hasNext()) {
      const f = pastas.next();
      if (f.getName().replace(/\D/g, '').slice(-14) === digitos) return f;
    }
  }
  const nome = [tc(ct.nome_fantasia || ct.razao_social || 'Cliente sem CNPJ'), ct.cnpj].filter(Boolean).join(' — ');
  return raiz.createFolder(nome);
}

// ── Formata número com separador de milhar (sem depender de Intl/toLocaleString) ──
function formatarMilhar(valor) {
  var num = Math.round(Number(valor));
  if (isNaN(num)) return String(valor);
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ── Rode esta função manualmente (▶ Executar, com "autorizarPermissoes"
// selecionado no menu ao lado do botão) UMA VEZ para conceder ao script
// a permissão de acessar sites externos (necessária pra consultarCNPJ).
// A tela de autorização do Google vai aparecer — clique em "Revisar
// permissões" → escolha a conta → "Avançado" → "Acessar [projeto] (não seguro)".
function autorizarPermissoes() {
  UrlFetchApp.fetch('https://brasilapi.com.br/api/cnpj/v1/00000000000191', { muteHttpExceptions: true });
}

// ── Consulta CNPJ na BrasilAPI (pública e gratuita, sem chave) ──
// Propositalmente NÃO engole erros aqui — quem chama (criarDocEntrevista)
// tem um try/catch que escreve a mensagem de erro direto no Doc, para diagnóstico.
function consultarCNPJ(cnpj) {
  if (!cnpj) throw new Error('CNPJ vazio no formulário');
  var numeros = String(cnpj).replace(/\D/g, '');
  if (numeros.length !== 14) throw new Error('CNPJ com formato inválido: "' + cnpj + '" (' + numeros.length + ' dígitos após limpar)');
  var resp = UrlFetchApp.fetch('https://brasilapi.com.br/api/cnpj/v1/' + numeros, { muteHttpExceptions: true });
  var status = resp.getResponseCode();
  if (status !== 200) {
    throw new Error('BrasilAPI retornou status ' + status + ': ' + resp.getContentText().substring(0, 300));
  }
  return JSON.parse(resp.getContentText());
}

// ── Salva um arquivo (base64) em uma pasta do Drive e retorna a URL ──
function salvarArquivoDrive(base64, nomeOriginal, mimeType, prefixo, pastaId) {
  try {
    var extensao = String(nomeOriginal).split('.').pop() || 'bin';
    var nomeArquivo = prefixo + '_' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd_HHmmss') + '.' + extensao;
    var bytes = Utilities.base64Decode(base64);
    var blob  = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', nomeArquivo);
    var pasta = DriveApp.getFolderById(pastaId);
    var arquivo = pasta.createFile(blob);
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return arquivo.getUrl();
  } catch (err) {
    Logger.log('Erro ao salvar arquivo: ' + err.toString());
    return '';
  }
}

// ── helpers ──
function sec(body, titulo) {
  body.appendParagraph('');
  body.appendParagraph(titulo).setHeading(DocumentApp.ParagraphHeading.HEADING2);
}
function linha(body, campo, valor) {
  if (!valor) return;
  const p = body.appendParagraph('');
  p.appendText(campo + ': ').setBold(true);
  p.appendText(String(valor)).setBold(false);
}
