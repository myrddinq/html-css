/*
 * Gerador: transforma os dados do formulário em código HTML/CSS
 * e faz o caminho inverso (lê um código colado e preenche os campos).
 *
 * Modelo: código -> seções -> blocos. Cada seção tem um título e uma
 * lista de blocos (parágrafos, cartões, régua, etapas, árvore ou HTML livre),
 * seguindo os componentes do particularidades.css.
 */
const Gerador = (() => {
  const CSS_BASE = 'https://gaaaaaaaaabs.github.io/goldenagerepositor.io/particularidades.css';
  const CSS_PADRAO = CSS_BASE + '?v=1';

  const SVG_PADRAO = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="3"/>
  <circle cx="50" cy="50" r="5" fill="currentColor"/>
</svg>`;

  const CORES_PADRAO = {
    fundo: '#111111',
    cartao: '#1a1a1a',
    texto: '#f0f0f0',
    destaque: '#9b59b6',
    borda: '#333333',
  };

  // Molduras laterais prontas para os cartões (borda, cor do nome)
  const MOLDURAS = {
    nenhuma: ['', ''],
    dourada: ['var(--gold, #c5a059)', 'var(--gold, #c5a059)'],
    vermelha: ['#8b0000', '#ff4d4d'],
    tema: ['var(--highlight)', 'var(--highlight)'],
    verde: ['var(--success)', 'var(--success)'],
    azul: ['var(--blue)', 'var(--blue)'],
  };

  const uid = () => Math.random().toString(36).slice(2, 10);

  /* ---------- Modelos em branco ---------- */

  const novoItem = (rotulo = '', texto = '') => ({ id: uid(), estilo: 'normal', rotulo, texto });
  const novoCartao = (o = {}) => ({
    id: uid(), nome: 'Novo cartão', classe: 'normal', borda: '', corNome: '',
    formato: 'padrao', intro: '', itens: [], ...o,
  });
  const novoEstagio = () => ({ id: uid(), faixa: '', tipo: 'neutro', nome: '', efeito: '' });
  const novaAcao = () => ({ id: uid(), acao: '', pontos: 0 });
  const novaEtapa = () => ({ id: uid(), nivel: 1, titulo: 'Nova etapa', texto: '' });
  const novoNo = () => ({ id: uid(), nome: 'Nova habilidade', custo: '', tier: 1, texto: '' });
  const novoCaminho = () => ({ id: uid(), titulo: 'Novo caminho', estilo: 'padrao', nos: [novoNo()] });
  const novoParagrafo = () => '';

  function novoBloco(tipo) {
    switch (tipo) {
      case 'texto':
        return { id: uid(), tipo, paragrafos: [''] };
      case 'cartoes':
        return { id: uid(), tipo, colunas: 'auto', cartoes: [novoCartao({ itens: [novoItem()] })] };
      case 'regua':
        return {
          id: uid(), tipo,
          intro: 'Todos os portadores iniciam o jogo com **0 Pontos**.',
          regua: { min: -100, rotuloMin: 'Queda', rotuloNeutro: 'Neutro', max: 100, rotuloMax: 'Ascensão', inicial: 0, rotuloMarcador: 'INÍCIO' },
          estagiosTitulo: 'Estágios de Sincronia',
          estagiosColunas: ['Pontuação', 'Efeito Passivo / Narrativo'],
          estagios: [novoEstagio()],
          acoesTitulo: 'Tabela de Ações e Consequências',
          acoesColunas: ['Ação', 'Impacto na Régua'],
          acoes: [novaAcao()],
        };
      case 'etapas':
        return { id: uid(), tipo, etapas: [novaEtapa()] };
      case 'arvore':
        return { id: uid(), tipo, caminhos: [
          { ...novoCaminho(), titulo: 'Defesa', estilo: 'path-defense' },
          { ...novoCaminho(), titulo: 'Ataque', estilo: 'path-offense' },
          { ...novoCaminho(), titulo: 'Utilidade', estilo: 'path-utility' },
        ] };
      default:
        return { id: uid(), tipo: 'html', html: '<p class="lead">Conteúdo...</p>' };
    }
  }

  // Modelos prontos de seção (botões "Adicionar seção")
  function novaSecao(modelo) {
    const s = (titulo, blocos) => ({ id: uid(), titulo, blocos });
    switch (modelo) {
      case 'texto': return s('Definição', [novoBloco('texto')]);
      case 'regras': return s('Regras da Particularidade', [{
        id: uid(), tipo: 'cartoes', colunas: 'auto', cartoes: [
          novoCartao({ nome: 'Vantagens Mecânicas', classe: 'vantagem', itens: [novoItem('Nome da vantagem', 'Descrição.')] }),
          novoCartao({ nome: 'Restrições Mecânicas', classe: 'restricao', itens: [novoItem('Nome da restrição', 'Descrição.')] }),
        ] }]);
      case 'destaque': return s('Nova Seção', [
        { id: uid(), tipo: 'texto', paragrafos: ['Texto de introdução da seção.'] },
        { id: uid(), tipo: 'cartoes', colunas: 1, cartoes: [novoCartao({
          nome: 'Título do cartão', borda: MOLDURAS.dourada[0], corNome: MOLDURAS.dourada[1], intro: 'Descrição do cartão.' })] },
      ]);
      case 'regua': return s('Ressonância da Alma', [novoBloco('regua')]);
      case 'etapas': return s('Estágios de Influência', [novoBloco('etapas')]);
      case 'arvore': return s('Árvore de Habilidades', [novoBloco('arvore')]);
      case 'html': return s('Seção livre', [novoBloco('html')]);
      default: return s('Nova Seção', []);
    }
  }

  function novoCodigo(nome = 'Novo código') {
    return {
      id: uid(),
      versao: 2,
      nome,
      atualizado: Date.now(),
      cssLink: CSS_PADRAO,
      estilo: { ativo: false, cores: { ...CORES_PADRAO }, extra: '' },
      cabecalho: { titulo: nome, subtitulo: '', tags: ['Particularidade'], svg: SVG_PADRAO },
      secoes: [novaSecao('texto'), novaSecao('regras')],
    };
  }

  // Converte códigos salvos na versão anterior do gerenciador
  function migrar(c) {
    if (c.versao === 2) return c;
    const n = novoCodigo(c.nome);
    n.id = c.id;
    n.atualizado = c.atualizado || Date.now();
    n.cssLink = c.cssLink ?? n.cssLink;
    n.cabecalho = c.cabecalho || n.cabecalho;
    n.estilo = { ativo: true, cores: { ...CORES_PADRAO, ...(c.cores || {}) }, extra: '' };
    n.secoes = (c.secoes || []).map((s) => {
      let bloco;
      if (s.tipo === 'texto') bloco = { id: uid(), tipo: 'texto', paragrafos: s.paragrafos || [] };
      else if (s.tipo === 'cartoes') {
        bloco = { id: uid(), tipo: 'cartoes', colunas: s.colunas || 1,
          cartoes: (s.cartoes || []).map((k) => novoCartao({ ...k, formato: 'classico' })) };
      } else if (s.tipo === 'ressonancia') {
        const { titulo, tipo, ...resto } = s;
        bloco = { ...resto, id: uid(), tipo: 'regua' };
      } else bloco = { id: uid(), tipo: 'html', html: s.html || '' };
      return { id: s.id || uid(), titulo: s.titulo || '', blocos: [bloco] };
    });
    return n;
  }

  /* ---------- Utilitários de texto ---------- */

  // **negrito**, *itálico* e quebras de linha -> HTML
  function md(txt) {
    return String(txt ?? '')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<i>$2</i>')
      .replace(/\r?\n/g, '<br>');
  }

  // HTML -> **negrito**, *itálico*; decodifica entidades se não sobrar HTML
  function paraMd(html) {
    let s = String(html ?? '').trim()
      .replace(/\s*<br\s*\/?>\s*/gi, '\n')
      .replace(/<(b|strong)>([\s\S]*?)<\/\1>/gi, '**$2**')
      .replace(/<(i|em)>([\s\S]*?)<\/\1>/gi, '*$2*');
    if (!/<[a-z!/]/i.test(s)) {
      const t = document.createElement('textarea');
      t.innerHTML = s;
      s = t.value;
    }
    return s.replace(/[ \t]+/g, ' ');
  }

  // Adiciona ":" ao rótulo, a menos que já termine com pontuação
  const rotulo = (r) => (/[.:!?]$/.test(r.trim()) ? r.trim() : r.trim() + ':');
  const sinal = (n) => (n > 0 ? '+' + n : String(n));
  const attr = (s) => String(s ?? '').replace(/"/g, '&quot;');

  function rgb(hex) {
    let h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (!/^[0-9a-f]{6}$/i.test(h)) return '155, 89, 182';
    const n = parseInt(h, 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
  }

  const blocos = (c) => c.secoes.flatMap((s) => s.blocos || []);
  const blocoRegua = (c) => blocos(c).find((b) => b.tipo === 'regua');
  const ind = (txt, n) => txt.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');

  /* ---------- Geração: CSS ---------- */

  function cssCores(k) {
    const hl = rgb(k.destaque);
    return `.rpg-card {
  --bg-color: ${k.fundo};
  --card-bg: ${k.cartao};
  --text-color: ${k.texto};
  --highlight: ${k.destaque};
  --highlight-dim: rgba(${hl}, 0.1);
  --border-color: ${k.borda};
  background-color: var(--bg-color) !important;
  color: var(--text-color) !important;
  border: 1px solid var(--border-color);
}
.new-header { border-bottom: 1px solid var(--border-color) !important; }
.new-header .title span.g { color: var(--highlight) !important; text-shadow: 0 0 10px rgba(${hl}, 0.3); }
.new-header .subtitle-line { color: #888 !important; }
.header-svg-container svg { stroke: var(--highlight) !important; filter: drop-shadow(0 0 5px rgba(${hl}, 0.5)); }
.header-svg-container circle, .header-svg-container path { fill: transparent !important; stroke: var(--highlight) !important; }
.tag-container .tag { background: var(--highlight) !important; color: #fff !important; }
.h .name { color: var(--highlight) !important; border-left: 3px solid var(--highlight) !important; }
.rules-card { background: var(--card-bg) !important; border: 1px solid var(--border-color) !important; }
.rules-name { color: var(--highlight) !important; }
.school-desc ul li::before { color: var(--highlight) !important; }`;
  }

  function cssRegua(g, destaque) {
    const hl = rgb(destaque);
    const faixa = Number(g.max) - Number(g.min) || 1;
    let pos = ((Number(g.inicial) - Number(g.min)) / faixa) * 100;
    pos = Math.max(0, Math.min(100, Math.round(pos * 100) / 100));
    const marcador = `${g.rotuloMarcador} (${sinal(Number(g.inicial))})`.replace(/"/g, '\\"');
    return `.alignment-wrapper { margin: 20px 0; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid #333; }
.alignment-bar-container { height: 30px; background: linear-gradient(90deg, #c0392b 0%, #2c3e50 50%, #27ae60 100%); border-radius: 15px; position: relative; margin-bottom: 10px; box-shadow: inset 0 0 10px #000; }
.alignment-marker { position: absolute; top: -5px; bottom: -5px; width: 4px; background: #fff; left: ${pos}%; box-shadow: 0 0 10px #fff; z-index: 2; }
.alignment-marker::after { content: "${marcador}"; position: absolute; top: -25px; left: 50%; transform: translateX(-50%); font-size: 0.7em; color: #fff; white-space: nowrap; font-weight: bold; }
.alignment-labels { display: flex; justify-content: space-between; font-size: 0.8em; font-weight: bold; text-transform: uppercase; }
.alignment-table { width: 100%; border-collapse: collapse; font-size: 0.85em; margin-top: 15px; }
.alignment-table th { background: rgba(${hl}, 0.15); color: var(--highlight); padding: 8px; text-align: left; border: 1px solid #444; }
.alignment-table td { padding: 8px; border: 1px solid #444; color: #ccc; }
.alignment-table tr:nth-child(even) { background: rgba(255,255,255,0.02); }
.evil-score { color: #e74c3c; font-weight: bold; }
.good-score { color: #2ecc71; font-weight: bold; }`;
  }

  function gerarCSS(c) {
    const partes = [];
    const e = c.estilo || {};
    if (e.ativo) partes.push(cssCores(e.cores));
    const r = blocoRegua(c);
    if (r) partes.push(cssRegua(r.regua, (e.cores || CORES_PADRAO).destaque));
    if (e.extra && e.extra.trim()) partes.push(e.extra.trim());
    return partes.join('\n');
  }

  /* ---------- Geração: HTML ---------- */

  function gerarCabecalho(h) {
    const tags = (h.tags || []).filter((t) => t.trim())
      .map((t) => `<span class="tag">${md(t.trim())}</span>`).join(' ');
    return `<div class="new-header">
  <div class="header-svg-container">
${ind((h.svg || '').trim(), 4)}
  </div>
  <div class="title"><span class="g">${md(h.titulo)}</span></div>
  <div class="subtitle-line">${md(h.subtitulo)}</div>
  <div class="tag-container">${tags}</div>
</div>`;
  }

  function gerarItem(it, classico) {
    const base = classico ? 'margin-bottom: 8px;' : '';
    const lbl = it.rotulo && it.rotulo.trim() ? `<b>${md(rotulo(it.rotulo))}</b> ` : '';
    const st = (extra) => {
      const s = [base, extra].filter(Boolean).join(' ');
      return s ? ` style="${s}"` : '';
    };
    if (it.estilo === 'nota') return `<li${st('color:#e74c3c;')}><i>${lbl}${md(it.texto)}</i></li>`;
    if (it.estilo === 'destaque') return `<li${st('color:var(--highlight);')}>${lbl}${md(it.texto)}</li>`;
    return `<li${st('')}>${lbl}${md(it.texto)}</li>`;
  }

  const paragrafosIntro = (txt) => String(txt || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  function gerarCartao(k) {
    const cls = ['rules-card', k.classe === 'vantagem' || k.classe === 'restricao' ? k.classe : ''].filter(Boolean).join(' ');
    const stCard = k.borda && k.borda.trim() ? ` style="border-left: 4px solid ${attr(k.borda.trim())};"` : '';
    const stNome = k.corNome && k.corNome.trim() ? ` style="color: ${attr(k.corNome.trim())};"` : '';
    const nome = `<div class="rules-name"${stNome}>${md(k.nome)}</div>`;
    const itens = (k.itens || []).map((it) => gerarItem(it, k.formato === 'classico'));

    if (k.formato === 'classico') {
      const intro = paragrafosIntro(k.intro).map((p) => `\n    <p style="margin: 0 0 8px 0;">${md(p)}</p>`).join('');
      const lista = itens.length
        ? `\n    <ul style="padding-left: 15px; margin: 0; list-style: none; font-size: 0.9em; color: var(--text);">\n${ind(itens.join('\n'), 6)}\n    </ul>`
        : '';
      return `<div class="${cls}"${stCard}>
  ${nome}
  <div class="school-desc" style="margin-top: 0;">${intro}${lista}
  </div>
</div>`;
    }

    const intro = paragrafosIntro(k.intro).map((p) => `\n  <p style="margin: 5px 0 0 0; font-size: 0.95rem;">${md(p)}</p>`).join('');
    const lista = itens.length ? `\n  <ul>\n${ind(itens.join('\n'), 4)}\n  </ul>` : '';
    return `<div class="${cls}"${stCard}>
  ${nome}${intro}${lista}
</div>`;
  }

  function gerarRegua(s) {
    const g = s.regua;
    const meio = Math.round((Number(g.min) + Number(g.max)) / 2);
    const est = s.estagios.map((e) => {
      const cel = e.tipo === 'maligno' ? '<td class="evil-score">'
        : e.tipo === 'benigno' ? '<td class="good-score">' : '<td style="color:#888;">';
      const nome = e.nome && e.nome.trim() ? `<b>${md(rotulo(e.nome))}</b> ` : '';
      return `<tr>\n  ${cel}${md(e.faixa)}</td>\n  <td>${nome}${md(e.efeito)}</td>\n</tr>`;
    }).join('\n');
    const aco = s.acoes.map((a) => {
      const p = Number(a.pontos) || 0;
      const cel = p < 0 ? '<td class="evil-score">' : p > 0 ? '<td class="good-score">' : '<td style="color:#888;">';
      return `<tr>\n  <td>${md(a.acao)}</td>\n  ${cel}${sinal(p)} ${Math.abs(p) === 1 ? 'Ponto' : 'Pontos'}</td>\n</tr>`;
    }).join('\n');
    const [ec1, ec2] = s.estagiosColunas;
    const [ac1, ac2] = s.acoesColunas;
    const blocoEst = s.estagios.length ? `
<p style="margin: 15px 0 5px 0; font-weight:bold; color:var(--highlight);">${md(s.estagiosTitulo)}</p>
<table class="alignment-table">
  <thead>
    <tr>
      <th width="20%">${md(ec1)}</th>
      <th>${md(ec2)}</th>
    </tr>
  </thead>
  <tbody>
${ind(est, 4)}
  </tbody>
</table>` : '';
    const blocoAco = s.acoes.length ? `
<p style="margin: 20px 0 5px 0; font-weight:bold; color:var(--highlight);">${md(s.acoesTitulo)}</p>
<table class="alignment-table">
  <thead>
    <tr>
      <th>${md(ac1)}</th>
      <th>${md(ac2)}</th>
    </tr>
  </thead>
  <tbody>
${ind(aco, 4)}
  </tbody>
</table>` : '';
    const corpo = `<p style="margin: 0 0 10px 0;">${md(s.intro)}</p>
<div class="alignment-wrapper">
  <div class="alignment-bar-container">
    <div class="alignment-marker"></div>
  </div>
  <div class="alignment-labels">
    <span style="color:#e74c3c;">${sinal(Number(g.min))} (${md(g.rotuloMin)})</span>
    <span style="color:#bdc3c7;">${sinal(meio)} (${md(g.rotuloNeutro)})</span>
    <span style="color:#2ecc71;">${sinal(Number(g.max))} (${md(g.rotuloMax)})</span>
  </div>
</div>${blocoEst}${blocoAco}`;
    return `<div class="rules-card" style="margin-top: 10px;">
  <div class="school-desc">
${ind(corpo, 4)}
  </div>
</div>`;
  }

  function gerarBloco(b) {
    switch (b.tipo) {
      case 'texto':
        return b.paragrafos.filter((p) => p.trim())
          .map((p, i) => `<p class="lead"${i ? ' style="margin-top:10px;"' : ''}>${md(p)}</p>`).join('\n');
      case 'cartoes': {
        const n = Number(b.colunas);
        const st = b.colunas === 'auto' || !n ? '' : ` style="grid-template-columns: ${n === 1 ? '1fr' : `repeat(${n}, 1fr)`};"`;
        return `<div class="rules-grid"${st}>\n${ind(b.cartoes.map(gerarCartao).join('\n'), 2)}\n</div>`;
      }
      case 'regua':
        return gerarRegua(b);
      case 'etapas':
        return `<ul class="influence-stepper">\n${ind(b.etapas.map((e) => {
          const nv = Number(e.nivel) ? ` level-${Number(e.nivel)}` : '';
          return `<li class="influence-step${nv}">
  <div class="influence-step-title">${md(e.titulo)}</div>
  <div class="influence-step-content">${md(e.texto)}</div>
</li>`;
        }).join('\n'), 2)}\n</ul>`;
      case 'arvore':
        return `<div class="skill-tree-grid">\n${ind(b.caminhos.map((cm) => {
          const cls = cm.estilo && cm.estilo !== 'padrao' ? ` ${cm.estilo}` : '';
          const nos = cm.nos.map((no) => `<div class="skill-node" data-tier="${Number(no.tier) || 1}">
  ${no.custo && String(no.custo).trim() ? `<span class="skill-cost">${md(no.custo)}</span>` : ''}<span class="skill-name">${md(no.nome)}</span>
  <div class="skill-desc">${md(no.texto)}</div>
</div>`).join('\n');
          return `<div class="skill-path${cls}">
  <div class="skill-path-title">${md(cm.titulo)}</div>
${ind(nos, 2)}
</div>`;
        }).join('\n'), 2)}\n</div>`;
      default:
        return (b.html || '').trim();
    }
  }

  function gerarSecao(s) {
    const corpo = (s.blocos || []).map(gerarBloco).filter(Boolean).join('\n');
    if (s.solta) return corpo;
    const h = s.titulo && s.titulo.trim() ? `<div class="h"><div class="name">${md(s.titulo)}</div></div>\n` : '';
    return `<div class="section">\n${ind(h + corpo, 2)}\n</div>`;
  }

  function gerar(c, { compacto = false } = {}) {
    const link = c.cssLink && c.cssLink.trim()
      ? `<link href="${attr(c.cssLink.trim())}" rel="stylesheet" type="text/css">\n` : '';
    const css = gerarCSS(c);
    const style = css ? `<style>\n${ind(css, 2)}\n</style>\n` : '';
    const secoes = c.secoes.map(gerarSecao).join('\n');
    let out = `${link}${style}<div class="rpg-card">
${ind(gerarCabecalho(c.cabecalho), 2)}
  <div class="main-content">
${ind(secoes, 4)}
  </div>
</div>
`;
    if (compacto) out = out.replace(/\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
    return out;
  }

  /* ---------- Importação (código -> campos) ---------- */

  // Seletores que o próprio gerador cria; o resto do <style> vira "CSS adicional"
  let seletoresConhecidos = null;
  function regrasCSS(css) {
    if (typeof CSSStyleSheet === 'undefined' || !CSSStyleSheet.prototype.replaceSync) return null;
    const folha = new CSSStyleSheet();
    folha.replaceSync(css.replace(/@import[^;]+;/g, ''));
    return [...folha.cssRules];
  }
  function conhecidos() {
    if (!seletoresConhecidos) {
      const regras = regrasCSS(cssCores(CORES_PADRAO) + '\n' + cssRegua(novoBloco('regua').regua, '#000000')) || [];
      seletoresConhecidos = new Set(regras.map((r) => r.selectorText).filter(Boolean));
    }
    return seletoresConhecidos;
  }

  function importar(codigo) {
    const doc = new DOMParser().parseFromString(`<body>${codigo}</body>`, 'text/html');
    const card = doc.querySelector('.rpg-card');
    if (!card) throw new Error('Não encontrei um bloco <div class="rpg-card"> no código colado.');

    const c = novoCodigo();
    c.secoes = [];

    const link = doc.querySelector('link[rel="stylesheet"]');
    c.cssLink = link ? link.getAttribute('href') : '';

    // CSS: cores conhecidas + o que sobrar vira CSS adicional
    const css = [...doc.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    const v = (nome) => (css.match(new RegExp(`--${nome}\\s*:\\s*([^;]+);`)) || [])[1]?.trim();
    c.estilo = {
      ativo: /--highlight\s*:/.test(css) && /--bg-color\s*:/.test(css),
      cores: {
        fundo: v('bg-color') || CORES_PADRAO.fundo,
        cartao: v('card-bg') || CORES_PADRAO.cartao,
        texto: v('text-color') || CORES_PADRAO.texto,
        destaque: v('highlight') || CORES_PADRAO.destaque,
        borda: v('border-color') || CORES_PADRAO.borda,
      },
      extra: '',
    };
    if (css.trim()) {
      const imports = (css.match(/@import[^;]+;/g) || []).join('\n');
      const regras = regrasCSS(css);
      if (regras) {
        const extra = regras.filter((r) => !conhecidos().has(r.selectorText)).map((r) => r.cssText);
        c.estilo.extra = [imports, ...extra].filter(Boolean).join('\n');
      }
    }

    const txt = (sel, raiz = card) => paraMd(raiz.querySelector(sel)?.innerHTML || '');
    const svg = card.querySelector('.header-svg-container');
    c.cabecalho = {
      titulo: card.querySelector('.title .g') ? txt('.title .g') : txt('.title'),
      subtitulo: txt('.subtitle-line'),
      tags: [...card.querySelectorAll('.tag-container .tag')].map((t) => paraMd(t.innerHTML)),
      svg: svg ? svg.innerHTML.trim().replace(/>\s+</g, '>\n  <').replace(/\n  <\/svg>/, '\n</svg>') : '',
    };
    c.nome = c.cabecalho.titulo.replace(/\*/g, '') || 'Código importado';

    const main = card.querySelector('.main-content') || card;
    [...main.children].forEach((el) => {
      if (el.classList.contains('new-header')) return;
      if (el.classList.contains('section')) c.secoes.push(lerSecao(el, css));
      else c.secoes.push({ id: uid(), titulo: '', solta: true, blocos: [{ id: uid(), tipo: 'html', html: el.outerHTML }] });
    });
    return c;
  }

  function lerSecao(sec, css) {
    const s = { id: uid(), titulo: '', blocos: [] };
    let pendente = [];
    let anterior = null;
    const fechar = () => {
      if (pendente.length) s.blocos.push({ id: uid(), tipo: 'html', html: pendente.join('\n') });
      pendente = [];
    };
    const add = (b) => { fechar(); s.blocos.push(b); anterior = b; };

    sec.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        if (n.textContent.trim()) { pendente.push(n.textContent.trim()); anterior = null; }
        return;
      }
      if (n.nodeType !== 1) return;
      if (n.classList.contains('h') && !s.titulo && !s.blocos.length) {
        s.titulo = paraMd(n.querySelector('.name')?.innerHTML || n.innerHTML);
        return;
      }
      if (n.matches('p.lead')) {
        if (anterior && anterior.tipo === 'texto' && !pendente.length) anterior.paragrafos.push(paraMd(n.innerHTML));
        else add({ id: uid(), tipo: 'texto', paragrafos: [paraMd(n.innerHTML)] });
        return;
      }
      if (n.querySelector('.alignment-wrapper, .alignment-table')) return add(lerRegua(n, css));
      if (n.matches('.rules-grid')) {
        const b = lerCartoes(n);
        if (b) return add(b);
      }
      if (n.matches('ul.influence-stepper, ol.influence-stepper')) return add(lerEtapas(n));
      if (n.matches('.skill-tree-grid')) return add(lerArvore(n));
      pendente.push(n.outerHTML);
      anterior = null;
    });
    fechar();
    return s;
  }

  function separarRotulo(el) {
    // Retorna { rotulo, texto } quando o elemento começa com <b>Rótulo:</b>
    const primeiro = [...el.childNodes].find((n) => n.nodeType !== 3 || n.textContent.trim());
    if (primeiro && (primeiro.nodeName === 'B' || primeiro.nodeName === 'STRONG')) {
      const r = paraMd(primeiro.innerHTML).replace(/:\s*$/, '');
      const clone = el.cloneNode(true);
      const b = [...clone.childNodes].find((n) => n.nodeType !== 3 || n.textContent.trim());
      b.remove();
      return { rotulo: r, texto: paraMd(clone.innerHTML) };
    }
    return { rotulo: '', texto: paraMd(el.innerHTML) };
  }

  const estiloRaw = (el, prop) => {
    const m = (el?.getAttribute('style') || '').match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i'));
    return m ? m[1].trim() : '';
  };

  function lerItem(li) {
    const cor = estiloRaw(li, 'color').replace(/\s/g, '');
    let estilo = 'normal';
    let alvo = li;
    const soItalico = li.children.length === 1 && li.firstElementChild.nodeName === 'I'
      && li.textContent.trim() === li.firstElementChild.textContent.trim();
    if (/e74c3c|231,76,60|red/i.test(cor) || soItalico) {
      estilo = 'nota';
      if (soItalico) alvo = li.firstElementChild;
    } else if (cor) {
      estilo = 'destaque';
    }
    return { id: uid(), estilo, ...separarRotulo(alvo) };
  }

  // Retorna null se o grid tiver algo que o editor não sabe representar
  function lerCartoes(grid) {
    const gtc = estiloRaw(grid, 'grid-template-columns');
    let colunas = 'auto';
    if (gtc) {
      const rep = gtc.match(/repeat\((\d+)/);
      colunas = rep ? Number(rep[1]) : (gtc.match(/1fr/g) || [1]).length;
    }
    const cartoes = [];
    for (const rc of grid.children) {
      if (!rc.classList.contains('rules-card')) return null;
      const desc = rc.querySelector(':scope > .school-desc');
      const raiz = desc || rc;
      const permitidos = desc ? ['P', 'UL'] : ['P', 'UL'];
      const filhos = [...raiz.children].filter((x) => !x.classList.contains('rules-name'));
      if (filhos.some((x) => !permitidos.includes(x.nodeName)) || (desc && [...rc.children].some((x) => x !== desc && !x.classList.contains('rules-name')))) return null;
      if (rc.querySelectorAll('ul').length > 1) return null;
      const nomeEl = rc.querySelector('.rules-name');
      cartoes.push(novoCartao({
        nome: paraMd(nomeEl?.innerHTML || ''),
        classe: rc.classList.contains('vantagem') ? 'vantagem' : rc.classList.contains('restricao') ? 'restricao' : 'normal',
        borda: (estiloRaw(rc, 'border-left').match(/solid\s+(.+)$/i) || [])[1] || '',
        corNome: estiloRaw(nomeEl, 'color'),
        formato: desc ? 'classico' : 'padrao',
        intro: [...raiz.querySelectorAll(':scope > p')].map((p) => paraMd(p.innerHTML)).join('\n\n'),
        itens: [...raiz.querySelectorAll(':scope > ul > li')].map(lerItem),
      }));
    }
    return { id: uid(), tipo: 'cartoes', colunas, cartoes };
  }

  function lerEtapas(ul) {
    return {
      id: uid(), tipo: 'etapas',
      etapas: [...ul.querySelectorAll(':scope > .influence-step')].map((li) => ({
        id: uid(),
        nivel: Number((li.className.match(/level-(\d)/) || [])[1] || 0),
        titulo: paraMd(li.querySelector('.influence-step-title')?.innerHTML || ''),
        texto: paraMd(li.querySelector('.influence-step-content')?.innerHTML || ''),
      })),
    };
  }

  function lerArvore(grid) {
    return {
      id: uid(), tipo: 'arvore',
      caminhos: [...grid.querySelectorAll(':scope > .skill-path')].map((p) => ({
        id: uid(),
        titulo: paraMd(p.querySelector('.skill-path-title')?.innerHTML || ''),
        estilo: ['path-defense', 'path-offense', 'path-utility'].find((k) => p.classList.contains(k)) || 'padrao',
        nos: [...p.querySelectorAll('.skill-node')].map((n) => ({
          id: uid(),
          nome: paraMd(n.querySelector('.skill-name')?.innerHTML || ''),
          custo: paraMd(n.querySelector('.skill-cost')?.innerHTML || ''),
          tier: Number(n.dataset.tier) || 1,
          texto: paraMd(n.querySelector('.skill-desc')?.innerHTML || ''),
        })),
      })),
    };
  }

  function lerRegua(el, css) {
    const s = novoBloco('regua');
    const desc = el.querySelector('.school-desc') || el;
    const ps = [...desc.querySelectorAll(':scope > p')];
    const wrapper = desc.querySelector('.alignment-wrapper');
    const intro = ps.find((p) => !wrapper || (p.compareDocumentPosition(wrapper) & Node.DOCUMENT_POSITION_FOLLOWING));
    s.intro = intro ? paraMd(intro.innerHTML) : '';

    const labels = [...el.querySelectorAll('.alignment-labels span')].map((sp) => {
      const m = sp.textContent.trim().match(/^([+-]?\d+)\s*\((.*)\)$/);
      return m ? { n: Number(m[1]), t: m[2] } : { n: null, t: sp.textContent.trim() };
    });
    if (labels[0]) { s.regua.min = labels[0].n ?? -100; s.regua.rotuloMin = labels[0].t; }
    if (labels[1]) { s.regua.rotuloNeutro = labels[1].t; }
    if (labels[2]) { s.regua.max = labels[2].n ?? 100; s.regua.rotuloMax = labels[2].t; }

    const m = css.match(/alignment-marker::after\s*{[^}]*content:\s*"([^"]*)"/);
    const mm = m && m[1].match(/^(.*?)\s*\(([+-]?\d+)\)\s*$/);
    if (mm) {
      s.regua.rotuloMarcador = mm[1];
      s.regua.inicial = Number(mm[2]);
    } else {
      const left = css.match(/\.alignment-marker\s*{[^}]*left:\s*([\d.]+)%/);
      if (left) s.regua.inicial = Math.round(s.regua.min + (Number(left[1]) / 100) * (s.regua.max - s.regua.min));
      if (m) s.regua.rotuloMarcador = m[1];
    }

    const tabelas = [...desc.querySelectorAll('table.alignment-table')];
    const tituloDe = (tab) => {
      const p = tab.previousElementSibling;
      return p && p.nodeName === 'P' ? paraMd(p.innerHTML) : '';
    };
    const cabec = (tab) => [...tab.querySelectorAll('thead th')].map((th) => paraMd(th.innerHTML));

    s.estagios = [];
    s.acoes = [];
    tabelas.forEach((tab) => {
      const linhas = [...tab.querySelectorAll('tbody tr')];
      const ehAcoes = linhas.length && linhas.every((tr) => /^[+-]?\d+\s*Pontos?$/i.test(tr.cells[1]?.textContent.trim() || ''));
      if (ehAcoes) {
        s.acoesTitulo = tituloDe(tab) || s.acoesTitulo;
        s.acoesColunas = cabec(tab).concat(s.acoesColunas).slice(0, 2);
        s.acoes = linhas.map((tr) => ({
          id: uid(),
          acao: paraMd(tr.cells[0].innerHTML),
          pontos: parseInt(tr.cells[1].textContent, 10) || 0,
        }));
      } else {
        s.estagiosTitulo = tituloDe(tab) || s.estagiosTitulo;
        s.estagiosColunas = cabec(tab).concat(s.estagiosColunas).slice(0, 2);
        s.estagios = linhas.map((tr) => {
          const c0 = tr.cells[0];
          const tipo = c0.classList.contains('evil-score') ? 'maligno'
            : c0.classList.contains('good-score') ? 'benigno' : 'neutro';
          const { rotulo: nome, texto: efeito } = separarRotulo(tr.cells[1]);
          return { id: uid(), faixa: paraMd(c0.innerHTML), tipo, nome, efeito };
        });
      }
    });
    return s;
  }

  return {
    CSS_BASE, MOLDURAS,
    novoCodigo, novaSecao, novoBloco, novoCartao, novoItem, novoEstagio, novaAcao,
    novaEtapa, novoCaminho, novoNo, novoParagrafo,
    migrar, gerar, importar, uid, md, rgb,
  };
})();
