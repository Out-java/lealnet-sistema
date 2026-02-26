import { supabaseCliente } from './server.js';
const TEMPO_LIMITE = 3 * 60 * 60 * 1000;
let usuario = null;

// Declare as variáveis no topo, mas não atribua valor ainda
let modal,
  btnLogin,
  sistemaArea,
  loginArea,
  modalLista,
  modalDetalhes,
  conteudoDetalhes;

// --- FUNÇÕES DE INTERFACE ---
function abrirModal() {
  if (modal) modal.classList.remove('hidden');
}

function fecharModal() {
  if (modal) modal.classList.add('hidden');
}

// FUNÇÃO CORRIGIDA: Agora ela usa a variável que preencheremos no carregamento
function abrirModalLista() {
  if (modalLista) {
    modalLista.classList.remove('hidden');
    carregar(); // Aproveita para atualizar a lista ao abrir
  } else {
    console.error('Erro: modalLista não foi encontrado no DOM.');
  }
}

function fecharModalLista() {
  if (modalLista) modalLista.classList.add('hidden');
}

function mostrarSistema() {
  if (sistemaArea) sistemaArea.classList.remove('hidden');
  if (loginArea) loginArea.classList.add('hidden');
  if (typeof carregar === 'function') carregar();
}

// --- LÓGICA DE LOGIN ---
async function login() {
  const emailField = document.getElementById('email').value;
  const senhaField = document.getElementById('senha').value;

  if (!emailInput || !senhaInput) {
    alert('Preencha email e senha.');
    return;
  }
  const emailInput = emailField.value;
  const senhaInput = senhaField.value;

  const textoOriginal = btnLogin.innerText;
  btnLogin.innerText = 'Carregando...';
  btnLogin.disabled = true;

  const { data, error } = await supabaseCliente.auth.signInWithPassword({
    email: emailInput,
    password: senhaInput,
  });

  if (error) {
    alert('Erro no login: ' + error.message);
    btnLogin.innerText = textoOriginal;
    btnLogin.disabled = false;
    return;
  }

  usuario = data.user;
  localStorage.setItem('loginTime', Date.now());
  setTimeout(executarLogoutAutomatico, TEMPO_LIMITE);

  mostrarSistema();

  btnLogin.innerText = textoOriginal;
  btnLogin.disabled = false;
}

// --- LÓGICA DE LOGOUT ---
async function executarLogoutAutomatico() {
  console.log('Sessão expirada. Executando logout...');
  localStorage.removeItem('loginTime');

  if (typeof supabaseCliente !== 'undefined') {
    await supabaseCliente.auth.signOut();
  }

  alert('Sua sessão expirou.');
  location.reload();
}

async function logout() {
  await executarLogoutAutomatico();
}

function verificacaoCriacao(cliente, tipo, status) {
  if (!cliente) {
    alert('O nome do cliente é obrigatório.');
    return false;
  }

  if (!tipo) {
    alert('O Tipo é obrigatório.');
    return false;
  }

  if (!status) {
    alert('O status é obrigatório.');
    return false;
  }

  return true;
}
// --- LÓGICA DE CRIAÇÃO E CARREGAMENTO ---
async function criar() {
  if (!usuario) {
    alert('Faça login primeiro');
    return;
  }

  const tipoInput = document.getElementById('tipo').value;
  const tecnicoInput = document.getElementById('tecnico').value;
  const clienteInput = document.getElementById('cliente').value;
  const telefoneInput = document.getElementById('telefone').value;
  const enderecoInput = document.getElementById('endereco').value;
  const statusInput = document.getElementById('status').value;
  const obsInput = document.getElementById('obs').value;
  const fotoInput = document.getElementById('foto');

  const valido = verificacaoCriacao(clienteInput, tipoInput, statusInput);
  if (!valido) return;

  const { data, error } = await supabaseCliente
    .from('atendimentos')
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

  if (error) return alert('Erro ao salvar atendimento: ' + error.message);

  const atendimentoId = data[0].id;
  const file = fotoInput.files[0];

  if (file) {
    const { data: uploadData, error: uploadError } =
      await supabaseCliente.storage
        .from('atendimentos')
        .upload(`${atendimentoId}/${file.name}`, file);

    if (uploadError) {
      alert(
        'Atendimento criado, mas erro ao enviar foto: ' + uploadError.message
      );
    } else {
      const { error: anexoError } = await supabaseCliente
        .from('anexos')
        .insert([
          {
            atendimento_id: atendimentoId,
            url: uploadData.path,
            nome_arquivo: file.name,
          },
        ]);

      if (anexoError)
        console.error('Erro ao registrar anexo no banco: ', anexoError);
    }
  }

  // Limpar os campos
  document.getElementById('cliente').value = '';
  document.getElementById('telefone').value = '';
  document.getElementById('tecnico').value = '';
  document.getElementById('endereco').value = '';
  document.getElementById('obs').value = '';
  document.getElementById('foto').value = '';

  alert('Atendimento salvo com sucesso!');
  fecharModal();
  carregar();
}

async function carregar() {
  // O 'data' é criado aqui dentro desta linha:
  const { data, error } = await supabaseCliente
    .from('atendimentos')
    .select(`*, tecnicos!atendimentos_tecnico_id_fkey (nome)`)
    .order('data_abertura', { ascending: false });

  if (error) {
    console.error('Erro ao carregar atendimentos:', error);
    return;
  }

  // Se o Supabase não retornar nada, 'data' será um array vazio []
  const lista = document.getElementById('lista');
  if (!lista) return;

  lista.innerHTML = '';

  if (!data || data.length === 0) {
    lista.innerHTML = '<p>Nenhum atendimento encontrado.</p>';
    return;
  }

  // Agora o 'data' existe e podemos usar o forEach
  data.forEach((a) => {
    const nomeExibicao =
      a.tecnicos?.nome || a.atendimentos_tecnico_id_fkey?.nome || 'Sem técnico';

    const card = document.createElement('div');
    card.className = `card ${a.status}`;
    card.style.cursor = 'pointer';

    card.innerHTML = `
        <strong>${a.tipo.toUpperCase()}</strong><br>
        <strong>Técnico:</strong> ${nomeExibicao} <br>
        Cliente: ${a.cliente_nome}<br>
        Status: ${a.status}
    `;

    // Vincula o clique ao card para abrir o detalhe
    card.onclick = () => {
      console.log('Abrindo detalhes de:', a.cliente_nome);
      abrirDetalhes(a);
    };

    lista.appendChild(card);
  });
}
function abrirDetalhes(atendimento) {
  // Buscamos o elemento na hora do clique para não ter erro de referência nula
  const modalDet = document.getElementById('modal-detalhes');
  const conteudoDet = document.getElementById('conteudo-detalhes');

  // Se mesmo assim não achar, o problema é o ID no arquivo HTML
  if (!modalDet || !conteudoDet) {
    console.error(
      'ERRO CRÍTICO: O ID "modal-detalhes" ou "conteudo-detalhes" não existe no seu HTML.'
    );
    alert('Erro interno: Elemento de detalhes não encontrado.');
    return;
  }

  const nomeExibicao =
    atendimento.tecnicos?.nome ||
    atendimento.atendimentos_tecnico_id_fkey?.nome ||
    'Sem técnico';

  conteudoDet.innerHTML = `
    <p><strong>Tipo:</strong> ${atendimento.tipo}</p>
    <p><strong>Cliente:</strong> ${atendimento.cliente_nome}</p>
    <p><strong>Técnico:</strong> ${nomeExibicao}</p>
    <p><strong>Status:</strong> ${atendimento.status}</p>
    <p><strong>Observações:</strong> ${atendimento.observacoes || 'Nenhuma'}</p>
  `;

  modalDet.classList.remove('hidden');
}
// --- INICIALIZAÇÃO E EVENTOS ---
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Sistema iniciado: Mapeando elementos...');

  // 1. MAPEAMENTO DE ELEMENTOS (Com suporte para múltiplas páginas)
  modal = document.getElementById('modal-atendimento');
  modalLista = document.getElementById('modal-listaAtendimentos');
  modalDetalhes = document.getElementById('modal-detalhes');
  conteudoDetalhes = document.getElementById('conteudo-detalhes');
  btnLogin = document.querySelector('.btn-login');
  sistemaArea = document.getElementById('sistema');
  loginArea = document.getElementById('loginArea');

  // 2. EVENTO DE LOGIN (Só ativa se o botão existir na tela atual)
  if (btnLogin) {
    console.log('✅ Botão de login encontrado.');
    btnLogin.addEventListener('click', login);
  }

  // 3. FECHAR MODAIS AO CLICAR FORA (Overlay)
  window.onclick = function (event) {
    if (event.target === modal) fecharModal();
    if (event.target === modalDetalhes) fecharDetalhes();
  };

  // 4. VERIFICAÇÃO DE PÁGINA (Nova Tela de Atendimentos)
  // Usamos 'includes' porque o caminho pode variar (ex: /atendimentos.html ou atendimentos.html)
  if (window.location.pathname.includes('atendimentos.html')) {
    console.log('📂 Você está na tela de LISTA. Carregando dados...');
    carregar();
  }

  // 5. CONTROLE DE SESSÃO COM SUPABASE
  console.log('🔐 Verificando sessão do usuário...');
  try {
    const {
      data: { session },
      error,
    } = await supabaseCliente.auth.getSession();

    if (error) {
      console.error('❌ Erro ao buscar sessão:', error.message);
      return;
    }

    if (session) {
      console.log('👤 Usuário logado:', session.user.email);
      usuario = session.user;
      mostrarSistema(); // Mostra a área logada
    } else {
      console.warn('⚠️ Nenhuma sessão ativa encontrada.');

      // Se estiver na tela de atendimentos e não estiver logado, volta pro login
      if (window.location.pathname.includes('atendimentos.html')) {
        alert('Sessão encerrada. Por favor, faça login.');
        window.location.href = 'main.html';
      }
    }
  } catch (err) {
    console.error('❌ Falha crítica na comunicação com o banco:', err);
  }
});

function fecharDetalhes() {
  if (modalDetalhes) modalDetalhes.classList.add('hidden');
}

// Atribuições globais
window.login = login;
window.criar = criar;
window.carregar = carregar;
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.abrirModalLista = abrirModalLista;
window.fecharModalLista = fecharModalLista;
window.fecharDetalhes = fecharDetalhes;
window.abrirDetalhes = abrirDetalhes;
window.mostrarSistema = mostrarSistema;
window.logout = logout;
