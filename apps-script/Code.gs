const PASTA_ENTREVISTA = '1_z76Xm_9Jz7guQR4anvEPJnVwjys3IGw';
const PASTA_CADASTRO   = '144OpeDuNke782I-NAdSIeCbE23h38j_q';
const EMAIL_ALERTA     = 'rodrigo.aramis@ecgnow.com.br';

// ── Title Case: primeira letra de cada palavra em maiúscula ──
function tc(str) {
  if (!str) return '';
  return String(str).toLowerCase().split(' ').map(function(w) {
    return w ? w[0].toUpperCase() + w.slice(1) : w;
  }).join(' ');
}

function doGet(e) {
  try {
    var raw   = e.parameter.data || '{}';
    var bytes = Utilities.base64Decode(raw);
    var dados = JSON.parse(Utilities.newBlob(bytes).getDataAsString());
    var tipo  = dados.origem || '';
    if (tipo === 'aliar-formulario-web')           criarDocEntrevista(dados);
    else if (tipo === 'aliar-cadastro-contratual') criarDocCadastro(dados);
    return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput('erro: ' + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);
    if (dados.origem === 'aliar-cadastro-contratual') criarDocCadastro(dados);
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

  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(DriveApp.getFolderById(PASTA_ENTREVISTA));

  MailApp.sendEmail({
    to:      EMAIL_ALERTA,
    subject: '🔔 Novo Entendimento ALIAR — ' + empresa,
    body:    'Nome: ' + tc(d.nome || '—') + '\nEmpresa: ' + (empresa || '—') + '\nCNPJ: ' + (d.cnpj || '—') + '\nE-mail: ' + (d.email || '—') + '\nWhatsApp: ' + (d.whatsapp || '—') + '\nÁrea: ' + tc(d.area || '—') + '\n\nPreenchido em: ' + new Date().toLocaleString('pt-BR')
  });
}

function criarDocCadastro(d) {
  const emp     = d.empresa || {};
  const empresa = tc(emp.nome_fantasia || emp.razao_social || d.cnpj || 'Empresa');
  const titulo  = 'Cadastro ALIAR — ' + empresa + ' — ' + new Date().toLocaleDateString('pt-BR');
  const doc  = DocumentApp.create(titulo);
  const body = doc.getBody();

  body.appendParagraph('CADASTRO ALIAR — DADOS CONTRATUAIS').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Gerado em: ' + new Date().toLocaleString('pt-BR'));
  body.appendHorizontalRule();

  sec(body, 'DADOS DA EMPRESA');

  // Razão Social | Nome Fantasia | Cidade/UF — na mesma linha
  const cidadeUF   = [tc(emp.cidade), (emp.estado || '').toUpperCase()].filter(Boolean).join('/');
  const razaoLinha = [tc(emp.razao_social), tc(emp.nome_fantasia), cidadeUF].filter(Boolean).join(' | ');
  linha(body, 'Razão Social',      razaoLinha);

  linha(body, 'CNPJ',              emp.cnpj);
  linha(body, 'Tipo de Serviço',   tc(emp.tipo_servico));
  linha(body, 'Nº Funcionários',   emp.num_funcionarios);
  linha(body, 'Vencimento Boleto', 'Dia ' + (emp.vencimento_boleto || '—'));
  linha(body, 'Endereço', [tc(emp.logradouro), emp.numero, tc(emp.complemento), tc(emp.bairro), tc(emp.cidade), (emp.estado || '').toUpperCase()].filter(Boolean).join(', '));

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

  MailApp.sendEmail({
    to:      EMAIL_ALERTA,
    subject: '🔔 Novo Cadastro ALIAR — ' + empresa,
    body:    'Empresa: ' + (empresa || '—') + '\nCNPJ: ' + (emp.cnpj || '—') + '\nCidade: ' + cidadeUF +
             (docsSalvos.length ? '\n\nDocumentos:\n' + docsSalvos.map(function(x) { return '- ' + x.label + ': ' + x.url; }).join('\n') : '') +
             '\n\nPreenchido em: ' + new Date().toLocaleString('pt-BR')
  });
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
