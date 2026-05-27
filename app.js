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
// PROFISSIONAIS
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
}

// ==========================
// LISTA PROFISSIONAIS
// ==========================
function renderProfissionais() {
  const container = document.getElementById("listaProfissionais")
  if (!container) return

  container.innerHTML = profissionaisCache.map(p => `
    <div class="card-profissional">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:14px;height:14px;border-radius:50%;background:${p.cor}"></div>
        <b>${p.nome}</b>
      </div>

      <div>
        <button onclick="editarProfissional('${p.id}')">✏️</button>
        <button onclick="excluirProfissional('${p.id}')">🗑️</button>
      </div>
    </div>
  `).join("")
}

// ==========================
// DETALHES EVENTO
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

  document.getElementById("infoAgendamento").innerHTML = `
    <div><b>Cliente:</b> ${d.cliente || "-"}</div>
    <div><b>Procedimento:</b> ${d.procedimento || "-"}</div>
    <div><b>Profissional:</b> ${d.profissional || "-"}</div>
    <div><b>Horário:</b> ${hora}</div>
  `

  document.querySelector(".btn-remarcar").onclick = abrirRemarcar
  document.querySelector(".btn-cancelar").onclick = cancelar

  document.getElementById("viewModal").style.display = "flex"
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
  fecharView()
}

// ==========================
// REMARCAR
// ==========================
function abrirRemarcar() {
  document.getElementById("remarcarModal").style.display = "flex"
}

function fecharRemarcar() {
  document.getElementById("remarcarModal").style.display = "none"
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
  fecharView()
  calendar.refetchEvents()
}

// ==========================
// CALENDÁRIO PRINCIPAL
// ==========================
document.addEventListener("DOMContentLoaded", function () {

  const calendarEl = document.getElementById("calendar")

  calendar = new FullCalendar.Calendar(calendarEl, {

    locale: "pt-br",

    // 📅 SEMPRE ABRE NO MÊS
    initialView: "dayGridMonth",

    height: "auto",
    expandRows: true,
    nowIndicator: true,
    allDaySlot: false,

    slotMinTime: "07:00:00",
    slotMaxTime: "22:00:00",

    // ❌ SEM BOTÃO "HOJE"
    headerToolbar: {
      left: "prev,next",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay"
    },

    buttonText: {
      month: "Mês",
      week: "Semana",
      day: "Dia"
    },

    titleFormat: {
      year: 'numeric',
      month: 'long'
    },

    // ==========================
    // CLICK DIA
    // ==========================
    dateClick(info) {
      selectedDate = info.dateStr
      document.getElementById("data").value = info.dateStr
      document.getElementById("modal").style.display = "flex"
    },

    // ==========================
    // CLICK EVENTO
    // ==========================
    eventClick(info) {
      abrirDetalhes(info.event)
    },

    // ==========================
    // EVENTOS SUPABASE
    // ==========================
    events: async function (fetchInfo, successCallback, failureCallback) {

      const { data, error } = await window.sb
        .from("agendamentos")
        .select("*")

      if (error) return failureCallback(error)

      const eventos = data.filter(e => e.status !== "cancelado")

      successCallback(eventos.map(e => ({
        id: e.id,
        title: window.innerWidth < 768
          ? e.cliente
          : `${e.cliente} - ${e.procedimento}`,
        start: e.inicio,
        end: e.fim,
        backgroundColor: gerarPastel(e.cor),
        borderColor: e.cor,
        textColor: "#333",
        extendedProps: {
          cliente: e.cliente,
          procedimento: e.procedimento,
          profissional: e.profissional
        }
      })))
    }
  })

  calendar.render()

  // ==========================
  // RESIZE LIMPO (SEM BUG)
  // ==========================
  window.addEventListener("resize", () => {
    calendar.updateSize()
  })

  carregarProfissionais()
})

// ==========================
// MODAIS
// ==========================
function abrirProfissionais() {
  document.getElementById("modalProfissionais").style.display = "flex"
}

function fecharProfissionais() {
  document.getElementById("modalProfissionais").style.display = "none"
}

function fecharModal() {
  document.getElementById("modal").style.display = "none"
}

function fecharView() {
  document.getElementById("viewModal").style.display = "none"
}