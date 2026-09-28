(() => {
  const CHAVE = 'gerenciador-codigos.v2';
  const CHAVE_ANTIGA = 'gerenciador-codigos.v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const form = $('#editor');
  const iframe = $('#previa');
  const saidaCodigo = $('#codigo');
  const scrollEditor = $('#scroll-editor');

  const TIPOS_BLOCO = {
    texto: { nome: 'Parágrafos', icone: 'notes' },
    cartoes: { nome: 'Cartões', icone: 'view_agenda' },
    regua: { nome: 'Régua de alinhamento', icone: 'linear_scale' },
    etapas: { nome: 'Etapas de influência', icone: 'timeline' },
    arvore: { nome: 'Árvore de habilidades', icone: 'account_tree' },
    html: { nome: 'HTML livre', icone: 'code' },
  };

  const MODELOS_SECAO = [
    ['texto', 'notes', 'Texto', 'Título + parágrafos (ex.: Definição).'],
    ['regras', 'thumbs_up_down', 'Vantagens e Restrições', 'Dois cartões lado a lado, com + e −.'],
    ['destaque', 'bookmark', 'Cartão em destaque', 'Introdução + cartão com moldura dourada.'],
    ['regua', 'linear_scale', 'Régua de alinhamento', 'Pontuação, estágios e tabela de ações.'],
    ['etapas', 'timeline', 'Etapas de influência', 'Linha do tempo com níveis coloridos.'],
    ['arvore', 'account_tree', 'Árvore de habilidades', 'Caminhos com habilidades por tier.'],
    ['html', 'code', 'HTML livre', 'Qualquer código, inserido como está.'],
    ['vazia', 'crop_square', 'Seção vazia', 'Só o título; adicione blocos depois.'],
  ];

  const abertos = new Set();
  const filtros = {};
  let focarDepois = null;

  /* ---------- Dados ---------- */

  function exemplos() {
    const lista = [];
    [typeof CODIGO_RECEPTACULO !== 'undefined' && CODIGO_RECEPTACULO, CODIGO_EXEMPLO].forEach((cod) => {
      if (!cod) return;
      try { lista.push(Gerador.importar(cod)); } catch (e) { /* ignora exemplo inválido */ }
    });
    return lista.length ? lista : [Gerador.novoCodigo()];
  }

  function carregar() {
    try {
      const d = JSON.parse(localStorage.getItem(CHAVE));
      if (d && Array.isArray(d.codigos) && d.codigos.length) {
        d.codigos = d.codigos.map(Gerador.migrar);
        return d;
      }
    } catch (e) { /* segue */ }
    try {
      const antigo = JSON.parse(localStorage.getItem(CHAVE_ANTIGA));
      if (antigo && Array.isArray(antigo.codigos) && antigo.codigos.length) {
        return { codigos: antigo.codigos.map(Gerador.migrar), atualId: antigo.atualId, compacto: !!antigo.compacto };
      }
    } catch (e) { /* segue */ }
    const lista = exemplos();
    return { codigos: lista, atualId: lista[0].id, compacto: true };
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

  function clonar(o) {
    const c = JSON.parse(JSON.stringify(o));
    (function novosIds(x) {
      if (Array.isArray(x)) x.forEach(novosIds);
      else if (x && typeof x === 'object') {
        if ('id' in x) x.id = Gerador.uid();
        Object.values(x).forEach(novosIds);
      }
    })(c);
    return c;
  }

  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const semMd = (s) => String(s || '').replace(/\*/g, '');
  const icone = (nome, extra = '') => `<span class="material-icons-round${extra ? ' ' + extra : ''}">${nome}</span>`;
  const temRegua = () => atual().secoes.some((s) => s.blocos.some((b) => b.tipo === 'regua'));

  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  /* ---------- Componentes de formulário ---------- */

  function entrada(path, o = {}) {
    const v = getPath(atual(), path);
    const id = 'f-' + path.replace(/\./g, '-');
    const ph = o.placeholder ? ` placeholder="${esc(o.placeholder)}"` : '';
    const kind = o.kind ? ` data-kind="${o.kind}"` : '';
    const cls = o.cls ? ` class="${o.cls}"` : '';
    if (o.tipo === 'textarea') {
      return `<textarea id="${id}" data-bind="${path}"${ph}${kind}${cls} spellcheck="${o.cls && o.cls.includes('mono') ? 'false' : 'true'}">${esc(v)}</textarea>`;
    }
    if (o.tipo === 'select') {
      return `<select id="${id}" data-bind="${path}"${kind}${cls}>${o.opcoes.map(([val, txt]) =>
        `<option value="${esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${txt}</option>`).join('')}</select>`;
    }
    const val = o.kind === 'csv' ? (v || []).join(', ') : v;
    return `<input id="${id}" type="${o.tipo || 'text'}" data-bind="${path}" value="${esc(val)}"${ph}${kind}${cls}>`;
  }

  function campo(path, rotulo, o = {}) {
    const id = 'f-' + path.replace(/\./g, '-');
    return `<div class="input-group"><label for="${id}">${rotulo}${o.extraRotulo || ''}</label>${entrada(path, o)}${o.ajuda ? `<span class="ajuda">${o.ajuda}</span>` : ''}</div>`;
  }

  function campoCor(path, rotulo) {
    const v = getPath(atual(), path) || '';
    const hex = /^#[0-9a-f]{6}$/i.test(v) ? v : '#000000';
    return `<div class="input-group"><label>${rotulo}</label><div class="hex-picker-wrapper">
      <input type="color" data-bind="${path}" value="${hex}" aria-label="${rotulo}">
      <input type="text" data-bind="${path}" value="${esc(v)}" aria-label="${rotulo} (código)"></div></div>`;
  }

  const row = (...cols) => `<div class="row">${cols.map((c) => `<div class="col">${c}</div>`).join('')}</div>`;

  function botoesHeader(drag, i, o = {}) {
    return `<div class="header-acoes">
      ${o.duplicar === false ? '' : `<button type="button" class="icon-btn" data-act="duplicar" data-path="${drag}" data-i="${i}" title="Duplicar">${icone('content_copy')}</button>`}
      <button type="button" class="icon-btn perigo" data-act="remover" data-path="${drag}" data-i="${i}" title="Excluir">${icone('delete')}</button>
      ${icone('expand_more', 'seta')}
    </div>`;
  }

  // Caixa recolhível e arrastável (tech-builder-item do Grimório)
  function caixa({ chave, drag, i, titulo, livePath, vazio, icon, extra = '', corpo, duplicar = true }) {
    const tituloHtml = livePath
      ? `<span class="tech-title-text" data-live="${livePath}" data-vazio="${esc(vazio)}">${esc(semMd(titulo) || vazio)}</span>`
      : `<span class="tech-title-text">${esc(titulo)}</span>`;
    return `<div class="tech-builder-item${abertos.has(chave) ? ' open' : ''}" data-key="${chave}" data-drag="${drag}" data-i="${i}">
      <div class="tech-builder-header" data-toggle>
        <div class="tech-title-wrapper">
          ${icone('drag_indicator', 'drag-handle')}
          ${icon ? icone(icon, 'icone-tipo') : ''}
          ${tituloHtml}${extra}
        </div>
        ${botoesHeader(drag, i, { duplicar })}
      </div>
      <div class="tech-builder-body">${corpo}</div>
    </div>`;
  }

  // Linha de lista arrastável (feature-item do Grimório)
  function linha({ drag, i, corpo, classe = '', duplicar = false }) {
    return `<div class="feature-item ${classe}" data-drag="${drag}" data-i="${i}">
      ${icone('drag_indicator', 'drag-handle')}
      <div class="feature-corpo">${corpo}</div>
      <div class="feature-acoes">
        <button type="button" class="btn-mini" data-act="remover" data-path="${drag}" data-i="${i}" title="Remover">${icone('close')}</button>
        ${duplicar ? `<button type="button" class="btn-mini neutro" data-act="duplicar" data-path="${drag}" data-i="${i}" title="Duplicar">${icone('content_copy')}</button>` : ''}
      </div>
    </div>`;
  }

  const botaoAdd = (path, novo, texto, extra = '') =>
    `<button type="button" class="btn btn-secondary btn-add-bloco" data-act="adicionar" data-path="${path}" data-novo="${novo}"${extra}>${icone('add')} ${texto}</button>`;

  /* ---------- Editor ---------- */

  function renderEditor() {
    const c = atual();
    const rolagem = scrollEditor.scrollTop;
    const html = [];

    html.push(`<div class="painel">
      <label class="rotulo-painel">Informações Principais</label>
      ${campo('nome', 'Nome na lista', { ajuda: 'Só serve para você encontrar o código aqui no gerenciador.' })}
      ${campo('cabecalho.titulo', 'Título', { placeholder: 'Ex.: Receptáculo de Plasma Estelar' })}
      ${row(campo('cabecalho.subtitulo', 'Subtítulo', { placeholder: 'Ex.: Seishōtai' }),
        campo('cabecalho.tags', 'Etiquetas', { kind: 'csv', placeholder: 'Particularidade, ...' }))}
      <div class="input-group"><label for="f-cabecalho-svg">Ícone (SVG ou kanji)</label>
        <div class="row apertada">
          <div class="svg-previa" id="svg-previa">${c.cabecalho.svg || ''}</div>
          <div class="col">${entrada('cabecalho.svg', { tipo: 'textarea', cls: 'mono curto' })}</div>
        </div>
      </div>
    </div>`);

    const e = c.estilo;
    html.push(`<div class="painel">
      <label class="rotulo-painel">Aparência</label>
      ${campo('cssLink', 'Folha de estilo base (link CSS)', {
        ajuda: 'O padrão atual é <code>particularidades.css?v=1</code>. Deixe em branco para não incluir o &lt;link&gt;.' })}
      <label class="check"><input type="checkbox" data-bind="estilo.ativo" data-rerender> Personalizar cores (gera um bloco &lt;style&gt;)</label>
      ${e.ativo ? `<div class="grade-cores">
        ${campoCor('estilo.cores.destaque', 'Destaque')}
        ${campoCor('estilo.cores.fundo', 'Fundo')}
        ${campoCor('estilo.cores.cartao', 'Fundo dos cartões')}
        ${campoCor('estilo.cores.texto', 'Texto')}
        ${campoCor('estilo.cores.borda', 'Bordas')}
      </div>` : ''}
      ${campo('estilo.extra', 'CSS adicional (opcional)', { tipo: 'textarea', cls: 'mono curto',
        placeholder: '.rpg-card .minha-classe { ... }', ajuda: 'Regras extras que vão dentro do &lt;style&gt;. Ao importar, CSS desconhecido aparece aqui.' })}
    </div>`);

    html.push('<hr class="section-divider">');

    const regua = temRegua();
    html.push(`<div class="titulo-lista">
      <span class="rotulo">${icone('auto_awesome')} Seções <span class="contador">(${c.secoes.length})</span></span>
      <div class="menu-wrap">
        <button type="button" class="btn btn-primary btn-add" data-menu="menu-secao">+ Adicionar</button>
        <div class="menu" id="menu-secao">${MODELOS_SECAO.map(([k, ic, nome, desc]) =>
          `<button type="button" data-act="adicionar" data-path="secoes" data-novo="secao:${k}"${k === 'regua' && regua ? ' disabled title="Só é possível ter uma régua por código"' : ''}>
            ${icone(ic)}<span><b>${nome}</b><small>${desc}</small></span></button>`).join('')}
        </div>
      </div>
    </div>
    <p class="ajuda" style="margin-top:-12px">Arraste os itens pela alça (⠿) para reordenar. Clique no título para abrir ou fechar.</p>`);

    html.push(`<div class="lista">${c.secoes.map((s, i) => renderSecao(s, i)).join('')}</div>`);

    form.innerHTML = html.join('');
    scrollEditor.scrollTop = rolagem;
    $$('[data-filtro]', form).forEach(aplicarFiltro);
    atualizarBarra();

    $$('textarea', form).forEach(autoAltura);

    if (focarDepois) {
      const alvo = $(`[data-bind="${focarDepois}"], [data-bind^="${focarDepois}."]`, form);
      if (alvo) { alvo.focus({ preventScroll: true }); rolarPara(alvo); }
      focarDepois = null;
    }
  }

  // Caixas de texto crescem com o conteúdo (até um limite)
  function autoAltura(t) {
    if (t.classList.contains('mono') || !t.offsetParent) return;
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight + 2, 420) + 'px';
  }

  // Centraliza um campo sem deslocar o painel fixo do editor
  function rolarPara(el) {
    const r = el.getBoundingClientRect();
    if (getComputedStyle(scrollEditor).overflowY === 'auto') {
      const a = scrollEditor.getBoundingClientRect();
      scrollEditor.scrollTo({ top: scrollEditor.scrollTop + r.top - a.top - a.height / 2, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: window.scrollY + r.top - window.innerHeight / 2, behavior: 'smooth' });
    }
  }

  function renderSecao(s, i) {
    const p = `secoes.${i}`;
    const chips = s.blocos.map((b) => icone(TIPOS_BLOCO[b.tipo].icone, 'tech-title-sub')).join('');
    const regua = temRegua();
    const corpo = `
      ${s.solta
        ? '<p class="ajuda">Conteúdo encontrado fora de uma <code>.section</code>; é inserido sem título nem moldura.</p>'
        : campo(p + '.titulo', 'Título da seção', { ajuda: 'Deixe em branco para uma seção sem título.' })}
      <div class="lista">${s.blocos.map((b, j) => renderBloco(b, `${p}.blocos.${j}`, j, `${p}.blocos`)).join('')}</div>
      <div class="input-group">
        <label>Adicionar bloco nesta seção</label>
        <div class="adicionar-blocos">
          ${Object.entries(TIPOS_BLOCO).map(([k, t]) => botaoAdd(`${p}.blocos`, 'bloco:' + k,
            t.nome.split(' ')[0], k === 'regua' && regua ? ' disabled title="Só é possível ter uma régua por código"' : '')).join('')}
        </div>
      </div>`;
    return caixa({ chave: s.id, drag: 'secoes', i, titulo: s.solta ? '(conteúdo solto)' : s.titulo,
      livePath: s.solta ? null : p + '.titulo', vazio: '(seção sem título)', extra: `<span class="row apertada">${chips}</span>`, corpo });
  }

  function renderBloco(b, p, j, arrPath) {
    const t = TIPOS_BLOCO[b.tipo];
    let corpo = '';
    let sub = '';
    if (b.tipo === 'texto') {
      sub = `${b.paragrafos.length} parágrafo(s)`;
      corpo = `<div class="lista-linhas">${b.paragrafos.map((_, k) => linha({ drag: p + '.paragrafos', i: k,
        corpo: entrada(`${p}.paragrafos.${k}`, { tipo: 'textarea', placeholder: 'Escreva o parágrafo…' }) })).join('')}</div>
        ${botaoAdd(p + '.paragrafos', 'paragrafo', 'Parágrafo')}`;
    }
    if (b.tipo === 'cartoes') {
      sub = `${b.cartoes.length} cartão(ões)`;
      corpo = `${campo(p + '.colunas', 'Disposição', { tipo: 'select', kind: 'colunas', opcoes: [
          ['auto', 'Automática (2 colunas, 1 no celular)'], ['1', '1 coluna'], ['2', '2 colunas fixas'], ['3', '3 colunas fixas']] })}
        <div class="lista">${b.cartoes.map((k, n) => renderCartao(k, `${p}.cartoes.${n}`, n, p + '.cartoes')).join('')}</div>
        ${botaoAdd(p + '.cartoes', 'cartao', 'Cartão')}`;
    }
    if (b.tipo === 'regua') { sub = `${b.acoes.length} ações`; corpo = renderRegua(b, p); }
    if (b.tipo === 'etapas') {
      sub = `${b.etapas.length} etapa(s)`;
      corpo = `<div class="lista-linhas">${b.etapas.map((e, k) => linha({ drag: p + '.etapas', i: k, classe: 'nivel-' + e.nivel, duplicar: true, corpo: `
          <div class="feature-linha">
            ${entrada(`${p}.etapas.${k}.nivel`, { tipo: 'select', kind: 'numero', opcoes: [['0', 'Neutra (cinza)'], ['1', 'Nível 1 (verde)'], ['2', 'Nível 2 (destaque)'], ['3', 'Nível 3 (vermelho)'], ['4', 'Nível 4 (vermelho intenso)']] })}
            ${entrada(`${p}.etapas.${k}.titulo`, { placeholder: 'Título da etapa' })}
          </div>
          ${entrada(`${p}.etapas.${k}.texto`, { tipo: 'textarea', placeholder: 'Descrição / efeito…' })}` })).join('')}</div>
        ${botaoAdd(p + '.etapas', 'etapa', 'Etapa')}`;
    }
    if (b.tipo === 'arvore') {
      sub = `${b.caminhos.length} caminho(s)`;
      corpo = `<div class="lista">${b.caminhos.map((cm, k) => {
        const cp = `${p}.caminhos.${k}`;
        return caixa({ chave: cm.id, drag: p + '.caminhos', i: k, titulo: cm.titulo, livePath: cp + '.titulo', vazio: '(caminho)',
          icon: 'alt_route', corpo: `
          ${row(campo(cp + '.titulo', 'Nome do caminho'),
            campo(cp + '.estilo', 'Cor', { tipo: 'select', opcoes: [['padrao', 'Destaque'], ['path-defense', 'Azul (defesa)'], ['path-offense', 'Vermelho (ataque)'], ['path-utility', 'Verde (utilidade)']] }))}
          <div class="lista-linhas">${cm.nos.map((no, n) => linha({ drag: cp + '.nos', i: n, classe: 'tier-' + no.tier, duplicar: true, corpo: `
            <div class="feature-linha">
              ${entrada(`${cp}.nos.${n}.tier`, { tipo: 'select', kind: 'numero', opcoes: [1, 2, 3, 4, 5].map((x) => [String(x), 'Tier ' + x]) })}
              ${entrada(`${cp}.nos.${n}.custo`, { placeholder: 'Custo (ex.: 50 EA)' })}
            </div>
            ${entrada(`${cp}.nos.${n}.nome`, { placeholder: 'Nome da habilidade' })}
            ${entrada(`${cp}.nos.${n}.texto`, { tipo: 'textarea', placeholder: 'Descrição…' })}` })).join('')}</div>
          ${botaoAdd(cp + '.nos', 'no', 'Habilidade')}` });
      }).join('')}</div>
      ${botaoAdd(p + '.caminhos', 'caminho', 'Caminho')}`;
    }
    if (b.tipo === 'html') {
      corpo = campo(p + '.html', 'Código HTML', { tipo: 'textarea', cls: 'mono',
        ajuda: 'Inserido exatamente como está. Útil para trechos que o editor não reconhece.' });
    }
    return caixa({ chave: b.id, drag: arrPath, i: j, titulo: t.nome, icon: t.icone,
      extra: sub ? `<span class="tech-title-sub">${sub}</span>` : '', corpo, duplicar: b.tipo !== 'regua' });
  }

  const ESTILOS_ITEM = [['normal', 'Normal'], ['destaque', 'Destaque (cor)'], ['nota', 'Nota (vermelho)']];

  function molduraAtual(k) {
    const achada = Object.entries(Gerador.MOLDURAS).find(([, [b, n]]) => b === (k.borda || '') && n === (k.corNome || ''));
    return achada ? achada[0] : 'personalizada';
  }

  function renderCartao(k, p, n, arrPath) {
    const moldura = molduraAtual(k);
    const chip = k.classe !== 'normal' ? `<span class="chip ${k.classe}">${k.classe === 'vantagem' ? 'Vantagem' : 'Restrição'}</span>` : '';
    const itens = k.itens.map((it, x) => linha({ drag: p + '.itens', i: x, classe: 'estilo-' + it.estilo, duplicar: true, corpo: `
      <div class="feature-linha">
        ${entrada(`${p}.itens.${x}.estilo`, { tipo: 'select', opcoes: ESTILOS_ITEM })}
        ${entrada(`${p}.itens.${x}.rotulo`, { placeholder: 'Nome em negrito (opcional)' })}
      </div>
      ${entrada(`${p}.itens.${x}.texto`, { tipo: 'textarea', placeholder: 'Descrição do efeito…' })}` })).join('');

    return caixa({ chave: k.id, drag: arrPath, i: n, titulo: k.nome, livePath: p + '.nome', vazio: '(cartão sem nome)',
      icon: 'style', extra: chip, corpo: `
      ${campo(p + '.nome', 'Nome do cartão')}
      ${row(
        campo(p + '.classe', 'Tipo', { tipo: 'select', opcoes: [['normal', 'Normal'], ['vantagem', 'Vantagem (+ verde)'], ['restricao', 'Restrição (− vermelho)']], rerender: true }),
        `<div class="input-group"><label for="mold-${k.id}">Moldura lateral</label>
          <select id="mold-${k.id}" data-moldura="${p}">
            ${[['nenhuma', 'Nenhuma'], ['dourada', 'Dourada'], ['vermelha', 'Vermelha (perigo)'], ['tema', 'Cor de destaque'], ['verde', 'Verde'], ['azul', 'Azul'], ['personalizada', 'Personalizada…']]
              .map(([v, t]) => `<option value="${v}"${v === moldura ? ' selected' : ''}>${t}</option>`).join('')}
          </select></div>`)}
      ${moldura === 'personalizada' ? `<div class="grade-cores">${campoCor(p + '.borda', 'Cor da borda')}${campoCor(p + '.corNome', 'Cor do nome')}</div>` : ''}
      ${campo(p + '.intro', 'Texto do cartão (opcional)', { tipo: 'textarea', cls: 'curto',
        ajuda: 'Parágrafo abaixo do nome. Deixe uma linha em branco para criar outro parágrafo.' })}
      <div class="subtitulo">Itens da lista <span class="contador">${k.itens.length}</span></div>
      <div class="lista-linhas">${itens}</div>
      ${botaoAdd(p + '.itens', 'item', 'Item')}
      ${campo(p + '.formato', 'Formato do HTML', { tipo: 'select', opcoes: [['padrao', 'Padrão novo (lista simples)'], ['classico', 'Clássico (school-desc)']],
        ajuda: 'Os dois funcionam; o clássico é o formato dos códigos antigos.' })}` });
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

  function renderRegua(b, p) {
    const estagios = b.estagios.map((e, k) => linha({ drag: p + '.estagios', i: k, classe: 'tipo-' + e.tipo, duplicar: true, corpo: `
      <div class="feature-linha">
        ${entrada(`${p}.estagios.${k}.tipo`, { tipo: 'select', opcoes: TIPOS_ESTAGIO })}
        ${entrada(`${p}.estagios.${k}.faixa`, { placeholder: 'Faixa (ex.: -99 a -90)' })}
      </div>
      ${entrada(`${p}.estagios.${k}.nome`, { placeholder: 'Nome do estágio (em negrito)' })}
      ${entrada(`${p}.estagios.${k}.efeito`, { tipo: 'textarea', placeholder: 'Efeito passivo / narrativo…' })}` })).join('');

    const acoes = b.acoes.map((a, k) => linha({ drag: p + '.acoes', i: k,
      classe: a.pontos < 0 ? 'negativo' : a.pontos > 0 ? 'positivo' : '', corpo: `
      <div class="feature-linha acao">
        ${entrada(`${p}.acoes.${k}.acao`, { placeholder: 'Descreva a ação…' })}
        ${entrada(`${p}.acoes.${k}.pontos`, { tipo: 'number' })}
      </div>` })).join('');

    return `
      ${campo(p + '.intro', 'Texto de introdução', { tipo: 'textarea', cls: 'curto' })}
      <div class="subtitulo">Régua</div>
      ${row(campo(p + '.regua.min', 'Mínimo', { tipo: 'number' }), campo(p + '.regua.rotuloMin', 'Nome do mínimo'))}
      ${row(campo(p + '.regua.max', 'Máximo', { tipo: 'number' }), campo(p + '.regua.rotuloMax', 'Nome do máximo'))}
      ${row(campo(p + '.regua.inicial', 'Pontos iniciais', { tipo: 'number' }), campo(p + '.regua.rotuloMarcador', 'Texto do marcador'), campo(p + '.regua.rotuloNeutro', 'Centro'))}
      <div class="regua-mini" data-regua="${p}">${reguaMini(b.regua)}</div>

      <div class="subtitulo">Estágios <span class="contador">${b.estagios.length}</span></div>
      ${campo(p + '.estagiosTitulo', 'Título da tabela de estágios')}
      ${row(campo(p + '.estagiosColunas.0', 'Coluna 1'), campo(p + '.estagiosColunas.1', 'Coluna 2'))}
      <div class="lista-linhas">${estagios}</div>
      ${botaoAdd(p + '.estagios', 'estagio', 'Estágio')}

      <div class="subtitulo">Ações e consequências <span class="contador">${b.acoes.length}</span></div>
      ${campo(p + '.acoesTitulo', 'Título da tabela de ações')}
      ${row(campo(p + '.acoesColunas.0', 'Coluna 1'), campo(p + '.acoesColunas.1', 'Coluna 2'))}
      <div class="resumo-acoes" data-resumo="${p}">${resumoAcoes(b.acoes)}</div>
      <div class="row apertada">
        <input type="search" data-filtro="${b.id}" placeholder="Filtrar ações…" value="${esc(filtros[b.id] || '')}">
        <button type="button" class="btn btn-secondary btn-add-bloco" style="width:auto" data-act="ordenar" data-path="${p}.acoes" data-modo="pontos" title="Ordenar por pontos">${icone('sort')}</button>
        <button type="button" class="btn btn-secondary btn-add-bloco" style="width:auto" data-act="ordenar" data-path="${p}.acoes" data-modo="alfa" title="Ordenar de A a Z">${icone('sort_by_alpha')}</button>
      </div>
      <div class="lista-linhas" data-lista-acoes="${b.id}">${acoes}</div>
      ${botaoAdd(p + '.acoes', 'acao', 'Ação')}`;
  }

  function aplicarFiltro(input) {
    const termo = input.value.trim().toLowerCase();
    filtros[input.dataset.filtro] = input.value;
    const lista = $(`[data-lista-acoes="${input.dataset.filtro}"]`, form);
    if (!lista) return;
    $$('.feature-item', lista).forEach((l) => {
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
    if (el.nodeName === 'TEXTAREA') autoAltura(el);
    const c = atual();

    let v = el.value;
    if (el.type === 'number') v = el.value === '' ? 0 : Number(el.value);
    if (el.type === 'checkbox') v = el.checked;
    if (el.dataset.kind === 'csv') v = el.value.split(',').map((t) => t.trim()).filter(Boolean);
    if (el.dataset.kind === 'numero') v = Number(el.value);
    if (el.dataset.kind === 'colunas') v = el.value === 'auto' ? 'auto' : Number(el.value);
    setPath(c, p, v);

    if (el.hasAttribute('data-rerender') || /\.classe$/.test(p)) {
      renderEditor();
      return alterou();
    }

    // Sincroniza outros campos ligados ao mesmo dado (ex.: seletor de cor + texto)
    $$(`[data-bind="${p}"]`, form).forEach((o) => {
      if (o === el) return;
      if (o.type === 'color' && !/^#[0-9a-f]{6}$/i.test(el.value)) return;
      o.value = el.value;
    });
    $$(`[data-live="${p}"]`, form).forEach((o) => { o.textContent = semMd(el.value) || o.dataset.vazio; });

    // Decorações ao vivo
    const linhaEl = el.closest('.feature-item');
    if (linhaEl) {
      if (/itens\.\d+\.estilo$/.test(p)) linhaEl.className = 'feature-item estilo-' + v;
      if (/estagios\.\d+\.tipo$/.test(p)) linhaEl.className = 'feature-item tipo-' + v;
      if (/etapas\.\d+\.nivel$/.test(p)) linhaEl.className = 'feature-item nivel-' + v;
      if (/nos\.\d+\.tier$/.test(p)) linhaEl.className = 'feature-item tier-' + v;
      if (/acoes\.\d+\.pontos$/.test(p)) {
        linhaEl.className = 'feature-item ' + (v < 0 ? 'negativo' : v > 0 ? 'positivo' : '');
        const bp = p.replace(/\.acoes\.\d+\.pontos$/, '');
        $(`[data-resumo="${bp}"]`, form).innerHTML = resumoAcoes(getPath(c, bp).acoes);
      }
    }
    if (/\.regua\./.test(p)) {
      const bp = p.replace(/\.regua\.[^.]+$/, '');
      $(`[data-regua="${bp}"]`, form).innerHTML = reguaMini(getPath(c, bp).regua);
    }
    if (p === 'cabecalho.svg') $('#svg-previa').innerHTML = v;
    if (p === 'nome') atualizarBarra();

    alterou();
  });

  form.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-moldura]');
    if (!sel) return;
    const k = getPath(atual(), sel.dataset.moldura);
    if (sel.value === 'personalizada') {
      if (!k.borda) k.borda = '#c5a059';
      if (!k.corNome) k.corNome = k.borda;
    } else {
      [k.borda, k.corNome] = Gerador.MOLDURAS[sel.value];
    }
    renderEditor();
    alterou();
  });

  const FABRICAS = {
    paragrafo: Gerador.novoParagrafo,
    cartao: () => Gerador.novoCartao({ itens: [Gerador.novoItem()] }),
    item: () => Gerador.novoItem(),
    estagio: Gerador.novoEstagio,
    acao: Gerador.novaAcao,
    etapa: Gerador.novaEtapa,
    caminho: Gerador.novoCaminho,
    no: Gerador.novoNo,
  };

  function fabricar(novo) {
    const [tipo, arg] = novo.split(':');
    if (tipo === 'secao') return Gerador.novaSecao(arg);
    if (tipo === 'bloco') return Gerador.novoBloco(arg);
    return FABRICAS[tipo]();
  }

  form.addEventListener('click', (e) => {
    // Menus suspensos
    const gatilho = e.target.closest('[data-menu]');
    if (gatilho) {
      e.preventDefault();
      const m = $('#' + gatilho.dataset.menu);
      const abrir = !m.classList.contains('aberto');
      fecharMenus();
      m.classList.toggle('aberto', abrir);
      return;
    }

    const b = e.target.closest('[data-act]');
    if (!b) {
      // Abrir/fechar caixas pelo cabeçalho
      const cab = e.target.closest('[data-toggle]');
      if (cab && !e.target.closest('.drag-handle')) {
        const item = cab.closest('.tech-builder-item');
        item.classList.toggle('open');
        if (item.classList.contains('open')) {
          abertos.add(item.dataset.key);
          $$('textarea', item).forEach(autoAltura);
        } else abertos.delete(item.dataset.key);
      }
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (b.disabled) return;
    fecharMenus();
    const c = atual();
    const arr = getPath(c, b.dataset.path);
    const i = Number(b.dataset.i);

    switch (b.dataset.act) {
      case 'adicionar': {
        const novo = fabricar(b.dataset.novo);
        arr.push(novo);
        const abrir = (x) => { if (x && x.id) abertos.add(x.id); };
        abrir(novo);
        (novo.blocos || []).forEach(abrir);
        focarDepois = `${b.dataset.path}.${arr.length - 1}`;
        if (/\.acoes$/.test(b.dataset.path)) delete filtros[getPath(c, b.dataset.path.replace(/\.acoes$/, '')).id];
        break;
      }
      case 'duplicar': {
        const copia = typeof arr[i] === 'object' ? clonar(arr[i]) : arr[i];
        arr.splice(i + 1, 0, copia);
        if (copia && copia.id) abertos.add(copia.id);
        break;
      }
      case 'remover': {
        const caixaEl = b.closest('.tech-builder-item');
        const grande = caixaEl && caixaEl.dataset.drag === b.dataset.path;
        if (grande) {
          confirmar('Excluir este bloco e todo o seu conteúdo?', 'Excluir').then((ok) => {
            if (!ok) return;
            arr.splice(i, 1);
            renderEditor();
            alterou();
          });
          return;
        }
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

  function fecharMenus() { $$('.menu.aberto').forEach((m) => m.classList.remove('aberto')); }
  document.addEventListener('click', (e) => { if (!e.target.closest('.menu-wrap')) fecharMenus(); });

  /* ---------- Arrastar e soltar (mouse e toque) ---------- */

  let arrasto = null;

  form.addEventListener('pointerdown', (e) => {
    const alca = e.target.closest('.drag-handle');
    if (!alca || e.button > 0) return;
    const item = alca.closest('[data-drag]');
    if (!item) return;
    e.preventDefault();
    arrasto = { item, path: item.dataset.drag, de: Number(item.dataset.i), para: null, alvo: null };
    item.classList.add('dragging');
    document.body.classList.add('arrastando');
    alca.setPointerCapture(e.pointerId);
  });

  form.addEventListener('pointermove', (e) => {
    if (!arrasto) return;
    if (arrasto.alvo) arrasto.alvo.classList.remove('over-antes', 'over-depois');
    arrasto.alvo = null;
    arrasto.para = null;
    const sob = document.elementFromPoint(e.clientX, e.clientY);
    const alvo = sob && sob.closest(`[data-drag="${arrasto.path}"]`);
    if (alvo && alvo !== arrasto.item) {
      const r = alvo.getBoundingClientRect();
      const depois = e.clientY > r.top + r.height / 2;
      alvo.classList.add(depois ? 'over-depois' : 'over-antes');
      arrasto.alvo = alvo;
      arrasto.para = Number(alvo.dataset.i) + (depois ? 1 : 0);
    }
    // Rolagem automática perto das bordas
    const noPainel = getComputedStyle(scrollEditor).overflowY === 'auto';
    const area = noPainel ? scrollEditor.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    const alvoRolagem = noPainel ? scrollEditor : document.scrollingElement;
    if (e.clientY < area.top + 50) alvoRolagem.scrollTop -= 12;
    else if (e.clientY > area.bottom - 50) alvoRolagem.scrollTop += 12;
  });

  function soltar() {
    if (!arrasto) return;
    const { item, path, de, alvo } = arrasto;
    let { para } = arrasto;
    item.classList.remove('dragging');
    if (alvo) alvo.classList.remove('over-antes', 'over-depois');
    document.body.classList.remove('arrastando');
    arrasto = null;
    if (para == null) return;
    if (para > de) para -= 1;
    if (para === de) return;
    const arr = getPath(atual(), path);
    const [movido] = arr.splice(de, 1);
    arr.splice(para, 0, movido);
    renderEditor();
    alterou();
  }
  form.addEventListener('pointerup', soltar);
  form.addEventListener('pointercancel', soltar);

  /* ---------- Saída (prévia e código) ---------- */

  let previaPronta = false;
  let linksPrevia = null;

  function ajustarAltura() {
    try {
      const d = iframe.contentDocument;
      if (d && d.body) iframe.style.height = Math.max(400, d.documentElement.scrollHeight) + 'px';
    } catch (e) { /* sem acesso */ }
  }

  function renderSaida() {
    const c = atual();
    saidaCodigo.value = Gerador.gerar(c, { compacto: db.compacto });

    const previa = Gerador.gerar(c);
    const links = (previa.match(/<link[^>]*>/g) || []).join('\n');
    const corpo = previa.replace(/<link[^>]*>\n?/g, '');
    const doc = iframe.contentDocument;

    // Atualiza só o conteúdo quando possível (evita piscar e reiniciar animações)
    if (previaPronta && links === linksPrevia && doc && doc.getElementById('raiz')) {
      if (!doc.getElementById('sem-animacao')) {
        doc.head.insertAdjacentHTML('beforeend', '<style id="sem-animacao">.section{animation:none!important;opacity:1!important}</style>');
      }
      doc.getElementById('raiz').innerHTML = corpo;
      ajustarAltura();
      return;
    }
    linksPrevia = links;
    previaPronta = false;
    iframe.onload = () => {
      previaPronta = true;
      ajustarAltura();
      try { iframe.contentDocument.fonts.ready.then(ajustarAltura); } catch (e) { /* ignore */ }
      setTimeout(ajustarAltura, 400);
      setTimeout(ajustarAltura, 1200);
    };
    // Onde links externos são bloqueados, uma cópia embutida do CSS pode ser fornecida (window.CSS_PREVIA_LOCAL)
    const cabeca = typeof window.CSS_PREVIA_LOCAL === 'string'
      ? links.replace(/<link[^>]*particularidades\.css[^>]*>/g, () => `<style>${window.CSS_PREVIA_LOCAL}</style>`)
      : links;
    iframe.srcdoc = `<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8">${cabeca}
<style>html,body{margin:0;background:transparent;overflow:hidden}body{padding:1px 0}</style></head>
<body><div id="raiz">${corpo}</div></body></html>`;
  }
  window.addEventListener('resize', debounce(ajustarAltura, 150));

  const salvarDepois = debounce(salvar, 400);
  const saidaDepois = debounce(renderSaida, 200);

  function alterou() {
    atual().atualizado = Date.now();
    salvarDepois();
    saidaDepois();
  }

  const chkCompacto = $('#compacto');
  chkCompacto.checked = !!db.compacto;
  chkCompacto.addEventListener('change', () => {
    db.compacto = chkCompacto.checked;
    salvar();
    saidaCodigo.value = Gerador.gerar(atual(), { compacto: db.compacto });
  });

  $('#btn-copiar').addEventListener('click', async () => {
    const codigo = Gerador.gerar(atual(), { compacto: db.compacto });
    try {
      await navigator.clipboard.writeText(codigo);
    } catch (e) {
      saidaCodigo.value = codigo;
      saidaCodigo.select();
      document.execCommand('copy');
    }
    aviso('Copiado com sucesso!');
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

  /* ---------- Gerenciar códigos ---------- */

  const selCodigo = $('#sel-codigo');

  function atualizarBarra() {
    selCodigo.innerHTML = db.codigos.map((c) =>
      `<option value="${c.id}"${c.id === db.atualId ? ' selected' : ''}>${esc(c.nome || 'sem nome')}</option>`).join('');
    $('#contagem').textContent = `${db.codigos.length} salvo(s)`;
  }

  function selecionar(id) {
    db.atualId = id;
    salvar();
    renderTudo();
  }

  selCodigo.addEventListener('change', () => selecionar(selCodigo.value));

  $('#btn-novo').addEventListener('click', () => {
    const c = Gerador.novoCodigo('Nova Particularidade');
    db.codigos.unshift(c);
    c.secoes.forEach((s) => abertos.add(s.id));
    focarDepois = 'cabecalho.titulo';
    selecionar(c.id);
    aviso('Código criado');
  });

  $('#btn-duplicar').addEventListener('click', () => {
    const c = atual();
    const copia = clonar(c);
    copia.nome = c.nome + ' (cópia)';
    copia.atualizado = Date.now();
    db.codigos.splice(db.codigos.indexOf(c) + 1, 0, copia);
    selecionar(copia.id);
    aviso('Código duplicado');
  });

  $('#btn-excluir').addEventListener('click', async () => {
    const c = atual();
    if (!await confirmar(`Excluir "${c.nome}"? Essa ação não pode ser desfeita.`, 'Excluir')) return;
    db.codigos = db.codigos.filter((x) => x.id !== c.id);
    if (!db.codigos.length) db.codigos.push(Gerador.novoCodigo());
    selecionar(db.codigos[0].id);
    aviso('Código excluído');
  });

  /* ---------- Confirmação (janela própria, sem confirm() do navegador) ---------- */

  const modalConfirmar = $('#modal-confirmar');
  let responderConfirmacao = null;

  function confirmar(mensagem, textoBotao = 'Confirmar') {
    if (responderConfirmacao) responderConfirmacao(false);
    $('#texto-confirmar').textContent = mensagem;
    $('#btn-confirmar-sim').textContent = textoBotao;
    modalConfirmar.classList.add('aberto');
    $('#btn-confirmar-nao').focus();
    return new Promise((resolve) => { responderConfirmacao = resolve; });
  }

  function fecharConfirmacao(ok) {
    modalConfirmar.classList.remove('aberto');
    const r = responderConfirmacao;
    responderConfirmacao = null;
    if (r) r(ok);
  }

  $('#btn-confirmar-sim').addEventListener('click', () => fecharConfirmacao(true));
  $('#btn-confirmar-nao').addEventListener('click', () => fecharConfirmacao(false));
  modalConfirmar.addEventListener('click', (e) => { if (e.target === modalConfirmar) fecharConfirmacao(false); });

  /* ---------- Importar código colado ---------- */

  const modal = $('#modal-importar');
  function abrirModal(abrir) {
    modal.classList.toggle('aberto', abrir);
    if (abrir) {
      $('#texto-importar').value = '';
      $('#erro-importar').hidden = true;
      $('#texto-importar').focus();
    }
  }
  $('#btn-importar').addEventListener('click', () => abrirModal(true));
  $$('[data-fechar-modal]').forEach((b) => b.addEventListener('click', () => abrirModal(false)));
  modal.addEventListener('click', (e) => { if (e.target === modal) abrirModal(false); });

  async function importarTexto(substituir) {
    const txt = $('#texto-importar').value.trim();
    const erro = $('#erro-importar');
    if (!txt) { erro.textContent = 'Cole o código primeiro.'; erro.hidden = false; return; }
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
      if (!await confirmar(`Substituir todo o conteúdo de "${a.nome}" pelo código colado?`, 'Substituir')) return;
      c.id = a.id;
      db.codigos[db.codigos.indexOf(a)] = c;
    } else {
      db.codigos.unshift(c);
    }
    c.atualizado = Date.now();
    abrirModal(false);
    selecionar(c.id);
    const livres = c.secoes.flatMap((s) => s.blocos).filter((b) => b.tipo === 'html').length;
    aviso(livres ? `Importado! ${livres} trecho(s) viraram HTML livre.` : 'Código importado — confira os campos!');
  }

  $('#btn-importar-novo').addEventListener('click', () => importarTexto(false));
  $('#btn-substituir').addEventListener('click', () => importarTexto(true));

  /* ---------- Backup ---------- */

  $('#btn-backup').addEventListener('click', () => {
    const data = new Date().toISOString().slice(0, 10);
    baixar(JSON.stringify({ versao: 2, codigos: db.codigos }, null, 2), `backup-codigos-${data}.json`, 'application/json');
  });

  $('#arquivo-backup').addEventListener('change', async (e) => {
    const arq = e.target.files[0];
    e.target.value = '';
    if (!arq) return;
    try {
      const dados = JSON.parse(await arq.text());
      const lista = Array.isArray(dados) ? dados : dados.codigos;
      if (!Array.isArray(lista) || !lista.every((c) => c && Array.isArray(c.secoes) && c.cabecalho)) throw new Error('formato');
      const ids = new Set(db.codigos.map((c) => c.id));
      lista.map(Gerador.migrar).forEach((c) => { if (ids.has(c.id)) c.id = Gerador.uid(); db.codigos.push(c); });
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

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      salvar();
      aviso('Tudo salvo');
    }
    if (e.key === 'Escape') {
      if (responderConfirmacao) return fecharConfirmacao(false);
      abrirModal(false);
      fecharMenus();
    }
  });

  function renderTudo() {
    renderEditor();
    renderSaida();
  }

  salvar();
  renderTudo();
})();
