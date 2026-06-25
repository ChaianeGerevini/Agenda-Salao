let calendar
let selectedDate = null
let eventoSelecionado = null
let profissionaisCache = []
let profissionalEditando = null
let totalSalao = 0

// ==========================
// HELPERS
// ==========================
function toLocalISO(dateStr, timeStr) {
  return `${dateStr}T${timeStr}:00`
}

function gerarPastel(hex) {
  if (!hex) return "#d4af37"

  const c = hex.replace("#", "")
  const num = parseInt(c, 16)

  let r = (num >> 16) & 255
  let g = (num >> 8) & 255
  let b = num & 255

  r = Math.min(255, r + 120)
  g = Math.min(255, g + 120)
  b = Math.min(255, b + 120)

  return `rgb(${r}, ${g}, ${b})`
}

// ==========================
// PROFISSIONAIS - Desktop
// ==========================
async function carregarProfissionais() {
  const { data, error } = await window.sb
    .from("profissionais")
    .select("*")
    .eq("ativo", true)
    

  if (error) return console.log(error)

  profissionaisCache = data || []

  const select = document.getElementById("profissional")
const editSelect = document.getElementById("editProfissional")
const filtroSelect = document.getElementById("filtroProfissional")

  if (select) select.innerHTML = `<option value="">Selecione profissional</option>`
  if (editSelect) editSelect.innerHTML = `<option value="">Selecione profissional</option>`
  

  profissionaisCache.forEach(p => {
    if (select) {
      const opt = document.createElement("option")
      opt.value = p.id
      opt.textContent = `⬤ ${p.nome}`
      opt.dataset.cor = p.cor
      select.appendChild(opt)
    }

    if (editSelect) {
      const opt = document.createElement("option")
      opt.value = p.id
      opt.textContent = `⬤ ${p.nome}`
      opt.dataset.cor = p.cor
      editSelect.appendChild(opt)
    }
    if (filtroSelect) {
  const opt = document.createElement("option")
  opt.value = p.id
  opt.textContent = `⬤ ${p.nome}`
  filtroSelect.appendChild(opt)
}
  })

  renderProfissionais()

if (calendar) {
  calendar.refetchEvents()
} 
}

function renderProfissionais() {

  const container = document.getElementById("listaProfissionais")
  if (!container) return

  container.innerHTML = profissionaisCache.map(p => `
    <div class="card-profissional">

      <div class="lado-esquerdo">
        <div class="bolinha" style="background:${p.cor}"></div>

        <div>
          <b>${p.nome}</b>
          <small>${p.porcentagem || 0}%</small>
        </div>
      </div>

      <div class="acoes-profissional">

        <button class="btn-edit" onclick="abrirEditarProfissional('${p.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cba630" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
        </button>

        <button class="btn-delete" onclick="excluirProfissional('${p.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cba630" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>

      </div>

    </div>
  `).join("")
}

// ==========================
// DETALHES
// ==========================
function abrirDetalhes(evento) {
  eventoSelecionado = evento

  const d = evento.extendedProps || {}

  const telefone = d.telefone || ""
const cliente = d.cliente || "-"
const procedimento = d.procedimento || "-"

  const inicio = new Date(evento.start)
  const fim = new Date(evento.end)

  const hora = `
${inicio.toLocaleDateString()}
${inicio.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
—
${fim.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
`

  // 🔥 CONVERTE ID → NOME AQUI
  const nomeProfissional =
    profissionaisCache.find(p => p.id == d.profissional)?.nome || "-"

  document.getElementById("infoAgendamento").innerHTML = `
    <div><b>Cliente:</b> ${d.cliente || "-"}</div>
    <div><b>Procedimento:</b> ${d.procedimento || "-"}</div>
    <div><b>Profissional:</b> ${nomeProfissional}</div>
    <div><b>Valor:</b> R$ ${Number(d.valor || 0).toFixed(2)}</div>
    <div><b>Horário:</b> ${hora}</div>
  `

  document.querySelector(".btn-whatsapp").onclick =
  () => enviarConfirmacaoWhatsApp(eventoSelecionado.extendedProps)
  document.querySelector(".btn-remarcar").onclick = abrirRemarcar
  document.querySelector(".btn-cancelar").onclick = cancelar

  abrirModal("viewModal")
}

// ==========================
// CANCELAR
// ==========================
window.cancelar = async function () {
  if (!eventoSelecionado) return

  const { error } = await window.sb
    .from("agendamentos")
    .update({ status: "cancelado" })
    .eq("id", eventoSelecionado.id)

  if (error) return alert("Erro ao cancelar")

  calendar.refetchEvents()
  fecharModal("viewModal")
}

// ==========================
// REMARCAR
// ==========================
function abrirRemarcar() {
  abrirModal("remarcarModal")
}

function fecharRemarcar() {
  fecharModal("remarcarModal")
}

async function confirmarRemarcacao() {
  const data = document.getElementById("novaData").value
  const hora = document.getElementById("novaHora").value
  const fim = document.getElementById("novoFim").value

  if (!data || !hora || !fim) return alert("Preencha todos os campos")

  await window.sb
    .from("agendamentos")
    .update({
      inicio: toLocalISO(data, hora),
      fim: toLocalISO(data, fim)
    })
    .eq("id", eventoSelecionado.id)

  fecharRemarcar()
  fecharModal("viewModal")
  calendar.refetchEvents()
}

// ==========================
// MODAIS (PADRÃO ÚNICO)
// ==========================
function abrirModal(id) {

  const modal = document.getElementById(id)

  if (!modal) return

  modal.classList.add("show")

  // trava scroll do fundo
  document.body.style.overflow = "hidden"
}

function fecharModal(id) {

  const modal = document.getElementById(id)

  if (!modal) return

  modal.classList.remove("show")

  // verifica se ainda existe modal aberto
  const aberto = document.querySelector(".modal.show")

  if (!aberto) {
    document.body.style.overflow = ""
  }

}
document.addEventListener("DOMContentLoaded", async () => {

// ==========================
// BOTÕES NAV
// ==========================
document.addEventListener("click", (e) => {

  const agenda = e.target.closest("#navAgenda")
  const novo = e.target.closest("#navNovo")
  const prof = e.target.closest("#navProfissionais")
  const gestao = e.target.closest("#navGestao")

  if (agenda) {
    fecharTodosModais()
  }

  if (novo) {
    abrirNovoAgendamento()
  }

  if (prof) {
    abrirProfissionais()
  }

  if (gestao) {
    carregarGestao()
  }

})
  // ==========================
  // CALENDÁRIO
  // ==========================
  const calendarEl = document.getElementById("calendar")

  if (!calendarEl) return

  calendar = new FullCalendar.Calendar(calendarEl, {
    locale: "pt-br",
  firstDay: 0,

    dayHeaderFormat: {
    weekday: "short"
  },

  buttonText: {
    today: "Hoje",
    month: "Mês",
    week: "Semana",
    day: "Dia",
    list: "Lista"
  },

  allDayText: "Dia inteiro",
  moreLinkText: "mais",

    initialView: "dayGridMonth",
    height: "100%",

   headerToolbar: false,

dateClick(info) {
  irParaData(info.dateStr, "timeGridDay") // ou timeGridWeek
  abrirAgendamentosDoDia(info.dateStr)
},

    eventClick(info) {
      abrirDetalhes(info.event)
    },
    datesSet(info)
     {
      

  const titulo =
    document.getElementById("tituloCalendario")

  if (titulo) {
    titulo.textContent = info.view.title
  }

},

    events: async function (fetchInfo, successCallback, failureCallback) {

  const { data, error } = await window.sb
    .from("agendamentos")
    .select("*")
    const profissionalFiltro =
  document.getElementById("filtroProfissional")
  ?.value

  if (error) return failureCallback(error)

  successCallback(
(data || [])
.filter(e => {

  if (!profissionalFiltro)
    return true

  return e.profissional ==
    profissionalFiltro

})    
  .filter(e => e.status !== "cancelado")
      .map(e => {

        const prof = profissionaisCache.find(p => p.id == e.profissional)
        const cor = prof?.cor || "#d4af37"

        return {
          id: e.id,
          title: window.innerWidth < 768
            ? e.cliente
            : `${e.cliente} - ${e.procedimento}`,
          start: e.inicio,
          end: e.fim,

          backgroundColor: gerarPastel(cor),
          borderColor: cor,
          textColor: "#333",

          extendedProps: e
        }
      })
  )
}

  })

 await carregarProfissionais()
calendar.render()
document
  .querySelector('[data-view="dayGridMonth"]')
  ?.classList.add("active")
  document
  .getElementById("filtroProfissional")
  ?.addEventListener("change", () => {

    calendar.refetchEvents()

  })
})

// ==========================
// NAVEGAÇÃO CUSTOMIZADA
// ==========================

document.getElementById("btnPrev")
?.addEventListener("click", () => {

  calendar.prev()

})

document.getElementById("btnNext")
?.addEventListener("click", () => {

  calendar.next()

})

document.getElementById("btnHoje")?.addEventListener("click", () => {
  calendar.changeView(calendar.view.type)
  calendar.today()
})

document
  .querySelectorAll("[data-view]")
  .forEach(btn => {

    btn.addEventListener("click", () => {

      document
        .querySelectorAll("[data-view]")
        .forEach(b =>
          b.classList.remove("active")
        )

      btn.classList.add("active")

    mudarViewHoje(btn.dataset.view)

    })

})
function mudarViewHoje(view) {
  if (!calendar) return

  calendar.changeView(view)
  calendar.today()
}
// ==========================
// ABRIR/FECHAR dia com agendamentos pelo calendario
// ==========================
 async function abrirAgendamentosDoDia(dataSelecionada) {

  const inicioDia = `${dataSelecionada}T00:00:00`
  const fimDia = `${dataSelecionada}T23:59:59`

let query = window.sb
  .from("agendamentos")
  .select("*")
  .gte("inicio", inicioDia)
  .lte("inicio", fimDia)
  .neq("status", "cancelado")

const profissionalFiltro =
  document.getElementById("filtroProfissional")?.value

if (profissionalFiltro) {
  query = query.eq(
    "profissional",
    profissionalFiltro
  )
}

const { data, error } = await query

  if (error) {
    console.log(error)
    return alert("Erro ao buscar agendamentos")
  }

  const container = document.getElementById("listaAgendamentosDia")

  if (!container) return

  if (!data.length) {
    container.innerHTML = `
      <div class="sem-agendamentos">
        Nenhum agendamento neste dia
      </div>
    `
  } else {

    container.innerHTML = data.map(a => {

      const prof = profissionaisCache.find(
        p => p.id == a.profissional
      )

      const hora = new Date(a.inicio)
        .toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })

      return `
  <div class="item-dia">

    <b>${hora}</b>

    <div class="item-dia-info">
      <h4>${a.cliente}</h4>
      <p>${a.procedimento}</p>
      <p>👤 ${prof?.nome || "-"}</p>
    </div>

  </div>
`
    }).join("")
  }

  abrirModal("modalDia")
}
// ==========================
// ABRIR/FECHAR PRINCIPAIS
// ==========================
function fecharTodosModais() {

  document.querySelectorAll(".modal.show")
    .forEach(modal => {
      modal.classList.remove("show")
    })

  document.body.style.overflow = ""
}


function abrirNovoAgendamento() {

  fecharTodosModais()
  abrirModal("modal")

}

function abrirProfissionais() {

  fecharTodosModais()
  abrirModal("modalProfissionais")

}

function carregarGestao() {

  fecharTodosModais()
  abrirModal("modalSenhaGestao")

}

async function validarSenhaGestao() {

  const senha = document.getElementById("senhaGestao")?.value

  if (senha !== "123456") {
    alert("Senha inválida")
    return
  }

  fecharModal("modalSenhaGestao")

  const { data, error } = await window.sb
    .from("agendamentos")
    .select("*")
    .neq("status", "cancelado")

  if (error) {
    console.log("Erro Supabase:", error)
    return
  }

  // =========================
  // BASE DE DADOS
  // =========================
  const hoje = new Date()

  let totalBruto = 0
  const ranking = {}
  const profissionaisSet = new Set()

  totalSalao = 0

  let totalHoje = 0
  let totalSemana = 0
  let totalMes = 0

 data.forEach(a => {

  const valor = Number(a.valor || 0)
  totalBruto += valor

  const dataAg = new Date(a.inicio)

  const mesmoDia =
    dataAg.toDateString() === hoje.toDateString()

  const mesmaSemana =
    (hoje - dataAg) <= 7 * 24 * 60 * 60 * 1000

  const mesmoMes =
    dataAg.getMonth() === hoje.getMonth() &&
    dataAg.getFullYear() === hoje.getFullYear()

  if (mesmoDia) totalHoje += valor
  if (mesmaSemana) totalSemana += valor
  if (mesmoMes) totalMes += valor

  // 👇 SÓ ISSO AQUI É NOVO (sem repetir variável)
  const prof = profissionaisCache.find(
    p => p.id == a.profissional
  )

  const nome = prof?.nome || "Sem profissional"
  if (prof?.nome) {
  profissionaisSet.add(prof.nome)
}
const porcentagem = 0

  const valorProfissional = valor * (porcentagem / 100)
  const valorSalao = valor - valorProfissional

  // ranking profissional
  if (!ranking[nome]) ranking[nome] = 0
  ranking[nome] += valorProfissional

  // salão
  totalSalao += valorSalao
  })

  // =========================
  // CARDS DO DASHBOARD
  // =========================
  const dashBruto = document.getElementById("dashBruto")
  const dashSalao = document.getElementById("dashSalao")
  const dashProf = document.getElementById("dashProf")
  const dashAtend = document.getElementById("dashAtend")

  if (dashBruto) dashBruto.innerText = `R$ ${totalBruto.toFixed(2)}`
  if (dashSalao) dashSalao.innerText = `R$ ${totalSalao.toFixed(2)}`
  if (dashProf) dashProf.innerText = profissionaisSet.size
  if (dashAtend) dashAtend.innerText = data.length

  // =========================
  // RANKING
  // =========================
  const rankingOrdenado = Object.entries(ranking)
    .sort((a, b) => b[1] - a[1])

  const lista = document.getElementById("rankingEquipe")

  if (lista) {
    lista.innerHTML = rankingOrdenado.map(([nome, valor], index) => `
      <div class="rank-item">
        <span>${index + 1}. ${nome}</span>
        <b>R$ ${valor.toFixed(2)}</b>
      </div>
    `).join("")
  }

  // =========================
  // ABRIR MODAL GESTÃO
  // =========================
  fecharTodosModais()
  abrirModal("modalGestao")
}

// ==========================
// FECHAR MODAIS ESPECÍFICOS
// ==========================
function fecharNovoModal() {
  fecharModal("modal")
}

function fecharEdit() {
  fecharModal("editModal")
}

function fecharProfissionais() {
  fecharModal("modalProfissionais")
}

function fecharViewModal() {
  fecharModal("viewModal")
}
// ==========================
// FECHAR AO CLICAR FORA
// ==========================
document.addEventListener("click", function (e) {

  const modal = document.querySelector(".modal.show")

  if (modal && e.target === modal) {
    modal.classList.remove("show")
    document.body.style.overflow = ""
  }

}, true)

// ==========================
// FECHAR COM ESC
// ==========================
document.addEventListener("keydown", function (e) {

  if (e.key === "Escape") {

    document.querySelectorAll(".modal.show").forEach(modal => {
      modal.classList.remove("show")
    })

    document.body.style.overflow = ""
  }

})
// ==========================
// DEBUG MOBILE MODAIS
// ==========================
document.addEventListener("touchstart", () => {}, { passive: true })

// ==========================
// SALVAR AGENDAMENTO
// ==========================

window.salvar = async function () {

  console.log("SALVAR AGENDAMENTO OK")

  const cliente = document.getElementById("cliente")?.value
  const telefone = document.getElementById("telefone")?.value
  const procedimento = document.getElementById("procedimento")?.value
  const valor = parseFloat( document.getElementById("valor")?.value) || 0
  const profissional = document.getElementById("profissional")?.value
  const data = document.getElementById("data")?.value
  const hora = document.getElementById("hora")?.value
  const fim = document.getElementById("fim")?.value

  const inicioNovo = new Date(`${data}T${hora}:00`)
  const fimNovo = new Date(`${data}T${fim}:00`)

  // Busca agendamentos do mesmo profissional
  const { data: agendamentos, error: erroBusca } = await window.sb
    .from("agendamentos")
    .select("*")
    .eq("profissional", profissional)
    .neq("status", "cancelado")

  if (erroBusca) {
    console.log(erroBusca)
    alert("Erro ao validar horários")
    return
  }

  // Verifica conflito
  const conflito = (agendamentos || []).some(a => {

    const inicioExistente = new Date(a.inicio)
    const fimExistente = new Date(a.fim)

    return (
      inicioNovo < fimExistente &&
      fimNovo > inicioExistente
    )
  })

  if (conflito) {
    alert("Este profissional já possui atendimento neste horário.")
    return
  }

  // Salva
  const { error } = await window.sb
    .from("agendamentos")
    .insert([{
      cliente,
      telefone,
      procedimento,
      valor,
      profissional,
      inicio: `${data}T${hora}:00`,
      fim: `${data}T${fim}:00`,
      status: "ativo"
    }])

  if (error) {
    console.log("ERRO SUPABASE:", error)
    alert("Erro ao salvar agendamento")
    return
  }
  document.getElementById("cliente").value = ""
document.getElementById("telefone").value = ""
document.getElementById("procedimento").value = ""
document.getElementById("valor").value = ""
document.getElementById("profissional").value = ""
document.getElementById("data").value = ""
document.getElementById("hora").value = ""
document.getElementById("fim").value = ""

  calendar.refetchEvents()
  fecharModal("modal")
}

// ==========================
// SALVAR PROFISSIONAL
// ==========================

window.salvarProfissional = async function () {

const nome = document.getElementById("nomeProfissional")?.value
const cor = document.getElementById("corProfissional")?.value
const porcentagem = Number(document.getElementById("porcentagemProfissional")?.value || 0)

  const { error } = await window.sb
    .from("profissionais")
    .insert([{ nome, cor, porcentagem, ativo: true }])

  if (error) {
    console.log(error)
    alert("Erro ao salvar profissional")
    return
  }

  carregarProfissionais()
}

// ==========================
// EDITAR PROFISSIONAL
// ==========================

window.editarProfissional = function (id) {

  const prof = profissionaisCache.find(p => p.id == id)
  if (!prof) return alert("Profissional não encontrado")

  const novoNome = prompt("Novo nome:", prof.nome)
  const novaCor = prompt("Nova cor (hex):", prof.cor)

  if (!novoNome || !novaCor) return

  window.sb
    .from("profissionais")
    .update({
      nome: novoNome,
      cor: novaCor,
      porcentagem
    })
    .eq("id", id)
    .then(({ error }) => {
      if (error) {
        console.log(error)
        alert("Erro ao editar profissional")
        return
      }

      carregarProfissionais()
    })
}

//* EXCLUIR PROFISSIONAL *//

window.excluirProfissional = function (id) {

  if (!confirm("Tem certeza que deseja excluir este profissional?")) return

  window.sb
    .from("profissionais")
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error) {
        console.log(error)
        alert("Erro ao excluir profissional")
        return
      }

      carregarProfissionais()
    })
}
window.abrirEditarProfissional = function (id) {
  const prof = profissionaisCache.find(p => p.id == id)
  if (!prof) return alert("Profissional não encontrado")

  profissionalEditando = prof

  document.getElementById("editNomeProfissional").value = prof.nome
  document.getElementById("editCorProfissional").value = prof.cor
  document.getElementById("editPorcentagemProfissional").value = prof.porcentagem

  abrirModal("modalEditarProfissional")
}

window.salvarEdicaoProfissional = async function () {
  if (!profissionalEditando) return

  const nome = document.getElementById("editNomeProfissional")?.value
  const cor = document.getElementById("editCorProfissional")?.value
  const porcentagem = Number(
    document.getElementById("editPorcentagemProfissional")?.value || 0
  )

  const { error } = await window.sb
    .from("profissionais")
    .update({
      nome,
      cor,
      porcentagem
    })
    .eq("id", profissionalEditando.id)

  if (error) {
    console.log(error)
    alert("Erro ao atualizar profissional")
    return
  }

  profissionalEditando = null
  fecharModal("modalEditarProfissional")
  carregarProfissionais()
}
function enviarConfirmacaoWhatsApp(d) {

  if (!d.telefone) {
    alert("Cliente sem telefone cadastrado")
    return
  }

  const telefone = d.telefone.replace(/\D/g, "")

  const data = new Date(d.inicio).toLocaleDateString("pt-BR")
  const hora = new Date(d.inicio).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })

  const mensagem = `
Olá ${d.cliente}! 

Tudo pronto! Seu horário foi confirmado.
Vai ser um prazer te receber no dia do seu atendimento.

 Data: ${data}
 Hora: ${hora}
 Serviço: ${d.procedimento}

Se precisar remarcar ou cancelar, pedimos que entre em contato com até 24h de antecedência.

  `.trim()

  const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`

  window.open(url, "_blank")
}