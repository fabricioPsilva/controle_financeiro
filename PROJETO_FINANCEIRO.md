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
* **Persistência (Banco de Dados)**: Arquitetura Híbrida:
  * **Supabase** (PostgreSQL na nuvem com tabelas de usuários e dados JSONB) se configurado no painel da Cloudflare.
  * **LocalStorage** do navegador como fallback automático.

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
  * **Barra de Navegação Inferior (Bottom Tabs)**: No celular, as abas de navegação são fixadas no rodapé da tela com ícones centralizados e visual translúcido limpo, igual a aplicativos nativos.
  * **Cabeçalho Compacto**: O topo exibe um avatar circular com as iniciais do usuário, o mês de referência de forma reduzida e ações rápidas de manual e logout.
  * **Suporte PWA**: Configurado o `manifest.json` e as tags `apple-mobile-web-app-capable` para permitir a instalação do site como aplicativo de tela cheia sem barras do navegador.

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

* [`src/utils/supabaseClient.js`](file:///home/fabricio/fabricio/controle_financeiro_3/src/utils/supabaseClient.js): Inicializador do cliente Supabase.
* [`src/utils/storage.js`](file:///home/fabricio/fabricio/controle_financeiro_3/src/utils/storage.js): Abstração de persistência assíncrona, validações de autenticação e gerenciamento de status de logins, senhas e tours.
* [`src/utils/invoiceUtils.js`](file:///home/fabricio/fabricio/controle_financeiro_3/src/utils/invoiceUtils.js): Lógica de cálculo de faturas.
* [`src/components/Login.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/Login.jsx): Formulário de autenticação, registro e política de senhas.
* [`src/components/AdminPanel.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/AdminPanel.jsx): Painel do administrador para listagem, criação, inativação, solicitações pendentes e vencimentos.
* [`src/components/CreditCards.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/CreditCards.jsx): Gerenciamento de limites, faturas e parcelas.
* [`src/components/Transactions.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/Transactions.jsx): Lançamento de despesas e receitas com visualização dupla (desktop/mobile) e controle de repetição.
* [`src/components/Dashboard.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/Dashboard.jsx): Gráficos Recharts e conselhos financeiros baseados no usuário logado.

---

## 📍 Onde Paramos & Próximos Passos

A aplicação está configurada e rodando no **Cloudflare Pages** com conexão direta ao **Supabase**. Os próximos passos são:

1. **Testar no Celular**:
   - Abrir o site no celular e selecionar "Adicionar à Tela de Início" no navegador (Safari no iPhone ou Chrome no Android).
   - Abrir a aplicação através do ícone gerado para desfrutar da experiência em tela cheia idêntica a de um aplicativo de verdade!
