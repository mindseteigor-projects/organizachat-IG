/* ============================================================
   IG SITES — GESTÃO DE CONVERSAS
   app.js COMPLETO

   FUNCIONALIDADES:
   - Menu lateral
   - Troca de telas
   - Importação de listas
   - Vários formatos de telefone
   - Evita duplicados
   - Dados salvos no localStorage
   - Datas mais recentes primeiro
   - Seleção múltipla de conversas
   - Selecionar todas
   - Excluir várias conversas de uma vez
   - Confirmação antes de excluir
   - Anotações
   - Funil
   - Análise
   - NÃO conecta ao WhatsApp
   - NÃO envia mensagens
   ============================================================ */


/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */

const STORAGE_KEY = "ig_sites_conversas";
const NOTES_KEY = "ig_sites_anotacoes";

const ETAPAS = [
  "Prospectado",
  "Respondeu",
  "Interessado",
  "Pediu modelo",
  "Orçamento / negociação",
  "Venda fechada",
  "Não avançou"
];

const TITULOS = {
  dashboard: "Visão geral",
  conversations: "Conversas",
  funnel: "Funil",
  analysis: "Análise",
  notes: "Anotações",
  settings: "Configurações"
};


/* ============================================================
   DADOS INICIAIS
   ============================================================ */

const dadosIniciais = [
  {
    id: 1,
    company: "Oficina Exemplo",
    phone: "(41) 99999-1111",
    stage: "Interessado",
    firstReply: 18,
    updated: "2026-09-25",
    note: "Demonstrou interesse no site.",
    history: [
      {
        from: "ig",
        text: "Olá! Tudo bem? Falo com o responsável pela Oficina Exemplo?",
        time: "09:10"
      },
      {
        from: "client",
        text: "Olá, sim. Pode falar.",
        time: "09:28"
      },
      {
        from: "client",
        text: "Tenho interesse. Como seria?",
        time: "09:36"
      }
    ]
  },

  {
    id: 2,
    company: "Estética Modelo",
    phone: "(41) 98888-2222",
    stage: "Pediu modelo",
    firstReply: 7,
    updated: "2026-09-24",
    note: "Pediu para ver um exemplo de site.",
    history: [
      {
        from: "ig",
        text: "Olá! Tudo bem? Falo com o responsável pela Estética Modelo?",
        time: "14:02"
      },
      {
        from: "client",
        text: "Sim, sou eu.",
        time: "14:09"
      },
      {
        from: "client",
        text: "Pode me mandar um modelo?",
        time: "14:12"
      }
    ]
  },

  {
    id: 3,
    company: "Mercado Fictício",
    phone: "(41) 97777-3333",
    stage: "Respondeu",
    firstReply: 42,
    updated: "2026-09-23",
    note: "Respondeu à abordagem.",
    history: [
      {
        from: "ig",
        text: "Olá! Tudo bem? Falo com o responsável pelo Mercado Fictício?",
        time: "11:15"
      },
      {
        from: "client",
        text: "Sim.",
        time: "11:57"
      }
    ]
  },

  {
    id: 4,
    company: "Studio Demonstração",
    phone: "(41) 96666-4444",
    stage: "Orçamento / negociação",
    firstReply: 12,
    updated: "2026-09-22",
    note: "Entrou em conversa sobre preço.",
    history: [
      {
        from: "client",
        text: "Quanto fica para fazer um site?",
        time: "10:34"
      }
    ]
  },

  {
    id: 5,
    company: "Café Ilustrativo",
    phone: "(41) 95555-5555",
    stage: "Não avançou",
    firstReply: 0,
    updated: "2026-09-20",
    note: "Não avançou.",
    history: [
      {
        from: "ig",
        text: "Olá! Tudo bem? Falo com o responsável pelo Café Ilustrativo?",
        time: "16:05"
      }
    ]
  },

  {
    id: 6,
    company: "Auto Demo",
    phone: "(41) 94444-6666",
    stage: "Venda fechada",
    firstReply: 5,
    updated: "2026-09-19",
    note: "Venda fechada.",
    history: [
      {
        from: "client",
        text: "Gostei da ideia e quero seguir.",
        time: "08:52"
      }
    ]
  }
];


/* ============================================================
   ESTADO
   ============================================================ */

let selectedId = null;
let importadosTemporarios = [];

/*
   IDs selecionados para exclusão em massa.
*/
let conversasSelecionadas = new Set();


/* ============================================================
   UTILITÁRIOS
   ============================================================ */

const $ = id => document.getElementById(id);


function escaparHTML(valor) {
  return String(valor ?? "").replace(
    /[&<>"']/g,
    caractere => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[caractere])
  );
}


function hoje() {
  const d = new Date();

  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}


function gerarId() {
  return Date.now() +
    Math.floor(Math.random() * 100000);
}


function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}


/* ============================================================
   TELEFONE
   ============================================================ */

function normalizarTelefone(valor) {
  let numero = String(valor ?? "")
    .replace(/\D/g, "");

  if (
    numero.startsWith("55") &&
    (
      numero.length === 12 ||
      numero.length === 13
    )
  ) {
    numero = numero.slice(2);
  }

  return numero;
}


function formatarTelefone(valor) {
  let numero =
    normalizarTelefone(valor);

  if (numero.length === 11) {
    return `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}-${numero.slice(7)}`;
  }

  if (numero.length === 10) {
    return `(${numero.slice(0, 2)}) ${numero.slice(2, 6)}-${numero.slice(6)}`;
  }

  return String(valor ?? "").trim();
}


/* ============================================================
   ETAPAS
   ============================================================ */

function etapaValida(etapa) {
  return ETAPAS.includes(etapa);
}


function detectarEtapa(texto) {
  const t = normalizarTexto(texto);

  if (
    /venda\s+fechada/.test(t) ||
    /fechou/.test(t) ||
    /cliente\s+fechado/.test(t) ||
    /venda\s+realizada/.test(t) ||
    /fechamento/.test(t)
  ) {
    return "Venda fechada";
  }

  if (
    /nao\s+tenho\s+interesse/.test(t) ||
    /sem\s+interesse/.test(t) ||
    /nao\s+quero/.test(t) ||
    /nao\s+avancou/.test(t) ||
    /desistiu/.test(t)
  ) {
    return "Não avançou";
  }

  if (
    /orcamento/.test(t) ||
    /negociacao/.test(t) ||
    /quanto\s+custa/.test(t) ||
    /quanto\s+fica/.test(t) ||
    /qual\s+o\s+preco/.test(t) ||
    /preco/.test(t) ||
    /valor\s+do\s+site/.test(t) ||
    /quanto\s+e/.test(t)
  ) {
    return "Orçamento / negociação";
  }

  if (
    /pediu\s+modelo/.test(t) ||
    /pedir\s+modelo/.test(t) ||
    /manda\s+(o\s+)?modelo/.test(t) ||
    /mandar\s+(o\s+)?modelo/.test(t) ||
    /mande\s+(o\s+)?modelo/.test(t) ||
    /enviar\s+(o\s+)?modelo/.test(t) ||
    /envia\s+(o\s+)?modelo/.test(t) ||
    /quero\s+ver\s+(o\s+)?modelo/.test(t) ||
    /ver\s+(o\s+)?modelo/.test(t) ||
    /modelo\s+do\s+site/.test(t)
  ) {
    return "Pediu modelo";
  }

  if (
    /tenho\s+interesse/.test(t) ||
    /interessado/.test(t) ||
    /interessou/.test(t) ||
    /gostei/.test(t) ||
    /quero\s+fazer/.test(t) ||
    /quero\s+sim/.test(t) ||
    /vamos\s+fazer/.test(t) ||
    /pode\s+fazer/.test(t)
  ) {
    return "Interessado";
  }

  if (
    /^respondeu$/.test(t) ||
    /respondeu/.test(t) ||
    /resposta/.test(t)
  ) {
    return "Respondeu";
  }

  return "Prospectado";
}


/* ============================================================
   DETECTAR TELEFONE
   ============================================================ */

function detectarTelefone(texto) {
  const textoOriginal =
    String(texto ?? "");

  const regexFormatado =
    /(?:\+?55[\s.-]*)?\(?\d{2}\)?[\s.-]*9?\d{4}[\s.-]*\d{4}/;

  const encontrado =
    textoOriginal.match(
      regexFormatado
    );

  if (encontrado) {
    return encontrado[0];
  }

  const apenasNumeros =
    textoOriginal.match(
      /(?:55)?\d{10,13}/
    );

  if (apenasNumeros) {
    return apenasNumeros[0];
  }

  return null;
}


function linhaTemTelefone(linha) {
  return !!detectarTelefone(linha);
}


/* ============================================================
   LOCAL STORAGE
   ============================================================ */

function carregarConversas() {
  try {
    const salvo =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!salvo) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          dadosIniciais
        )
      );

      return normalizarConversas(
        dadosIniciais
      );
    }

    const dados =
      JSON.parse(salvo);

    return Array.isArray(dados)
      ? normalizarConversas(dados)
      : [];

  } catch (erro) {
    console.error(
      "Erro ao carregar conversas:",
      erro
    );

    return [];
  }
}


function normalizarConversas(lista) {
  return lista.map(
    (c, indice) => ({
      id:
        c.id ??
        gerarId() +
          indice,

      company:
        c.company ??
        c.empresa ??
        "Empresa sem nome",

      phone:
        formatarTelefone(
          c.phone ??
          c.telefone ??
          ""
        ),

      stage:
        etapaValida(
          c.stage ??
          c.etapa
        )
          ? (
              c.stage ??
              c.etapa
            )
          : "Prospectado",

      firstReply:
        Number(
          c.firstReply ??
          c.tempoPrimeiraResposta ??
          0
        ),

      updated:
        c.updated ??
        c.ultimaAtividade ??
        hoje(),

      note:
        c.note ??
        c.observacao ??
        "",

      history:
        Array.isArray(
          c.history
        )
          ? c.history

          : Array.isArray(
              c.historico
            )
            ? c.historico.map(
                h => ({
                  from:
                    h.from ??
                    "client",

                  text:
                    h.text ??
                    h.texto ??
                    "",

                  time:
                    h.time ??
                    h.data ??
                    ""
                })
              )

            : []
    })
  );
}


function salvarConversas(lista) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(lista)
  );
}


function carregarAnotacoes() {
  try {
    const dados =
      JSON.parse(
        localStorage.getItem(
          NOTES_KEY
        ) || "[]"
      );

    return Array.isArray(dados)
      ? dados
      : [];

  } catch {
    return [];
  }
}


function salvarAnotacoes(lista) {
  localStorage.setItem(
    NOTES_KEY,
    JSON.stringify(lista)
  );
}


function getConversas() {
  return carregarConversas();
}


function contarEtapa(etapa) {
  return getConversas()
    .filter(
      c =>
        c.stage === etapa
    )
    .length;
}


function telefoneJaExiste(
  telefone,
  conversas
) {
  const numero =
    normalizarTelefone(
      telefone
    );

  if (!numero) {
    return false;
  }

  return conversas.some(
    c =>
      normalizarTelefone(
        c.phone
      ) === numero
  );
}


/* ============================================================
   IMPORTAÇÃO
   ============================================================ */

function limparEmpresa(valor) {
  return String(valor ?? "")
    .replace(
      /^[-•*]+\s*/,
      ""
    )
    .replace(
      /^(empresa|nome|negocio|negócio)\s*:\s*/i,
      ""
    )
    .trim();
}


function textoDepoisDoTelefone(
  linha,
  telefone
) {
  const pos =
    String(linha).indexOf(
      telefone
    );

  if (pos < 0) {
    return "";
  }

  return String(linha)
    .slice(
      pos + telefone.length
    )
    .trim();
}


function textoAntesDoTelefone(
  linha,
  telefone
) {
  const pos =
    String(linha).indexOf(
      telefone
    );

  if (pos < 0) {
    return "";
  }

  return String(linha)
    .slice(
      0,
      pos
    )
    .trim();
}


function analisarLista(texto) {
  const linhas =
    String(texto ?? "")
      .replace(/\r/g, "")
      .split("\n")
      .map(
        linha =>
          linha.trim()
      )
      .filter(Boolean);

  const contatos = [];

  let empresaPendente = "";
  let contatoAtual = null;


  function finalizar() {
    if (
      !contatoAtual ||
      !contatoAtual.telefone
    ) {
      return;
    }

    const informacao =
      contatoAtual.informacoes
        .join(" | ")
        .trim();

    const etapa =
      detectarEtapa(
        informacao
      );

    contatos.push({
      empresa:
        limparEmpresa(
          contatoAtual.empresa ||
          "Empresa sem nome"
        ),

      telefone:
        formatarTelefone(
          contatoAtual.telefone
        ),

      etapa,

      observacao:
        informacao,

      fonte:
        "importacao"
    });

    contatoAtual = null;
  }


  for (const linha of linhas) {

    const telefoneOriginal =
      detectarTelefone(
        linha
      );


    /* --------------------------------------------
       LINHA POSSUI TELEFONE
       -------------------------------------------- */

    if (telefoneOriginal) {

      finalizar();

      const antes =
        textoAntesDoTelefone(
          linha,
          telefoneOriginal
        );

      const depois =
        textoDepoisDoTelefone(
          linha,
          telefoneOriginal
        );

      const empresa =
        limparEmpresa(
          antes
        ) ||
        empresaPendente ||
        "Empresa sem nome";

      contatoAtual = {
        empresa,

        telefone:
          telefoneOriginal,

        informacoes:
          depois
            ? [depois]
            : []
      };

      empresaPendente = "";

      continue;
    }


    /* --------------------------------------------
       LINHA SEM TELEFONE
       -------------------------------------------- */

    if (!contatoAtual) {

      if (!empresaPendente) {
        empresaPendente =
          limparEmpresa(
            linha
          );
      }

      continue;
    }

    contatoAtual.informacoes.push(
      linha
    );
  }


  finalizar();


  /* --------------------------------------------
     REMOVE DUPLICADOS DA PRÓPRIA LISTA
     -------------------------------------------- */

  const mapa =
    new Map();

  for (
    const contato
    of contatos
  ) {

    const numero =
      normalizarTelefone(
        contato.telefone
      );

    if (!numero) {
      continue;
    }

    if (
      !mapa.has(numero)
    ) {
      mapa.set(
        numero,
        contato
      );
    }
  }

  return Array.from(
    mapa.values()
  );
}


/* ============================================================
   IMPORTAR CONTATOS
   ============================================================ */

function importarContatos(
  contatos
) {
  const conversas =
    getConversas();

  let adicionados = 0;
  let duplicados = 0;


  for (
    const contato
    of contatos
  ) {

    if (
      !contato.telefone ||
      telefoneJaExiste(
        contato.telefone,
        conversas
      )
    ) {

      duplicados++;

      continue;
    }


    conversas.push({
      id:
        gerarId(),

      company:
        contato.empresa ||
        "Empresa sem nome",

      phone:
        formatarTelefone(
          contato.telefone
        ),

      stage:
        etapaValida(
          contato.etapa
        )
          ? contato.etapa
          : "Prospectado",

      firstReply: 0,

      updated:
        hoje(),

      note:
        contato.observacao ||
        "",

      history: [
        {
          from: "system",

          text:
            contato.observacao
              ? `Contato importado. Informação: ${contato.observacao}`
              : "Contato importado.",

          time:
            hoje()
        }
      ]
    });

    adicionados++;
  }


  salvarConversas(
    conversas
  );


  return {
    adicionados,
    duplicados
  };
}


/* ============================================================
   BOTÃO IMPORTAR LISTA
   ============================================================ */

function criarBotaoImportar() {

  if (
    $("igImportarListaBtn")
  ) {
    return;
  }


  const botao =
    document.createElement(
      "button"
    );

  botao.id =
    "igImportarListaBtn";

  botao.type =
    "button";

  botao.className =
    "secondary";

  botao.textContent =
    "⇩ Importar lista";

  botao.style.marginLeft =
    "10px";

  botao.addEventListener(
    "click",
    abrirImportacao
  );


  const botoes = [
    $("newConversation2"),
    $("newConversation")
  ].filter(Boolean);


  const referencia =
    botoes[0];


  if (
    referencia &&
    referencia.parentElement
  ) {

    referencia.parentElement.appendChild(
      botao
    );

  } else {

    document.body.appendChild(
      botao
    );
  }
}


/* ============================================================
   MODAL DE IMPORTAÇÃO
   ============================================================ */

function criarModalImportacao() {

  if (
    $("igImportModal")
  ) {
    return;
  }


  const modal =
    document.createElement(
      "div"
    );

  modal.id =
    "igImportModal";

  modal.className =
    "modal";


  modal.innerHTML = `

    <div
      class="modalbox"
      style="
        max-width:900px;
        max-height:calc(100vh - 40px);
        overflow-y:auto;
        box-sizing:border-box;
      "
    >

      <div class="modalTop">

        <div>

          <h2>
            Importar lista de contatos
          </h2>

          <p class="muted">
            Cole a lista completa.
            O sistema identifica automaticamente
            empresa, telefone e etapa.
          </p>

        </div>


        <button
          type="button"
          class="secondary"
          id="igFecharImport"
        >
          Fechar
        </button>

      </div>


      <div
        class="safe"
        style="margin-bottom:14px;"
      >

        <b>
          Formatos aceitos:
        </b>

        <br>

        <b>
          Tudo na mesma linha:
        </b>

        <br>

        Oficina Motor Sul
        (41) 99999-1001
        Prospectado

        <br><br>

        <b>
          Ou separado:
        </b>

        <br>

        Oficina Motor Sul

        <br>

        (41) 99999-1001

        <br>

        Prospectado

        <br><br>

        Também aceita vários contatos
        seguidos, sem linhas em branco.

      </div>


      <textarea
        id="igImportTextarea"
        style="
          width:100%;
          min-height:260px;
          box-sizing:border-box;
          padding:14px;
          border:1px solid #cbd5e1;
          border-radius:10px;
          font:inherit;
          resize:vertical;
        "
        placeholder="Exemplo:

Oficina Motor Sul (41) 99999-1001 Prospectado
Estética Bella Vida (41) 98888-1002 Respondeu
Auto Center Paraná (41) 97777-1003 Interessado

Ou:

Oficina Motor Sul
(41) 99999-1001
Prospectado

Estética Bella Vida
(41) 98888-1002
Respondeu"
      ></textarea>


      <div
        id="igImportResultado"
        style="margin-top:15px;"
      ></div>


      <div
        class="igImportAcoes"
        style="
          position:sticky;
          bottom:0;
          display:flex;
          justify-content:flex-end;
          gap:10px;
          margin-top:15px;
          padding-top:15px;
          padding-bottom:5px;
          background:#fff;
          border-top:1px solid #e5e7eb;
          z-index:20;
          flex-wrap:wrap;
        "
      >

        <button
          type="button"
          class="secondary"
          id="igCancelarImport"
        >
          Cancelar
        </button>


        <button
          type="button"
          class="primary"
          id="igAnalisarImport"
        >
          Analisar lista
        </button>


        <button
          type="button"
          class="primary"
          id="igConfirmarImport"
          style="
            display:none;
            background:#16a34a;
          "
        >
          Importar contatos
        </button>

      </div>

    </div>
  `;


  document.body.appendChild(
    modal
  );


  $("igFecharImport").onclick =
    fecharImportacao;

  $("igCancelarImport").onclick =
    fecharImportacao;

  $("igAnalisarImport").onclick =
    analisarImportacaoInterface;

  $("igConfirmarImport").onclick =
    confirmarImportacaoInterface;
}


/* ============================================================
   ABRIR / FECHAR IMPORTAÇÃO
   ============================================================ */

function abrirImportacao() {

  criarModalImportacao();

  const modal =
    $("igImportModal");

  modal.classList.add(
    "show"
  );

  $("igImportTextarea").value =
    "";

  $("igImportResultado").innerHTML =
    "";

  $("igConfirmarImport").style.display =
    "none";

  importadosTemporarios =
    [];


  setTimeout(() => {

    $("igImportTextarea")
      ?.focus();

  }, 50);
}


function fecharImportacao() {

  $("igImportModal")
    ?.classList.remove(
      "show"
    );

  importadosTemporarios =
    [];
}


/* ============================================================
   ANALISAR LISTA
   ============================================================ */

function analisarImportacaoInterface() {

  const texto =
    $("igImportTextarea")
      ?.value ||
    "";

  const resultado =
    $("igImportResultado");

  const confirmar =
    $("igConfirmarImport");


  if (!texto.trim()) {

    resultado.innerHTML = `
      <div class="safe">
        Cole uma lista antes de analisar.
      </div>
    `;

    confirmar.style.display =
      "none";

    return;
  }


  const contatos =
    analisarLista(
      texto
    );


  importadosTemporarios =
    contatos;


  if (!contatos.length) {

    resultado.innerHTML = `
      <div class="safe">
        Não consegui identificar nenhum contato.
        Verifique se existem números de telefone.
      </div>
    `;

    confirmar.style.display =
      "none";

    return;
  }


  const existentes =
    new Set(
      getConversas().map(
        c =>
          normalizarTelefone(
            c.phone
          )
      )
    );


  const novos =
    contatos.filter(
      c =>
        !existentes.has(
          normalizarTelefone(
            c.telefone
          )
        )
    ).length;


  const duplicados =
    contatos.length -
    novos;


  resultado.innerHTML = `

    <div
      class="card"
      style="padding:14px;"
    >

      <p>
        <b>
          ${contatos.length}
          contato(s) identificado(s)
        </b>
      </p>


      <p>
        ${novos}
        novo(s) serão importados
        •
        ${duplicados}
        já cadastrado(s)
      </p>


      <div
        style="
          overflow:auto;
          max-height:300px;
          border:1px solid #e5e7eb;
          border-radius:8px;
        "
      >

        <table
          style="
            width:100%;
            border-collapse:collapse;
          "
        >

          <thead>

            <tr>

              <th
                style="
                  text-align:left;
                  padding:8px;
                "
              >
                Empresa
              </th>


              <th
                style="
                  text-align:left;
                  padding:8px;
                "
              >
                Telefone
              </th>


              <th
                style="
                  text-align:left;
                  padding:8px;
                "
              >
                Etapa
              </th>

            </tr>

          </thead>


          <tbody>

            ${contatos.map(
              c => `

              <tr>

                <td
                  style="
                    padding:8px;
                    border-top:1px solid #e2e8f0;
                  "
                >
                  ${escaparHTML(
                    c.empresa
                  )}
                </td>


                <td
                  style="
                    padding:8px;
                    border-top:1px solid #e2e8f0;
                  "
                >
                  ${escaparHTML(
                    c.telefone
                  )}
                </td>


                <td
                  style="
                    padding:8px;
                    border-top:1px solid #e2e8f0;
                  "
                >
                  ${escaparHTML(
                    c.etapa
                  )}
                </td>

              </tr>

            `
            ).join("")}

          </tbody>

        </table>

      </div>

    </div>
  `;


  confirmar.style.display =
    novos > 0
      ? "inline-block"
      : "none";


  if (novos > 0) {

    setTimeout(() => {

      confirmar.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });

    }, 50);
  }
}


/* ============================================================
   CONFIRMAR IMPORTAÇÃO
   ============================================================ */

function confirmarImportacaoInterface() {

  if (
    !importadosTemporarios.length
  ) {
    return;
  }


  const resultado =
    importarContatos(
      importadosTemporarios
    );


  $("igImportResultado").innerHTML = `

    <div class="safe">

      <b>
        Importação concluída.
      </b>

      <br>

      ${resultado.adicionados}
      contato(s) adicionado(s).

      <br>

      ${resultado.duplicados}
      contato(s) ignorado(s)
      por duplicidade.

    </div>

  `;


  $("igConfirmarImport").style.display =
    "none";


  importadosTemporarios =
    [];


  render();
}


/* ============================================================
   NAVEGAÇÃO
   ============================================================ */

function mostrarPagina(view) {

  const nome =
    TITULOS[view]
      ? view
      : "dashboard";


  document
    .querySelectorAll(".view")
    .forEach(
      secao => {

        secao.classList.toggle(
          "active",
          secao.id === nome
        );

      }
    );


  document
    .querySelectorAll(
      ".nav[data-view]"
    )
    .forEach(
      item => {

        item.classList.toggle(
          "active",
          item.dataset.view === nome
        );

      }
    );


  if ($("title")) {

    $("title").textContent =
      TITULOS[nome];

  }


  try {

    if (
      window.location.hash !==
      `#${nome}`
    ) {

      history.pushState(
        {
          view: nome
        },
        "",
        `#${nome}`
      );

    }

  } catch (erro) {

    console.warn(
      "Não foi possível atualizar o histórico.",
      erro
    );

  }


  render();
}


function configurarMenu() {

  document
    .querySelectorAll(
      ".nav[data-view]"
    )
    .forEach(
      item => {

        item.onclick =
          event => {

            event.preventDefault();

            mostrarPagina(
              item.dataset.view
            );

          };

      }
    );
}


function carregarPaginaDoHash() {

  const hash =
    window.location.hash
      .replace(
        /^#/,
        ""
      );


  const view =
    TITULOS[hash]
      ? hash
      : "dashboard";


  document
    .querySelectorAll(".view")
    .forEach(
      secao => {

        secao.classList.toggle(
          "active",
          secao.id === view
        );

      }
    );


  document
    .querySelectorAll(
      ".nav[data-view]"
    )
    .forEach(
      item => {

        item.classList.toggle(
          "active",
          item.dataset.view === view
        );

      }
    );


  if ($("title")) {

    $("title").textContent =
      TITULOS[view];

  }
}


window.addEventListener(
  "popstate",
  carregarPaginaDoHash
);


window.addEventListener(
  "hashchange",
  carregarPaginaDoHash
);


/* ============================================================
   DASHBOARD
   ============================================================ */

function renderDashboard(
  conversas
) {

  const total =
    conversas.length;


  const respondidas =
    conversas.filter(
      c =>
        c.stage !==
        "Prospectado"
    ).length;


  const interessadas =
    conversas.filter(
      c =>
        [
          "Interessado",
          "Pediu modelo",
          "Orçamento / negociação",
          "Venda fechada"
        ].includes(
          c.stage
        )
    ).length;


  const fechadas =
    conversas.filter(
      c =>
        c.stage ===
        "Venda fechada"
    ).length;


  if ($("sTotal")) {
    $("sTotal").textContent =
      total;
  }


  if ($("sAnswered")) {
    $("sAnswered").textContent =
      respondidas;
  }


  if ($("sInterested")) {
    $("sInterested").textContent =
      interessadas;
  }


  if ($("sWon")) {
    $("sWon").textContent =
      fechadas;
  }


  if ($("navCount")) {
    $("navCount").textContent =
      total;
  }


  const max =
    Math.max(
      ...ETAPAS.map(
        etapa =>
          conversas.filter(
            c =>
              c.stage ===
              etapa
          ).length
      ),
      1
    );


  if ($("bars")) {

    $("bars").innerHTML =
      ETAPAS.map(
        etapa => {

          const quantidade =
            conversas.filter(
              c =>
                c.stage ===
                etapa
            ).length;


          const largura =
            quantidade
              ? Math.max(
                  5,
                  quantidade /
                    max *
                    100
                )
              : 0;


          return `

            <div class="barline">

              <div>

                <span>
                  ${escaparHTML(
                    etapa
                  )}
                </span>

                <b>
                  ${quantidade}
                </b>

              </div>


              <div class="bar">

                <i
                  style="
                    width:${largura}%
                  "
                ></i>

              </div>

            </div>

          `;

        }
      ).join("");

  }


  const recentes =
    [...conversas]
      .sort(
        (a, b) =>
          String(
            b.updated
          ).localeCompare(
            String(
              a.updated
            )
          )
      )
      .slice(
        0,
        5
      );


  if ($("recent")) {

    $("recent").innerHTML =
      recentes.length

        ? recentes.map(
            c => `

              <div class="recent">

                <b>
                  ${escaparHTML(
                    c.company
                  )}
                </b>

                <small>
                  ${escaparHTML(
                    c.phone
                  )}

                  •

                  ${escaparHTML(
                    c.stage
                  )}

                  •

                  ${escaparHTML(
                    c.updated
                  )}

                </small>

              </div>

            `
          ).join("")

        : `

          <div class="empty">
            Nenhuma conversa registrada.
          </div>

        `;
  }
}


/* ============================================================
   ORDENAÇÃO POR DATA
   ============================================================ */

function ordenarPorDataMaisRecente(
  lista
) {

  return [...lista].sort(
    (a, b) => {

      const dataA =
        String(
          a.updated || ""
        );

      const dataB =
        String(
          b.updated || ""
        );

      const comparacao =
        dataB.localeCompare(
          dataA
        );


      if (
        comparacao !== 0
      ) {
        return comparacao;
      }


      return Number(
        b.id || 0
      ) -
      Number(
        a.id || 0
      );
    }
  );
}


/* ============================================================
   BARRA DE AÇÕES EM MASSA
   ============================================================ */

function criarBarraSelecao() {

  if (
    $("igBulkActions")
  ) {
    return;
  }


  const barra =
    document.createElement(
      "div"
    );

  barra.id =
    "igBulkActions";


  barra.style.cssText = `
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    flex-wrap:wrap;
    margin:12px 0;
    padding:12px 14px;
    background:#ffffff;
    border:1px solid #e2e8f0;
    border-radius:10px;
    box-sizing:border-box;
  `;


  barra.innerHTML = `

    <div
      style="
        display:flex;
        align-items:center;
        gap:10px;
      "
    >

      <label
        style="
          display:flex;
          align-items:center;
          gap:8px;
          cursor:pointer;
          font-weight:600;
        "
      >

        <input
          type="checkbox"
          id="igSelecionarTodas"
          style="
            width:18px;
            height:18px;
            cursor:pointer;
          "
        >

        Selecionar todas

      </label>


      <span
        id="igQuantidadeSelecionada"
        style="
          font-size:13px;
          color:#64748b;
        "
      >
        0 selecionadas
      </span>

    </div>


    <button
      type="button"
      id="igExcluirSelecionadas"
      class="secondary"
      disabled
      style="
        color:#b91c1c;
        border-color:#fecaca;
        background:#fff;
        font-weight:600;
      "
    >
      🗑️ Excluir selecionadas
    </button>

  `;


  const rows =
    $("rows");


  if (
    rows &&
    rows.closest("table")
  ) {

    const tabela =
      rows.closest(
        "table"
      );


    tabela.parentElement.insertBefore(
      barra,
      tabela
    );

  } else if (
    $("search")
  ) {

    const area =
      $("search").parentElement;


    area.parentElement.insertBefore(
      barra,
      area.nextSibling
    );

  } else {

    document.body.prepend(
      barra
    );
  }


  $("igSelecionarTodas")
    ?.addEventListener(
      "change",
      selecionarTodasVisiveis
    );


  $("igExcluirSelecionadas")
    ?.addEventListener(
      "click",
      excluirSelecionadas
    );
}


/* ============================================================
   ATUALIZAR BARRA DE SELEÇÃO
   ============================================================ */

function atualizarBarraSelecao(
  idsVisiveis = []
) {

  const checkbox =
    $("igSelecionarTodas");

  const contador =
    $("igQuantidadeSelecionada");

  const botao =
    $("igExcluirSelecionadas");


  const quantidade =
    conversasSelecionadas.size;


  if (contador) {

    contador.textContent =
      `${quantidade} selecionada${
        quantidade === 1
          ? ""
          : "s"
      }`;

  }


  if (botao) {

    botao.disabled =
      quantidade === 0;

    botao.style.opacity =
      quantidade === 0
        ? "0.55"
        : "1";

    botao.style.cursor =
      quantidade === 0
        ? "not-allowed"
        : "pointer";

  }


  if (checkbox) {

    const totalVisiveis =
      idsVisiveis.length;


    const selecionadasVisiveis =
      idsVisiveis.filter(
        id =>
          conversasSelecionadas.has(
            String(id)
          )
      ).length;


    checkbox.checked =
      totalVisiveis > 0 &&
      selecionadasVisiveis ===
        totalVisiveis;


    checkbox.indeterminate =
      selecionadasVisiveis > 0 &&
      selecionadasVisiveis <
        totalVisiveis;

  }
}


/* ============================================================
   SELECIONAR / DESELECIONAR CONVERSA
   ============================================================ */

function alternarSelecao(
  id,
  selecionado
) {

  const chave =
    String(id);


  if (selecionado) {

    conversasSelecionadas.add(
      chave
    );

  } else {

    conversasSelecionadas.delete(
      chave
    );

  }


  renderConversas(
    getConversas()
  );
}


/* ============================================================
   SELECIONAR TODAS AS VISÍVEIS
   ============================================================ */

function selecionarTodasVisiveis(
  event
) {

  const marcados =
    event.target.checked;


  const conversas =
    getConversas();


  const busca =
    (
      $("search")?.value ||
      ""
    )
      .toLowerCase()
      .trim();


  const filtro =
    $("stageFilter")?.value ||
    "";


  const filtradas =
    ordenarPorDataMaisRecente(
      conversas
    ).filter(
      c => {

        const texto =
          `${c.company} ${c.phone} ${c.note}`
            .toLowerCase();


        return (
          (!busca ||
            texto.includes(
              busca
            )) &&

          (!filtro ||
            c.stage ===
              filtro)
        );

      }
    );


  if (marcados) {

    filtradas.forEach(
      c =>
        conversasSelecionadas.add(
          String(c.id)
        )
    );

  } else {

    filtradas.forEach(
      c =>
        conversasSelecionadas.delete(
          String(c.id)
        )
    );

  }


  renderConversas(
    conversas
  );
}


/* ============================================================
   EXCLUIR SELECIONADAS
   ============================================================ */

function excluirSelecionadas() {

  const quantidade =
    conversasSelecionadas.size;


  if (
    quantidade === 0
  ) {
    return;
  }


  const mensagem =
    quantidade === 1

      ? "Tem certeza que deseja apagar esta conversa? Essa ação não pode ser desfeita."

      : `Tem certeza que deseja apagar ${quantidade} conversas selecionadas? Essa ação não pode ser desfeita.`;


  const confirmar =
    window.confirm(
      mensagem
    );


  if (!confirmar) {
    return;
  }


  const conversas =
    getConversas();


  const restantes =
    conversas.filter(
      conversa =>
        !conversasSelecionadas.has(
          String(
            conversa.id
          )
        )
    );


  const removidas =
    conversas.length -
    restantes.length;


  salvarConversas(
    restantes
  );


  conversasSelecionadas.clear();


  alert(
    `${removidas} conversa(s) apagada(s) com sucesso.`
  );


  render();
}


/* ============================================================
   CONVERSAS
   ============================================================ */

function renderConversas(
  conversas
) {

  const busca =
    (
      $("search")?.value ||
      ""
    )
      .toLowerCase()
      .trim();


  const filtro =
    $("stageFilter")?.value ||
    "";


  /*
     DATA MAIS RECENTE PRIMEIRO
  */

  const ordenadas =
    ordenarPorDataMaisRecente(
      conversas
    );


  const filtradas =
    ordenadas.filter(
      c => {

        const texto =
          `${c.company} ${c.phone} ${c.note}`
            .toLowerCase();


        return (
          (!busca ||
            texto.includes(
              busca
            )) &&

          (!filtro ||
            c.stage ===
              filtro)
        );

      }
    );


  /*
     Remove da seleção IDs
     que já não existem.
  */

  const idsExistentes =
    new Set(
      conversas.map(
        c =>
          String(c.id)
      )
    );


  conversasSelecionadas.forEach(
    id => {

      if (
        !idsExistentes.has(id)
      ) {

        conversasSelecionadas.delete(
          id
        );

      }

    }
  );


  if ($("rows")) {

    $("rows").innerHTML =
      filtradas.length

        ? filtradas.map(
            c => `

              <tr>

                <td
                  style="
                    width:45px;
                    text-align:center;
                  "
                >

                  <input
                    type="checkbox"
                    class="igContatoCheckbox"
                    data-id="${c.id}"
                    ${
                      conversasSelecionadas.has(
                        String(c.id)
                      )
                        ? "checked"
                        : ""
                    }
                    style="
                      width:18px;
                      height:18px;
                      cursor:pointer;
                    "
                  >

                </td>


                <td>

                  <b>
                    ${escaparHTML(
                      c.company
                    )}
                  </b>

                </td>


                <td>

                  ${escaparHTML(
                    c.phone
                  )}

                </td>


                <td>

                  <span class="pill">

                    ${escaparHTML(
                      c.stage
                    )}

                  </span>

                </td>


                <td>

                  ${escaparHTML(
                    c.updated
                  )}

                </td>


                <td>

                  <button
                    type="button"
                    class="secondary view-btn"
                    data-id="${c.id}"
                  >
                    Ver conversa
                  </button>

                </td>

              </tr>

            `
          ).join("")

        : `

          <tr>

            <td
              colspan="6"
              class="empty"
            >
              Nenhum resultado.
            </td>

          </tr>

        `;
  }


  /*
     Cria a barra de seleção.
  */

  criarBarraSelecao();


  /*
     Atualiza o cabeçalho da tabela
     para mostrar checkbox.
  */

  const tabela =
    $("rows")
      ?.closest("table");


  if (tabela) {

    const primeiroTh =
      tabela.querySelector(
        "thead th"
      );


    if (
      primeiroTh &&
      !primeiroTh.dataset.igSelectHeader
    ) {

      primeiroTh.dataset.igSelectHeader =
        "1";

      primeiroTh.textContent =
        "Selecionar";

      primeiroTh.style.width =
        "45px";

      primeiroTh.style.textAlign =
        "center";
    }
  }


  /*
     Eventos dos checkboxes.
  */

  document
    .querySelectorAll(
      ".igContatoCheckbox"
    )
    .forEach(
      checkbox => {

        checkbox.addEventListener(
          "change",
          event => {

            event.stopPropagation();

            alternarSelecao(
              checkbox.dataset.id,
              checkbox.checked
            );

          }
        );

      }
    );


  /*
     Eventos dos botões
     "Ver conversa".
  */

  document
    .querySelectorAll(
      ".view-btn"
    )
    .forEach(
      botao => {

        botao.onclick =
          () =>
            abrirConversa(
              Number(
                botao.dataset.id
              )
            );

      }
    );


  atualizarBarraSelecao(
    filtradas.map(
      c =>
        c.id
    )
  );
}


/* ============================================================
   FUNIL
   ============================================================ */

function renderFunil(
  conversas
) {

  if (!$("board")) {
    return;
  }


  $("board").innerHTML =
    ETAPAS.map(
      etapa => {

        const contatos =
          ordenarPorDataMaisRecente(
            conversas.filter(
              c =>
                c.stage ===
                etapa
            )
          );


        return `

          <div class="col">

            <b>

              ${escaparHTML(
                etapa
              )}

              (${contatos.length})

            </b>


            ${
              contatos.length

                ? contatos
                    .map(
                      c => `

                        <div
                          class="ticket"
                          data-id="${c.id}"
                        >

                          <b>
                            ${escaparHTML(
                              c.company
                            )}
                          </b>

                          <small>
                            ${escaparHTML(
                              c.phone
                            )}
                          </small>

                        </div>

                      `
                    )
                    .join("")

                : `

                  <p class="empty">
                    Nenhuma conversa.
                  </p>

                `
            }

          </div>

        `;

      }
    ).join("");


  document
    .querySelectorAll(
      ".ticket[data-id]"
    )
    .forEach(
      ticket => {

        ticket.onclick =
          () =>
            abrirConversa(
              Number(
                ticket.dataset.id
              )
            );

      }
    );
}


/* ============================================================
   ANÁLISE
   ============================================================ */

function renderAnalise(
  conversas
) {

  const total =
    conversas.length;


  const respondidas =
    conversas.filter(
      c =>
        c.stage !==
        "Prospectado"
    ).length;


  const interessadas =
    conversas.filter(
      c =>
        [
          "Interessado",
          "Pediu modelo",
          "Orçamento / negociação",
          "Venda fechada"
        ].includes(
          c.stage
        )
    ).length;


  const modelos =
    conversas.filter(
      c =>
        [
          "Pediu modelo",
          "Orçamento / negociação",
          "Venda fechada"
        ].includes(
          c.stage
        )
    ).length;


  const vendas =
    conversas.filter(
      c =>
        c.stage ===
        "Venda fechada"
    ).length;


  if ($("responseRate")) {

    $("responseRate").textContent =
      total

        ? `${Math.round(
            respondidas /
              total *
              100
          )}%`

        : "0%";
  }


  if ($("interestRate")) {

    $("interestRate").textContent =
      respondidas

        ? `${Math.round(
            interessadas /
              respondidas *
              100
          )}%`

        : "0%";
  }


  if ($("modelRate")) {

    $("modelRate").textContent =
      total

        ? `${Math.round(
            modelos /
              total *
              100
          )}%`

        : "0%";
  }


  if ($("saleRate")) {

    $("saleRate").textContent =
      total

        ? `${Math.round(
            vendas /
              total *
              100
          )}%`

        : "0%";
  }


  const max =
    Math.max(
      ...ETAPAS.map(
        e =>
          conversas.filter(
            c =>
              c.stage ===
              e
          ).length
      ),
      1
    );


  if ($("dropoff")) {

    $("dropoff").innerHTML =
      ETAPAS.map(
        etapa => {

          const quantidade =
            conversas.filter(
              c =>
                c.stage ===
                etapa
            ).length;


          const largura =
            quantidade
              ? Math.max(
                  4,
                  quantidade /
                    max *
                    100
                )
              : 0;


          return `

            <div class="barline">

              <div>

                <span>
                  ${escaparHTML(
                    etapa
                  )}
                </span>

                <b>
                  ${quantidade}
                </b>

              </div>


              <div class="bar">

                <i
                  style="
                    width:${largura}%
                  "
                ></i>

              </div>

            </div>

          `;

        }
      ).join("");
  }


  const respostas =
    conversas
      .map(
        c =>
          Number(
            c.firstReply
          )
      )
      .filter(
        n =>
          n > 0
      );


  const media =
    respostas.length

      ? Math.round(
          respostas.reduce(
            (a, b) =>
              a + b,
            0
          ) /
          respostas.length
        )

      : 0;


  const maisRapida =
    respostas.length
      ? Math.min(
          ...respostas
        )
      : 0;


  const maisDemorada =
    respostas.length
      ? Math.max(
          ...respostas
        )
      : 0;


  if ($("timing")) {

    $("timing").innerHTML = `

      <p>

        <b>
          Média até primeira resposta:
        </b>

        ${media} minutos

      </p>


      <p>

        <b>
          Mais rápida:
        </b>

        ${maisRapida} minutos

      </p>


      <p>

        <b>
          Mais demorada:
        </b>

        ${maisDemorada} minutos

      </p>

    `;
  }


  if ($("insight")) {

    $("insight").innerHTML = `

      <h2>
        Leitura dos dados
      </h2>

      <p>

        Hoje há
        <b>${respondidas}</b>
        conversa(s) que responderam
        e
        <b>${interessadas}</b>
        que chegaram a interesse,
        pedido de modelo ou negociação.

      </p>

    `;
  }
}


/* ============================================================
   ANOTAÇÕES
   ============================================================ */

function renderNotas(
  conversas
) {

  if (!$("notesList")) {
    return;
  }


  const anotacoes =
    carregarAnotacoes();


  const cards =
    conversas.map(
      c => `

        <div
          class="card notesItem"
        >

          <h3>

            ${escaparHTML(
              c.company
            )}

            <span class="pill">

              ${escaparHTML(
                c.stage
              )}

            </span>

          </h3>


          <p>

            ${escaparHTML(
              c.note ||
              "Sem anotação."
            )}

          </p>


          <small>

            ${escaparHTML(
              c.phone
            )}

          </small>

        </div>

      `
    );


  const extras =
    anotacoes.map(
      n => `

        <div
          class="card notesItem"
        >

          <h3>
            Anotação
          </h3>


          <p>

            ${escaparHTML(
              n.texto
            )}

          </p>


          <small>

            ${escaparHTML(
              n.data
            )}

          </small>

        </div>

      `
    );


  $("notesList").innerHTML =
    [
      ...cards,
      ...extras
    ].join("") ||

    `

      <div class="card empty">
        Nenhuma anotação.
      </div>

    `;
}


/* ============================================================
   RENDER GERAL
   ============================================================ */

function render() {

  const conversas =
    getConversas();


  renderDashboard(
    conversas
  );


  renderConversas(
    conversas
  );


  renderFunil(
    conversas
  );


  renderAnalise(
    conversas
  );


  renderNotas(
    conversas
  );
}


/* ============================================================
   ABRIR CONVERSA
   ============================================================ */

function abrirConversa(
  id
) {

  const conversa =
    getConversas().find(
      c =>
        Number(c.id) ===
        Number(id)
    );


  if (!conversa) {
    return;
  }


  selectedId =
    conversa.id;


  if ($("detailName")) {

    $("detailName").textContent =
      conversa.company;

  }


  if ($("detailMeta")) {

    $("detailMeta").textContent =
      `${conversa.phone} • ${conversa.stage} • última atividade ${conversa.updated}`;

  }


  if ($("detailSummary")) {

    $("detailSummary").innerHTML = `

      <b>Etapa:</b>

      ${escaparHTML(
        conversa.stage
      )}

      <br>

      <b>
        Tempo até primeira resposta:
      </b>

      ${
        conversa.firstReply
          ? `${conversa.firstReply} minutos`
          : "Não respondeu"
      }

      <br>

      <b>
        Observação:
      </b>

      ${escaparHTML(
        conversa.note ||
        "Nenhuma"
      )}

    `;
  }


  if ($("detailNote")) {

    $("detailNote").value =
      conversa.note ||
      "";

  }


  const historico =
    Array.isArray(
      conversa.history
    )
      ? conversa.history
      : [];


  if ($("history")) {

    $("history").innerHTML =
      historico.length

        ? historico
            .map(
              m => `

                <div
                  class="
                    bubble
                    ${
                      m.from ===
                      "client"
                        ? "client"
                        : "ig"
                    }
                  "
                >

                  ${escaparHTML(
                    m.text
                  )}

                  <small>

                    ${
                      m.from ===
                      "client"
                        ? "Cliente"
                        : "IG Sites"
                    }

                    •

                    ${escaparHTML(
                      m.time ||
                      ""
                    )}

                  </small>

                </div>

              `
            )
            .join("")

        : `

          <div class="empty">

            Nenhum histórico
            importado/registrado
            nesta conversa.

          </div>

        `;
  }


  if ($("conversationModal")) {

    $("conversationModal")
      .classList.add(
        "show"
      );

  }
}


/* ============================================================
   NOVA CONVERSA
   ============================================================ */

function abrirNovaConversa() {

  if ($("modal")) {

    $("modal")
      .classList.add(
        "show"
      );

  }
}


function salvarNovaConversa(
  event
) {

  event.preventDefault();


  const formulario =
    event.target;


  const dados =
    new FormData(
      formulario
    );


  const conversas =
    getConversas();


  const telefone =
    formatarTelefone(
      dados.get(
        "phone"
      )
    );


  if (
    telefoneJaExiste(
      telefone,
      conversas
    )
  ) {

    alert(
      "Este telefone já está cadastrado no CRM."
    );

    return;
  }


  conversas.push({

    id:
      gerarId(),

    company:
      String(
        dados.get(
          "company"
        ) || ""
      ).trim(),

    phone:
      telefone,

    stage:
      String(
        dados.get(
          "stage"
        ) ||
        "Prospectado"
      ),

    firstReply:
      Number(
        dados.get(
          "firstReply"
        ) || 0
      ),

    updated:
      hoje(),

    note:
      String(
        dados.get(
          "note"
        ) || ""
      ).trim(),

    history: []

  });


  salvarConversas(
    conversas
  );


  formulario.reset();


  if ($("modal")) {

    $("modal")
      .classList.remove(
        "show"
      );

  }


  render();
}


/* ============================================================
   SALVAR ANOTAÇÃO
   ============================================================ */

function salvarAnotacaoConversa() {

  const conversas =
    getConversas();


  const conversa =
    conversas.find(
      c =>
        Number(c.id) ===
        Number(selectedId)
    );


  if (!conversa) {
    return;
  }


  conversa.note =
    $("detailNote")
      .value
      .trim();


  conversa.updated =
    hoje();


  salvarConversas(
    conversas
  );


  const anotacoes =
    carregarAnotacoes();


  anotacoes.unshift({

    data:
      hoje(),

    texto:
      `${conversa.company}: ${
        conversa.note ||
        "Anotação removida."
      }`

  });


  salvarAnotacoes(
    anotacoes
  );


  render();


  abrirConversa(
    conversa.id
  );
}


/* ============================================================
   SELECTS
   ============================================================ */

function preencherSelects() {

  if ($("stageFilter")) {

    $("stageFilter").innerHTML =
      `

        <option value="">
          Todas as etapas
        </option>

      ` +

      ETAPAS.map(
        e => `

          <option
            value="${escaparHTML(
              e
            )}"
          >

            ${escaparHTML(
              e
            )}

          </option>

        `
      ).join("");
  }


  if ($("newStage")) {

    $("newStage").innerHTML =
      ETAPAS.map(
        e => `

          <option
            value="${escaparHTML(
              e
            )}"
          >

            ${escaparHTML(
              e
            )}

          </option>

        `
      ).join("");
  }
}


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

function inicializar() {

  carregarConversas();


  preencherSelects();


  configurarMenu();


  criarBotaoImportar();


  criarModalImportacao();


  $("search")
    ?.addEventListener(
      "input",
      render
    );


  $("stageFilter")
    ?.addEventListener(
      "change",
      render
    );


  $("newConversation")
    ?.addEventListener(
      "click",
      abrirNovaConversa
    );


  $("newConversation2")
    ?.addEventListener(
      "click",
      abrirNovaConversa
    );


  $("cancel")
    ?.addEventListener(
      "click",
      () =>
        $("modal")
          ?.classList.remove(
            "show"
          )
    );


  $("form")
    ?.addEventListener(
      "submit",
      salvarNovaConversa
    );


  $("closeDetail")
    ?.addEventListener(
      "click",
      () =>
        $("conversationModal")
          ?.classList.remove(
            "show"
          )
    );


  $("saveNote")
    ?.addEventListener(
      "click",
      salvarAnotacaoConversa
    );


  $("modal")
    ?.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("modal")
        ) {

          $("modal")
            .classList.remove(
              "show"
            );

        }

      }
    );


  $("conversationModal")
    ?.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("conversationModal")
        ) {

          $("conversationModal")
            .classList.remove(
              "show"
            );

        }

      }
    );


  carregarPaginaDoHash();


  render();
}


/* ============================================================
   FUNÇÕES GLOBAIS
   ============================================================ */

window.analisarLista =
  analisarLista;

window.importarContatos =
  importarContatos;

window.abrirConversa =
  abrirConversa;

window.mostrarPagina =
  mostrarPagina;

window.render =
  render;

window.excluirSelecionadas =
  excluirSelecionadas;


/* ============================================================
   START
   ============================================================ */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    inicializar
  );

} else {

  inicializar();

}
