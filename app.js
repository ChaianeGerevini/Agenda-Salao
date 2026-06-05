let calendar
let selectedDate = null
let eventoSelecionado = null
let profissionaisCache = []
let profissionalEditando = null

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
      <b>${p.nome}</b>
    </div>

    <button class="btn-delete" onclick="excluirProfissional('${p.id}')">
      🗑️
    </button>

  </div>
`).join("")
}

// ==========================
// DETALHES
// ==========================
function abrirDetalhes(evento) {
  eventoSelecionado = evento

  const d = evento.extendedProps || {}

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
    <div><b>Horário:</b> ${hora}</div>
  `

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
    abrirGestao()
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

    headerToolbar: {
      left: "prev,next",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay"
    },

dateClick(info) {
  abrirAgendamentosDoDia(info.dateStr)
},

    eventClick(info) {
      abrirDetalhes(info.event)
    },

    events: async function (fetchInfo, successCallback, failureCallback) {

  const { data, error } = await window.sb
    .from("agendamentos")
    .select("*")

  if (error) return failureCallback(error)

  successCallback(
    (data || [])
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

})
// ==========================
// ABRIR/FECHAR dia com agendamentos pelo calendario
// ==========================
 async function abrirAgendamentosDoDia(dataSelecionada) {

  const inicioDia = `${dataSelecionada}T00:00:00`
  const fimDia = `${dataSelecionada}T23:59:59`

  const { data, error } = await window.sb
    .from("agendamentos")
    .select("*")
    .gte("inicio", inicioDia)
    .lte("inicio", fimDia)
    .neq("status", "cancelado")

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

function abrirGestao() {

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

  calendar.refetchEvents()
  fecharModal("modal")
}

// ==========================
// SALVAR PROFISSIONAL
// ==========================

window.salvarProfissional = async function () {

  const nome = document.getElementById("nomeProfissional")?.value
  const cor = document.getElementById("corProfissional")?.value

  const { error } = await window.sb
    .from("profissionais")
    .insert([{ nome, cor, ativo: true }])

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
      cor: novaCor
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