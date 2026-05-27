let calendar
let selectedDate = null
let eventoSelecionado = null
let profissionaisCache = []

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
// SUPABASE TESTE
// ==========================
async function testarConexao() {
  const { data, error } = await window.sb
    .from("agendamentos")
    .select("*")

  console.log("DADOS:", data)
  console.log("ERRO:", error)
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
  const filtro = document.getElementById("filtroProfissional")

  if (select) select.innerHTML = `<option value="">Selecione profissional</option>`
  if (filtro) filtro.innerHTML = `<option value="todos">Filtrar todos</option>`

  profissionaisCache.forEach(p => {

    if (select) {
      const opt = document.createElement("option")
      opt.value = p.id
      opt.textContent = p.nome
      opt.dataset.cor = p.cor
      select.appendChild(opt)
    }

    if (filtro) {
      const opt = document.createElement("option")
      opt.value = p.id
      opt.textContent = p.nome
      filtro.appendChild(opt)
    }
  })

  renderProfissionais()
}

// ==========================
// SALVAR PROFISSIONAL
// ==========================
window.salvarProfissional = async function () {

  const nome = document.getElementById("nomeProfissional").value.trim()
  const cor = document.getElementById("corProfissional").value

  if (!nome) return alert("Digite o nome do profissional")

  const { error } = await window.sb
    .from("profissionais")
    .insert([{ nome, cor, ativo: true }])

  if (error) return alert("Erro ao salvar")

  document.getElementById("nomeProfissional").value = ""

  fecharProfissionais()
  carregarProfissionais()
}

// ==========================
// EDITAR PROFISSIONAL
// ==========================
window.editarProfissional = async function (id) {

  const nome = prompt("Novo nome:")
  const cor = prompt("Nova cor (hex):", "#d4af37")

  if (!nome) return

  await window.sb
    .from("profissionais")
    .update({ nome, cor })
    .eq("id", id)

  carregarProfissionais()
}

// ==========================
// EXCLUIR PROFISSIONAL
// ==========================
window.excluirProfissional = async function (id) {

  await window.sb
    .from("profissionais")
    .update({ ativo: false })
    .eq("id", id)

  carregarProfissionais()
}

// ==========================
// RENDER PROFISSIONAIS
// ==========================
function renderProfissionais() {

  const container = document.getElementById("listaProfissionais")
  if (!container) return

  container.innerHTML = profissionaisCache.map(p => `
    <div style="
      display:flex;
      justify-content:space-between;
      padding:10px;
      margin:6px 0;
      border-left:5px solid ${p.cor};
      background:#f7f7f7;
      border-radius:8px;
      align-items:center;
    ">
      <div>
        <b>${p.nome}</b><br>
        <small>${p.cor}</small>
      </div>

      <div style="display:flex; gap:6px;">
        <button onclick="editarProfissional('${p.id}')">✏️</button>
        <button onclick="excluirProfissional('${p.id}')">🗑️</button>
      </div>
    </div>
  `).join("")
}

// ==========================
// EVENTO CLIQUE (DETALHES + AÇÕES)
// ==========================
window.eventoSelecionado = null

function abrirDetalhes(evento) {

  eventoSelecionado = evento

  const inicio = new Date(evento.start)
  const fim = new Date(evento.end)

  const horaFormatada = `${inicio.toLocaleDateString()} ${inicio.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${fim.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

  const [cliente, procedimento] = evento.title.split(" - ")

  document.getElementById("infoAgendamento").innerHTML = `
    <p><b>Cliente:</b> ${cliente}</p>
    <p><b>Profissional:</b> ${procedimento}</p>
    <p><b>Hora marcada:</b> ${horaFormatada}</p>
  `

  document.getElementById("viewModal").style.display = "flex"
}

// ==========================
// CANCELAR AGENDAMENTO
// ==========================
window.cancelar = async function () {

  if (!eventoSelecionado) return

  await window.sb
    .from("agendamentos")
    .update({ status: "cancelado" })
    .eq("id", eventoSelecionado.id)

  fecharView()
  calendar.refetchEvents()
}

// ==========================
// REMARCAR (rápido)
// ==========================
window.remarcar = function () {

  if (!eventoSelecionado) return

  const novaData = prompt("Nova data (YYYY-MM-DD):")
  const novaHora = prompt("Novo horário início (HH:MM):")
  const novoFim = prompt("Novo horário fim (HH:MM):")

  if (!novaData || !novaHora || !novoFim) return

  const inicio = toLocalISO(novaData, novaHora)
  const fim = toLocalISO(novaData, novoFim)

  window.sb
    .from("agendamentos")
    .update({ inicio, fim })
    .eq("id", eventoSelecionado.id)
    .then(() => {
      fecharView()
      calendar.refetchEvents()
    })
}

// ==========================
// CALENDÁRIO
// ==========================
document.addEventListener("DOMContentLoaded", function () {

  const calendarEl = document.getElementById("calendar")

  calendar = new FullCalendar.Calendar(calendarEl, {

    locale: "pt-br",
    initialView: "dayGridMonth",

    headerToolbar: {
      left: "prev,next hoje",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay"
    },

customButtons: {
  hoje: {
    text: "Hoje",
    click: () => {
      const hoje = new Date()
      calendar.gotoDate(hoje)
      calendar.changeView("timeGridDay")
      mostrarPainelDoDia(hoje)
    }
  }
},
    buttonText: { today: "Hoje", month: "Mês", week: "Semana", day: "Dia" },

    dateClick: function (info) {
      selectedDate = info.dateStr
      document.getElementById("data").value = info.dateStr
      document.getElementById("modal").style.display = "flex"
    },

    eventClick: function (info) {
      abrirDetalhes({
        id: info.event.id,
        title: info.event.title,
        start: info.event.start,
        end: info.event.end
      })
    },

    events: async function (fetchInfo, successCallback, failureCallback) {

      const { data, error } = await window.sb
        .from("agendamentos")
        .select("*")

      if (error) return failureCallback(error)

      const eventos = data
        .filter(e => e.status !== "cancelado")
        .map(e => ({
          id: e.id,
          title: `${e.cliente} - ${e.procedimento}`,
          start: e.inicio,
          end: e.fim,
          backgroundColor: gerarPastel(e.cor),
          borderColor: e.cor,
          textColor: "#333",
          display: "block"
        }))

      successCallback(eventos)
    }
  })

  calendar.render()
  carregarProfissionais()
  testarConexao()
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

// ==========================
// SALVAR AGENDAMENTO
// ==========================
async function salvar() {

  const cliente = document.getElementById("cliente").value
  const procedimento = document.getElementById("procedimento").value

  const select = document.getElementById("profissional")
  const option = select.options[select.selectedIndex]

  if (!option?.value) return alert("Selecione profissional")

  const profissional_id = option.value
  const profissional_nome = option.textContent
  const cor = option.dataset.cor

  const data = document.getElementById("data").value
  const hora = document.getElementById("hora").value
  const fim = document.getElementById("fim").value

  const inicio = toLocalISO(data, hora)
  const fimISO = toLocalISO(data, fim)

  const { data: existentes } = await window.sb
    .from("agendamentos")
    .select("*")

  const conflito = existentes.find(e =>
    e.profissional_id === profissional_id &&
    new Date(inicio) < new Date(e.fim) &&
    new Date(fimISO) > new Date(e.inicio)
  )

  if (conflito) {
    alert("Profissional ocupado nesse horário")
    return
  }

  const { error } = await window.sb
    .from("agendamentos")
    .insert([{
      cliente,
      procedimento,
      profissional_id,
      profissional: profissional_nome,
      cor,
      inicio,
      fim: fimISO,
      status: "ativo"
    }])

  if (error) return alert("Erro ao salvar")

  fecharModal()
  calendar.refetchEvents()
}