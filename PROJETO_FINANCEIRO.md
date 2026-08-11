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
  * **Supabase** (PostgreSQL na nuvem com tabela JSONB) se configurado no `.env`.
  * **LocalStorage** do navegador como fallback automático.

---

## 🛠️ Arquitetura e Regras de Negócios Implementadas

### 1. Cálculo de Fatura por Ciclo de Fechamento
As despesas do cartão não são contabilizadas pelo mês calendário da transação, mas sim pelo ciclo da fatura:
* **Algoritmo (`invoiceUtils.js`)**: Compara o dia da transação com o `closingDay` (dia de fechamento) do cartão. Se o dia for posterior ao fechamento, a compra é atribuída à fatura do mês seguinte.
* **Exemplo**: Compra em `11/08/2026` em cartão com fechamento dia `10` entra na fatura de `Setembro/2026`.

### 2. Divisão e Agendamento de Parcelas
* Ao lançar uma compra parcelada, o usuário insere o **Valor Total** e a **Quantidade de Parcelas**.
* O sistema cria $N$ lançamentos distribuídos mês a mês, calculando o valor individual da parcela (`Total / N`).
* A descrição é enriquecida automaticamente: `[Descrição] (Parcela X/N - Total R$ [Total])`.

### 3. Edição e Deleção de Parcelados em Cascata
* As parcelas geradas compartilham um `installmentGroupId`.
* **Edição**: Ao editar qualquer parcela do grupo, o formulário recarrega a compra total original (descrição limpa, valor total e parcelas originais). Ao salvar, as parcelas antigas do grupo são excluídas e re-geradas sob os novos critérios.
* **Exclusão**: O usuário pode optar por excluir apenas a parcela individual daquele mês ou apagar a compra completa (todas as parcelas vinculadas).

---

## 📊 Estrutura de Pastas e Arquivos Principais

* [`src/utils/supabaseClient.js`](file:///home/fabricio/fabricio/controle_financeiro_3/src/utils/supabaseClient.js): Inicializador do cliente Supabase com checagem de integridade das chaves.
* [`src/utils/storage.js`](file:///home/fabricio/fabricio/controle_financeiro_3/src/utils/storage.js): Abstração de persistência assíncrona (Supabase / LocalStorage).
* [`src/utils/invoiceUtils.js`](file:///home/fabricio/fabricio/controle_financeiro_3/src/utils/invoiceUtils.js): Lógica de cálculo de datas e fechamento de faturas.
* [`src/components/CreditCards.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/CreditCards.jsx): Gerenciamento de limites, lançamento rápido com parcelas, histórico consolidado e o **Modal Extrato da Fatura**.
* [`src/components/Transactions.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/Transactions.jsx): Lançamento de receitas e despesas gerais/cartão, filtros, busca e listagem detalhada de itens.
* [`src/components/Dashboard.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/Dashboard.jsx): KPIs financeiros, barras de metas por categorias, gráficos Recharts e recomendações financeiras automáticas baseadas em regras de mercado (ex: regra 50-30-20).
* [`src/components/Profiles.jsx`](file:///home/fabricio/fabricio/controle_financeiro_3/src/components/Profiles.jsx): Troca e criação de perfis/usuários com sincronização de banco de dados independente.

---

## 📍 Onde Paramos & Próximos Passos

A aplicação está configurada para deploy no **GitHub Pages** e conexão com o **Supabase**, rodando com sucesso localmente. Os próximos passos necessários para o usuário configurar as ferramentas são:

1. **Configuração de Chaves do Banco**:
   - Obter URL e Chave Anon no console do Supabase e colar no arquivo `.env`.
   - Executar o script SQL de criação da tabela `profiles_data` (descrito na documentação do projeto).
2. **Configuração do Link do Site**:
   - Acessar o repositório GitHub e configurar o **Pages** para rodar a partir da branch `gh-pages` nas configurações do repositório para tirar o site do erro 404.
3. **Ideias de Melhorias Futuras**:
   - Adicionar autenticação com usuário e senha por perfil (usando o Supabase Auth).
   - Anexar imagens de comprovantes de pagamento usando Supabase Storage.
   - Opção de exportar relatórios de faturas em PDF ou planilha Excel.
