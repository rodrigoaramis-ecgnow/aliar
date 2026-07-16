// ============================================================
// ECGNow / ALIAR — Cadastro e Marketplace de Médicos
// Google Apps Script — Web App
// ============================================================

var CONFIG = {
  SHEET_ID:           '1XSoRN2aRY39MHSfm5d3n4hAQ_UAMqaWTIMVhTCq9fzM',
  DOCS_FOLDER_ID:     '1f7bGljhMj9Hm25tzk3lr7u8qrZLcmhlh',
  RD_TOKEN:           '67f7a640a229010019e06586',
  RD_PIPELINE_ID:     '6751bcaac79cfd001f457eb9', // [Closer] TD
  RD_CAMPO_INDICACAO: 'Instituição SAAS',
};

// ── ROTEAMENTO ──────────────────────────────────────────────

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  try {
    if (action === 'indicacoes') return getIndicacoes();
    return getMedicos();
  } catch (err) {
    Logger.log('Erro doGet [' + action + ']: ' + err.toString());
    return resposta(false, 'Erro interno: ' + err.toString());
  }
}

function doPost(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  try {
    if (action === 'salvar-depara') return salvarDepara(e);
    return cadastrarMedico(e);
  } catch (err) {
    Logger.log('Erro doPost [' + action + ']: ' + err.toString());
    return resposta(false, 'Erro interno: ' + err.toString());
  }
}

// ── MÉDICOS — GET ────────────────────────────────────────────

function getMedicos() {
  var ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sheet = ss.getSheetByName('Médicos');
  if (!sheet || sheet.getLastRow() <= 1) return resposta(true, 'OK', []);

  var dados     = sheet.getDataRange().getValues();
  var cabecalhos = dados[0];
  var medicos   = dados.slice(1).map(function(linha) {
    var obj = {};
    cabecalhos.forEach(function(col, i) {
      obj[col] = linha[i] !== undefined ? linha[i] : '';
    });
    return obj;
  });

  return resposta(true, 'OK', medicos);
}

// ── MÉDICOS — POST (cadastro) ────────────────────────────────

function cadastrarMedico(e) {
  var data = JSON.parse(e.postData.contents);

  var validacao = validarCamposObrigatorios(data);
  if (!validacao.ok) return resposta(false, validacao.mensagem);

  var ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sheet = getOuCriarAba(ss, 'Médicos');

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(getCabecalhos());
    sheet.getRange(1, 1, 1, getCabecalhos().length).setFontWeight('bold');
  }

  var fotoUrl   = '';
  var crmDocUrl = '';

  if (data.foto_base64 && data.foto_nome) {
    fotoUrl = salvarArquivoDrive(
      data.foto_base64, sanitizar(data.foto_nome),
      data.foto_tipo || 'image/jpeg', sanitizar(data.nome) + '_foto'
    );
  }

  if (data.crm_doc_base64 && data.crm_doc_nome) {
    crmDocUrl = salvarArquivoDrive(
      data.crm_doc_base64, sanitizar(data.crm_doc_nome),
      'application/pdf', sanitizar(data.nome) + '_crm'
    );
  }

  sheet.appendRow(construirLinha(data, fotoUrl, crmDocUrl));
  return resposta(true, 'Cadastro realizado com sucesso!');
}

// ── INDICAÇÕES — GET ─────────────────────────────────────────

function getIndicacoes() {
  var deals  = buscarDealsGanhos();
  var depara = lerDepara();
  var grupos = {};

  deals.forEach(function(deal) {
    var apelido = '';
    (deal.deal_custom_fields || []).forEach(function(cf) {
      if (cf.custom_field &&
          cf.custom_field.label === CONFIG.RD_CAMPO_INDICACAO &&
          cf.value) {
        apelido = String(cf.value).trim();
      }
    });
    if (!apelido) return;

    if (!grupos[apelido]) {
      grupos[apelido] = {
        apelido:     apelido,
        nome_medico: depara[apelido] || '',
        total:       0,
        deals:       []
      };
    }
    grupos[apelido].total++;
    grupos[apelido].deals.push({
      nome:       sanitizar(deal.name || ''),
      fechado_em: deal.closed_at || '',
      valor:      deal.amount_montly || deal.amount_total || 0
    });
  });

  var resultado = Object.values(grupos).sort(function(a, b) {
    return b.total - a.total;
  });

  return resposta(true, 'OK', resultado);
}

function buscarDealsGanhos() {
  var allDeals = [];
  var page     = 1;
  var MAX_PAGES = 20;

  while (page <= MAX_PAGES) {
    var url = 'https://crm.rdstation.com/api/v1/deals' +
      '?token='            + CONFIG.RD_TOKEN +
      '&deal_pipeline_id=' + CONFIG.RD_PIPELINE_ID +
      '&limit=200&page='   + page;

    var resp  = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) break;

    var data  = JSON.parse(resp.getContentText());
    var batch = (data.deals || []).filter(function(d) { return d.win === true; });
    allDeals  = allDeals.concat(batch);

    if (!data.has_more || (data.deals || []).length === 0) break;
    page++;
  }

  return allDeals;
}

// ── DE-PARA ──────────────────────────────────────────────────

function lerDepara() {
  var ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sheet = ss.getSheetByName('De-Para');
  if (!sheet || sheet.getLastRow() <= 1) return {};

  var mapa = {};
  sheet.getDataRange().getValues().slice(1).forEach(function(row) {
    if (row[0]) mapa[String(row[0]).trim()] = String(row[1] || '').trim();
  });
  return mapa;
}

function salvarDepara(e) {
  var data     = JSON.parse(e.postData.contents);
  var entradas = data.entradas || [];

  var ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sheet = getOuCriarAba(ss, 'De-Para');

  sheet.clearContents();
  sheet.appendRow(['CRM Apelido', 'Nome no Cadastro']);
  sheet.getRange(1, 1, 1, 2).setFontWeight('bold');

  entradas.forEach(function(entry) {
    if (entry.apelido) {
      sheet.appendRow([sanitizar(entry.apelido), sanitizar(entry.nome_medico || '')]);
    }
  });

  return resposta(true, 'De-Para salvo com sucesso!');
}

// ── HELPERS ──────────────────────────────────────────────────

function validarCamposObrigatorios(data) {
  var obrigatorios = ['nome', 'crm', 'rqe', 'formacao', 'instituicao_grad',
    'especializacao', 'instituicao_esp', 'cnpj', 'razao_social',
    'telefone', 'email', 'estado', 'horario'];

  for (var i = 0; i < obrigatorios.length; i++) {
    var campo = obrigatorios[i];
    if (!data[campo] || String(data[campo]).trim() === '') {
      return { ok: false, mensagem: 'Campo obrigatório ausente: ' + campo };
    }
  }

  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { ok: false, mensagem: 'E-mail inválido.' };
  }

  return { ok: true };
}

function salvarArquivoDrive(base64, nomeOriginal, mimeType, prefixo) {
  try {
    var extensao    = nomeOriginal.split('.').pop();
    var nomeArquivo = prefixo + '_' +
      Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd_HHmmss') +
      '.' + extensao;
    var bytes   = Utilities.base64Decode(base64);
    var blob    = Utilities.newBlob(bytes, mimeType, nomeArquivo);
    var pasta   = DriveApp.getFolderById(CONFIG.DOCS_FOLDER_ID);
    var arquivo = pasta.createFile(blob);
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return arquivo.getUrl();
  } catch (err) {
    Logger.log('Erro ao salvar arquivo: ' + err.toString());
    return '';
  }
}

function getOuCriarAba(ss, nomeAba) {
  var sheet = ss.getSheetByName(nomeAba);
  if (!sheet) sheet = ss.insertSheet(nomeAba);
  return sheet;
}

function getCabecalhos() {
  return [
    'Data Cadastro', 'Nome', 'CRM', 'RQE', 'Formação (Grad.)', 'Instituição Grad.',
    'Especialização', 'Instituição Esp.', 'CNPJ', 'Razão Social', 'Telefone', 'E-mail', 'Estado',
    'Exames',
    'ECG Valor Amb (R$)', 'ECG SLA Amb', 'ECG Valor Emerg (R$)', 'ECG SLA Emerg',
    'Holter Valor Amb (R$)', 'Holter SLA Amb', 'Holter Valor Emerg (R$)', 'Holter SLA Emerg',
    'MAPA Valor Amb (R$)', 'MAPA SLA Amb', 'MAPA Valor Emerg (R$)', 'MAPA SLA Emerg',
    'TE Valor Amb (R$)', 'TE SLA Amb', 'TE Valor Emerg (R$)', 'TE SLA Emerg',
    'Horário', 'Dias Atendimento',
    'Foto URL', 'CRM Doc URL'
  ];
}

function construirLinha(data, fotoUrl, crmDocUrl) {
  var ex     = data.exames || {};
  var ecg    = ex.ecg    || {};
  var holter = ex.holter || {};
  var mapa   = ex.mapa   || {};
  var te     = ex.te     || {};

  return [
    Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'),
    sanitizar(data.nome),
    sanitizar(data.crm),
    sanitizar(data.rqe),
    sanitizar(data.formacao),
    sanitizar(data.instituicao_grad),
    sanitizar(data.especializacao),
    sanitizar(data.instituicao_esp),
    sanitizar(data.cnpj),
    sanitizar(data.razao_social),
    sanitizar(data.telefone),
    sanitizar(data.email),
    sanitizar(data.estado),
    sanitizar((data.exames_selecionados || []).join(', ')),
    sanitizar(ecg.valor_amb),      sanitizar(ecg.sla_amb),
    sanitizar(ecg.valor_emerg),    sanitizar(ecg.sla_emerg),
    sanitizar(holter.valor_amb),   sanitizar(holter.sla_amb),
    sanitizar(holter.valor_emerg), sanitizar(holter.sla_emerg),
    sanitizar(mapa.valor_amb),     sanitizar(mapa.sla_amb),
    sanitizar(mapa.valor_emerg),   sanitizar(mapa.sla_emerg),
    sanitizar(te.valor_amb),       sanitizar(te.sla_amb),
    sanitizar(te.valor_emerg),     sanitizar(te.sla_emerg),
    sanitizar(data.horario),
    sanitizar((data.dias || []).join(', ')),
    fotoUrl,
    crmDocUrl,
  ];
}

function sanitizar(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/<[^>]*>/g, '').trim().substring(0, 1000);
}

function resposta(sucesso, mensagem, dados) {
  var payload = JSON.stringify({
    success: sucesso,
    message: mensagem,
    data:    dados !== undefined ? dados : null
  });
  return ContentService.createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}
