const PALAVRAS = [
  { resposta: "ROM",              linha: 0,  coluna: 4, direcao: "H", pista: "" },
  { resposta: "REGISTRADORES",    linha: 0,  coluna: 4, direcao: "V", pista: "" },
  { resposta: "QUADCORE",         linha: 0,  coluna: 9, direcao: "V", pista: "" },
  { resposta: "CACHE",            linha: 1,  coluna: 0, direcao: "H", pista: "" },
  { resposta: "MICROCONTROLADOR", linha: 1,  coluna: 7, direcao: "V", pista: "" },
  { resposta: "UC",               linha: 3,  coluna: 6, direcao: "H", pista: "" },
  { resposta: "FLASH",            linha: 4,  coluna: 1, direcao: "H", pista: "" },
  { resposta: "MEMORIADEMASSA",   linha: 6,  coluna: 0, direcao: "V", pista: "" },
  { resposta: "DUALCORE",         linha: 7,  coluna: 2, direcao: "H", pista: "" },
  { resposta: "EEPROM",           linha: 11, coluna: 3, direcao: "H", pista: "" },
  { resposta: "DMA",              linha: 13, coluna: 5, direcao: "H", pista: "" },
  { resposta: "DATABUS",          linha: 13, coluna: 5, direcao: "V", pista: "" },
  { resposta: "CPU",              linha: 14, coluna: 3, direcao: "V", pista: "" },
  { resposta: "ULA",              linha: 16, coluna: 3, direcao: "H", pista: "" },
  { resposta: "RAM",              linha: 16, coluna: 7, direcao: "H", pista: "" },
  { resposta: "ADDRESSBUS",       linha: 19, coluna: 0, direcao: "H", pista: "" }
];

const TEXTO_PISTA_VAZIA = "(escreva a pista aqui)";

/* ---------- Elementos da página ---------- */

const tabuleiroEl = document.getElementById("tabuleiro");
const contadorEl  = document.getElementById("contador");
const listaH      = document.getElementById("pistas-horizontais");
const listaV      = document.getElementById("pistas-verticais");

/* ---------- Estado ---------- */

const celulas = {};          // "linha,coluna" -> { el, input, linha, coluna, direcoes }
let direcaoAtual = "H";
let ultimaClicada = null;

/* ---------- Funções auxiliares ---------- */

const chave = (linha, coluna) => `${linha},${coluna}`;

// Lista as coordenadas [linha, coluna] ocupadas por uma palavra.
function coordenadas(p) {
  return [...p.resposta].map((_, i) =>
    p.direcao === "H" ? [p.linha, p.coluna + i] : [p.linha + i, p.coluna]
  );
}

const TOTAL_LINHAS = Math.max(...PALAVRAS.flatMap(p => coordenadas(p).map(([l]) => l))) + 1;
const TOTAL_COLUNAS = Math.max(...PALAVRAS.flatMap(p => coordenadas(p).map(([, c]) => c))) + 1;

function palavraNaCelula(linha, coluna, direcao) {
  return PALAVRAS.find(p =>
    p.direcao === direcao && coordenadas(p).some(([l, c]) => l === linha && c === coluna)
  );
}

function atualizarContador(acertos) {
  contadorEl.textContent = `${acertos} de ${PALAVRAS.length} palavras`;
}

/* ---------- Montagem do tabuleiro e das pistas ---------- */

function construirTabuleiro() {
  tabuleiroEl.style.setProperty("--colunas", TOTAL_COLUNAS);

  // Letra esperada e direções de cada casa usada
  const usadas = {};
  PALAVRAS.forEach(p => {
    p.resposta = p.resposta.toUpperCase();
    coordenadas(p).forEach(([l, c], i) => {
      const k = chave(l, c);
      if (usadas[k] && usadas[k].letra !== p.resposta[i]) {
        console.warn(`Conflito de letras em linha ${l}, coluna ${c} (palavra ${p.resposta}).`);
      }
      usadas[k] = usadas[k] || { letra: p.resposta[i], direcoes: [] };
      usadas[k].direcoes.push(p.direcao);
    });
  });

  // Numeração: percorre o tabuleiro e numera quem inicia uma palavra
  const numeros = {};
  let proximo = 1;
  for (let l = 0; l < TOTAL_LINHAS; l++) {
    for (let c = 0; c < TOTAL_COLUNAS; c++) {
      const iniciam = PALAVRAS.filter(p => p.linha === l && p.coluna === c);
      if (iniciam.length) {
        numeros[chave(l, c)] = proximo;
        iniciam.forEach(p => { p.numero = proximo; });
        proximo++;
      }
    }
  }

  // Cria as casas
  for (let l = 0; l < TOTAL_LINHAS; l++) {
    for (let c = 0; c < TOTAL_COLUNAS; c++) {
      const k = chave(l, c);
      const el = document.createElement("div");
      el.className = "celula";

      if (!usadas[k]) {
        el.classList.add("vazia");
        tabuleiroEl.appendChild(el);
        continue;
      }

      if (numeros[k]) {
        const num = document.createElement("span");
        num.className = "numero";
        num.textContent = numeros[k];
        el.appendChild(num);
      }

      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;
      input.autocomplete = "off";
      input.autocapitalize = "characters";
      input.spellcheck = false;
      input.setAttribute("aria-label", `Linha ${l + 1}, coluna ${c + 1}`);
      el.appendChild(input);

      celulas[k] = { el, input, linha: l, coluna: c, direcoes: usadas[k].direcoes };
      ligarEventos(celulas[k]);
      tabuleiroEl.appendChild(el);
    }
  }
}

function construirPistas() {
  const ordenadas = [...PALAVRAS].sort((a, b) => a.numero - b.numero);

  ordenadas.forEach(p => {
    const item = document.createElement("li");
    const temPista = p.pista && p.pista.trim() !== "";
    item.innerHTML = `<strong>${p.numero}.</strong> <span class="texto${temPista ? "" : " vazio"}"></span>`;
    item.querySelector(".texto").textContent = temPista ? p.pista : TEXTO_PISTA_VAZIA;

    item.addEventListener("click", () => {
      direcaoAtual = p.direcao;
      const [l, c] = coordenadas(p)[0];
      celulas[chave(l, c)].input.focus();
      destacarPalavraAtiva(l, c);
    });

    p.itemPista = item;
    (p.direcao === "H" ? listaH : listaV).appendChild(item);
  });
}

/* ---------- Digitação e navegação ---------- */

function ligarEventos(cel) {
  const { input, linha, coluna } = cel;

  input.addEventListener("focus", () => {
    if (!cel.direcoes.includes(direcaoAtual)) direcaoAtual = cel.direcoes[0];
    input.select();
    destacarPalavraAtiva(linha, coluna);
  });

  // Clicar de novo na mesma casa alterna entre horizontal e vertical
  input.addEventListener("click", () => {
    if (ultimaClicada === input && cel.direcoes.length > 1) {
      direcaoAtual = direcaoAtual === "H" ? "V" : "H";
      destacarPalavraAtiva(linha, coluna);
    }
    ultimaClicada = input;
  });

  input.addEventListener("input", () => {
    input.value = input.value
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toUpperCase().replace(/[^A-Z]/g, "").slice(-1);

    cel.el.classList.remove("certa", "errada");
    if (input.value) moverNaPalavra(linha, coluna, +1);
  });

  input.addEventListener("keydown", e => {
    const setas = {
      ArrowLeft:  ["H", 0, -1],
      ArrowRight: ["H", 0, +1],
      ArrowUp:    ["V", -1, 0],
      ArrowDown:  ["V", +1, 0]
    };

    if (setas[e.key]) {
      e.preventDefault();
      const [dir, dl, dc] = setas[e.key];
      const destino = celulas[chave(linha + dl, coluna + dc)];
      if (destino) {
        if (destino.direcoes.includes(dir)) direcaoAtual = dir;
        destino.input.focus();
      }
    } else if (e.key === "Backspace" && !input.value) {
      e.preventDefault();
      const anterior = vizinha(linha, coluna, -1);
      if (anterior) {
        anterior.input.value = "";
        anterior.el.classList.remove("certa", "errada");
        anterior.input.focus();
      }
    }
  });
}

function vizinha(linha, coluna, sentido) {
  const l = direcaoAtual === "V" ? linha + sentido : linha;
  const c = direcaoAtual === "H" ? coluna + sentido : coluna;
  return celulas[chave(l, c)];
}

function moverNaPalavra(linha, coluna, sentido) {
  const proxima = vizinha(linha, coluna, sentido);
  if (proxima) proxima.input.focus();
}

function destacarPalavraAtiva(linha, coluna) {
  document.querySelectorAll(".celula.ativa, .pistas li.ativa")
    .forEach(el => el.classList.remove("ativa"));

  const p = palavraNaCelula(linha, coluna, direcaoAtual);
  if (!p) return;
  coordenadas(p).forEach(([l, c]) => celulas[chave(l, c)].el.classList.add("ativa"));
  p.itemPista.classList.add("ativa");
}

/* ---------- Conferir e Reiniciar ---------- */

function conferir() {
  const emPalavraCerta = new Set();
  let acertos = 0;

  PALAVRAS.forEach(p => {
    const coords = coordenadas(p);
    const certa = coords.every(([l, c], i) => celulas[chave(l, c)].input.value === p.resposta[i]);

    p.itemPista.classList.remove("certa", "errada");
    p.itemPista.classList.add(certa ? "certa" : "errada");

    if (certa) {
      acertos++;
      coords.forEach(([l, c]) => emPalavraCerta.add(chave(l, c)));
    }
  });

  // Casas que fazem parte de alguma palavra certa ficam verdes; as demais, vermelhas
  Object.entries(celulas).forEach(([k, cel]) => {
    cel.el.classList.remove("certa", "errada");
    cel.el.classList.add(emPalavraCerta.has(k) ? "certa" : "errada");
  });

  atualizarContador(acertos);
}

function reiniciar() {
  Object.values(celulas).forEach(cel => {
    cel.input.value = "";
    cel.el.classList.remove("certa", "errada", "ativa");
  });
  PALAVRAS.forEach(p => p.itemPista.classList.remove("certa", "errada", "ativa"));

  direcaoAtual = "H";
  ultimaClicada = null;
  atualizarContador(0);

  const primeira = Object.values(celulas)[0];
  if (primeira) primeira.input.focus();
}

/* ---------- Início ---------- */

construirTabuleiro();
construirPistas();
atualizarContador(0);

document.getElementById("btn-conferir").addEventListener("click", conferir);
document.getElementById("btn-reiniciar").addEventListener("click", reiniciar);
