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
* **Persistência (Banco de Dados)**: Arquitetura Híbrida:
  * **Supabase** (PostgreSQL na nuvem com tabelas de usuários e dados JSONB) se configurado no `.env`.
  * **LocalStorage** do navegador como fallback automático.

---

## 🛠️ Arquitetura e Regras de Negócios Implementadas

### 1. Sistema de Segurança e Autenticação (Login e Usuários)
* **Estrutura de Login**: Tela com validação de usuário e senha atrelada à tabela `users` do Supabase. As senhas são criptografadas localmente via SHA-256 antes de serem salvas/comparadas.
* **Isolamento de Dados**: Os dados financeiros (lançamentos, cartões, metas) são recuperados com base no nome de usuário logado, garantindo privacidade total ("maria" não vê dados de "admin").
* **Perfil Administrador**: O usuário padrão `admin` possui a flag `is_admin: true`.
  * Somente o administrador tem acesso ao menu **Administração**.
  * O administrador cria novos logins (nomes de usuário).
* **Primeiro Acesso**: Novos usuários são criados sem senha (campo `password_hash` nulo). No primeiro login, a aplicação detecta e solicita a criação de uma senha personalizada.
* **Reset de Senha**: O administrador pode resetar a senha de qualquer usuário através de um botão no painel de administração (o que limpa a senha no banco e força o usuário a criar uma nova senha no próximo login).

### 2. Cálculo de Fatura por Ciclo de Fechamento
As despesas do cartão não são contabilizadas pelo mês calendário da transação, mas sim pelo ciclo da fatura:
* **Algoritmo (`invoiceUtils.js`)**: Compara o dia da transação com o `closingDay` (dia de fechamento) do cartão. Se o dia for posterior ao fechamento, a compra é atribuída à fatura do mês seguinte.

### 3. Divisão e Agendamento de Parcelas
* Ao lançar uma compra parcelada, o usuário insere o **Valor Total** e a **Quantidade de Parcelas**.
* O sistema cria $N$ lançamentos distribuídos mês a mês, calculando o valor individual da parcela (`Total / N`).
* A descrição é enriquecida automaticamente: `[Descrição] (Parcela X/N - Total R$ [Total])`.

### 4. Edição e Deleção de Parcelados em Cascata
* As parcelas geradas compartilham um `installmentGroupId`.
* **Edição**: Ao editar qualquer parcela do grupo, o formulário recarrega a compra total original (descrição limpa, valor total e parcelas originais). Ao salvar, as parcelas antigas do grupo são excluídas e re-geradas sob os novos critérios.
* **Exclusão**: O usuário pode optar por excluir apenas a parcela individual daquele mês ou apagar a compra completa (todas as parcelas vinculadas).

---

## 📊 Estrutura de Pastas e Arquivos Principais

* [`src/utils/supabaseClient.js`](file:///home/fabricio/fabricio/controle_financeiro_3/src/utils/supabaseClient.js): Inicializador do cliente Supabase.
* [`src/utils/storage.js`](file:///home/fabricio/fabricio/controle_financeiro_3/src/utils/storage.js): Abstração de persistência assíncrona (Supabase / LocalStorage), incluindo validações de autenticação e gerenciamento de logins.
* [`src/utils/invoiceUtils.js`](file:///home/fabricio/fabricio/controle_financeiro_3/src/utils/invoiceUtils.js): Lógica de cálculo de faturas.
* [`src/components/Login.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/Login.jsx): Formulário de autenticação e redefinição de senhas de primeiro acesso.
* [`src/components/AdminPanel.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/AdminPanel.jsx): Painel do administrador para listagem, criação e reset de usuários.
* [`src/components/CreditCards.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/CreditCards.jsx): Gerenciamento de limites, faturas e parcelas.
* [`src/components/Transactions.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/Transactions.jsx): Lançamento de despesas e receitas.
* [`src/components/Dashboard.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/Dashboard.jsx): Gráficos Recharts e conselhos financeiros baseados no usuário logado.

---

## 📍 Onde Paramos & Próximos Passos

A aplicação está configurada para deploy no **GitHub Pages** e conexão com o **Supabase**, rodando com sucesso localmente. Os próximos passos necessários para o usuário configurar as ferramentas são:

1. **Configuração de Chaves do Banco**:
   - Rodar o script SQL de criação das tabelas `users` e `profiles_data` no painel do Supabase.
2. **Primeiro Acesso**:
   - Acessar o site, digitar `admin` e definir a senha mestra.
   - Pelo painel `Administração`, criar as novas contas para os membros do sistema.
