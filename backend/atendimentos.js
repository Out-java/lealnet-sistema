import { supabaseCliente } from "./server.js";

const modalLista = document.getElementById("modal-listaAtendimentos");
const modalDetalhes = document.getElementById("modal-detalhes");
const conteudoDetalhes = document.getElementById("conteudo-detalhes");
const listaContainer = document.getElementById("lista");

async function carregarAtendimentos() {
  const { data, error } = await supabaseCliente
    .from("atendimentos")
    .select(`*, tecnicos!atendimentos_tecnico_id_fkey (nome)`)
    .order("data_abertura", { ascending: false });

  if (error) return console.error("Erro:", error);

  listaContainer.innerHTML = data.length ? "" : "<p>Nenhum atendimento.</p>";

  data.forEach((a) => {
    const nomeTecnico = a.tecnicos?.nome || "Sem técnico";
    const card = document.createElement("div");
    card.className = `card ${a.status}`;
    card.innerHTML = `
            <strong>${a.tipo.toUpperCase()}</strong><br>
            <strong>Técnico:</strong> ${nomeTecnico}<br>
            Cliente: ${a.cliente_nome}<br>
            Status: ${a.status}
        `;
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

// 1. Pegamos a referência do fundo escuro
const overlay = document.getElementById("modal-detalhes");

// 2. Escutamos qualquer clique nessa área
overlay.addEventListener("click", function (event) {
  // 3. SE o clique foi DIRETAMENTE no fundo (overlay)
  // e NÃO no conteúdo branco que está dentro dele:
  if (event.target === overlay) {
    fecharDetalhes();
  }
});

// Funções globais para os botões "X" no HTML
window.fecharModalLista = () => modalLista.classList.add("hidden");
window.fecharDetalhes = () => modalDetalhes.classList.add("hidden");

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  carregarAtendimentos();
});
