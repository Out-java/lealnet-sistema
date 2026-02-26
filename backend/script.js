import { supabaseCliente } from "./server.js";

const TEMPO_LIMITE = 3 * 60 * 60 * 1000;
let usuario = null;
// Declare as variáveis no topo, mas não atribua valor ainda
let sistemaArea, loginArea, modal;

// FUNÇÕES DE INTERFACE
//NOVO ATENDIMENTO
function abrirModal() {
  if (modal) modal.classList.remove("hidden");
}

function fecharModal() {
  if (modal) modal.classList.add("hidden");
}

// 1. ESSA FUNÇÃO MOSTRA O LOGIN
function ocultarSistema() {
  if (sistemaArea) sistemaArea.classList.add("hidden");
  if (loginArea) loginArea.classList.remove("hidden");
}
// 2. ESSA FUNÇÃO MOSTRA O SISTEMA (CHAMAR APÓS LOGIN SUCESSO)
function mostrarSistema() {
  if (sistemaArea) sistemaArea.classList.remove("hidden");
  if (loginArea) loginArea.classList.add("hidden");
}

// LÓGICA DE LOGIN
async function login() {
  //Pega os valores do front-end
  const emailInput = document.getElementById("email").value;
  const senhaInput = document.getElementById("senha").value;

  if (!emailInput || !senhaInput) {
    alert("Preencha email e senha.");
    return;
  }
  //TRANSFORMA O BOTÃO DE ENTRAR(LOGIN) PARA CARREGANDO...
  const btnLogin = document.querySelector(".btn-login");
  if (!btnLogin) {
    console.error("Botão de login não encontrado no DOM");
    return;
  }
  //Pega o texto original pra colocar novamente caso de erro =
  const textoOriginal = btnLogin.innerText;
  btnLogin.innerText = "Carregando...";
  btnLogin.disabled = true;

  //LOGIN NO BANCO DE DADOS COM USUARIO
  const { data, error } = await supabaseCliente.auth.signInWithPassword({
    email: emailInput,
    password: senhaInput,
  });

  if (error) {
    alert("Erro no login: " + error.message);
    btnLogin.innerText = textoOriginal;
    btnLogin.disabled = false;
    return;
  }
  // GUARDA O USUARIO NO DATA DE USUARIO
  usuario = data.user;
  //INICIA O TOKEN DE SESSÇÃO
  localStorage.setItem("loginTime", Date.now());
  setTimeout(executarLogoutAutomatico, TEMPO_LIMITE);

  mostrarSistema();

  // SE DER ERRO NO LOGIN VOLTA AO NORMAL
  btnLogin.innerText = textoOriginal;
  btnLogin.disabled = false;
}

// LÓGICA DE LOGOUT
async function executarLogoutAutomatico() {
  console.log("Sessão expirada. Executando logout...");
  localStorage.removeItem("loginTime");

  //SE NÃO TIVER FEITO LOGIN
  if (typeof supabaseCliente !== "undefined") {
    await supabaseCliente.auth.signOut();
  }

  alert("Sua sessão expirou.");
  //RECARREGA A PAGINA
  location.reload();
}

async function logout() {
  await executarLogoutAutomatico();
}

// Verificações se tem o nome do cliente, tipo e status e se esta logado
function verificacaoCriacao(usuario, cliente, tipo, status) {
  if (!usuario) {
    alert("Faça login primeiro");
    return false;
  }
  if (!cliente) {
    alert("O nome do cliente é obrigatório.");
    return false;
  }

  if (!tipo) {
    alert("O Tipo é obrigatório.");
    return false;
  }

  if (!status) {
    alert("O status é obrigatório.");
    return false;
  }

  return true;
}
// LÓGICA DE CRIAÇÃO E CARREGAMENTO
async function criar() {
  const tipoInput = document.getElementById("tipo").value;
  const tecnicoInput = document.getElementById("tecnico").value;
  const clienteInput = document.getElementById("cliente").value;
  const telefoneInput = document.getElementById("telefone").value;
  const enderecoInput = document.getElementById("endereco").value;
  const statusInput = document.getElementById("status").value;
  const obsInput = document.getElementById("obs").value;
  const fotoInput = document.getElementById("foto");

  const valido = verificacaoCriacao(
    usuario,
    clienteInput,
    tipoInput,
    statusInput,
  );
  if (!valido) return;

  const { data, error } = await supabaseCliente
    .from("atendimentos")
    .insert([
      {
        tipo: tipoInput,
        tecnico_id: tecnicoInput,
        cliente_nome: clienteInput,
        cliente_telefone: telefoneInput,
        endereco: enderecoInput,
        status: statusInput,
        observacoes: obsInput,
        criado_por: usuario.id,
      },
    ])
    .select();

  if (error) return alert("Erro ao salvar atendimento: " + error.message);

  const atendimentoId = data[0].id;
  const file = fotoInput.files[0];

  if (file) {
    const { data: uploadData, error: uploadError } =
      await supabaseCliente.storage
        .from("atendimentos")
        .upload(`${atendimentoId}/${file.name}`, file);

    if (uploadError) {
      alert(
        "Atendimento criado, mas erro ao enviar foto: " + uploadError.message,
      );
    } else {
      const { error: anexoError } = await supabaseCliente
        .from("anexos")
        .insert([
          {
            atendimento_id: atendimentoId,
            url: uploadData.path,
            nome_arquivo: file.name,
          },
        ]);

      if (anexoError)
        console.error("Erro ao registrar anexo no banco: ", anexoError);
    }
  }

  // Limpar os campos
  document.getElementById("cliente").value = "";
  document.getElementById("telefone").value = "";
  document.getElementById("tecnico").value = "";
  document.getElementById("endereco").value = "";
  document.getElementById("obs").value = "";
  document.getElementById("foto").value = "";

  alert("Atendimento salvo com sucesso!");
  fecharModal();
}

// --- INICIALIZAÇÃO E EVENTOS ---
document.addEventListener("DOMContentLoaded", async () => {
  // MAPEAMENTO CORRETO PELOS IDS DO HTML
  sistemaArea = document.getElementById("sistema");
  loginArea = document.getElementById("loginArea");

  modal = document.getElementById("modal-atendimento");

  // --- NOVA LÓGICA DE VERIFICAÇÃO DE TEMPO ---
  const loginTime = localStorage.getItem("loginTime");
  if (loginTime) {
    const agora = Date.now();
    const tempoPassado = agora - parseInt(loginTime);

    if (tempoPassado >= TEMPO_LIMITE) {
      // Se já passou de 3 horas, desloga na hora
      await executarLogoutAutomatico();
      return; // Interrompe o resto da inicialização
    } else {
      // Se ainda não passou, agenda o logout para o tempo que resta
      const tempoRestante = TEMPO_LIMITE - tempoPassado;
      setTimeout(executarLogoutAutomatico, tempoRestante);
    }
  }

  // 5. CONTROLE DE SESSÃO
  try {
    const {
      data: { session },
    } = await supabaseCliente.auth.getSession();

    if (session) {
      usuario = session.user;
      mostrarSistema();
    } else {
      ocultarSistema();
      if (window.location.pathname.includes("atendimentos.html")) {
        window.location.href = "main.html";
      }
    }
  } catch (err) {
    console.error("❌ Erro:", err);
  }
});

// Atribuições globais
// 3. EXECUTAR AO CARREGAR A PÁGINA
window.onload = () => {
  ocultarSistema(); // Força a tela de login a aparecer primeiro
};
window.login = login;
window.criar = criar;
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.mostrarSistema = mostrarSistema;
window.logout = logout;
