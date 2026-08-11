export const getExpertSuggestions = (transactions, creditCards, budgetConfig) => {
  const suggestions = [];
  
  // 1. Calculate Totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
    
  const totalEssential = transactions
    .filter(t => t.type === 'essential')
    .reduce((sum, t) => sum + Number(t.amount), 0);
    
  const totalVariable = transactions
    .filter(t => t.type === 'variable')
    .reduce((sum, t) => sum + Number(t.amount), 0);
    
  const totalExpenses = totalEssential + totalVariable;
  const actualSavings = Math.max(0, totalIncome - totalExpenses);
  
  // Percentages relative to total income (if income > 0)
  const incomeRef = totalIncome > 0 ? totalIncome : (totalExpenses || 1);
  const pctEssential = (totalEssential / incomeRef) * 100;
  const pctVariable = (totalVariable / incomeRef) * 100;
  const pctSavings = (actualSavings / incomeRef) * 100;

  // Find standard goals in budget list or use defaults
  const isConfigArray = Array.isArray(budgetConfig);
  const essentialTarget = isConfigArray ? (budgetConfig.find(g => g.id === 'essential')?.target ?? 50) : 50;
  const variableTarget = isConfigArray ? (budgetConfig.find(g => g.id === 'variable')?.target ?? 30) : 30;
  const savingsTarget = isConfigArray ? (budgetConfig.find(g => g.id === 'savings')?.target ?? 20) : 20;

  // 2. Budget Target suggestions (e.g., 50/30/20 compliance)
  if (pctEssential > essentialTarget) {
    suggestions.push({
      type: 'warning',
      category: 'essential',
      title: 'Despesas Essenciais Acima do Planejado',
      message: `Suas despesas essenciais representam ${pctEssential.toFixed(1)}% da sua renda, superando o objetivo de ${essentialTarget}%.`,
      tip: 'Considere renegociar contratos (internet, seguros), economizar consumo de energia/água, ou revisar compras de supermercado com marcas alternativas.'
    });
  } else if (totalIncome > 0) {
    suggestions.push({
      type: 'success',
      category: 'essential',
      title: 'Despesas Essenciais sob Controle',
      message: `Parabéns! Suas despesas essenciais estão em ${pctEssential.toFixed(1)}%, dentro da sua meta de ${essentialTarget}%.`,
      tip: 'Mantenha esse nível de controle para garantir a saúde das suas contas básicas.'
    });
  }

  if (pctVariable > variableTarget) {
    suggestions.push({
      type: 'warning',
      category: 'variable',
      title: 'Gastos Variáveis Elevados',
      message: `Você gastou ${pctVariable.toFixed(1)}% em despesas não essenciais, ultrapassando os ${variableTarget}% planejados.`,
      tip: 'Especialistas recomendam criar uma "mesada" semanal para lazer. Tente reduzir saídas para jantar ou assinaturas que você usa pouco.'
    });
  } else if (totalIncome > 0 && totalVariable > 0) {
    suggestions.push({
      type: 'success',
      category: 'variable',
      title: 'Lazer e Supérfluos Equilibrados',
      message: `Seus gastos não essenciais (${pctVariable.toFixed(1)}%) estão alinhados com o limite de ${variableTarget}%.`,
      tip: 'Você está conseguindo aproveitar a vida sem comprometer suas finanças futuras.'
    });
  }

  if (pctSavings < savingsTarget && totalIncome > 0) {
    suggestions.push({
      type: 'danger',
      category: 'savings',
      title: 'Poupança Abaixo da Meta',
      message: `Sua taxa de poupança atual é de ${pctSavings.toFixed(1)}%, abaixo da sua meta de ${savingsTarget}%.`,
      tip: 'Dica de Especialista: "Pague-se primeiro". Programe uma transferência automática para seus investimentos/poupança logo no dia do pagamento.'
    });
  } else if (totalIncome > 0) {
    suggestions.push({
      type: 'success',
      category: 'savings',
      title: 'Excelente Taxa de Poupança',
      message: `Você está poupando ${pctSavings.toFixed(1)}% da sua renda, batendo sua meta de ${savingsTarget}%.`,
      tip: 'Continue assim! Esse hábito acelera sua independência financeira ou conquista de objetivos de médio/longo prazo.'
    });
  }

  // 3. Credit Card Suggestions
  creditCards.forEach(card => {
    const cardExpenses = transactions
      .filter(t => t.cardId === card.id)
      .reduce((sum, t) => sum + Number(t.amount), 0);
      
    const utilizationPct = card.limit > 0 ? (cardExpenses / card.limit) * 100 : 0;
    
    if (utilizationPct > 30) {
      suggestions.push({
        type: 'warning',
        category: 'credit_card',
        title: `Alta Utilização do Cartão ${card.name}`,
        message: `Você já utilizou ${utilizationPct.toFixed(1)}% do limite de R$ ${card.limit}. (R$ ${cardExpenses.toFixed(2)} gastos).`,
        tip: 'Especialistas recomendam manter o uso do cartão abaixo de 30% do limite para evitar endividamento excessivo e manter um bom score de crédito. Se possível, antecipe o pagamento ou use débito.'
      });
    }
  });

  // 4. Emergency Reserve suggestions
  const monthlyCost = totalEssential > 0 ? totalEssential : 2000;
  const targetReserve = monthlyCost * 6;
  const currentReserve = actualSavings;
  
  if (totalIncome > 0) {
    suggestions.push({
      type: 'info',
      category: 'reserve',
      title: 'Reserva de Emergência',
      message: `Sua reserva ideal (6 meses de custo essencial) é de R$ ${targetReserve.toFixed(2)}.`,
      tip: 'Esta reserva deve estar investida em ativos de alta liquidez e baixo risco (como Tesouro Selic ou CDB de liquidez diária) e serve para imprevistos como perda de renda ou saúde.'
    });
  }

  // If no transactions yet
  if (transactions.length === 0) {
    suggestions.push({
      type: 'info',
      category: 'general',
      title: 'Bem-vindo ao Controle Financeiro!',
      message: 'Comece adicionando suas receitas e despesas essenciais.',
      tip: 'Uma boa prática recomendada por especialistas é o método 50/30/20: 50% para necessidades, 30% para desejos e 20% para poupança.'
    });
  }

  return suggestions;
};
