// Importações Oficiais do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURAÇÃO (COLE SUAS CHAVES AQUI) ---
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO_ID",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "NUMERO",
    appId: "APP_ID"
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

// Botões de Ação
document.getElementById('btn-save-prof').addEventListener('click', salvarProfissional);
document.getElementById('btn-save-visit').addEventListener('click', salvarVisita);
document.getElementById('btn-search').addEventListener('click', buscarVisitas);

function fazerLogin() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, email, pass)
        .catch((error) => document.getElementById('login-msg').innerText = "Erro: " + error.message);
}

// Monitorar Estado (Logado ou Não)
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        carregarListaProfissionais();
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-screen').classList.add('hidden');
    }
});

function showTab(viewId, tabId) {
    // Esconde todas as views
    ['view-cadastro', 'view-registro', 'view-busca'].forEach(id => document.getElementById(id).classList.add('hidden'));
    // Mostra a selecionada
    document.getElementById(viewId).classList.remove('hidden');
    
    // Atualiza classes dos botões
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

// --- 2. LÓGICA DO SISTEMA ---

async function salvarProfissional() {
    const codigo = document.getElementById('prof-code').value;
    const nome = document.getElementById('prof-name').value;
    const grupo = document.getElementById('prof-group').value;

    if(!nome || !codigo) return alert("Preencha todos os campos");

    try {
        await addDoc(collection(db, "profissionais"), {
            codigo, nome, grupo, criadoEm: Timestamp.now()
        });
        alert("Profissional cadastrado!");
        document.getElementById('prof-code').value = '';
        document.getElementById('prof-name').value = '';
        carregarListaProfissionais();
    } catch (e) {
        alert("Erro: " + e.message);
    }
}

async function carregarListaProfissionais() {
    const select = document.getElementById('visit-prof-select');
    select.innerHTML = '<option value="">Selecione...</option>';
    
    const q = query(collection(db, "profissionais"), orderBy("nome"));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const option = document.createElement("option");
        option.value = JSON.stringify({id: doc.id, nome: data.nome, grupo: data.grupo}); 
        option.text = `${data.nome} (${data.grupo})`;
        select.appendChild(option);
    });
}

async function salvarVisita() {
    const dateVal = document.getElementById('visit-date').value;
    const profJson = document.getElementById('visit-prof-select').value;
    const detento = document.getElementById('visit-detento').value;

    if(!dateVal || !profJson || !detento) return alert("Preencha tudo!");

    const profData = JSON.parse(profJson);

    try {
        await addDoc(collection(db, "visitas"), {
            data: dateVal,
            profissional_nome: profData.nome,
            profissional_grupo: profData.grupo,
            detento: detento,
            registradoEm: Timestamp.now()
        });
        alert("Visita Registrada!");
        document.getElementById('visit-detento').value = '';
    } catch (e) {
        alert("Erro: " + e.message);
    }
}

async function buscarVisitas() {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    const nameFilter = document.getElementById('filter-name').value.toLowerCase();
    const tbody = document.getElementById('tabela-resultados');
    
    tbody.innerHTML = '<tr><td colspan="4">Buscando...</td></tr>';

    const q = query(collection(db, "visitas"), orderBy("data", "desc"));
    const querySnapshot = await getDocs(q);
    
    let total = 0;
    let html = '';

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        let matchDate = true;
        if (start && data.data < start) matchDate = false;
        if (end && data.data > end) matchDate = false;

        let matchName = true;
        if (nameFilter && !data.profissional_nome.toLowerCase().includes(nameFilter)) matchName = false;

        if (matchDate && matchName) {
            total++;
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

    tbody.innerHTML = html || '<tr><td colspan="4">Nenhuma visita encontrada.</td></tr>';
    document.getElementById('total-visitas').innerText = total;
}
