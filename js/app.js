// Importações Oficiais do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURAÇÃO DO FIREBASE ---
// Preenchi os dados baseados na sua imagem (pdad-pesqueira-5f66c)
const firebaseConfig = {
    apiKey: "COLE_SUA_API_KEY_AQUI", // <--- VOCÊ PRECISA COLAR SUA API KEY AQUI
    authDomain: "pdad-pesqueira-5f66c.firebaseapp.com",
    projectId: "pdad-pesqueira-5f66c",
    storageBucket: "pdad-pesqueira-5f66c.appspot.com",
    messagingSenderId: "145695840428", // Padrão gerado, pode manter ou atualizar se tiver o exato
    appId: "1:145695840428:web:75b060..." // Se tiver o App ID completo, cole aqui, mas muitas vezes funciona sem ele no modo básico
};

// Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 1. CONTROLE DE TELA E LOGIN ---

// Event Listeners (Botões)
document.getElementById('btn-login').addEventListener('click', fazerLogin);
document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

// Navegação de Abas
document.getElementById('tab-cadastro').addEventListener('click', () => showTab('view-cadastro', 'tab-cadastro'));
document.getElementById('tab-registro').addEventListener('click', () => showTab('view-registro', 'tab-registro'));
document.getElementById('tab-busca').addEventListener('click', () => showTab('view-busca', 'tab-busca'));

// Botões de Ação do Sistema
document.getElementById('btn-save-prof').addEventListener('click', salvarProfissional);
document.getElementById('btn-save-visit').addEventListener('click', salvarVisita);
document.getElementById('btn-search').addEventListener('click', buscarVisitas);

// Função de Login Inteligente (Usuário -> Email)
function fazerLogin() {
    let username = document.getElementById('username-input').value.trim();
    const pass = document.getElementById('password').value;
    
    // TRUQUE: Se o usuário digitar só "admin", o sistema completa o email
    // Isso permite que na tela de login apareça "Usuário" em vez de "Email"
    if (!username.includes('@')) {
        username = username + "@pdad.pe"; 
    }

    signInWithEmailAndPassword(auth, username, pass)
        .catch((error) => {
            console.error(error);
            let msg = "Erro ao entrar.";
            if(error.code === 'auth/invalid-credential') msg = "Usuário ou senha incorretos.";
            if(error.code === 'auth/invalid-email') msg = "Formato de usuário inválido.";
            document.getElementById('login-msg').innerText = msg;
        });
}

// Monitorar Estado (Logado ou Não)
onAuthStateChanged(auth, (user) => {
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');

    if (user) {
        // Usuário Logado
        loginScreen.classList.add('d-none');
        appScreen.classList.remove('d-none');
        carregarListaProfissionais(); // Já carrega a lista para o registro
    } else {
        // Usuário Saiu
        loginScreen.classList.remove('d-none');
        appScreen.classList.add('d-none');
    }
});

function showTab(viewId, tabId) {
    // Esconde todas as views
    ['view-cadastro', 'view-registro', 'view-busca'].forEach(id => {
        document.getElementById(id).classList.add('d-none');
    });
    // Mostra a selecionada
    document.getElementById(viewId).classList.remove('d-none');
    
    // Atualiza classes dos botões (Visual ativo)
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

// --- 2. LÓGICA DO SISTEMA (BANCO DE DADOS) ---

// SALVAR PROFISSIONAL
async function salvarProfissional() {
    const codigo = document.getElementById('prof-code').value;
    const nome = document.getElementById('prof-name').value;
    const grupo = document.getElementById('prof-group').value;

    if(!nome || !codigo) return alert("Preencha todos os campos");

    try {
        await addDoc(collection(db, "profissionais"), {
            codigo, nome, grupo, criadoEm: Timestamp.now()
        });
        alert("Profissional cadastrado com sucesso!");
        // Limpar campos
        document.getElementById('prof-code').value = '';
        document.getElementById('prof-name').value = '';
        carregarListaProfissionais(); // Atualiza a lista
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar: " + e.message);
    }
}

// CARREGAR LISTA (Para o Select de Visitas)
async function carregarListaProfissionais() {
    const select = document.getElementById('visit-prof-select');
    // Mantém a primeira opção
    select.innerHTML = '<option value="">Selecione o Profissional...</option>';
    
    try {
        const q = query(collection(db, "profissionais"), orderBy("nome"));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const option = document.createElement("option");
            // Salvamos os dados no value como JSON para recuperar fácil depois
            option.value = JSON.stringify({id: doc.id, nome: data.nome, grupo: data.grupo}); 
            option.text = `${data.nome} (${data.grupo})`;
            select.appendChild(option);
        });
    } catch (e) {
        console.log("Erro ao listar (pode ser permissão):", e);
    }
}

// REGISTRAR VISITA
async function salvarVisita() {
    const dateVal = document.getElementById('visit-date').value;
    const profJson = document.getElementById('visit-prof-select').value;
    const detento = document.getElementById('visit-detento').value;

    if(!dateVal || !profJson || !detento) return alert("Preencha todos os dados da visita!");

    const profData = JSON.parse(profJson); // Recupera o objeto salvo no value

    try {
        await addDoc(collection(db, "visitas"), {
            data: dateVal, // YYYY-MM-DD
            profissional_nome: profData.nome,
            profissional_grupo: profData.grupo,
            detento: detento,
            registradoEm: Timestamp.now()
        });
        alert("Visita Registrada!");
        document.getElementById('visit-detento').value = ''; // Limpa só o detento para agilizar
    } catch (e) {
        alert("Erro: " + e.message);
    }
}

// BUSCAR RELATÓRIO
async function buscarVisitas() {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    const nameFilter = document.getElementById('filter-name').value.toLowerCase();
    const tbody = document.getElementById('tabela-resultados');
    
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Buscando dados...</td></tr>';

    try {
        // Pega todas as visitas ordenadas por data
        const q = query(collection(db, "visitas"), orderBy("data", "desc"));
        const querySnapshot = await getDocs(q);
        
        let total = 0;
        let html = '';

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // Filtros no Cliente (Simples e funcional para volumes médios)
            let matchDate = true;
            if (start && data.data < start) matchDate = false;
            if (end && data.data > end) matchDate = false;

            let matchName = true;
            if (nameFilter && !data.profissional_nome.toLowerCase().includes(nameFilter)) matchName = false;

            if (matchDate && matchName) {
                total++;
                // Formata data de 2024-01-20 para 20/01/2024
                const dataFormatada = data.data.split('-').reverse().join('/');
                
                html += `
                    <tr>
                        <td>${dataFormatada}</td>
                        <td>${data.profissional_nome}</td>
                        <td><span class="badge bg-secondary">${data.profissional_grupo}</span></td>
                        <td>${data.detento}</td>
                    </tr>
                `;
            }
        });

        tbody.innerHTML = html || '<tr><td colspan="4" class="text-center">Nenhuma visita encontrada neste período.</td></tr>';
        document.getElementById('total-visitas').innerText = total;
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger text-center">Erro ao buscar dados. Verifique o console.</td></tr>';
    }
}
