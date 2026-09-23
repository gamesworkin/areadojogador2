// ==========================================================================
// CONFIGURAÇÃO DO FIREBASE
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBu7DKMzV-LwEKcnDYK7Y-1q9pNSCHE7jE",
    authDomain: "pre-venda-4168c.firebaseapp.com",
    databaseURL: "https://pre-venda-4168c-default-rtdb.firebaseio.com/",
    projectId: "pre-venda-4168c",
    storageBucket: "pre-venda-4168c.firebasestorage.app",
    messagingSenderId: "113812783935",
    appId: "1:113812783935:web:2b1229abdd35be7b73898a"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

const EMAIL_ADMIN = "admin@admin.com";

// Elementos HTML
const viewAuth = document.getElementById('view-auth');
const viewCliente = document.getElementById('view-cliente');
const viewClienteBloqueado = document.getElementById('view-cliente-bloqueado');
const viewAdmin = document.getElementById('view-admin');
const modalFormEnvio = document.getElementById('modal-formulario-envio');
const modalDetailsContainerGamer = document.getElementById('modal-details-container-gamer');
const modalDetalhesJogo = document.getElementById('modal-detalhes-jogo');
const modalEditarPerfil = document.getElementById('modal-editar-perfil');
const modalEsqueciSenha = document.getElementById('modal-esqueci-senha');
const modalEmailInterno = document.getElementById('modal-email-interno');
const modalSugestao = document.getElementById('modal-sugestao');
const modalPainelAdmin = document.getElementById('modal-painel-admin');
const gridCardsCliente = document.getElementById('grid-cards-cliente');
const listaUsuariosAdmin = document.getElementById('lista-usuarios-admin');
const listaCardsCriados = document.getElementById('lista-cards-criados');
const inputWhatsApp = document.getElementById('cad-whatsapp');
const perfWhatsApp = document.getElementById('perf-whatsapp');
const btnRetrairVitrine = document.getElementById('btn-retrair-vitrine');
const wrapperRetratilVitrine = document.getElementById('wrapper-retratil-vitrine');

// Modais Novidades
const modalNovidadesCliente = document.getElementById('modal-novidades-cliente');
const modalDetalheNovidade = document.getElementById('modal-detalhe-novidade');
const btnAbrirNovidadesCliente = document.getElementById('btn-abrir-novidades-cliente');

let usuarioLogadoUid = null;
let dadosClienteAtual = {};
let filtroAdminAtual = "pendentes";
let comprovanteBase64Global = "";
let avatarBase64Temp = null;
let qrCodeBase64Temp = "";
let cacheMensagensUsuario = {};
let cacheUsuariosDiretorio = {};
let cacheCardsAdmin = {};
let cacheUsuariosAdmin = {};
let cacheNovidades = {};
let buscaUsuariosAdmin = "";
let novidadesJaExibidasAuto = false;

// Referências ativas para limpeza
const referenciasAtivas = [];
function escutar(caminho, evento, callback) {
    const ref = database.ref(caminho);
    ref.on(evento, callback);
    referenciasAtivas.push(ref);
    return ref;
}
function desligarTodasReferencias() {
    while (referenciasAtivas.length) {
        const ref = referenciasAtivas.pop();
        try { ref.off(); } catch (e) { /* ignore */ }
    }
}

function escapar(texto) {
    return String(texto == null ? "" : texto)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function precoParaNumero(preco) {
    if (!preco) return 0;
    const limpo = String(preco).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const valor = parseFloat(limpo);
    return isNaN(valor) ? 0 : valor;
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(ts) {
    if (!ts) return "—";
    try { return new Date(ts).toLocaleString('pt-BR'); } catch (e) { return "—"; }
}

// Sanfona da vitrine
if (btnRetrairVitrine && wrapperRetratilVitrine) {
    btnRetrairVitrine.addEventListener('click', () => {
        wrapperRetratilVitrine.classList.toggle('escondido');
        btnRetrairVitrine.innerText = wrapperRetratilVitrine.classList.contains('escondido') ? "Exibir Vitrine" : "Ocultar Vitrine";
    });
}

// Máscaras Dinâmicas para WhatsApp
function aplicarMascaraWhats(elemento) {
    if (!elemento) return;
    let value = elemento.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 6) { value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`; }
    else if (value.length > 2) { value = `(${value.slice(0, 2)}) ${value.slice(2)}`; }
    else if (value.length > 0) { value = `(${value}`; }
    elemento.value = value;
}
if (inputWhatsApp) inputWhatsApp.addEventListener('input', (e) => aplicarMascaraWhats(e.target));
if (perfWhatsApp) perfWhatsApp.addEventListener('input', (e) => aplicarMascaraWhats(e.target));

// Máscara visual da senha de login
const loginShadowPass = document.getElementById('login-shadow-pass');
const loginSenhaReal = document.getElementById('login-senha');
if (loginShadowPass && loginSenhaReal) {
    loginShadowPass.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.length < loginSenhaReal.value.length) {
            loginSenhaReal.value = loginSenhaReal.value.slice(0, val.length);
        } else if (val.length > loginSenhaReal.value.length) {
            const charAdicionado = val.slice(-1);
            if (charAdicionado !== "•") loginSenhaReal.value += charAdicionado;
        }
        loginShadowPass.value = "•".repeat(loginSenhaReal.value.length);
    });
}

function validarProvedorEmail(email) {
    const emailLimpo = email.trim().toLowerCase();
    if (emailLimpo === "teste@teste.com") return true;
    const provedoresValidos = ["gmail.com", "hotmail.com", "outlook.com", "outlook.com.br", "yahoo.com", "yahoo.com.br", "icloud.com", "live.com", "uol.com.br", "terra.com.br", "bol.com.br"];
    const dominio = emailLimpo.split('@')[1];
    return provedoresValidos.includes(dominio);
}

function irParaTela(tela) {
    [viewAuth, viewCliente, viewClienteBloqueado, viewAdmin].forEach(v => { if (v) v.classList.remove('active'); });
    if (tela) tela.classList.add('active');
}

function fecharTodosModais() {
    document.querySelectorAll('.modal-form').forEach(m => m.classList.remove('active'));
    if (modalDetailsContainerGamer) modalDetailsContainerGamer.classList.remove('active');
    const lb = document.getElementById('lightbox-qrcode');
    if (lb) lb.classList.remove('active');
}

// Abas Login/Cadastro
const tabLogin = document.getElementById('tab-login');
const tabCadastro = document.getElementById('tab-cadastro');
if (tabLogin && tabCadastro) {
    tabLogin.addEventListener('click', () => {
        document.getElementById('form-login').classList.add('active');
        document.getElementById('form-cadastro-auth').classList.remove('active');
        tabLogin.classList.add('active'); tabCadastro.classList.remove('active');
    });
    tabCadastro.addEventListener('click', () => {
        document.getElementById('form-cadastro-auth').classList.add('active');
        document.getElementById('form-login').classList.remove('active');
        tabCadastro.classList.add('active'); tabLogin.classList.remove('active');
    });
}

// ==========================================================================
// RESET TOTAL DA TELA DE LOGIN
// ==========================================================================
function restaurarTelaLoginDoZero() {
    desligarTodasReferencias();
    fecharTodosModais();

    usuarioLogadoUid = null;
    dadosClienteAtual = {};
    comprovanteBase64Global = "";
    avatarBase64Temp = null;
    qrCodeBase64Temp = "";
    cacheMensagensUsuario = {};
    cacheUsuariosDiretorio = {};
    cacheCardsAdmin = {};
    cacheUsuariosAdmin = {};
    cacheNovidades = {};
    filtroAdminAtual = "pendentes";
    buscaUsuariosAdmin = "";
    novidadesJaExibidasAuto = false;

    ['form-login', 'form-cadastro-auth', 'form-comprovante', 'form-editar-perfil-cliente',
     'form-recuperar-senha-interno', 'form-nova-mensagem', 'form-sugestao',
     'form-criar-card', 'form-msg-admin', 'form-criar-novidade', 'form-comentar-novidade'].forEach(id => {
        const f = document.getElementById(id);
        if (f) f.reset();
    });

    if (loginSenhaReal) loginSenhaReal.value = "";
    if (loginShadowPass) { loginShadowPass.value = ""; loginShadowPass.blur(); }
    const emailLogin = document.getElementById('login-email');
    if (emailLogin) emailLogin.value = "";

    const btnLogar = document.getElementById('btn-logar');
    if (btnLogar) { btnLogar.classList.remove('carregando'); btnLogar.innerText = "LOGAR NO HUB"; btnLogar.disabled = false; }
    const btnCadastrarReset = document.getElementById('btn-cadastrar');
    if (btnCadastrarReset) { btnCadastrarReset.classList.remove('carregando'); btnCadastrarReset.innerText = "CADASTRAR E ENTRAR"; btnCadastrarReset.disabled = false; }
    const overlayAuth = document.getElementById('overlay-auth-carregando');
    if (overlayAuth) overlayAuth.classList.remove('active');

    if (tabLogin && tabCadastro) {
        document.getElementById('form-login').classList.add('active');
        document.getElementById('form-cadastro-auth').classList.remove('active');
        tabLogin.classList.add('active'); tabCadastro.classList.remove('active');
    }

    ['grid-cards-cliente', 'grid-vitrine-vendas', 'container-links-menu', 'lista-usuarios-admin',
     'lista-cards-criados', 'lista-email-entrada', 'lista-email-enviados',
     'lista-sugestoes-admin', 'lista-conferencia-pagamentos', 'grid-kpis-dashboard',
     'grid-kpis-relatorios', 'grid-kpis-pagamentos', 'tabela-vendas-patch',
     'tabela-novos-usuarios', 'construtor-menu-visual-container', 'lista-novidades-admin',
     'lista-novidades-cliente', 'lista-historico-temporadas'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
    });

    const fileInfo = document.getElementById('file-info');
    if (fileInfo) fileInfo.innerText = "Nenhum arquivo selecionado";
    const badge = document.getElementById('badge-emails-nao-lidos');
    if (badge) badge.style.display = "none";
    const badgeNov = document.getElementById('badge-novidades-nao-lidas');
    if (badgeNov) badgeNov.style.display = "none";
    const avatarHeader = document.getElementById('avatar-header-circulo');
    if (avatarHeader) avatarHeader.innerHTML = "?";

    try { sessionStorage.clear(); } catch (e) { /* ignore */ }

    irParaTela(viewAuth);
}

// Deslogar
function deslogar() {
    auth.signOut().then(() => restaurarTelaLoginDoZero());
}

// ==========================================================================
// MONITOR DE SESSÃO
// ==========================================================================
auth.onAuthStateChanged(user => {
    if (user) {
        usuarioLogadoUid = user.uid;
        if (user.email === EMAIL_ADMIN) {
            irParaTela(viewAdmin);
            iniciarAmbienteAdmin();
        } else {
            escutar('usuarios/' + user.uid, 'value', snapshot => {
                const dados = snapshot.val();
                if (!dados) return;
                dadosClienteAtual = dados;

                if (dados.status_cadastro === "solicitou_exclusao") {
                    irParaTela(viewClienteBloqueado);
                    return;
                }

                const displayNameElem = document.getElementById('user-display-name');
                if (displayNameElem) displayNameElem.innerText = `${dados.nome} ${dados.sobrenome}`;
                renderizarAvatarHeader(dados);

                const areaPendente = document.getElementById('area-compra-pendente');
                const caixaAnalise = document.getElementById('caixa-alerta-analise-comprovante');
                const temPedidosPendentes = dados.pedidos && Object.keys(dados.pedidos).length > 0;
                if (temPedidosPendentes) {
                    if (areaPendente) areaPendente.style.display = "block";
                    if (caixaAnalise) caixaAnalise.style.display = "block";
                } else if (caixaAnalise) {
                    caixaAnalise.style.display = "none";
                }

                povoarVitrineDeVendasCliente(dados.jogos_liberados || {});
                irParaTela(viewCliente);
                ouvirCardsDoCliente(user.uid);
                ouvirEConstruirMenuCliente();
                inicializarBotaoWhatsApp();
                ouvirMensagensDoUsuario(user.uid);
                ouvirNovidadesCliente(user.uid);
            });
        }
    } else {
        restaurarTelaLoginDoZero();
    }
});

function renderizarAvatarHeader(dados) {
    const alvo = document.getElementById('avatar-header-circulo');
    if (!alvo) return;
    if (dados.avatar_base64) {
        alvo.innerHTML = `<img src="${dados.avatar_base64}" alt="Avatar">`;
    } else {
        const iniciais = `${(dados.nome || "?").charAt(0)}${(dados.sobrenome || "").charAt(0)}`.toUpperCase();
        alvo.innerText = iniciais;
    }
}

// ==========================================================================
// VITRINE DO CLIENTE
// ==========================================================================
function povoarVitrineDeVendasCliente(jogosLiberadosUsuario) {
    const areaPendente = document.getElementById('area-compra-pendente');
    const containerVitrine = document.getElementById('grid-vitrine-vendas');
    if (!containerVitrine || !areaPendente) return;

    database.ref('cards_disponiveis').once('value', snapshot => {
        const cardsGlobais = snapshot.val();
        if (!cardsGlobais) { areaPendente.style.display = "none"; return; }

        containerVitrine.innerHTML = "";
        let totalDisponiveisVenda = 0;

        const idsPatchesComPedidoPendente = [];
        if (dadosClienteAtual.pedidos) {
            Object.keys(dadosClienteAtual.pedidos).forEach(pId => {
                const p = dadosClienteAtual.pedidos[pId];
                if (p.id_card_comprado) idsPatchesComPedidoPendente.push(p.id_card_comprado);
            });
        }

        Object.keys(cardsGlobais).forEach(cardId => {
            const jaAdquirido = jogosLiberadosUsuario[cardId] === true;
            const jaEmAnalise = idsPatchesComPedidoPendente.includes(cardId);
            if (!jaAdquirido && !jaEmAnalise) {
                totalDisponiveisVenda++;
                const cardVitrine = document.createElement('div');
                cardVitrine.className = 'game-card';
                cardVitrine.style.border = "1px dashed #242f41";
                const precoExibicao = cardsGlobais[cardId].preco || "R$ 10,00";
                cardVitrine.innerHTML = `
                    <img src="${escapar(cardsGlobais[cardId].capa_url)}" style="opacity: 0.65;">
                    <h4 style="color:#aaa;">[Disponível] ${escapar(cardsGlobais[cardId].titulo)}</h4>
                    <div style="position:absolute; top:10px; right:10px; background:#00ff66; color:#000; font-size:0.7rem; font-weight:bold; padding:3px 6px; border-radius:3px;">${escapar(precoExibicao)}</div>
                `;
                cardVitrine.onclick = () => abrirModalJogo(cardsGlobais[cardId], true, cardId);
                containerVitrine.appendChild(cardVitrine);
            }
        });

        const temPedidos = dadosClienteAtual.pedidos && Object.keys(dadosClienteAtual.pedidos).length > 0;
        areaPendente.style.display = (totalDisponiveisVenda > 0 || temPedidos) ? "block" : "none";
    });
}

function fecharModalJogo() {
    if (modalDetailsContainerGamer) modalDetailsContainerGamer.classList.remove('active');
}

// Cópia blindada
function ejecutarCopiaGamerBlindada(textoParaCopiar, elementoBotao) {
    const textoOriginal = elementoBotao.innerHTML;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textoParaCopiar).then(() => {
            elementoBotao.innerHTML = "✅ Copiado";
            setTimeout(() => { elementoBotao.innerHTML = textoOriginal; }, 2000);
        }).catch(() => executarMetodoCopiaAntigo(textoParaCopiar, elementoBotao, textoOriginal));
    } else {
        executarMetodoCopiaAntigo(textoParaCopiar, elementoBotao, textoOriginal);
    }
}

function executarMetodoCopiaAntigo(texto, botao, textoOrig) {
    const textarea = document.createElement("textarea");
    textarea.value = texto;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand("copy");
        botao.innerHTML = "✅ Copiado";
    } catch (err) { console.error("Falha ao copiar texto", err); }
    document.body.removeChild(textarea);
    setTimeout(() => { botao.innerHTML = textoOrig; }, 2000);
}

// Modal Jogo / Checkout
function abrirModalJogo(card, modoLojaVenda = false, cardId = "") {
    const imgCapa = document.getElementById('modal-jogo-capa');
    if (!imgCapa) return;
    imgCapa.src = card.capa_url;
    document.getElementById('modal-jogo-titulo').innerText = card.titulo;
    document.getElementById('modal-jogo-descricao').innerText = card.descricao;
    imgCapa.addEventListener('dragstart', (e) => e.preventDefault());

    const containerSenha = document.getElementById('container-senha-protegida-modal');
    const btnRevelarSenha = document.getElementById('btn-revelar-senha-modal');
    const areaTextoSenha = document.getElementById('area-texto-senha-secreta');
    const textoSenhaReal = document.getElementById('texto-senha-secreta-real');
    const btnCopiarSenha = document.getElementById('btn-copiar-senha-modal');
    const containerDownloads = document.getElementById('modal-jogo-botoes');
    const btnAdquirirLoja = document.getElementById('btn-adquirir-patch-vitrine');
    const blocoPixPreview = document.getElementById('bloco-pix-dinamico-preview');
    const txtPixPreviewReal = document.getElementById('texto-pix-dinamico-preview-real');
    const btnCopiarPixPreview = document.getElementById('btn-copiar-pix-preview-dinamico');

    if (btnRevelarSenha) btnRevelarSenha.style.display = "block";
    if (areaTextoSenha) areaTextoSenha.style.display = "none";
    if (containerSenha) containerSenha.style.display = "none";
    if (containerDownloads) containerDownloads.style.display = "none";
    if (btnAdquirirLoja) btnAdquirirLoja.style.display = "none";
    if (blocoPixPreview) blocoPixPreview.style.display = "none";

    const precoFinalCard = card.preco || "R$ 10,00";
    const pixFinalCard = card.pix || "88988470190";
    const copiaColaCard = (card.pix_copia_cola || "").trim();
    const qrCard = card.pix_qr_base64 || "";

    if (modoLojaVenda) {
        if (txtPixPreviewReal) txtPixPreviewReal.innerText = pixFinalCard;
        if (blocoPixPreview) blocoPixPreview.style.display = "block";
        if (btnCopiarPixPreview) {
            btnCopiarPixPreview.onclick = (e) => { e.stopPropagation(); ejecutarCopiaGamerBlindada(pixFinalCard, btnCopiarPixPreview); };
        }

        document.getElementById('texto-preco-botao-dinamico').innerText = precoFinalCard;
        if (btnAdquirirLoja) {
            btnAdquirirLoja.style.display = "block";
            btnAdquirirLoja.onclick = () => {
                fecharModalJogo();
                document.getElementById('id-card-escolhido-compra').value = cardId;
                document.getElementById('titulo-envio-comprovante-dinamico').innerText = `Adquirir: ${card.titulo}`;
                document.getElementById('texto-preco-modal-checkout').innerText = precoFinalCard;
                document.getElementById('texto-chave-pix-checkout').innerText = pixFinalCard;

                comprovanteBase64Global = "";

                const btnCopiarCheckout = document.getElementById('btn-copiar-pix-checkout');
                if (btnCopiarCheckout) btnCopiarCheckout.onclick = () => ejecutarCopiaGamerBlindada(pixFinalCard, btnCopiarCheckout);

                const caixaCC = document.getElementById('caixa-copia-cola-checkout');
                const textoCC = document.getElementById('texto-copia-cola-checkout');
                const btnCC = document.getElementById('btn-copiar-copia-cola-checkout');
                if (caixaCC && textoCC) {
                    if (copiaColaCard) {
                        textoCC.value = copiaColaCard;
                        caixaCC.style.display = "block";
                        if (btnCC) btnCC.onclick = () => ejecutarCopiaGamerBlindada(copiaColaCard, btnCC);
                    } else {
                        caixaCC.style.display = "none";
                    }
                }

                const caixaQR = document.getElementById('caixa-qrcode-checkout');
                const imgQR = document.getElementById('img-qrcode-checkout');
                if (caixaQR && imgQR) {
                    if (qrCard) {
                        imgQR.src = qrCard;
                        caixaQR.style.display = "block";
                        const btnSalvar = document.getElementById('btn-salvar-qr-checkout');
                        const btnAmpliar = document.getElementById('btn-ampliar-qr-checkout');
                        if (btnSalvar) btnSalvar.onclick = () => baixarBase64(qrCard, `qrcode-pix-${(card.titulo || 'patch').replace(/\s+/g, '-').toLowerCase()}.png`);
                        if (btnAmpliar) btnAmpliar.onclick = () => abrirLightboxQr(qrCard);
                    } else {
                        caixaQR.style.display = "none";
                    }
                }

                if (modalFormEnvio) modalFormEnvio.classList.add('active');
            };
        }
    } else {
        if (containerDownloads) containerDownloads.style.display = "flex";
        if (card.senha_patch && card.senha_patch.trim() !== "") {
            if (textoSenhaReal) textoSenhaReal.innerText = card.senha_patch.trim();
            if (containerSenha) containerSenha.style.display = "block";
            if (btnRevelarSenha && areaTextoSenha) {
                btnRevelarSenha.onclick = () => { btnRevelarSenha.style.display = "none"; areaTextoSenha.style.display = "block"; };
            }
            if (btnCopiarSenha && textoSenhaReal) {
                btnCopiarSenha.onclick = () => ejecutarCopiaGamerBlindada(textoSenhaReal.innerText, btnCopiarSenha);
            }
        }
        if (containerDownloads) {
            containerDownloads.innerHTML = "";
            if (card.botoes) {
                card.botoes.forEach(btn => {
                    const buttonElement = document.createElement('button');
                    buttonElement.className = 'btn-download-dinamico';
                    buttonElement.innerText = btn.texto;
                    buttonElement.style.width = "100%";
                    buttonElement.style.cursor = "pointer";
                    buttonElement.addEventListener('dragstart', (e) => e.preventDefault());
                    buttonElement.addEventListener('click', () => { window.open(btn.url, '_blank'); });
                    containerDownloads.appendChild(buttonElement);
                });
            }
        }
    }
    if (modalDetailsContainerGamer) modalDetailsContainerGamer.classList.add('active');
}

function abrirLightboxQr(base64) {
    const lb = document.getElementById('lightbox-qrcode');
    const img = document.getElementById('lightbox-qr-img');
    if (!lb || !img) return;
    img.src = base64;
    lb.classList.add('active');
}

function baixarBase64(base64, nomeArquivo) {
    const a = document.createElement('a');
    a.href = base64;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function converterImagemParaBase64(arquivo, ladoMaximo, quadrado) {
    return new Promise((resolve, reject) => {
        if (!arquivo.type.startsWith('image/')) return reject(new Error("Selecione um arquivo de imagem."));
        if (arquivo.size > 6 * 1024 * 1024) return reject(new Error("Imagem muito grande (limite 6MB)."));
        const leitor = new FileReader();
        leitor.onload = () => {
            const img = new Image();
            img.onload = () => {
                let largura = img.width, altura = img.height;
                if (quadrado) {
                    const lado = Math.min(largura, altura);
                    const canvas = document.createElement('canvas');
                    canvas.width = ladoMaximo; canvas.height = ladoMaximo;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, ladoMaximo, ladoMaximo);
                    ctx.drawImage(img, (largura - lado) / 2, (altura - lado) / 2, lado, lado, 0, 0, ladoMaximo, ladoMaximo);
                    return resolve(canvas.toDataURL('image/png'));
                }
                const escala = Math.min(1, ladoMaximo / Math.max(largura, altura));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(largura * escala);
                canvas.height = Math.round(altura * escala);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
            img.src = leitor.result;
        };
        leitor.onerror = () => reject(new Error("Falha ao carregar o arquivo."));
        leitor.readAsDataURL(arquivo);
    });
}

// CARDS E MENU CLIENTE
function ouvirCardsDoCliente(uid) {
    if (!gridCardsCliente) return;
    escutar(`usuarios/${uid}/jogos_liberados`, 'value', snapshotLiberados => {
        gridCardsCliente.innerHTML = "";
        const liberados = snapshotLiberados.val() || {};
        Object.keys(liberados).forEach(cardId => {
            database.ref(`cards_disponiveis/${cardId}`).once('value', cardSnap => {
                const card = cardSnap.val();
                if (!card) return;
                const cardElement = document.createElement('div');
                cardElement.className = 'game-card';
                cardElement.innerHTML = `<img src="${escapar(card.capa_url)}"><h4>${escapar(card.titulo)}</h4>`;
                cardElement.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; });
                cardElement.addEventListener('click', () => abrirModalJogo(card, false));
                gridCardsCliente.appendChild(cardElement);
            });
        });
    });
}

function ouvirEConstruirMenuCliente() {
    const menuContainer = document.getElementById('area-menu-dinamico');
    const linksList = document.getElementById('container-links-menu');
    if (!linksList || !menuContainer) return;

    escutar('configuracao_menu_json', 'value', snapshot => {
        linksList.innerHTML = "";
        const jsonString = snapshot.val() || "";
        if (!jsonString.trim()) { menuContainer.style.display = "none"; return; }
        try {
            const categorias = JSON.parse(jsonString);
            if (!Array.isArray(categorias) || categorias.length === 0) { menuContainer.style.display = "none"; return; }

            categorias.forEach(item => {
                const liCat = document.createElement('li');
                liCat.className = 'nav-dinamica-item';
                const aCat = document.createElement('a');
                aCat.className = 'nav-link-item';
                aCat.innerText = item.categoria;

                if (item.tipo === "link" && item.url_categoria) {
                    aCat.href = item.url_categoria;
                    if (item.nova_aba !== false) { aCat.target = "_blank"; aCat.rel = "noopener"; }
                } else if (item.tipo === "menu") {
                    aCat.href = "javascript:void(0);";
                    liCat.addEventListener('click', (e) => {
                        e.stopPropagation();
                        document.querySelectorAll('.nav-dinamica-item').forEach(el => { if (el !== liCat) el.classList.remove('submenu-visivel'); });
                        liCat.classList.toggle('submenu-visivel');
                    });
                }
                liCat.appendChild(aCat);

                if (item.tipo !== "link" && Array.isArray(item.subcategorias) && item.subcategorias.length > 0) {
                    const ulSub = document.createElement('ul');
                    ulSub.className = 'submenu-dinamico';
                    item.subcategorias.forEach(sub => {
                        const liSub = document.createElement('li');
                        const aSub = document.createElement('a');
                        aSub.innerText = sub.texto;
                        aSub.href = sub.url;
                        if (sub.nova_aba !== false) { aSub.target = "_blank"; aSub.rel = "noopener"; }
                        aSub.addEventListener('click', (e) => e.stopPropagation());
                        liSub.appendChild(aSub);
                        ulSub.appendChild(liSub);
                    });
                    liCat.appendChild(ulSub);
                }
                linksList.appendChild(liCat);
            });
            menuContainer.style.display = "block";
            verificarEncaixeDoMenu();
        } catch (e) { menuContainer.style.display = "none"; }
    });
}

function verificarEncaixeDoMenu() {
    const menuContainer = document.getElementById('area-menu-dinamico');
    const linksList = document.getElementById('container-links-menu');
    if (!menuContainer || !linksList || menuContainer.style.display === "none") return;

    const estavaEmHamburguer = menuContainer.classList.contains('modo-hamburguer');
    menuContainer.classList.remove('modo-hamburguer', 'aberto');

    const cabe = linksList.scrollWidth <= menuContainer.clientWidth + 1;
    if (!cabe) {
        menuContainer.classList.add('modo-hamburguer');
        if (estavaEmHamburguer) menuContainer.classList.remove('aberto');
    }
}

function inicializarBotaoWhatsApp() {
    const whatsappNumero = "5588988470190";
    const btnWhats = document.getElementById('btn-whatsapp-flutuante');
    if (btnWhats) btnWhats.href = `https://api.whatsapp.com/send?phone=${whatsappNumero}&text=Ol%C3%A1,%20preciso%20de%20ajuda%20no%20Hub!`;
}

// ==========================================================================
// MÓDULO DE NOVIDADES (CLIENTE E ADMIN)
// ==========================================================================
function ouvirNovidadesCliente(uid) {
    escutar('novidades', 'value', snapshot => {
        cacheNovidades = snapshot.val() || {};
        database.ref(`usuarios/${uid}/novidades_lidas`).once('value', lidasSnap => {
            const lidasMap = lidasSnap.val() || {};
            let naoLidasContador = 0;
            let novidadeAvisarAuto = null;

            const listaArr = Object.keys(cacheNovidades).map(id => ({ id, ...cacheNovidades[id] }));
            listaArr.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            listaArr.forEach(nov => {
                if (!lidasMap[nov.id]) {
                    naoLidasContador++;
                    if (!novidadeAvisarAuto) novidadeAvisarAuto = nov;
                }
            });

            const badge = document.getElementById('badge-novidades-nao-lidas');
            if (badge) {
                if (naoLidasContador > 0) {
                    badge.innerText = naoLidasContador;
                    badge.style.display = "inline-block";
                } else {
                    badge.style.display = "none";
                }
            }

            // Exibe automaticamente pop-up da novidade não lida no login
            if (novidadeAvisarAuto && !novidadesJaExibidasAuto) {
                novidadesJaExibidasAuto = true;
                abrirModalDetalheNovidade(novidadeAvisarAuto.id, true);
            }
        });
    });
}

function renderizarListaNovidadesCliente() {
    const container = document.getElementById('lista-novidades-cliente');
    if (!container) return;

    database.ref(`usuarios/${usuarioLogadoUid}/novidades_lidas`).once('value', lidasSnap => {
        const lidasMap = lidasSnap.val() || {};
        const listaArr = Object.keys(cacheNovidades).map(id => ({ id, ...cacheNovidades[id] }));
        listaArr.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        if (listaArr.length === 0) {
            container.innerHTML = `<p class="vazio-lista">Nenhuma novidade lançada ainda.</p>`;
            return;
        }

        container.innerHTML = listaArr.map(nov => {
            const lida = !!lidasMap[nov.id];
            return `
                <div class="user-item" onclick="abrirModalDetalheNovidade('${nov.id}')" style="cursor:pointer; border-left:4px solid ${lida ? '#242f41' : '#ffcc00'};">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="margin:0; color:#fff;">${escapar(nov.titulo)}</h4>
                        ${!lida ? '<span style="background:#ffcc00; color:#000; font-size:0.65rem; font-weight:bold; padding:2px 6px; border-radius:3px;">NOVO</span>' : ''}
                    </div>
                    <p style="font-size:0.75rem; color:#8899a6; margin:4px 0 0 0;">${formatarData(nov.timestamp)}</p>
                </div>
            `;
        }).join("");
    });
}

if (btnAbrirNovidadesCliente) {
    btnAbrirNovidadesCliente.addEventListener('click', () => {
        renderizarListaNovidadesCliente();
        if (modalNovidadesCliente) modalNovidadesCliente.classList.add('active');
    });
}

const btnFecharNovidadesCliente = document.getElementById('btn-fechar-novidades-cliente');
if (btnFecharNovidadesCliente) btnFecharNovidadesCliente.addEventListener('click', () => modalNovidadesCliente.classList.remove('active'));

const btnFecharDetalheNovidade = document.getElementById('btn-fechar-detalhe-novidade');
if (btnFecharDetalheNovidade) btnFecharDetalheNovidade.addEventListener('click', () => modalDetalheNovidade.classList.remove('active'));

function abrirModalDetalheNovidade(id, autoExibicao = false) {
    const nov = cacheNovidades[id];
    if (!nov) return;

    document.getElementById('detalhe-novidade-titulo').innerText = nov.titulo;
    document.getElementById('detalhe-novidade-data').innerText = `Lançado em: ${formatarData(nov.timestamp)}`;
    document.getElementById('detalhe-novidade-descricao').innerText = nov.descricao;

    // Downloads
    const containerDl = document.getElementById('container-downloads-novidade');
    containerDl.innerHTML = "";
    if (nov.botoes && nov.botoes.length > 0) {
        nov.botoes.forEach(btn => {
            const b = document.createElement('button');
            b.className = 'btn-download-dinamico';
            b.innerText = btn.texto;
            b.onclick = () => window.open(btn.url, '_blank');
            containerDl.appendChild(b);
        });
    }

    // Comentários
    const formComentar = document.getElementById('form-comentar-novidade');
    const msgDesativados = document.getElementById('msg-comentarios-desativados');
    document.getElementById('novidade-id-comentario').value = id;

    if (nov.permitir_comentarios !== false) {
        if (formComentar) formComentar.style.display = "block";
        if (msgDesativados) msgDesativados.style.display = "none";
    } else {
        if (formComentar) formComentar.style.display = "none";
        if (msgDesativados) msgDesativados.style.display = "block";
    }

    ouvirComentariosNovidade(id);

    // Marca como lida para o utilizador
    if (usuarioLogadoUid) {
        database.ref(`usuarios/${usuarioLogadoUid}/novidades_lidas/${id}`).set(true);
    }

    if (modalNovidadesCliente) modalNovidadesCliente.classList.remove('active');
    if (modalDetalheNovidade) modalDetalheNovidade.classList.add('active');
}

function ouvirComentariosNovidade(novidadeId) {
    const lista = document.getElementById('lista-comentarios-novidade');
    if (!lista) return;

    database.ref(`novidades/${novidadeId}/comentarios`).on('value', snapshot => {
        const coms = snapshot.val() || {};
        const arr = Object.keys(coms).map(cid => ({ cid, ...coms[cid] }));
        arr.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        if (arr.length === 0) {
            lista.innerHTML = `<p class="vazio-lista" style="font-size:0.8rem;">Nenhum comentário ainda. Seja o primeiro!</p>`;
            return;
        }

        lista.innerHTML = arr.map(c => `
            <div style="background:#121824; border:1px solid #1f2a3c; padding:8px 12px; border-radius:6px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="font-size:0.8rem; color:#00ff66;">${escapar(c.autor_nome)}</strong>
                    <span style="font-size:0.65rem; color:#8899a6;">${formatarData(c.timestamp)}</span>
                </div>
                <p style="font-size:0.85rem; color:#fff; margin:4px 0 0 0; white-space:pre-wrap;">${escapar(c.texto)}</p>
                ${usuarioLogadoUid && (dadosClienteAtual.email === EMAIL_ADMIN) ? `<button type="button" onclick="deletarComentarioNovidade('${novidadeId}', '${c.cid}')" style="background:none; border:none; color:#ff5555; font-size:0.7rem; cursor:pointer; padding:0; margin-top:4px;">Deletar comentário</button>` : ''}
            </div>
        `).join("");
    });
}

const formComentarNovidade = document.getElementById('form-comentar-novidade');
if (formComentarNovidade) {
    formComentarNovidade.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('novidade-id-comentario').value;
        const texto = document.getElementById('texto-comentario-novidade').value.trim();
        if (!texto || !id) return;

        const nomeAutor = dadosClienteAtual.nome ? `${dadosClienteAtual.nome} ${dadosClienteAtual.sobrenome || ''}` : 'Administrador';

        try {
            await database.ref(`novidades/${id}/comentarios`).push({
                uid: usuarioLogadoUid,
                autor_nome: nomeAutor,
                texto: texto,
                timestamp: Date.now()
            });
            document.getElementById('texto-comentario-novidade').value = "";
        } catch (err) { alert("Erro ao comentar: " + err.message); }
    });
}

function deletarComentarioNovidade(novidadeId, comentarioId) {
    if (confirm("Apagar este comentário?")) {
        database.ref(`novidades/${novidadeId}/comentarios/${comentarioId}`).remove();
    }
}

// ADMIN: NOVIDADES
const formCriarNovidade = document.getElementById('form-criar-novidade');
if (formCriarNovidade) {
    formCriarNovidade.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idEdicao = document.getElementById('novidade-id-edicao').value;
        const botoes = [];
        for (let i = 1; i <= 4; i++) {
            const txt = document.getElementById(`nov-btn-txt-${i}`).value.trim();
            const url = document.getElementById(`nov-btn-url-${i}`).value.trim();
            if (txt && url) botoes.push({ texto: txt, url: url });
        }

        const dadosNovidade = {
            titulo: document.getElementById('novidade-titulo').value.trim(),
            descricao: document.getElementById('novidade-descricao').value.trim(),
            permitir_comentarios: document.getElementById('novidade-permitir-comentarios').checked,
            botoes: botoes,
            timestamp: Date.now()
        };

        try {
            if (idEdicao) {
                await database.ref(`novidades/${idEdicao}`).update(dadosNovidade);
                alert("✨ Novidade atualizada!");
                cancelarEdicaoNovidade();
            } else {
                await database.ref('novidades').push(dadosNovidade);
                alert("🚀 Novidade lançada para todos os utilizadores!");
                cancelarEdicaoNovidade();
            }
        } catch (err) { alert("Erro: " + err.message); }
    });
}

function ouvirNovidadesAdmin() {
    const lista = document.getElementById('lista-novidades-admin');
    if (!lista) return;

    escutar('novidades', 'value', snapshot => {
        const data = snapshot.val() || {};
        lista.innerHTML = "";
        const keys = Object.keys(data);
        if (keys.length === 0) {
            lista.innerHTML = `<p class="vazio-lista">Nenhuma novidade cadastrada.</p>`;
            return;
        }

        keys.sort((a, b) => (data[b].timestamp || 0) - (data[a].timestamp || 0));
        keys.forEach(id => {
            const n = data[id];
            const div = document.createElement('div');
            div.className = 'user-item';
            div.style.borderLeft = "3px solid #ffcc00";
            div.innerHTML = `
                <div>
                    <h4 style="margin:0; color:#fff;">${escapar(n.titulo)}</h4>
                    <p style="font-size:0.75rem; color:#8899a6; margin:2px 0 0 0;">${formatarData(n.timestamp)} · ${n.permitir_comentarios !== false ? 'Comentários ativos' : 'Comentários desativados'}</p>
                </div>
                <div style="display:flex; gap:5px; margin-top:10px;">
                    <button class="btn-visualizar-comprovante" style="margin:0; background:#24334c; border-color:#ffcc00; color:#ffcc00;" onclick="carregarNovidadeEdicao('${id}')">✏️ Editar</button>
                    <button class="btn-visualizar-comprovante" style="margin:0; background:#3d1c1c; border-color:#ff3333; color:#ff3333;" onclick="deletarNovidade('${id}')">🗑️ Apagar</button>
                </div>
            `;
            lista.appendChild(div);
        });
    });
}

function carregarNovidadeEdicao(id) {
    database.ref(`novidades/${id}`).once('value', snapshot => {
        const n = snapshot.val();
        if (!n) return;
        document.getElementById('novidade-id-edicao').value = id;
        document.getElementById('novidade-titulo').value = n.titulo;
        document.getElementById('novidade-descricao').value = n.descricao;
        document.getElementById('novidade-permitir-comentarios').checked = n.permitir_comentarios !== false;

        for (let i = 1; i <= 4; i++) {
            document.getElementById(`nov-btn-txt-${i}`).value = "";
            document.getElementById(`nov-btn-url-${i}`).value = "";
        }
        if (n.botoes) {
            n.botoes.forEach((btn, idx) => {
                if (idx < 4) {
                    document.getElementById(`nov-btn-txt-${idx + 1}`).value = btn.texto;
                    document.getElementById(`nov-btn-url-${idx + 1}`).value = btn.url;
                }
            });
        }

        document.getElementById('titulo-form-novidade').innerText = "✏️ Editando Novidade";
        document.getElementById('btn-cancelar-edicao-novidade').style.display = "block";
        document.getElementById('btn-salvar-novidade').innerText = "ATUALIZAR NOVIDADE";
    });
}

function cancelarEdicaoNovidade() {
    document.getElementById('novidade-id-edicao').value = "";
    if (formCriarNovidade) formCriarNovidade.reset();
    document.getElementById('titulo-form-novidade').innerText = "Publicar Nova Novidade";
    document.getElementById('btn-cancelar-edicao-novidade').style.display = "none";
    document.getElementById('btn-salvar-novidade').innerText = "PUBLICAR NOVIDADE";
}
const btnCancelarEdicaoNovidade = document.getElementById('btn-cancelar-edicao-novidade');
if (btnCancelarEdicaoNovidade) btnCancelarEdicaoNovidade.addEventListener('click', cancelarEdicaoNovidade);

function deletarNovidade(id) {
    if (confirm("⚠️ Deseja eliminar esta novidade permanentemente?")) {
        database.ref(`novidades/${id}`).remove();
    }
}

// ==========================================================================
// MÓDULO DE GESTÃO DE TEMPORADAS MENSAIS (ADMIN)
// ==========================================================================
const btnExecutarEncerramentoTemporada = document.getElementById('btn-executar-encerramento-temporada');
if (btnExecutarEncerramentoTemporada) {
    btnExecutarEncerramentoTemporada.addEventListener('click', async () => {
        const nomeTemp = document.getElementById('input-nome-temporada-encerramento').value.trim();
        if (!nomeTemp) return alert("Por favor, informe um nome ou período para identificar a temporada!");

        if (!confirm(`⚠️ ATENÇÃO: Deseja encerrar a temporada "${nomeTemp}"?\n\nIsso irá arquivar os relatórios, sugestões e limpar pedidos aprovados dos utilizadores para abrir uma nova temporada.`)) return;

        try {
            const metricas = calcularMetricas();
            const snapshotSugestoes = await database.ref('sugestoes').once('value');
            const sugestoes = snapshotSugestoes.val() || {};

            const dadosArquivar = {
                nome: nomeTemp,
                data_encerramento: Date.now(),
                faturamento: metricas.faturamento,
                patches_vendidos: metricas.patchesVendidos,
                total_jogadores: metricas.totalUsuarios,
                vendas_por_patch: metricas.vendasPorPatch,
                sugestoes_recebidas: sugestoes
            };

            // Salva na coleção histórica de temporadas
            await database.ref('historico_temporadas').push(dadosArquivar);

            // Limpa pedidos e jogos do ciclo para todos os utilizadores (reinício de temporada)
            const usuarios = cacheUsuariosAdmin || {};
            for (const uid of Object.keys(usuarios)) {
                if (usuarios[uid] && usuarios[uid].email !== EMAIL_ADMIN) {
                    await database.ref(`usuarios/${uid}/pedidos`).remove();
                    await database.ref(`usuarios/${uid}/status_cadastro`).set("cadastrado");
                }
            }

            // Limpa caixa de sugestões ativas
            await database.ref('sugestoes').remove();

            document.getElementById('input-nome-temporada-encerramento').value = "";
            alert(`🎉 Temporada "${nomeTemp}" encerrada e arquivada com sucesso! Uma nova temporada foi iniciada.`);
            renderizarHistoricoTemporadas();
        } catch (err) {
            alert("Erro ao encerrar temporada: " + err.message);
        }
    });
}

function renderizarHistoricoTemporadas() {
    const lista = document.getElementById('lista-historico-temporadas');
    if (!lista) return;

    escutar('historico_temporadas', 'value', snapshot => {
        const data = snapshot.val() || {};
        lista.innerHTML = "";
        const keys = Object.keys(data);

        if (keys.length === 0) {
            lista.innerHTML = `<p class="vazio-lista">Nenhuma temporada encerrada ainda.</p>`;
            return;
        }

        keys.sort((a, b) => (data[b].data_encerramento || 0) - (data[a].data_encerramento || 0));
        keys.forEach(id => {
            const t = data[id];
            const div = document.createElement('div');
            div.className = 'user-item';
            div.style.borderLeft = "4px solid #00ff66";
            div.innerHTML = `
                <div>
                    <h4 style="margin:0; color:#fff;">${escapar(t.nome)}</h4>
                    <p style="font-size:0.75rem; color:#8899a6; margin:2px 0 0 0;">
                        Encerrada em: ${formatarData(t.data_encerramento)} | Faturamento: <strong style="color:#00ff66;">${formatarMoeda(t.faturamento || 0)}</strong> | Patches: ${t.patches_vendidos || 0}
                    </p>
                </div>
                <button class="btn-visualizar-comprovante" style="margin:10px 0 0 0; width:100%;" onclick="verDetalhesTemporadaHistorico('${id}')">🔍 Ver Histórico Detalhado</button>
            `;
            lista.appendChild(div);
        });
    });
}

function verDetalhesTemporadaHistorico(id) {
    database.ref(`historico_temporadas/${id}`).once('value', snapshot => {
        const t = snapshot.val();
        if (!t) return;

        document.getElementById('titulo-temporada-historico-nome').innerText = `Histórico: ${t.nome}`;
        montarKpis(document.getElementById('kpis-temporada-historico'), [
            { rotulo: "Faturamento", valor: formatarMoeda(t.faturamento || 0) },
            { rotulo: "Patches Vendidos", valor: t.patches_vendidos || 0 },
            { rotulo: "Jogadores", valor: t.total_jogadores || 0 }
        ]);

        const containerVendas = document.getElementById('conteudo-vendas-temporada-historico');
        const vendas = t.vendas_por_patch || {};
        const linhas = Object.keys(vendas);
        containerVendas.innerHTML = linhas.length ? `
            <table><thead><tr><th>Patch</th><th>Qtd</th><th>Total</th></tr></thead><tbody>
            ${linhas.map(n => `<tr><td>${escapar(n)}</td><td>${vendas[n].qtd}</td><td>${formatarMoeda(vendas[n].total)}</td></tr>`).join("")}
            </tbody></table>` : `<p class="vazio-lista">Sem vendas registradas nesta temporada.</p>`;

        const containerSugestoes = document.getElementById('conteudo-sugestoes-temporada-historico');
        const sugestoes = t.sugestoes_recebidas || {};
        const sugKeys = Object.keys(sugestoes);
        containerSugestoes.innerHTML = sugKeys.length ? sugKeys.map(sid => {
            const s = sugestoes[sid];
            return `
                <div class="user-item">
                    <p><strong>De:</strong> ${escapar(s.nome_usuario)} (${escapar(s.email_usuario)})</p>
                    <p><strong>Assunto:</strong> ${escapar(s.assunto)}</p>
                    <p style="color:#c0ceda; margin-top:4px;">${escapar(s.texto)}</p>
                </div>
            `;
        }).join("") : `<p class="vazio-lista">Nenhuma sugestão recebida nesta temporada.</p>`;

        document.getElementById('detalhes-temporada-historico-view').style.display = "block";
    });
}

function fecharDetalhesTemporadaHistorico() {
    document.getElementById('detalhes-temporada-historico-view').style.display = "none";
}

// ==========================================================================
// OUTRAS CONFIGURAÇÕES E FORMULÁRIOS
// ==========================================================================
// Inicialização do Painel Admin
function inicializarPainelAdmin() {
    ouvirCardsGlobaisAdmin();
    ouvirEPovoarMenuVisualAdmin();
    ouvirNovidadesAdmin();
    renderizarHistoricoTemporadas();
}

// Seleção de Destinatários Admin
function popularSelectDestinatariosAdmin() {
    const sel = document.getElementById('select-destinatario-admin');
    if (!sel) return;
    sel.innerHTML = `<option value="">Selecione um utilizador...</option>`;
    const usuarios = cacheUsuariosAdmin || {};
    Object.keys(usuarios).forEach(uid => {
        const u = usuarios[uid];
        if (u && u.email !== EMAIL_ADMIN) {
            const opt = document.createElement('option');
            opt.value = uid;
            opt.innerText = `${u.nome} ${u.sobrenome || ''} (${u.email})`;
            sel.appendChild(opt);
        }
    });
}

function ouvirSugestoesAdmin() {
    const lista = document.getElementById('lista-sugestoes-admin');
    if (!lista) return;

    escutar('sugestoes', 'value', snapshot => {
        const data = snapshot.val() || {};
        lista.innerHTML = "";
        const keys = Object.keys(data);
        if (keys.length === 0) {
            lista.innerHTML = `<p class="vazio-lista">Nenhuma sugestão pendente.</p>`;
            return;
        }

        keys.forEach(id => {
            const s = data[id];
            const div = document.createElement('div');
            div.className = 'user-item';
            div.innerHTML = `
                <div class="user-info">
                    <p><strong>Jogador:</strong> ${escapar(s.nome_usuario)} (${escapar(s.email_usuario)})</p>
                    <p><strong>WhatsApp:</strong> ${escapar(s.whatsapp_usuario || 'Não informado')}</p>
                    <p><strong>Assunto:</strong> ${escapar(s.assunto)}</p>
                    <p style="margin-top:6px; color:#fff;">${escapar(s.texto)}</p>
                </div>
                <button class="btn-sair" style="width:100%; margin-top:8px;" onclick="deletarSugestao('${id}')">Excluir Sugestão</button>
            `;
            lista.appendChild(div);
        });
    });
}

function deletarSugestao(id) {
    if (confirm("Excluir esta sugestão?")) {
        database.ref(`sugestoes/${id}`).remove();
    }
}