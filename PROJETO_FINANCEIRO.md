# Especificações e Progresso do Sistema de Controle Financeiro

Este documento serve como um guia completo do estado atual da aplicação de controle financeiro para que qualquer sessão de desenvolvimento futura possa retomar o trabalho exatamente de onde paramos.

---

## 🚀 Visão Geral do Projeto

Um sistema moderno de controle financeiro pessoal e familiar com suporte a múltiplos perfis locais/nuvem, planejamento de metas de gastos, controle avançado de limites e faturas de cartões de crédito e painéis estatísticos.

### Stack Tecnológica
* **Frontend**: React 19 (com Vite)
* **Estilização**: CSS Vanilla (Design Premium escuro com glassmorfismo)
* **Gráficos**: Recharts
* **Ícones**: Lucide React
* **Hospedagem & Deploy**: **Cloudflare Pages** (Deploy automático contínuo via GitHub ao fazer push na branch `main`)
* **URL de Produção**: `https://controle-financeiro-9h1.pages.dev/`
* **Persistência (Banco de Dados)**: Arquitetura Híbrida:
  * **Supabase** (PostgreSQL na nuvem com tabelas de usuários e dados JSONB) se configurado no painel da Cloudflare.
  * **LocalStorage** do navegador como fallback automático.
* **Credenciais Supabase**: As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão configuradas diretamente nas configurações do projeto no painel da Cloudflare Pages (não estão no código-fonte).

---

## 🛠️ Arquitetura e Regras de Negócios Implementadas

### 1. Sistema de Segurança e Autenticação (Login e Usuários)
* **Estrutura de Login**: Tela com validação de usuário e senha atrelada à tabela `users` do Supabase. As senhas são criptografadas localmente via SHA-256 antes de serem salvas/comparadas.
* **Isolamento de Dados**: Os dados financeiros (lançamentos, cartões, metas) são recuperados com base no nome de usuário logado, garantindo privacidade total.
* **Perfil Administrador**: O usuário padrão `admin` possui a flag `is_admin: true`.
  * Somente o administrador tem acesso ao menu **Administração**.
  * O administrador cria novos logins (nomes de usuário).
* **Ativação / Inativação de Contas**: O administrador pode inativar ou reativar qualquer conta no painel de administração.
  * Usuários inativos são bloqueados na tela de login e não conseguem acessar o sistema.
  * **Preservação de Dados**: Ao inativar uma conta, todos os dados financeiros do usuário são integralmente mantidos no banco de dados (não há exclusão de registros).
* **Primeiro Acesso**: Novos usuários são criados sem senha (campo `password_hash` nulo). No primeiro login, a aplicação detecta e solicita a criação de uma senha personalizada.
* **Reset de Senha**: O administrador pode resetar a senha de qualquer usuário através de um botão no painel de administração (o que limpa a senha no banco e força o usuário a criar uma nova senha no próximo login).
* **Políticas de Senha Forte**: Exigência de no mínimo 8 caracteres, uma letra maiúscula e um caractere especial para cadastro de novas senhas.
* **Auto-Cadastro (Solicitação de Acesso)**: Novos usuários podem se cadastrar diretamente na tela de login através da aba "Solicitar Acesso". O cadastro é criado com `is_pending: true` e requer aprovação do administrador antes de ser ativado.
* **Expiração de Contas**: O administrador pode definir uma `expiration_date` (data de validade) para cada conta. Após essa data, o sistema automaticamente inativa o usuário e bloqueia seu login, informando a data exata da expiração.
* **Login por Biometria (WebAuthn)** *(Somente Mobile)*: Suporte a login nativo usando digitais, reconhecimento facial (FaceID/TouchID) ou biometria de sistema operacional através da API WebAuthn.
  * **Registro**: Após o primeiro login com senha em um dispositivo móvel compatível, o usuário é convidado a registrar a biometria local.
  * **Autenticação**: O login pode ser efetuado tocando em **"Entrar com Biometria"**, sem necessidade de redigitar a senha.
  * **Memória de Usuário**: O último usuário logado é salvo no `localStorage` do dispositivo. Ao reabrir o sistema, o campo de usuário já vem preenchido e o botão de biometria aparece imediatamente, permitindo login com um único toque.
  * **Trocar Conta**: Link "Entrar com outro usuário" para limpar o campo pré-preenchido e permitir outro login manual.
  * **Restrição ao Desktop**: A biometria foi restrita exclusivamente para dispositivos móveis (Android/iOS). No desktop, o login é sempre por senha.

### 2. Controle de Usuários Escalável (Painel de Administração)
* **Barra de Pesquisa**: Adicionada busca em tempo real por nome de usuário para facilitar a localização em bancos de dados com muitos registros.
* **Filtros Avançados**: Possibilidade de filtrar a listagem por status de conta (Ativos / Inativos) e por cargo/função (Administradores / Usuários Padrão).
* **Tabela com Rolagem**: A listagem de usuários foi encapsulada em um wrapper com altura máxima fixa (`maxHeight: 350px`) e rolagem vertical interna, impedindo que uma grande quantidade de usuários empurre o layout da página para baixo indefinidamente.
* **Métricas**: Exibição da quantidade de usuários filtrados vs total cadastrado.
* **Solicitações de Acesso & Expiração**: Gerenciamento de novos cadastros de usuários que chegam com status pendente (`is_pending: true`). O administrador pode aprovar a entrada definindo uma data opcional de expiração da conta, após a qual a conta é automaticamente inativada e bloqueada no login.

### 3. Tour Interativo (Onboarding de Novos Usuários)
* **Holofote Dinâmico**: Ao logar pela primeira vez, um tour guiado é iniciado, escurecendo a tela e destacando os componentes-chave passo a passo com contornos e balões informativos de ajuda.
* **Navegação Autônoma**: O tour realiza as transições de abas de forma automática e mede as coordenadas dinamicamente na tela para posicionar os balões perfeitamente.
* **Persistência no Banco de Dados**: A conclusão ou cancelamento do tour é registrada no campo `tour_done` da tabela `users` do Supabase. Isso impede que o tour reapareça caso o usuário limpe o cache do navegador.
* **Replay Manual**: O tour pode ser reiniciado a qualquer momento clicando no botão **Manual** no cabeçalho do site.

### 4. Visualização Mobile Otimizada (Mobile UX & PWA)
* **Visualização por Cartões (Cards)**: Em viewports móveis (< 768px), as tabelas de lançamentos são ocultadas e convertidas para uma exibição de cartões individuais (estilo carteira digital).
* **Empilhamento de Grid**: Todos os formulários e filtros de pesquisa se reorganizam automaticamente em uma única coluna no celular, evitando rolagens horizontais.
* **Visual Nativo de Aplicativo**:
  * **Barra de Navegação Inferior (Bottom Tabs)**: No celular, as abas de navegação são fixadas no rodapé da tela com ícones centralizados e visual translúcido limpo, igual a aplicativos nativos. Estilizada com `backdrop-filter: blur(20px)` e sombra superior.
  * **Cabeçalho Compacto (Header Mobile)**: O topo exibe um avatar circular com as iniciais do usuário, o mês de referência de forma reduzida (`MM/AAAA`) e ações rápidas de manual e logout. O cabeçalho desktop é ocultado em telas menores que 768px.
  * **Suporte PWA**: Configurado o `manifest.json` (`public/manifest.json`) e as tags `apple-mobile-web-app-capable` e `theme-color` no `index.html` para permitir a instalação do site como aplicativo de tela cheia sem barras do navegador.
  * **Prompts Inteligentes de Instalação**: Banner roxo com botão "Instalar" para Android (usando `beforeinstallprompt` API) e balão explicativo no iOS que orienta o usuário a usar o menu de compartilhar do Safari para instalar. Ambos os banners podem ser dispensados com o botão X e a escolha é salva no `localStorage`.
  * **Viewport Seguro**: Aplicado `padding-top: 70px` e `padding-bottom: 80px` no `.app-container` para garantir que nenhum conteúdo fique oculto atrás das barras fixas.

### 5. Lançamento com Frequência de "Assinatura"
* **Opção de Assinatura**: Adicionada a opção "Assinatura / Mensalidade (Fixo no Cartão)" na frequência de repetição.
* **Comportamento**: Funciona de forma recorrente (como um gasto fixo mensal), mas atrelada ao fluxo de faturamento do cartão de crédito físico selecionado, exibindo a tag **Assinatura** na listagem de lançamentos desktop e mobile.

### 6. Cálculo de Fatura por Ciclo de Fechamento
As despesas do cartão não são contabilizadas pelo mês calendário da transação, mas sim pelo ciclo da fatura:
* **Algoritmo (`invoiceUtils.js`)**: Compara o dia da transação com o `closingDay` (dia de fechamento) do cartão. Se o dia for posterior ao fechamento, a compra é atribuída à fatura do mês seguinte.

### 7. Divisão e Agendamento de Parcelas
* Ao lançar uma compra parcelada, o usuário insere o **Valor Total** e a **Quantidade de Parcelas**.
* O sistema cria $N$ lançamentos distribuídos mês a mês, calculando o valor individual da parcela (`Total / N`).
* A descrição é enriquecida automaticamente: `[Descrição] (Parcela X/N - Total R$ [Total])`.

### 8. Edição e Deleção de Parcelados em Cascata
* As parcelas geradas compartilham um `installmentGroupId`.
* **Edição**: Ao editar qualquer parcela do grupo, o formulário recarrega a compra total original (descrição limpa, valor total e parcelas originais). Ao salvar, as parcelas antigas do grupo são excluídas e re-geradas sob os novos critérios.
* **Exclusão**: O usuário pode optar por excluir apenas a parcela individual daquele mês ou apagar a compra completa (todas as parcelas vinculadas).

---

## 📊 Estrutura de Pastas e Arquivos Principais

* [`index.html`](file:///home/fabricio/fabricio/controle_financeiro_3/index.html): Configurado com meta tags de PWA (`manifest`, `apple-mobile-web-app-capable`, `theme-color`), título "Finanças Hub" e zoom desabilitado (`user-scalable=no`).
* [`public/manifest.json`](file:///home/fabricio/fabricio/controle_financeiro_3/public/manifest.json): Web App Manifest para instalação PWA com `display: standalone` e cores do tema (`#0b0f19`).
* [`vite.config.js`](file:///home/fabricio/fabricio/controle_financeiro_3/vite.config.js): Configuração Vite com `base: '/'` (Cloudflare Pages).
* [`src/App.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/App.jsx): Shell principal com cabeçalho desktop (`header-desktop`) e mobile (`header-mobile`) separados, navegação por abas, prompts de instalação PWA (Android/iOS), modal de manual e tour interativo.
* [`src/index.css`](file:///home/fabricio/fabricio/controle_financeiro_3/src/index.css): Folha de estilos principal com design system (variáveis CSS), estilos base, media query para mobile (< 768px) com `.header-desktop` oculto, `.header-mobile` fixo no topo, `.nav-tabs` fixo no rodapé como bottom navigation bar.
* [`src/utils/supabaseClient.js`](file:///home/fabricio/fabricio/controle_financeiro_3/src/utils/supabaseClient.js): Inicializador do cliente Supabase.
* [`src/utils/storage.js`](file:///home/fabricio/fabricio/controle_financeiro_3/src/utils/storage.js): Abstração de persistência assíncrona com funções de login (`loginUser`, `loginUserWithBiometrics`), registro de senha (`registerUserPassword`), autocadastro (`registerSelfUser`), aprovação (`approveUserRequest`), e gerenciamento de status de logins, senhas, biometrias e tours.
* [`src/utils/invoiceUtils.js`](file:///home/fabricio/fabricio/controle_financeiro_3/src/utils/invoiceUtils.js): Lógica de cálculo de faturas por ciclo de fechamento.
* [`src/components/Login.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/Login.jsx): Formulário de autenticação (login/signup/primeiro acesso), política de senhas fortes, autenticação biométrica WebAuthn (somente mobile), memória do último usuário logado e modal de ativação da biometria.
* [`src/components/AdminPanel.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/AdminPanel.jsx): Painel do administrador com listagem paginada, criação de usuários, inativação, solicitações de acesso pendentes, campo de data de vencimento (expiração) e reset de senhas.
* [`src/components/CreditCards.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/CreditCards.jsx): Gerenciamento de limites, faturas e parcelas de cartões de crédito.
* [`src/components/Transactions.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/Transactions.jsx): Lançamento de despesas e receitas com visualização dupla (desktop/mobile), controle de repetição e tag de assinatura.
* [`src/components/Dashboard.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/Dashboard.jsx): Gráficos Recharts, conselhos financeiros baseados no usuário logado, personalização de metas com campos de porcentagem ajustados para mobile.
* [`src/components/InteractiveTour.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/InteractiveTour.jsx): Tour guiado interativo de onboarding com holofote dinâmico.

---

## 🗄️ Estrutura do Banco de Dados (Supabase)

### Tabela `users`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `username` | text (PK) | Nome de login do usuário |
| `password_hash` | text | Hash SHA-256 da senha (nulo = primeiro acesso) |
| `is_admin` | boolean | Flag de administrador |
| `is_active` | boolean | Se a conta está ativa |
| `is_pending` | boolean | Se o autocadastro aguarda aprovação |
| `expiration_date` | date | Data de expiração da conta (nulo = sem validade) |
| `tour_done` | boolean | Se o tour de onboarding foi concluído |

### Tabela `profiles_data`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `profile_name` | text (PK) | Nome do perfil (= username) |
| `data` | jsonb | Objeto JSON contendo `transactions`, `creditCards` e `budgetConfig` |
| `updated_at` | timestamptz | Data da última atualização |

---

## 🔑 Chaves do LocalStorage Utilizadas

| Chave | Descrição |
|-------|-----------|
| `fin_last_username` | Último usuário logado (para preenchimento automático na tela de login) |
| `fin_bio_reg_{username}` | Flag indicando que a biometria foi registrada para este usuário neste dispositivo |
| `fin_bio_cred_id_{username}` | ID da credencial WebAuthn (base64) para autenticação biométrica |
| `fin_pwa_dismissed` | Flag indicando que o banner de instalação PWA do Android foi dispensado |
| `fin_pwa_ios_dismissed` | Flag indicando que o balão de instalação PWA do iOS foi dispensado |
| `fin_active_profile` | Perfil ativo no momento |
| `fin_data_{username}` | Dados financeiros em cache local (fallback se Supabase indisponível) |

---

## 📍 Onde Paramos & Próximos Passos

A aplicação está configurada e rodando no **Cloudflare Pages** com conexão direta ao **Supabase**. Todas as funcionalidades descritas acima estão implementadas e publicadas.

### Status Atual (Agosto 2026):
* ✅ Sistema de login com senha forte e biometria (mobile)
* ✅ Auto-cadastro com aprovação do admin e expiração de contas
* ✅ Visual de aplicativo nativo no celular (PWA + Bottom Navigation)
* ✅ Prompts inteligentes de instalação (Android + iOS)
* ✅ Dashboard com metas personalizáveis
* ✅ Controle de cartões e faturas por ciclo
* ✅ Lançamentos com assinatura, parcelamento e edição em cascata
* ✅ Tour interativo de onboarding
* ✅ Deploy automático contínuo via GitHub → Cloudflare Pages
