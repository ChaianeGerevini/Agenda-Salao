let calendar
let selectedDate = null
let eventoSelecionado = null

// ==========================
// TESTE SUPABASE
// ==========================
async function testarConexao() {
const { data, error } = await window.sb
.from("agendamentos")
.select("*")

console.log("DADOS:", data)
console.log("ERRO:", error)
}

// ==========================
// PAINEL DO DIA
// ==========================
async function mostrarPainelDoDia(data) {

const dia = data.toISOString().split("T")[0]

const { data: eventos } = await window.sb
.from("agendamentos")
.select("*")
.gte("inicio", `${dia}T00:00:00`)
.lt("inicio", `${dia}T23:59:59`)
.eq("status", "ativo")

const container = document.getElementById("conteudoDia")

if (!eventos || eventos.length === 0) {
container.innerHTML = "<p>Nenhum agendamento hoje.</p>"
return
}

let html = ""

eventos.forEach(item => {
html += `
<div style="border-left:5px solid ${item.cor}; padding:10px; margin-bottom:10px;">
<b>${item.cliente}</b><br>
${item.procedimento}<br>
<small>${new Date(item.inicio).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
 - 
${new Date(item.fim).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small><br>
<small>${item.profissional}</small>
</div>
`
})

container.innerHTML = html

document.getElementById("painelDia").classList.add("ativo")
}

function fecharPainel(){
document.getElementById("painelDia").classList.remove("ativo")
}

// ==========================
// INIT CALENDAR
// ==========================
document.addEventListener("DOMContentLoaded", function () {

let calendarEl = document.getElementById("calendar");

calendar = new FullCalendar.Calendar(calendarEl, {

locale: "pt-br",

initialView: "dayGridMonth",

headerToolbar: {
left: "prev,next today",
center: "title",
right: "dayGridMonth,timeGridWeek"
},

customButtons: {
today: {
text: "Hoje",
click: function () {

const hoje = new Date()

calendar.gotoDate(hoje)
calendar.changeView("timeGridDay")

mostrarPainelDoDia(hoje)

}
}
},

buttonText: {
today: "Hoje",
month: "Mês",
week: "Semana"
},

editable: true,
selectable: true,

// ==========================
// CLICK NO DIA
// ==========================
dateClick: function(info) {

selectedDate = info.dateStr

calendar.changeView("timeGridDay", info.dateStr)

document.getElementById("data").value = info.dateStr
document.getElementById("modal").style.display = "flex"
},

// ==========================
// CLICK EVENTO
// ==========================
eventClick: function(info) {

eventoSelecionado = info.event

const e = info.event

document.getElementById("infoAgendamento").innerHTML = `
<p><b>Cliente:</b> ${e.title.split(" - ")[0]}</p>
<p><b>Procedimento:</b> ${e.title.split(" - ")[1]}</p>
<p><b>Início:</b> ${e.start.toLocaleString()}</p>
<p><b>Fim:</b> ${e.end ? e.end.toLocaleString() : "Não definido"}</p>
`

document.getElementById("viewModal").style.display = "flex"
},

// ==========================
// EVENTOS SUPABASE
// ==========================
events: async function(fetchInfo, successCallback, failureCallback) {

const { data, error } = await window.sb
.from("agendamentos")
.select("*")

if(error){
console.log(error)
failureCallback(error)
return
}

const eventos = data
.filter(item => item.status !== "cancelado")
.map(item => ({
id: item.id,
title: `${item.cliente} - ${item.procedimento}`,
start: item.inicio,
end: item.fim,
backgroundColor: item.cor || "#d4af37",
borderColor: item.cor || "#d4af37"
}))

successCallback(eventos)
}

});

calendar.render()

testarConexao()

})

// ==========================
// FECHAR MODAIS
// ==========================
function fecharModal(){
document.getElementById("modal").style.display = "none"
clearModal()
}

function fecharView(){
document.getElementById("viewModal").style.display = "none"
eventoSelecionado = null
}

// ==========================
// REMARCAR
// ==========================
function remarcar(){
if(!eventoSelecionado) return
document.getElementById("remarcarModal").style.display = "flex"
}

function fecharRemarcar(){
document.getElementById("remarcarModal").style.display = "none"
}

// ==========================
// CONFIRMAR REMARCAÇÃO
// ==========================
async function confirmarRemarcacao(){

const novaData = document.getElementById("novaData").value
const novaHora = document.getElementById("novaHora").value
const novoFim = document.getElementById("novoFim").value

const inicio = new Date(`${novaData}T${novaHora}:00`)
const fim = new Date(`${novaData}T${novoFim}:00`)

const { error } = await window.sb
.from("agendamentos")
.update({ inicio, fim })
.eq("id", eventoSelecionado.id)

if(error){
alert("Erro ao remarcar")
return
}

fecharRemarcar()
fecharView()
calendar.refetchEvents()
}

// ==========================
// CANCELAR
// ==========================
async function cancelar(){

if(!eventoSelecionado) return

await window.sb
.from("agendamentos")
.update({ status: "cancelado" })
.eq("id", eventoSelecionado.id)

fecharView()
calendar.refetchEvents()
}

// ==========================
// LIMPAR CAMPOS
// ==========================
function clearModal(){

document.getElementById("cliente").value = ""
document.getElementById("telefone").value = ""
document.getElementById("procedimento").value = ""
document.getElementById("profissional").value = ""
document.getElementById("data").value = ""
document.getElementById("hora").value = ""
document.getElementById("fim").value = ""
}

// ==========================
// SALVAR AGENDAMENTO
// ==========================
async function salvar(){

const cliente = document.getElementById("cliente").value
const telefone = document.getElementById("telefone").value
const procedimento = document.getElementById("procedimento").value
const profissional = document.getElementById("profissional").value
const cor = document.getElementById("cor").value

const data = document.getElementById("data").value
const hora = document.getElementById("hora").value
const fimInput = document.getElementById("fim").value

if(!cliente || !procedimento || !profissional || !data || !hora || !fimInput){
alert("Preencha todos os campos obrigatórios (*)")
return
}

const inicio = new Date(`${data}T${hora}:00`)
const fim = new Date(`${data}T${fimInput}:00`)

// ==========================
// CONFLITO CASE INSENSITIVE
// ==========================
const { data: existentes } = await window.sb
.from("agendamentos")
.select("*")

const conflito = existentes.find(item => {

const ini = new Date(item.inicio)
const end = new Date(item.fim)

const mesmaProfissional =
(item.profissional || "").toLowerCase().trim() ===
(profissional || "").toLowerCase().trim()

const sobrepoe = inicio < end && fim > ini

return mesmaProfissional && sobrepoe
})

if(conflito){
alert("Essa profissional já possui um agendamento nesse horário!")
return
}

// ==========================
// SALVAR
// ==========================
const { error } = await window.sb
.from("agendamentos")
.insert([{
cliente,
telefone,
procedimento,
profissional,
cor: cor || "#d4af37",
inicio,
fim,
status: "ativo"
}])

if(error){
console.log(error)
alert("Erro ao salvar")
return
}

fecharModal()
calendar.refetchEvents()
}