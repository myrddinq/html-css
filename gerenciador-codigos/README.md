# Gerenciador de Particularidades

Site para editar os códigos de ficha (`<div class="rpg-card">`) por meio de campos, sem mexer no HTML na mão.
A interface segue o padrão visual do [Grimório](https://goldenagerpg.github.io/grimoriodetecnicas.io/).

Abra `index.html` no navegador. Não precisa instalar nada.

## O que dá para fazer

- **Guardar vários códigos**: escolher, criar, duplicar e excluir pelo topo do editor. Tudo é salvo automaticamente no navegador.
- **Importar qualquer código** do padrão `particularidades.css`. O botão *Importar* preenche os campos sozinho:
  - cabeçalho (ícone SVG ou kanji, título, subtítulo, etiquetas);
  - parágrafos `p.lead`;
  - cartões `rules-card`: normais, **vantagem** (+), **restrição** (−) e com **moldura lateral** (dourada, vermelha, personalizada…), nos formatos novo e clássico (`school-desc`);
  - régua de alinhamento (estágios e tabela de ações);
  - etapas de influência (`influence-stepper`);
  - árvore de habilidades (`skill-tree-grid`);
  - o que não for reconhecido vira **HTML livre**, e o CSS desconhecido vai para *CSS adicional*. Nada se perde.
- **Arrastar e soltar** pela alça (⠿) para reordenar seções, blocos, cartões, itens, estágios, ações, etapas e habilidades. Funciona com mouse e no toque.
- **Prévia ao vivo** com o CSS real do fórum e **código final** para copiar ou baixar. A opção *Linha única* vem ligada, como no Grimório.
- **Backup**: exporte e restaure todos os códigos num arquivo `.json`.

Nos campos de texto, use `**negrito**` e `*itálico*`.
