import { supabaseCliente } from "./server.js";

const modalDetalhes = document.getElementById("modal-detalhes");
const conteudoDetalhes = document.getElementById("conteudo-detalhes");

async function carregarAtendimentos(tipoInput) {
  // 1. LÓGICA DO MENU ATIVO
  const botoes = document.querySelectorAll(".menu-atendimento button");

  botoes.forEach((btn) => {
    btn.classList.remove("ativo");

    // Normalizamos o texto: tiramos acentos e deixamos tudo em minúsculo
    const textoBotao = btn.innerText
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const textoInput = tipoInput
      ? tipoInput
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
      : "";

    // Se o texto do botão for igual ao que foi clicado, ou se for o padrão inicial
    if (
      textoBotao === textoInput ||
      (tipoInput === "Manutencao" && textoBotao === "manutencao")
    ) {
      btn.classList.add("ativo");
    }
  });
  // 1. Inicia a query básica
  let query = supabaseCliente
    .from("atendimentos")
    .select(`*, tecnicos!atendimentos_tecnico_id_fkey (nome)`);

  // 2. SE o tipoInput foi passado, adicionamos o FILTRO (.eq)
  // Certifique-se que o texto nos botões do HTML bate com o banco (ex: 'Manutencao')
  if (tipoInput) {
    query = query.eq("tipo", tipoInput);
  }
  const listaContainer = document.getElementById("listaAtendimentos");
  // 3. Ordenação (opcional, ex: por id mais recente)
  const { data, error } = await query.order("id", { ascending: false });

  if (error) return console.error("Erro:", error);

  // 4. Limpa o container e verifica se há dados
  listaContainer.innerHTML = data.length
    ? ""
    : "<p style='color: white;'>Nenhum atendimento encontrado.</p>";

  // 5. Um ÚNICO loop para criar os cards
  data.forEach((a) => {
    const nomeTecnico = a.tecnicos?.nome || "Sem técnico";
    const card = document.createElement("div");

    // Define a classe base e a classe de status (Pendente, Andamento, Finalizado)
    card.className = `card ${a.status}`;

    card.innerHTML = `
        <h3>${a.cliente_nome}</h3>
        <strong>Técnico:</strong> ${nomeTecnico}<br>
        <p>${a.observacoes || "Sem observações"}</p>
        <small>Status: ${a.status}</small>
    `;

    // Evento de clique para abrir o modal de detalhes
    card.onclick = () => abrirDetalhes(a);

    listaContainer.appendChild(card);
  });
}

function abrirDetalhes(atendimento) {
  const nomeTecnico = atendimento.tecnicos?.nome || "Sem técnico";
  conteudoDetalhes.innerHTML = `
        <p><strong>Tipo:</strong> ${atendimento.tipo}</p>
        <p><strong>Cliente:</strong> ${atendimento.cliente_nome}</p>
        <p><strong>Técnico:</strong> ${nomeTecnico}</p>
        <p><strong>Status:</strong> ${atendimento.status}</p>
        <p><strong>Obs:</strong> ${atendimento.observacoes || "Nenhuma"}</p>
    `;
  modalDetalhes.classList.remove("hidden");
}

// Fechamento de modais
const overlay = document.getElementById("modal-detalhes");
overlay.addEventListener("click", (event) => {
  if (event.target === overlay) fecharDetalhes();
});

window.fecharDetalhes = () => modalDetalhes.classList.add("hidden");

// Inicialização: carrega TUDO ao abrir a página pela primeira vez
document.addEventListener("DOMContentLoaded", () => {
  carregarAtendimentos("Manutencao");
});

// Torna a função global para os botões do HTML
window.carregarAtendimentos = carregarAtendimentos;
