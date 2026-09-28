/*
 * Gerador: transforma os dados do formulário em código HTML/CSS
 * e faz o caminho inverso (lê um código colado e preenche os campos).
 */
const Gerador = (() => {
  const CSS_PADRAO = 'https://gaaaaaaaaabs.github.io/goldenagerepositor.io/particularidades.css?v=4';

  const SVG_PADRAO = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 Z" fill="none" stroke="currentColor" stroke-width="3"/>
  <path d="M30 30 L70 70 M70 30 L30 70" fill="none" stroke="currentColor" stroke-width="3"/>
  <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" stroke-width="3"/>
</svg>`;

  const CORES_PADRAO = {
    fundo: '#111111',
    cartao: '#1a1a1a',
    texto: '#f0f0f0',
    destaque: '#9b59b6',
    borda: '#333333',
  };

  const uid = () => Math.random().toString(36).slice(2, 10);

  /* ---------- Modelos em branco ---------- */

  function novaSecao(tipo) {
    switch (tipo) {
      case 'texto':
        return { id: uid(), tipo, titulo: 'Definição', paragrafos: [''] };
      case 'cartoes':
        return { id: uid(), tipo, titulo: 'Características', colunas: 1, cartoes: [novoCartao()] };
      case 'ressonancia':
        return {
          id: uid(), tipo,
          titulo: 'Ressonância da Alma',
          intro: 'Todos os portadores iniciam o jogo com **0 Pontos**.',
          regua: { min: -100, rotuloMin: 'Queda', rotuloNeutro: 'Neutro', max: 100, rotuloMax: 'Ascensão', inicial: 0, rotuloMarcador: 'INÍCIO' },
          estagiosTitulo: 'Estágios de Sincronia',
          estagiosColunas: ['Pontuação', 'Efeito Passivo / Narrativo'],
          estagios: [novoEstagio()],
          acoesTitulo: 'Tabela de Ações e Consequências',
          acoesColunas: ['Ação', 'Impacto na Régua'],
          acoes: [novaAcao()],
        };
      default:
        return { id: uid(), tipo: 'html', titulo: 'Seção livre', html: '<p class="lead">Conteúdo...</p>' };
    }
  }
  const novoCartao = () => ({ id: uid(), nome: 'Novo cartão', intro: '', itens: [novoItem()] });
  const novoItem = () => ({ id: uid(), estilo: 'normal', rotulo: '', texto: '' });
  const novoEstagio = () => ({ id: uid(), faixa: '', tipo: 'neutro', nome: '', efeito: '' });
  const novaAcao = () => ({ id: uid(), acao: '', pontos: 0 });

  function novoCodigo(nome = 'Novo código') {
    return {
      id: uid(),
      nome,
      atualizado: Date.now(),
      cssLink: CSS_PADRAO,
      cores: { ...CORES_PADRAO },
      cabecalho: { titulo: nome, subtitulo: '', tags: ['Particularidade'], svg: SVG_PADRAO },
      secoes: [novaSecao('texto')],
    };
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

  function rgb(hex) {
    let h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (!/^[0-9a-f]{6}$/i.test(h)) return '155, 89, 182';
    const n = parseInt(h, 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
  }

  const secaoRessonancia = (c) => c.secoes.find((s) => s.tipo === 'ressonancia');

  /* ---------- Geração ---------- */

  function gerarCSS(c) {
    const k = c.cores;
    const hl = rgb(k.destaque);
    let css = `.rpg-card {
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

    const r = secaoRessonancia(c);
    if (r) {
      const g = r.regua;
      const faixa = Number(g.max) - Number(g.min) || 1;
      let pos = ((Number(g.inicial) - Number(g.min)) / faixa) * 100;
      pos = Math.max(0, Math.min(100, Math.round(pos * 100) / 100));
      const marcador = `${g.rotuloMarcador} (${sinal(Number(g.inicial))})`.replace(/"/g, '\\"');
      css += `
.alignment-wrapper { margin: 20px 0; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid #333; }
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
    return css;
  }

  const ind = (txt, n) => txt.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');

  function gerarCabecalho(h) {
    const tags = (h.tags || []).filter((t) => t.trim())
      .map((t) => `<span class="tag">${md(t.trim())}</span>`).join('');
    return `<div class="new-header">
  <div class="header-svg-container">
${ind((h.svg || '').trim(), 4)}
  </div>
  <div class="title"><span class="g">${md(h.titulo)}</span></div>
  <div class="subtitle-line">${md(h.subtitulo)}</div>
  <div class="tag-container">${tags}</div>
</div>`;
  }

  const titulo = (t) => `  <div class="h"><div class="name">${md(t)}</div></div>`;

  function gerarItem(it) {
    const base = 'margin-bottom: 8px;';
    const lbl = it.rotulo && it.rotulo.trim() ? `<b>${md(rotulo(it.rotulo))}</b> ` : '';
    if (it.estilo === 'nota') return `<li style="${base} color:#e74c3c;"><i>${lbl}${md(it.texto)}</i></li>`;
    if (it.estilo === 'destaque') return `<li style="${base} color:var(--highlight);">${lbl}${md(it.texto)}</li>`;
    return `<li style="${base}">${lbl}${md(it.texto)}</li>`;
  }

  function gerarSecao(s) {
    if (s.tipo === 'texto') {
      const ps = s.paragrafos.filter((p) => p.trim()).map((p, i) =>
        `  <p class="lead"${i ? ' style="margin-top:10px;"' : ''}>${md(p)}</p>`);
      return `<div class="section">\n${titulo(s.titulo)}\n${ps.join('\n')}\n</div>`;
    }

    if (s.tipo === 'cartoes') {
      const n = Math.max(1, Math.min(4, Number(s.colunas) || 1));
      const cols = n === 1 ? '1fr' : `repeat(${n}, 1fr)`;
      const cards = s.cartoes.map((c) => {
        const intro = c.intro && c.intro.trim() ? `\n    <p style="margin: 0 0 8px 0;">${md(c.intro)}</p>` : '';
        const itens = c.itens.map((it) => '      ' + gerarItem(it)).join('\n');
        const lista = c.itens.length
          ? `\n    <ul style="padding-left: 15px; margin: 0; list-style: none; font-size: 0.9em; color: var(--text);">\n${itens}\n    </ul>`
          : '';
        return `<div class="rules-card">
  <div class="rules-name">${md(c.nome)}</div>
  <div class="school-desc" style="margin-top: 0;">${intro}${lista}
  </div>
</div>`;
      });
      return `<div class="section">
${titulo(s.titulo)}
  <div class="rules-grid" style="grid-template-columns: ${cols};">
${ind(cards.join('\n'), 4)}
  </div>
</div>`;
    }

    if (s.tipo === 'ressonancia') {
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
      return `<div class="section">
${titulo(s.titulo)}
  <div class="rules-card" style="margin-top: 10px;">
    <div class="school-desc">
${ind(corpo, 6)}
    </div>
  </div>
</div>`;
    }

    // html livre
    return `<div class="section">\n${titulo(s.titulo)}\n${ind((s.html || '').trim(), 2)}\n</div>`;
  }

  function gerar(c, { compacto = false } = {}) {
    const link = c.cssLink && c.cssLink.trim()
      ? `<link href="${c.cssLink.trim()}" rel="stylesheet" type="text/css">\n` : '';
    const secoes = c.secoes.map(gerarSecao).join('\n');
    let out = `${link}<style>
${ind(gerarCSS(c), 2)}
</style>
<div class="rpg-card">
${ind(gerarCabecalho(c.cabecalho), 2)}
  <div class="main-content">
${ind(secoes, 4)}
  </div>
</div>
`;
    if (compacto) {
      out = out.replace(/\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
    }
    return out;
  }

  /* ---------- Importação (código -> campos) ---------- */

  function importar(codigo) {
    const doc = new DOMParser().parseFromString(`<body>${codigo}</body>`, 'text/html');
    const card = doc.querySelector('.rpg-card');
    if (!card) throw new Error('Não encontrei um bloco <div class="rpg-card"> no código colado.');

    const c = novoCodigo();
    c.secoes = [];

    const link = doc.querySelector('link[rel="stylesheet"]');
    c.cssLink = link ? link.getAttribute('href') : '';

    const css = [...doc.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    const v = (nome) => (css.match(new RegExp(`--${nome}\\s*:\\s*([^;]+);`)) || [])[1]?.trim();
    c.cores = {
      fundo: v('bg-color') || CORES_PADRAO.fundo,
      cartao: v('card-bg') || CORES_PADRAO.cartao,
      texto: v('text-color') || CORES_PADRAO.texto,
      destaque: v('highlight') || CORES_PADRAO.destaque,
      borda: v('border-color') || CORES_PADRAO.borda,
    };

    const txt = (sel, raiz = card) => paraMd(raiz.querySelector(sel)?.innerHTML || '');
    const svg = card.querySelector('.header-svg-container');
    c.cabecalho = {
      titulo: txt('.title .g') || txt('.title'),
      subtitulo: txt('.subtitle-line'),
      tags: [...card.querySelectorAll('.tag-container .tag')].map((t) => paraMd(t.innerHTML)),
      svg: svg ? svg.innerHTML.trim().replace(/>\s+</g, '>\n  <').replace(/\n  <\/svg>/, '\n</svg>') : '',
    };
    c.nome = c.cabecalho.titulo.replace(/\*/g, '') || 'Código importado';

    const secoes = card.querySelectorAll('.main-content > .section');
    secoes.forEach((sec) => {
      const tituloSec = txt('.h .name', sec);
      if (sec.querySelector('.alignment-wrapper, .alignment-table')) {
        c.secoes.push(lerRessonancia(sec, tituloSec, css));
      } else if (sec.querySelector('.rules-card')) {
        c.secoes.push(lerCartoes(sec, tituloSec));
      } else if (sec.querySelector('p.lead') && sec.children.length === sec.querySelectorAll(':scope > p.lead').length + 1) {
        c.secoes.push({
          id: uid(), tipo: 'texto', titulo: tituloSec,
          paragrafos: [...sec.querySelectorAll(':scope > p.lead')].map((p) => paraMd(p.innerHTML)),
        });
      } else {
        const clone = sec.cloneNode(true);
        clone.querySelector('.h')?.remove();
        c.secoes.push({ id: uid(), tipo: 'html', titulo: tituloSec, html: clone.innerHTML.trim() });
      }
    });
    return c;
  }

  function separarRotulo(el) {
    // Retorna { rotulo, texto } quando o elemento começa com <b>Rótulo:</b>
    const primeiro = [...el.childNodes].find((n) => n.nodeType !== 3 || n.textContent.trim());
    if (primeiro && primeiro.nodeName === 'B') {
      const r = paraMd(primeiro.innerHTML).replace(/:\s*$/, '');
      const clone = el.cloneNode(true);
      const b = [...clone.childNodes].find((n) => n.nodeType !== 3 || n.textContent.trim());
      b.remove();
      return { rotulo: r, texto: paraMd(clone.innerHTML) };
    }
    return { rotulo: '', texto: paraMd(el.innerHTML) };
  }

  function lerCartoes(sec, tituloSec) {
    const grid = sec.querySelector('.rules-grid');
    const gtc = grid?.style.gridTemplateColumns || '1fr';
    const rep = gtc.match(/repeat\((\d+)/);
    const colunas = rep ? Number(rep[1]) : (gtc.match(/1fr/g) || [1]).length;
    const cartoes = [...sec.querySelectorAll('.rules-card')].map((rc) => {
      const desc = rc.querySelector('.school-desc') || rc;
      const intro = desc.querySelector(':scope > p');
      const itens = [...desc.querySelectorAll('li')].map((li) => {
        const cor = (li.style.color || '').replace(/\s/g, '');
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
      });
      return {
        id: uid(),
        nome: paraMd(rc.querySelector('.rules-name')?.innerHTML || ''),
        intro: intro ? paraMd(intro.innerHTML) : '',
        itens,
      };
    });
    return { id: uid(), tipo: 'cartoes', titulo: tituloSec, colunas, cartoes };
  }

  function lerRessonancia(sec, tituloSec, css) {
    const s = novaSecao('ressonancia');
    s.titulo = tituloSec;
    const desc = sec.querySelector('.school-desc') || sec;
    const ps = [...desc.querySelectorAll(':scope > p')];
    const wrapper = desc.querySelector('.alignment-wrapper');
    const intro = ps.find((p) => !wrapper || (p.compareDocumentPosition(wrapper) & Node.DOCUMENT_POSITION_FOLLOWING));
    s.intro = intro ? paraMd(intro.innerHTML) : '';

    const labels = [...sec.querySelectorAll('.alignment-labels span')].map((sp) => {
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
      let p = tab.previousElementSibling;
      return p && p.nodeName === 'P' ? paraMd(p.innerHTML) : '';
    };
    const cabec = (tab) => [...tab.querySelectorAll('thead th')].map((th) => paraMd(th.innerHTML));

    s.estagios = [];
    s.acoes = [];
    tabelas.forEach((tab) => {
      const linhas = [...tab.querySelectorAll('tbody tr')];
      // Tabela de ações: segunda coluna é "N Pontos"
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
    novoCodigo, novaSecao, novoCartao, novoItem, novoEstagio, novaAcao,
    gerar, importar, uid, md, rgb,
  };
})();
