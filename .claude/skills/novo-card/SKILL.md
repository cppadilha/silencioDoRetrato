---
name: novo-card
description: Adicionar um novo card/série ao zine Silêncio do Retrato — cria a subpasta, a página index.html com as seções no padrão do projeto (Abertura, Sobre a obra, atos/imagens/legendas, Epílogo ou Manifesto, créditos), o CSS local e o cover card na home. Use ao criar uma nova série fotográfica, nova página de série, nova subpasta de card, ou "add new series card". Guia o artista no fornecimento dos dados e gera tudo.
---

# Novo Card (nova série do zine)

Este zine é arte, não engenharia: cada série repete um **esqueleto comum** mas
varia livremente dentro dele. Esta skill conduz o artista por uma entrevista,
monta um **spec JSON**, e o driver
[.claude/skills/novo-card/scaffold.mjs](.claude/skills/novo-card/scaffold.mjs)
gera de uma vez:

1. `<slug>/index.html` — a página da série
2. `<slug>/assets/css/main.css` — o CSS local (vazio, ou um preset)
3. o `<a class="cover-card">` inserido na grade da home `index.html`

Depois, pré-visualize com o run driver e **olhe o screenshot**.

> Caminhos abaixo são relativos à raiz do repositório.

## Pré-requisitos

- **Node** (usei v24). O scaffolder usa **só builtins do Node** — sem
  `npm install`.
- Para pré-visualizar: o run driver (Playwright + Chrome). Se ainda não
  instalou: `cd .claude/skills/run-silencio-do-retrato && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install`.

## Fluxo (agent path)

### 1. Entreviste o artista

Colete conversacionalmente (em português). Aceite texto poético livre — **não
imponha esquema rígido**. Perguntas com poucas opções (tema, seção de
fechamento) combinam com `AskUserQuestion`; o resto é texto livre:

- **slug** da pasta (minúsculas com hífens, ex. `luz-de-dentro`) e **título**.
- **tema**: `light` ou `dark` (`data-default-theme`).
- **Abertura**: a epígrafe/frase (pode usar `<br />`).
- **Sobre a obra**: um ou mais parágrafos (o 1º costuma abrir com
  `<b>"Título"</b>`).
- **Blocos** na ordem desejada — a poesia mora aqui. Cada bloco é um de:
  - `act` — um divisor `<h3>` (ex. "Ato I — ..."). Séries como *canções* e
    *diário* **não usam** atos; anicca e silêncios usam.
  - `image` — uma imagem (URL do Flickr, tamanho `_b.jpg`) com `caption` e
    `captionPosition` (`before` ou `after`).
  - `images` — várias imagens lado a lado (`srcs: [...]`) com `caption`.
  - `line` — uma linha de fechamento (ex. "— ..."), geralmente
    `variant: "texto-final"`.
  - `quote` — uma citação, geralmente `variant: "pixacao-quote"`.
- **Fechamento**: título `Epílogo` (anicca, silêncios) ou `Manifesto`
  (diário, luz, canções), com um ou mais parágrafos (normalmente em `<i>`).
- **Créditos**: `["Série realizada em 2025"]`, ou várias linhas ao estilo
  anicca (`Modelo: Gabriela`, `Ano de realização: 2025`, `Técnica: ...`).
- **CSS local** (`localCss`): `"pixacao"` (habilita `.pixacao-quote` e
  `.texto-final`), `"hero:<url-da-imagem>"` (fundo na Abertura, estilo *luz de
  dentro*), `"none"`, ou uma string de CSS crua.
- **Cover**: `image` (URL), `overlayText` (texto sobre a capa, pode ser vazio)
  e `title` (default = título da série).

### 2. Escreva o spec JSON

Grave em qualquer caminho (ex. `/tmp/spec.json`). Exemplo real usado neste
container (dark, com ato, legenda antes/depois, dupla de imagens, linha e
citação):

```bash
cat > /tmp/spec.json <<'EOF'
{
  "slug": "teste-efemero",
  "title": "Teste Efêmero",
  "theme": "dark",
  "abertura": "Uma abertura de teste<br />para verificar o gerador.",
  "sobre": [
    "<b>\"Teste Efêmero\"</b> é uma série de verificação.",
    "Segundo parágrafo, para ver a quebra de linha."
  ],
  "blocks": [
    { "type": "act", "title": "Ato I — A prova" },
    { "type": "image", "src": "https://live.staticflickr.com/65535/54801934653_f870ebe321_b.jpg", "caption": "Legenda antes da imagem.", "captionPosition": "before" },
    { "type": "image", "src": "https://live.staticflickr.com/65535/54801937643_6f824e0691_b.jpg", "caption": "Legenda depois da imagem.", "captionPosition": "after" },
    { "type": "images", "srcs": ["https://live.staticflickr.com/65535/54567507230_1fb453b1c1_b.jpg", "https://live.staticflickr.com/65535/54567178146_f0b6822c4b_b.jpg"], "caption": "Duas imagens lado a lado." },
    { "type": "line", "text": "— uma linha de fechamento em itálico.", "variant": "texto-final" },
    { "type": "quote", "text": "Uma citação inserida ao fim do ato.", "variant": "pixacao-quote" }
  ],
  "closing": { "title": "Manifesto", "paragraphs": ["<i>Um manifesto de teste,<br />em duas linhas.</i>"] },
  "credits": ["Série realizada em 2025"],
  "localCss": "pixacao",
  "cover": { "image": "https://live.staticflickr.com/65535/54802019300_ac401fe841_b.jpg", "overlayText": "teste", "title": "Teste Efêmero" }
}
EOF
```

### 3. Gere (confira antes com `--dry-run`)

```bash
# Prévia sem escrever nada:
node .claude/skills/novo-card/scaffold.mjs /tmp/spec.json --dry-run

# Cria a pasta, o index.html, o CSS local e insere o cover card na home:
node .claude/skills/novo-card/scaffold.mjs /tmp/spec.json
```

Flags: `--position=last` (anexa o cover no fim em vez de no início — o padrão
é **first**, séries novas aparecem primeiro), `--force` (sobrescreve a pasta),
`--no-home` (não toca na home), `--dry-run`.

### 4. Pré-visualize e olhe

```bash
node .claude/skills/run-silencio-do-retrato/driver.mjs teste-efemero/index.html
node .claude/skills/run-silencio-do-retrato/driver.mjs index.html
```

O screenshot cai em `%TEMP%\shots\` (o caminho exato é impresso). **Abra e
confira**: `N canvas rendered, clean` = imagens desenhadas e sem erro de
console.

## Gotchas

- **A home `index.html` tem finais de linha CRLF/misturados** (edições pela
  web do GitHub). O scaffolder detecta e insere o cover com o mesmo `\r\n`,
  então o diff não vira uma tempestade de mudanças de fim de linha. Se você
  editar a âncora `<main class="grid-covers">` à mão, mantenha isso em mente.
- **Arte, não engenharia.** Quase todo campo é opcional e cai no estilo da
  casa. Misture blocos à vontade; nem toda série tem atos, nem toda tem
  citação. O default de `closing.title` é `Epílogo`; troque para `Manifesto`
  quando fizer sentido.
- **Imagens são remotas (Flickr).** Use o link de tamanho `_b.jpg` (o mesmo
  padrão das séries existentes). Sem rede, os `<canvas>` mostram "Erro ao
  carregar" — não é bug do gerador.
- **`overlayText` do cover pode ser vazio** (anicca e silêncios não têm texto
  sobre a capa; diário, luz e canções têm).
- **HTML no conteúdo é confiado** — `<br />`, `<i>`, `<b>` são preservados de
  propósito. Não escape essas tags no spec.
- **Proteções:** o scaffolder recusa se `<slug>/` já existe (use `--force`) ou
  se a home já tem um card para aquele slug. Isso evita duplicar.
- **Consistência que o artista deve cuidar:** o `<title>` deve bater com o
  nome da série (uma série existente tem `<title>Luz de Dentro</title>` numa
  página que não é a Luz de Dentro), e o `<h2>` do cover deve levar acento
  (a home tem "Diario da Sombra" sem acento). O gerador usa o que você passar
  — passe certo.

## Troubleshooting

- **`could not locate the grid-covers <main> in home index.html`** — a âncora
  mudou. O scaffolder procura `<main class="grid-covers">` e `</main>`
  tolerando `\r?\n`; se a home foi reestruturada, ajuste a regex em
  `scaffold.mjs` ou insira o card à mão.
- **`refusing: <slug>/ already exists`** — a pasta já existe. Escolha outro
  slug ou rode com `--force`.
- **`refusing: home index.html already has a card for <slug>/`** — já existe um
  cover para esse slug; remova-o antes, ou use `--no-home` e insira à mão.
- **`spec.slug must be a lowercase-dashed folder name`** — use só minúsculas,
  números e hífens (ex. `nova-serie`, não `Nova Série`).
- **Canvas com texto vermelho "Erro ao carregar"** — sem rede ao Flickr, ou
  URL da imagem inválida. Confira a conectividade e os links `_b.jpg`.
