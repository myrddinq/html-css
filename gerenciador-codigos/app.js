(() => {
  const CHAVE = 'gerenciador-codigos.v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const form = $('#editor');
  const iframe = $('#previa');
  const saidaCodigo = $('#codigo');

  const NOMES_TIPO = { texto: 'Texto', cartoes: 'Cartões', ressonancia: 'Régua', html: 'HTML livre' };
  const abertos = new Set(['geral', 'cabecalho']);
  const filtros = {};
  let focarDepois = null;

  /* ---------- Dados ---------- */

  function carregar() {
    try {
      const d = JSON.parse(localStorage.getItem(CHAVE));
      if (d && Array.isArray(d.codigos) && d.codigos.length) return d;
    } catch (e) { /* segue para o exemplo */ }
    let ex;
    try { ex = Gerador.importar(CODIGO_EXEMPLO); } catch (e) { ex = Gerador.novoCodigo(); }
    return { codigos: [ex], atualId: ex.id, compacto: false };
  }

  let db = carregar();

  function salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(db));
    } catch (e) {
      aviso('Não foi possível salvar no navegador. Exporte um backup!', true);
    }
  }

  const atual = () => db.codigos.find((c) => c.id === db.atualId) || db.codigos[0];

  const getPath = (obj, p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  function setPath(obj, p, v) {
    const ks = p.split('.');
    const ult = ks.pop();
    ks.reduce((o, k) => o[k], obj)[ult] = v;
  }

  const clonar = (o) => {
    const c = JSON.parse(JSON.stringify(o));
    (function novosIds(x) {
      if (Array.isArray(x)) x.forEach(novosIds);
      else if (x && typeof x === 'object') {
        if ('id' in x) x.id = Gerador.uid();
        Object.values(x).forEach(novosIds);
      }
    })(c);
    return c;
  };

  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  /* ---------- Blocos de formulário ---------- */

  function campo(path, rotulo, o = {}) {
    const v = getPath(atual(), path);
    const id = 'f-' + path.replace(/\./g, '-');
    const extra = `${o.placeholder ? ` placeholder="${esc(o.placeholder)}"` : ''}${o.kind ? ` data-kind="${o.kind}"` : ''}`;
    let input;
    if (o.tipo === 'textarea') {
      input = `<textarea id="${id}" data-bind="${path}" rows="${o.rows || 3}"${extra}${o.cls ? ` class="${o.cls}"` : ''} spellcheck="${o.cls ? 'false' : 'true'}">${esc(v)}</textarea>`;
    } else if (o.tipo === 'select') {
      input = `<select id="${id}" data-bind="${path}">${o.opcoes.map(([val, txt]) =>
        `<option value="${val}"${val === v ? ' selected' : ''}>${txt}</option>`).join('')}</select>`;
    } else {
      const val = o.kind === 'csv' ? (v || []).join(', ') : v;
      input = `<input id="${id}" type="${o.tipo || 'text'}" data-bind="${path}" value="${esc(val)}"${extra}${o.min != null ? ` min="${o.min}"` : ''}${o.max != null ? ` max="${o.max}"` : ''}>`;
    }
    if (!rotulo) return input;
    return `<div class="campo-grupo"><label for="${id}">${rotulo}</label>${input}${o.ajuda ? `<span class="ajuda">${o.ajuda}</span>` : ''}</div>`;
  }

  function campoCor(path, rotulo) {
    const v = getPath(atual(), path);
    const hex = /^#[0-9a-f]{6}$/i.test(v) ? v : '#000000';
    return `<div class="campo-grupo"><label>${rotulo}</label><div class="cor-campo">
      <input type="color" data-bind="${path}" value="${hex}" aria-label="${rotulo}">
      <input type="text" data-bind="${path}" value="${esc(v)}" aria-label="${rotulo} (código)"></div></div>`;
  }

  function controles(arrPath, i, total, o = {}) {
    const b = (act, icone, titulo, extra = '') =>
      `<button type="button" class="btn-icone${act === 'remover' ? ' perigo' : ''}" data-act="${act}" data-path="${arrPath}" data-i="${i}" title="${titulo}" aria-label="${titulo}"${extra}>${icone}</button>`;
    return b('subir', '↑', 'Mover para cima', i === 0 ? ' disabled' : '')
      + b('descer', '↓', 'Mover para baixo', i === total - 1 ? ' disabled' : '')
      + (o.duplicar === false ? '' : b('duplicar', '⧉', 'Duplicar'))
      + b('remover', '✕', o.tituloRemover || 'Remover');
  }

  function bloco(chave, cabecalho, conteudo, ctrl = '') {
    return `<details class="bloco" data-key="${chave}"${abertos.has(chave) ? ' open' : ''}>
      <summary>${cabecalho}${ctrl ? `<span class="grupo-botoes">${ctrl}</span>` : ''}</summary>
      <div class="conteudo">${conteudo}</div></details>`;
  }

  const rotuloVivo = (path, vazio) => {
    const v = getPath(atual(), path);
    return `<span data-live="${path}" data-vazio="${esc(vazio)}">${esc(String(v || '').replace(/\*/g, '') || vazio)}</span>`;
  };

  const botaoAdicionar = (path, novo, texto) =>
    `<button type="button" class="btn pequeno" data-act="adicionar" data-path="${path}" data-novo="${novo}">+ ${texto}</button>`;

  /* ---------- Editor ---------- */

  function renderEditor() {
    const c = atual();
    const rolagem = $('#painel-editor').scrollTop;
    $('#titulo-editor').textContent = 'Editando: ' + (c.nome || 'sem nome');

    const html = [];

    html.push(bloco('geral', '<span class="rotulo-bloco">Identificação</span>',
      campo('nome', 'Nome na lista', { ajuda: 'Só serve para você encontrar o código aqui no gerenciador.' })));

    html.push(bloco('cabecalho', '<span class="rotulo-bloco">Cabeçalho</span>', `
      ${campo('cabecalho.titulo', 'Título', { placeholder: 'Ex.: Linhagem de Ryomen' })}
      ${campo('cabecalho.subtitulo', 'Subtítulo (frase de efeito)', { placeholder: 'Ex.: O sangue carrega a memória...' })}
      ${campo('cabecalho.tags', 'Etiquetas', { kind: 'csv', placeholder: 'Particularidade, Clã, ...', ajuda: 'Separe várias etiquetas por vírgula.' })}
      <div class="campo-grupo"><label for="f-cabecalho-svg">Ícone (SVG)</label>
        <div style="display:flex;gap:8px;align-items:flex-start">
          <div class="svg-previa" id="svg-previa">${c.cabecalho.svg || ''}</div>
          <div style="flex:1">${campo('cabecalho.svg', '', { tipo: 'textarea', rows: 4, cls: 'textarea-codigo' })}</div>
        </div>
        <span class="ajuda">Cole o código de qualquer ícone SVG. Ele recebe a cor de destaque automaticamente.</span>
      </div>`));

    html.push(bloco('aparencia', '<span class="rotulo-bloco">Aparência e cores</span>', `
      <div class="linha">
        ${campoCor('cores.destaque', 'Destaque')}
        ${campoCor('cores.fundo', 'Fundo')}
        ${campoCor('cores.cartao', 'Fundo dos cartões')}
        ${campoCor('cores.texto', 'Texto')}
        ${campoCor('cores.borda', 'Bordas')}
      </div>
      ${campo('cssLink', 'Folha de estilo base (link CSS)', { ajuda: 'Deixe em branco para não incluir o &lt;link&gt;.' })}`));

    c.secoes.forEach((s, i) => html.push(renderSecao(s, i, c.secoes.length)));

    const temRegua = c.secoes.some((s) => s.tipo === 'ressonancia');
    html.push(`<div class="adicionar-secao"><span>Adicionar seção:</span>
      ${botaoAdicionar('secoes', 'texto', 'Texto')}
      ${botaoAdicionar('secoes', 'cartoes', 'Cartões')}
      <button type="button" class="btn pequeno" data-act="adicionar" data-path="secoes" data-novo="ressonancia"${temRegua ? ' disabled title="Só é possível ter uma régua por código"' : ''}>+ Régua de alinhamento</button>
      ${botaoAdicionar('secoes', 'html', 'HTML livre')}
    </div>`);

    form.innerHTML = html.join('');
    $('#painel-editor').scrollTop = rolagem;
    $$('[data-filtro]', form).forEach(aplicarFiltro);

    if (focarDepois) {
      const alvo = $(`[data-bind="${focarDepois}"], [data-bind^="${focarDepois}."]`, form);
      if (alvo) { alvo.focus(); alvo.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      focarDepois = null;
    }
  }

  function renderSecao(s, i, total) {
    const p = `secoes.${i}`;
    const cab = `<span class="selo">${NOMES_TIPO[s.tipo]}</span><span class="rotulo-bloco">${rotuloVivo(p + '.titulo', '(sem título)')}</span>`;
    const ctrl = controles('secoes', i, total, { duplicar: s.tipo !== 'ressonancia', tituloRemover: 'Excluir seção' });
    let corpo = campo(p + '.titulo', 'Título da seção');

    if (s.tipo === 'texto') {
      corpo += `<div class="subtitulo-bloco"><h3>Parágrafos <span class="contador">(${s.paragrafos.length})</span></h3></div>
        <div class="lista-itens">${s.paragrafos.map((_, j) => `
          <div class="item"><div class="corpo">${campo(`${p}.paragrafos.${j}`, '', { tipo: 'textarea', rows: 3, placeholder: 'Escreva o parágrafo…' })}</div>
          <div class="controles">${controles(p + '.paragrafos', j, s.paragrafos.length)}</div></div>`).join('')}
        </div>${botaoAdicionar(p + '.paragrafos', 'paragrafo', 'Parágrafo')}`;
    }

    if (s.tipo === 'cartoes') {
      corpo += campo(p + '.colunas', 'Cartões por linha', { tipo: 'number', min: 1, max: 4 });
      corpo += `<div class="subtitulo-bloco"><h3>Cartões <span class="contador">(${s.cartoes.length})</span></h3></div>`;
      corpo += s.cartoes.map((card, j) => renderCartao(`${p}.cartoes.${j}`, card, j, s.cartoes.length, p + '.cartoes')).join('');
      corpo += botaoAdicionar(p + '.cartoes', 'cartao', 'Cartão');
    }

    if (s.tipo === 'ressonancia') corpo += renderRegua(s, p);

    if (s.tipo === 'html') {
      corpo += campo(p + '.html', 'Conteúdo HTML', { tipo: 'textarea', rows: 8, cls: 'textarea-codigo',
        ajuda: 'Trecho que o gerenciador não reconheceu. É inserido exatamente como está.' });
    }

    return bloco('sec-' + s.id, cab, corpo, ctrl);
  }

  const ESTILOS_ITEM = [['normal', 'Normal'], ['destaque', 'Destaque (cor)'], ['nota', 'Nota (vermelho)']];

  function renderCartao(p, card, j, total, arrPath) {
    const itens = card.itens.map((it, k) => `
      <div class="item estilo-${it.estilo}"><div class="corpo">
        <div class="topo-item">
          ${campo(`${p}.itens.${k}.estilo`, '', { tipo: 'select', opcoes: ESTILOS_ITEM })}
          ${campo(`${p}.itens.${k}.rotulo`, '', { placeholder: 'Nome em negrito (opcional)' })}
        </div>
        ${campo(`${p}.itens.${k}.texto`, '', { tipo: 'textarea', rows: 2, placeholder: 'Descrição do efeito…' })}
      </div><div class="controles">${controles(p + '.itens', k, card.itens.length)}</div></div>`).join('');

    const cab = `<span class="rotulo-bloco">${rotuloVivo(p + '.nome', '(cartão sem nome)')}<small>${card.itens.length} ${card.itens.length === 1 ? 'item' : 'itens'}</small></span>`;
    return bloco('card-' + card.id, cab, `
      ${campo(p + '.nome', 'Nome do cartão')}
      ${campo(p + '.intro', 'Introdução (opcional)', { tipo: 'textarea', rows: 2 })}
      <div class="subtitulo-bloco"><h3>Itens da lista</h3></div>
      <div class="lista-itens">${itens}</div>
      ${botaoAdicionar(p + '.itens', 'item', 'Item')}`, controles(arrPath, j, total, { tituloRemover: 'Excluir cartão' }));
  }

  const TIPOS_ESTAGIO = [['maligno', 'Maligno'], ['neutro', 'Neutro'], ['benigno', 'Benigno']];

  function reguaMini(g) {
    const faixa = Number(g.max) - Number(g.min) || 1;
    const pos = Math.max(0, Math.min(100, ((Number(g.inicial) - Number(g.min)) / faixa) * 100));
    const n = Number(g.inicial);
    return `<div class="marca-regua" style="left:${pos}%"><span>${esc(g.rotuloMarcador)} (${n > 0 ? '+' + n : n})</span></div>`;
  }

  function resumoAcoes(acoes) {
    const neg = acoes.filter((a) => a.pontos < 0).length;
    const pos = acoes.filter((a) => a.pontos > 0).length;
    return `<span>${acoes.length} ações</span><span><b class="neg">${neg}</b> negativas</span><span><b class="pos">${pos}</b> positivas</span>`;
  }

  function renderRegua(s, p) {
    const g = s.regua;
    const estagios = s.estagios.map((e, k) => `
      <div class="item tipo-${e.tipo}"><div class="corpo">
        <div class="topo-item tres">
          ${campo(`${p}.estagios.${k}.faixa`, '', { placeholder: 'Faixa (ex.: -99 a -90)' })}
          ${campo(`${p}.estagios.${k}.tipo`, '', { tipo: 'select', opcoes: TIPOS_ESTAGIO })}
          ${campo(`${p}.estagios.${k}.nome`, '', { placeholder: 'Nome do estágio' })}
        </div>
        ${campo(`${p}.estagios.${k}.efeito`, '', { tipo: 'textarea', rows: 2, placeholder: 'Efeito passivo / narrativo…' })}
      </div><div class="controles">${controles(p + '.estagios', k, s.estagios.length)}</div></div>`).join('');

    const acoes = s.acoes.map((a, k) => `
      <div class="acao-linha ${a.pontos < 0 ? 'negativo' : a.pontos > 0 ? 'positivo' : ''}">
        ${campo(`${p}.acoes.${k}.acao`, '', { placeholder: 'Descreva a ação…' })}
        ${campo(`${p}.acoes.${k}.pontos`, '', { tipo: 'number' })}
        <div class="controles">${controles(p + '.acoes', k, s.acoes.length, { duplicar: false })}</div>
      </div>`).join('');

    return `
      ${campo(p + '.intro', 'Texto de introdução', { tipo: 'textarea', rows: 3 })}

      <div class="subtitulo-bloco"><h3>Régua</h3></div>
      <div class="linha">
        ${campo(p + '.regua.min', 'Valor mínimo', { tipo: 'number' })}
        ${campo(p + '.regua.rotuloMin', 'Nome do mínimo')}
        ${campo(p + '.regua.max', 'Valor máximo', { tipo: 'number' })}
        ${campo(p + '.regua.rotuloMax', 'Nome do máximo')}
      </div>
      <div class="linha">
        ${campo(p + '.regua.rotuloNeutro', 'Nome do centro')}
        ${campo(p + '.regua.inicial', 'Pontos iniciais', { tipo: 'number' })}
        ${campo(p + '.regua.rotuloMarcador', 'Texto do marcador')}
      </div>
      <div class="regua-mini" id="regua-mini">${reguaMini(g)}</div>

      <div class="subtitulo-bloco"><h3>Estágios <span class="contador">(${s.estagios.length})</span></h3></div>
      ${campo(p + '.estagiosTitulo', 'Título da tabela de estágios')}
      <div class="linha">
        ${campo(p + '.estagiosColunas.0', 'Coluna 1')}
        ${campo(p + '.estagiosColunas.1', 'Coluna 2')}
      </div>
      <div class="lista-itens">${estagios}</div>
      ${botaoAdicionar(p + '.estagios', 'estagio', 'Estágio')}

      <div class="subtitulo-bloco"><h3>Ações e consequências <span class="contador">(${s.acoes.length})</span></h3></div>
      ${campo(p + '.acoesTitulo', 'Título da tabela de ações')}
      <div class="linha">
        ${campo(p + '.acoesColunas.0', 'Coluna 1')}
        ${campo(p + '.acoesColunas.1', 'Coluna 2')}
      </div>
      <div class="resumo-acoes" id="resumo-acoes">${resumoAcoes(s.acoes)}</div>
      <div class="linha">
        <input type="search" class="campo" data-filtro="${s.id}" placeholder="Filtrar ações…" value="${esc(filtros[s.id] || '')}">
        <div class="grupo-botoes">
          <button type="button" class="btn pequeno" data-act="ordenar" data-path="${p}.acoes" data-modo="pontos">Ordenar por pontos</button>
          <button type="button" class="btn pequeno" data-act="ordenar" data-path="${p}.acoes" data-modo="alfa">A → Z</button>
        </div>
      </div>
      <div class="lista-itens" data-lista-acoes="${s.id}">${acoes}</div>
      ${botaoAdicionar(p + '.acoes', 'acao', 'Ação')}`;
  }

  function aplicarFiltro(input) {
    const termo = input.value.trim().toLowerCase();
    filtros[input.dataset.filtro] = input.value;
    const lista = $(`[data-lista-acoes="${input.dataset.filtro}"]`, form);
    if (!lista) return;
    $$('.acao-linha', lista).forEach((l) => {
      const txt = $('input[type=text]', l).value.toLowerCase();
      l.classList.toggle('oculta', !!termo && !txt.includes(termo));
    });
  }

  /* ---------- Eventos do editor ---------- */

  form.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.filtro != null) return aplicarFiltro(el);
    const p = el.dataset.bind;
    if (!p) return;
    const c = atual();

    let v = el.value;
    if (el.type === 'number') v = el.value === '' ? 0 : Number(el.value);
    if (el.dataset.kind === 'csv') v = el.value.split(',').map((t) => t.trim()).filter(Boolean);
    setPath(c, p, v);

    // Sincroniza outros campos ligados ao mesmo dado (ex.: seletor de cor + texto)
    $$(`[data-bind="${p}"]`, form).forEach((o) => {
      if (o === el) return;
      if (o.type === 'color' && !/^#[0-9a-f]{6}$/i.test(el.value)) return;
      o.value = el.value;
    });
    $$(`[data-live="${p}"]`, form).forEach((o) => {
      o.textContent = el.value.replace(/\*/g, '') || o.dataset.vazio;
    });

    // Decorações ao vivo
    const item = el.closest('.item');
    if (/\.estilo$/.test(p) && item) item.className = 'item estilo-' + v;
    if (/estagios\.\d+\.tipo$/.test(p) && item) item.className = 'item tipo-' + v;
    if (/acoes\.\d+\.pontos$/.test(p)) {
      el.closest('.acao-linha').className = 'acao-linha ' + (v < 0 ? 'negativo' : v > 0 ? 'positivo' : '');
      const sec = getPath(c, p.split('.').slice(0, 2).join('.'));
      $('#resumo-acoes').innerHTML = resumoAcoes(sec.acoes);
    }
    if (/\.regua\./.test(p)) {
      $('#regua-mini').innerHTML = reguaMini(getPath(c, p.replace(/\.[^.]+$/, '')));
    }
    if (p === 'cabecalho.svg') $('#svg-previa').innerHTML = v;
    if (p === 'nome') $('#titulo-editor').textContent = 'Editando: ' + (v || 'sem nome');

    alterou();
  });

  form.addEventListener('toggle', (e) => {
    const k = e.target.dataset && e.target.dataset.key;
    if (!k) return;
    if (e.target.open) abertos.add(k); else abertos.delete(k);
  }, true);

  const FABRICAS = {
    texto: () => Gerador.novaSecao('texto'),
    cartoes: () => Gerador.novaSecao('cartoes'),
    ressonancia: () => Gerador.novaSecao('ressonancia'),
    html: () => Gerador.novaSecao('html'),
    paragrafo: () => '',
    cartao: () => Gerador.novoCartao(),
    item: () => Gerador.novoItem(),
    estagio: () => Gerador.novoEstagio(),
    acao: () => Gerador.novaAcao(),
  };

  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    const c = atual();
    const arr = getPath(c, b.dataset.path);
    const i = Number(b.dataset.i);

    switch (b.dataset.act) {
      case 'adicionar': {
        const novo = FABRICAS[b.dataset.novo]();
        arr.push(novo);
        if (novo && novo.id) abertos.add((b.dataset.path === 'secoes' ? 'sec-' : 'card-') + novo.id);
        focarDepois = `${b.dataset.path}.${arr.length - 1}`;
        if (/\.acoes$/.test(b.dataset.path)) delete filtros[getPath(c, b.dataset.path.replace(/\.acoes$/, '')).id];
        break;
      }
      case 'subir':
        if (i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
        break;
      case 'descer':
        if (i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
        break;
      case 'duplicar': {
        const copia = typeof arr[i] === 'object' ? clonar(arr[i]) : arr[i];
        arr.splice(i + 1, 0, copia);
        if (copia && copia.id) abertos.add((b.dataset.path === 'secoes' ? 'sec-' : 'card-') + copia.id);
        break;
      }
      case 'remover': {
        const grande = b.dataset.path === 'secoes' || /\.cartoes$/.test(b.dataset.path);
        if (grande && !confirm('Excluir este bloco e todo o seu conteúdo?')) return;
        arr.splice(i, 1);
        break;
      }
      case 'ordenar':
        if (b.dataset.modo === 'alfa') arr.sort((a, z) => a.acao.localeCompare(z.acao, 'pt-BR'));
        else arr.sort((a, z) => a.pontos - z.pontos);
        break;
      default:
        return;
    }
    renderEditor();
    alterou();
  });

  $('#btn-expandir').addEventListener('click', () => {
    const blocos = $$('details.bloco', form);
    const abrir = blocos.some((d) => !d.open);
    blocos.forEach((d) => { d.open = abrir; });
  });

  /* ---------- Saída (prévia e código) ---------- */

  function documentoPrevia(codigo) {
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<style>
/* Reserva caso a folha de estilo externa não carregue (ela sobrescreve estas regras) */
body{margin:0;padding:20px;background:#0b0b0b;font-family:Georgia,serif;line-height:1.5}
.rpg-card{max-width:760px;margin:0 auto;padding:20px;border-radius:8px}
.new-header{text-align:center;padding-bottom:16px;margin-bottom:16px}
.header-svg-container svg{width:70px;height:70px}
.new-header .title{font-size:1.8em;font-weight:bold}
.tag-container .tag{display:inline-block;padding:2px 10px;border-radius:12px;font-size:.75em;margin:6px 3px 0}
.section{margin-bottom:22px}
.h .name{font-weight:bold;font-size:1.15em;padding-left:8px;margin-bottom:10px}
.rules-grid{display:grid;gap:12px}
.rules-card{padding:12px;border-radius:6px}
.rules-name{font-weight:bold;margin-bottom:8px}
</style></head><body>${codigo}</body></html>`;
  }

  function renderSaida() {
    const codigo = Gerador.gerar(atual(), { compacto: db.compacto });
    saidaCodigo.value = codigo;
    let y = 0;
    try { y = iframe.contentWindow.scrollY; } catch (e) { /* sem acesso */ }
    iframe.onload = () => { try { iframe.contentWindow.scrollTo(0, y); } catch (e) { /* ignore */ } };
    iframe.srcdoc = documentoPrevia(codigo);
  }

  const salvarDepois = debounce(salvar, 400);
  const saidaDepois = debounce(renderSaida, 250);
  const listaDepois = debounce(renderLista, 300);

  function alterou() {
    atual().atualizado = Date.now();
    salvarDepois();
    saidaDepois();
    listaDepois();
  }

  $$('.aba').forEach((a) => a.addEventListener('click', () => {
    $$('.aba').forEach((x) => x.classList.toggle('ativo', x === a));
    const codigo = a.dataset.aba === 'codigo';
    saidaCodigo.hidden = !codigo;
    iframe.hidden = codigo;
  }));

  const chkCompacto = $('#compacto');
  chkCompacto.checked = !!db.compacto;
  chkCompacto.addEventListener('change', () => {
    db.compacto = chkCompacto.checked;
    salvar();
    renderSaida();
  });

  $('#btn-copiar').addEventListener('click', async () => {
    const codigo = Gerador.gerar(atual(), { compacto: db.compacto });
    try {
      await navigator.clipboard.writeText(codigo);
    } catch (e) {
      saidaCodigo.hidden = false;
      saidaCodigo.value = codigo;
      saidaCodigo.select();
      document.execCommand('copy');
      if (!$('.aba[data-aba="codigo"]').classList.contains('ativo')) saidaCodigo.hidden = true;
    }
    aviso('Código copiado!');
  });

  $('#btn-baixar').addEventListener('click', () => {
    const c = atual();
    baixar(Gerador.gerar(c, { compacto: db.compacto }), slug(c.nome) + '.html', 'text/html');
  });

  function baixar(conteudo, nome, tipo) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo + ';charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: nome });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const slug = (s) => (s || 'codigo').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'codigo';

  /* ---------- Lista de códigos ---------- */

  function renderLista() {
    const termo = $('#busca').value.trim().toLowerCase();
    const ul = $('#lista-codigos');
    const itens = db.codigos
      .filter((c) => !termo || (c.nome || '').toLowerCase().includes(termo))
      .map((c) => `<li data-id="${c.id}" class="${c.id === db.atualId ? 'ativo' : ''}">
        <span class="cor" style="background:${esc(c.cores.destaque)}"></span>
        <span class="info"><span class="nome">${esc(c.nome || 'sem nome')}</span>
        <span class="data">Editado ${quando(c.atualizado)}</span></span>
        <span class="acoes">
          <button class="btn-icone" data-lista="duplicar" title="Duplicar" aria-label="Duplicar">⧉</button>
          <button class="btn-icone perigo" data-lista="excluir" title="Excluir" aria-label="Excluir">✕</button>
        </span></li>`);
    ul.innerHTML = itens.join('') || '<li class="dica">Nenhum código encontrado.</li>';
  }

  function quando(t) {
    const s = (Date.now() - t) / 1000;
    if (s < 60) return 'agora';
    if (s < 3600) return `há ${Math.floor(s / 60)} min`;
    if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
    return 'em ' + new Date(t).toLocaleDateString('pt-BR');
  }

  function selecionar(id) {
    db.atualId = id;
    salvar();
    renderTudo();
  }

  $('#lista-codigos').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    const id = li.dataset.id;
    const acao = e.target.closest('[data-lista]')?.dataset.lista;
    const c = db.codigos.find((x) => x.id === id);

    if (acao === 'duplicar') {
      const copia = clonar(c);
      copia.nome = c.nome + ' (cópia)';
      copia.atualizado = Date.now();
      db.codigos.splice(db.codigos.indexOf(c) + 1, 0, copia);
      selecionar(copia.id);
      aviso('Código duplicado');
    } else if (acao === 'excluir') {
      if (!confirm(`Excluir "${c.nome}"? Essa ação não pode ser desfeita.`)) return;
      db.codigos = db.codigos.filter((x) => x.id !== id);
      if (!db.codigos.length) db.codigos.push(Gerador.novoCodigo());
      if (db.atualId === id) db.atualId = db.codigos[0].id;
      salvar();
      renderTudo();
      aviso('Código excluído');
    } else {
      selecionar(id);
      mostrarPainel('editor');
    }
  });

  $('#busca').addEventListener('input', renderLista);

  $('#btn-novo').addEventListener('click', () => {
    const c = Gerador.novoCodigo('Novo código');
    db.codigos.unshift(c);
    abertos.add('geral');
    focarDepois = 'nome';
    selecionar(c.id);
    mostrarPainel('editor');
  });

  /* ---------- Importar código colado ---------- */

  const modal = $('#modal-importar');
  $('#btn-importar').addEventListener('click', () => {
    $('#texto-importar').value = '';
    $('#erro-importar').hidden = true;
    modal.showModal();
    $('#texto-importar').focus();
  });

  function importarTexto(substituir) {
    const txt = $('#texto-importar').value.trim();
    const erro = $('#erro-importar');
    if (!txt) { erro.textContent = 'Cole um código primeiro.'; erro.hidden = false; return; }
    let c;
    try {
      c = Gerador.importar(txt);
    } catch (ex) {
      erro.textContent = ex.message;
      erro.hidden = false;
      return;
    }
    if (substituir) {
      const a = atual();
      if (!confirm(`Substituir todo o conteúdo de "${a.nome}" pelo código colado?`)) return;
      c.id = a.id;
      db.codigos[db.codigos.indexOf(a)] = c;
    } else {
      db.codigos.unshift(c);
    }
    c.atualizado = Date.now();
    modal.close();
    selecionar(c.id);
    mostrarPainel('editor');
    aviso('Código importado — confira os campos!');
  }

  $('#btn-importar-novo').addEventListener('click', (e) => { e.preventDefault(); importarTexto(false); });
  $('#btn-substituir').addEventListener('click', (e) => { e.preventDefault(); importarTexto(true); });

  /* ---------- Backup ---------- */

  $('#btn-backup').addEventListener('click', () => {
    const data = new Date().toISOString().slice(0, 10);
    baixar(JSON.stringify({ versao: 1, codigos: db.codigos }, null, 2), `backup-codigos-${data}.json`, 'application/json');
  });

  $('#arquivo-backup').addEventListener('change', async (e) => {
    const arq = e.target.files[0];
    e.target.value = '';
    if (!arq) return;
    try {
      const dados = JSON.parse(await arq.text());
      const lista = Array.isArray(dados) ? dados : dados.codigos;
      if (!Array.isArray(lista) || !lista.every((c) => c && Array.isArray(c.secoes) && c.cabecalho)) {
        throw new Error('formato');
      }
      const ids = new Set(db.codigos.map((c) => c.id));
      lista.forEach((c) => { if (ids.has(c.id)) c.id = Gerador.uid(); db.codigos.push(c); });
      salvar();
      renderTudo();
      aviso(`${lista.length} código(s) restaurado(s)`);
    } catch (ex) {
      aviso('Arquivo de backup inválido', true);
    }
  });

  /* ---------- Diversos ---------- */

  let tAviso;
  function aviso(msg, erro = false) {
    const el = $('#aviso');
    el.textContent = msg;
    el.classList.toggle('erro-aviso', erro);
    el.classList.add('visivel');
    clearTimeout(tAviso);
    tAviso = setTimeout(() => el.classList.remove('visivel'), 2200);
  }

  function mostrarPainel(nome) {
    $('.layout').dataset.painelAtivo = nome;
    $$('.abas-mobile button').forEach((b) => b.classList.toggle('ativo', b.dataset.painel === nome));
  }
  $$('.abas-mobile button').forEach((b) => b.addEventListener('click', () => mostrarPainel(b.dataset.painel)));

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      salvar();
      aviso('Tudo salvo');
    }
  });

  function renderTudo() {
    renderLista();
    renderEditor();
    renderSaida();
  }

  salvar();
  renderTudo();
})();
