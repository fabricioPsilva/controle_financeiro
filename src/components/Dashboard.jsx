import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Sliders, 
  Sparkles,
  Info,
  Plus,
  Trash2,
  X,
  CreditCard as CardIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { getExpertSuggestions } from '../utils/financeAdvisor';
import { getInvoiceMonth } from '../utils/invoiceUtils';

export default function Dashboard({ profileData, onUpdateProfileData, selectedMonth }) {
  const { transactions = [], creditCards = [], budgetConfig = [] } = profileData;

  // Local state to edit target percentages and add new goals
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editingMetas, setEditingMetas] = useState([]);
  
  // New custom goal form state
  const [newMetaLabel, setNewMetaLabel] = useState('');
  const [newMetaTarget, setNewMetaTarget] = useState('');
  const [newMetaMatchType, setNewMetaMatchType] = useState('category'); // category, tag
  const [newMetaMatchValue, setNewMetaMatchValue] = useState('');

  // 1. Filter and project transactions for the SELECTED MONTH
  const activeTransactions = [];
  transactions.forEach(t => {
    let tMonth = t.date.substring(0, 7);
    if (t.cardId) {
      const card = creditCards.find(c => c.id === t.cardId);
      if (card) {
        tMonth = getInvoiceMonth(t.date, card.closingDay);
      }
    }

    if (t.recurrenceType === 'fixed') {
      if (selectedMonth >= tMonth) {
        activeTransactions.push({
          ...t,
          date: `${selectedMonth}-${t.date.substring(8, 10)}`
        });
      }
    } else {
      if (tMonth === selectedMonth) {
        activeTransactions.push(t);
      }
    }
  });

  // Calculate Totals
  const totalIncome = activeTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalEssential = activeTransactions
    .filter(t => t.type === 'essential')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalVariable = activeTransactions
    .filter(t => t.type === 'variable')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = totalEssential + totalVariable;
  const currentBalance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (Math.max(0, currentBalance) / totalIncome) * 100 : 0;

  const refIncome = totalIncome > 0 ? totalIncome : (totalExpenses || 1);
  const actualEssentialPct = (totalEssential / refIncome) * 100;
  const actualVariablePct = (totalVariable / refIncome) * 100;

  const safeBudgetConfig = Array.isArray(budgetConfig) ? budgetConfig : [];

  // 2. Compute dynamic actual spent for all metas
  const goalsWithActuals = safeBudgetConfig.map(goal => {
    let actualAmount = 0;
    
    if (goal.matchType === 'type') {
      if (goal.matchValue === 'essential') {
        actualAmount = totalEssential;
      } else if (goal.matchValue === 'variable') {
        actualAmount = totalVariable;
      } else if (goal.matchValue === 'savings') {
        actualAmount = Math.max(0, currentBalance);
      }
    } else if (goal.matchType === 'category') {
      actualAmount = activeTransactions
        .filter(t => t.category === goal.matchValue && t.type !== 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
    } else if (goal.matchType === 'tag') {
      actualAmount = activeTransactions
        .filter(t => t.tags.includes(goal.matchValue.toLowerCase().trim()) && t.type !== 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
    }

    const actualPct = (actualAmount / refIncome) * 100;

    return {
      ...goal,
      actualAmount,
      actualPct
    };
  });

  // 3. Category Breakdown Data for Pie Chart
  const categoriesMap = {};
  activeTransactions
    .filter(t => t.type !== 'income')
    .forEach(t => {
      categoriesMap[t.category] = (categoriesMap[t.category] || 0) + Number(t.amount);
    });

  const categoryChartData = Object.keys(categoriesMap).map(name => ({
    name,
    value: categoriesMap[name]
  })).sort((a, b) => b.value - a.value);

  const CATEGORY_COLORS = ['#6366f1', '#0ea5e9', '#f43f5e', '#10b981', '#f59e0b', '#d946ef', '#8b5cf6', '#ec4899'];

  // 4. Monthly Evolution Data
  const monthlyMap = {};
  transactions.forEach(t => {
    const monthStr = t.date.substring(0, 7);
    if (!monthlyMap[monthStr]) {
      monthlyMap[monthStr] = { month: monthStr, receitas: 0, essenciais: 0, variaveis: 0 };
    }
    if (t.type === 'income') {
      monthlyMap[monthStr].receitas += Number(t.amount);
    } else if (t.type === 'essential') {
      monthlyMap[monthStr].essenciais += Number(t.amount);
    } else if (t.type === 'variable') {
      monthlyMap[monthStr].variaveis += Number(t.amount);
    }
  });

  if (!monthlyMap[selectedMonth]) {
    monthlyMap[selectedMonth] = { month: selectedMonth, receitas: 0, essenciais: 0, variaveis: 0 };
  }

  const monthlyChartData = Object.keys(monthlyMap)
    .sort()
    .map(m => {
      const [year, month] = m.split('-');
      const monthsName = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return {
        label: `${monthsName[parseInt(month) - 1]}/${year.substring(2)}`,
        Receitas: monthlyMap[m].receitas,
        Essenciais: monthlyMap[m].essenciais,
        Variáveis: monthlyMap[m].variaveis
      };
    });

  // 5. Credit Card Specific Spent Breakdown Calculations
  const totalCardsSpent = activeTransactions
    .filter(t => t.cardId)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const cardsBreakdown = creditCards.map(card => {
    const spent = activeTransactions
      .filter(t => t.cardId === card.id)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const pct = totalCardsSpent > 0 ? (spent / totalCardsSpent) * 100 : 0;
    return {
      ...card,
      spent,
      pct
    };
  }).filter(c => c.spent > 0);

  // 6. Metas Customization flow
  const startEditing = () => {
    setEditingMetas(safeBudgetConfig.map(g => ({ ...g })));
    setIsEditingBudget(true);
  };

  const handleUpdateEditingTarget = (id, newTarget) => {
    setEditingMetas(editingMetas.map(g => {
      if (g.id === id) {
        return { ...g, target: Number(newTarget) };
      }
      return g;
    }));
  };

  const handleAddCustomGoal = (e) => {
    e.preventDefault();
    if (!newMetaLabel.trim() || !newMetaTarget || !newMetaMatchValue.trim()) return;

    const newGoal = {
      id: `custom_${Date.now()}`,
      label: newMetaLabel.trim(),
      target: Number(newMetaTarget),
      matchType: newMetaMatchType,
      matchValue: newMetaMatchValue.trim()
    };

    setEditingMetas([...editingMetas, newGoal]);

    setNewMetaLabel('');
    setNewMetaTarget('');
    setNewMetaMatchValue('');
  };

  const handleDeleteEditingGoal = (id) => {
    setEditingMetas(editingMetas.filter(g => g.id !== id));
  };

  const cancelEditBudget = () => {
    setEditingMetas(safeBudgetConfig.map(g => ({ ...g })));
    setIsEditingBudget(false);
  };

  const handleSaveBudget = (e) => {
    e.preventDefault();
    const sum = editingMetas.reduce((acc, g) => acc + Number(g.target), 0);
    if (sum !== 100) {
      alert(`As porcentagens devem somar exatamente 100%. Soma atual: ${sum}%`);
      return;
    }
    onUpdateProfileData({
      ...profileData,
      budgetConfig: editingMetas
    });
    setIsEditingBudget(false);
  };

  // Get Suggestions
  const suggestions = getExpertSuggestions(activeTransactions, creditCards, safeBudgetConfig);

  const [yearStr, monthStr] = selectedMonth.split('-');
  const monthsNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const formattedMonthName = `${monthsNames[parseInt(monthStr) - 1]} de ${yearStr}`;

  const allCategories = [
    'Salário', 'Investimentos', 'Extras', 'Moradia/Aluguel', 'Supermercado',
    'Saúde/Convênio', 'Educação', 'Contas (Água/Luz)', 'Transporte',
    'Restaurante/Lanches', 'Lazer/Viagens', 'Assinaturas/Streaming', 'Compras/Roupas',
    'Outros Supérfluos', 'Outros'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Banner */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'var(--color-primary-light)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Visualizando Finanças de: {formattedMonthName}</h2>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {activeTransactions.length} movimentações no período (incluindo fixos e parcelados)
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-4">
        <div className="card kpi-card">
          <div className="kpi-header">
            <span>Renda Total</span>
            <TrendingUp size={20} style={{ color: 'var(--color-income)' }} />
          </div>
          <div className="kpi-value" style={{ color: 'var(--color-income)' }}>
            R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="kpi-sub">Total de entradas no período</span>
        </div>

        <div className="card kpi-card">
          <div className="kpi-header">
            <span>Despesas Essenciais</span>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-essential)' }}></div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--color-essential)' }}>
            R$ {totalEssential.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="kpi-sub">{actualEssentialPct.toFixed(1)}% do orçamento</span>
        </div>

        <div className="card kpi-card">
          <div className="kpi-header">
            <span>Gastos Variáveis</span>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-variable)' }}></div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--color-variable)' }}>
            R$ {totalVariable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="kpi-sub">{actualVariablePct.toFixed(1)}% do orçamento</span>
        </div>

        <div className="card kpi-card">
          <div className="kpi-header">
            <span>Saldo / Poupança</span>
            <TrendingDown size={20} style={{ color: currentBalance >= 0 ? 'var(--color-savings)' : 'var(--color-danger)' }} />
          </div>
          <div className="kpi-value" style={{ color: currentBalance >= 0 ? 'var(--color-savings)' : 'var(--color-danger)' }}>
            R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="kpi-sub">Taxa de poupança: {savingsRate.toFixed(1)}%</span>
        </div>
      </div>

      {/* Target Metas panel */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Personalização de Metas de Gastos</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Acompanhamento de alocação por tipo de gasto, categoria ou tag</p>
          </div>
          {!isEditingBudget ? (
            <button className="btn btn-secondary" onClick={startEditing} style={{ padding: '8px 14px', fontSize: '13px' }}>
              <Sliders size={14} /> Personalizar Metas
            </button>
          ) : null}
        </div>

        {isEditingBudget ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
            
            <form onSubmit={handleAddCustomGoal} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> Adicionar Nova Meta Customizada</h3>
              
              <div className="grid grid-4" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Nome da Meta</label>
                  <input 
                    type="text" 
                    value={newMetaLabel} 
                    onChange={(e) => setNewMetaLabel(e.target.value)} 
                    placeholder="Ex: Educação, Mercado" 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Meta (%)</label>
                  <input 
                    type="number" 
                    value={newMetaTarget} 
                    onChange={(e) => setNewMetaTarget(e.target.value)} 
                    placeholder="Ex: 10" 
                    min="1" max="100" 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Critério de Busca</label>
                  <select value={newMetaMatchType} onChange={(e) => setNewMetaMatchType(e.target.value)}>
                    <option value="category">Por Categoria</option>
                    <option value="tag">Por Tag</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>{newMetaMatchType === 'category' ? 'Categoria' : 'Tag'}</label>
                  {newMetaMatchType === 'category' ? (
                    <select value={newMetaMatchValue} onChange={(e) => setNewMetaMatchValue(e.target.value)} required>
                      <option value="">Selecione...</option>
                      {allCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={newMetaMatchValue} 
                      onChange={(e) => setNewMetaMatchValue(e.target.value)} 
                      placeholder="Ex: viagem" 
                      required 
                    />
                  )}
                </div>
              </div>
              
              <button type="submit" className="btn btn-secondary" style={{ marginTop: '12px', width: '100%', fontSize: '13px', padding: '8px' }}>
                Incluir Meta na Lista
              </button>
            </form>

            <form onSubmit={handleSaveBudget}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Ajustar Porcentagens (Deve somar 100%)</h4>
                {editingMetas.map((g) => (
                  <div key={g.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ flex: 2 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{g.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Filtro: {g.matchType === 'type' ? 'Tipo de Transação' : g.matchType === 'category' ? `Categoria: ${g.matchValue}` : `Tag: ${g.matchValue}`}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <input 
                        type="number" 
                        value={g.target} 
                        onChange={(e) => handleUpdateEditingTarget(g.id, e.target.value)}
                        min="0" max="100" required 
                        style={{ padding: '6px 12px', textAlign: 'right' }}
                      />
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>%</span>
                    </div>

                    <div style={{ width: '40px', display: 'flex', justifyContent: 'flex-end' }}>
                      {g.id !== 'essential' && g.id !== 'variable' && g.id !== 'savings' ? (
                        <button 
                          type="button" 
                          onClick={() => handleDeleteEditingGoal(g.id)} 
                          className="btn btn-secondary" 
                          style={{ padding: '6px', color: 'var(--color-danger)', border: 'none', background: 'none' }}
                          title="Remover Meta"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', color: editingMetas.reduce((acc, g) => acc + Number(g.target), 0) === 100 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  Soma Total: {editingMetas.reduce((acc, g) => acc + Number(g.target), 0)}% (Meta: 100%)
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={cancelEditBudget}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Salvar Metas</button>
                </div>
              </div>
            </form>
          </div>
        ) : null}

        {/* Visual trackers for all configurations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {goalsWithActuals.map(goal => {
            const isSavings = goal.matchType === 'type' && goal.matchValue === 'savings';
            
            let barColor = 'var(--color-primary)';
            if (goal.id === 'essential') barColor = 'var(--color-essential)';
            else if (goal.id === 'variable') barColor = 'var(--color-variable)';
            else if (goal.id === 'savings') barColor = 'var(--color-savings)';
            else barColor = '#a855f7';

            return (
              <div key={goal.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: barColor }}></div>
                    {goal.label}
                  </span>
                  <span>
                    Real: {goal.actualPct.toFixed(1)}% / Meta: {goal.target}%
                  </span>
                </div>
                <div className="progress-bar-container" style={{ height: '10px' }}>
                  <div 
                    className="progress-bar" 
                    style={{ 
                      width: `${Math.min(100, goal.actualPct)}%`,
                      background: barColor
                    }} 
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>Gasto/Saldo Real: R$ {goal.actualAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span>
                    {isSavings ? (
                      goal.actualPct >= goal.target ? (
                        <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '2px' }}><CheckCircle size={10} /> Meta poupança atingida!</span>
                      ) : (
                        <span style={{ color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '2px' }}><AlertTriangle size={10} /> Poupança abaixo da meta</span>
                      )
                    ) : (
                      goal.actualPct <= goal.target ? (
                        <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '2px' }}><CheckCircle size={10} /> Dentro do limite</span>
                      ) : (
                        <span style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '2px' }}><AlertTriangle size={10} /> Acima do limite configurado</span>
                      )
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Graphs */}
      <div className="grid grid-2">
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Distribuição por Categoria ({formattedMonthName})</h2>
          {categoryChartData.length === 0 ? (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Nenhum gasto registrado para exibir categorias neste mês.
            </div>
          ) : (
            <div style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ background: '#1e293b', borderColor: 'var(--border-color)' }}
                  />
                  <Legend layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Evolução de Contas por Mês</h2>
          {monthlyChartData.length === 0 ? (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Insira transações para ver o histórico mensal.
            </div>
          ) : (
            <div style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip 
                    formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                    contentStyle={{ background: '#1e293b', borderColor: 'var(--border-color)' }}
                  />
                  <Legend />
                  <Bar dataKey="Receitas" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Essenciais" fill="var(--color-essential)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Variáveis" fill="var(--color-variable)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Credit Card Spend Breakdown Widget */}
      <div className="grid grid-2">
        <div className="card" style={{ borderLeft: '4px solid #a855f7' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CardIcon size={20} style={{ color: '#a855f7' }} /> Gastos com Cartão ({formattedMonthName})
          </h2>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-expense)' }}>
              R$ {totalCardsSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Total faturado em faturas no mês
            </span>
          </div>

          {cardsBreakdown.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '10px 0' }}>
              Nenhum gasto faturado em cartões neste mês.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cardsBreakdown.map(card => (
                <div key={card.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                    <span>{card.name}</span>
                    <span>R$ {card.spent.toLocaleString('pt-BR')} ({card.pct.toFixed(0)}%)</span>
                  </div>
                  <div className="progress-bar-container" style={{ height: '6px' }}>
                    <div className="progress-bar" style={{ width: `${card.pct}%`, background: '#a855f7' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expert suggestions */}
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)', background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.05) 0%, transparent 100%)' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: 'var(--color-primary)' }} /> Sugestões & Diagnóstico ({formattedMonthName})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
            {suggestions.map((suggestion, idx) => {
              const Icon = suggestion.type === 'danger' || suggestion.type === 'warning' ? AlertTriangle : 
                           suggestion.type === 'success' ? CheckCircle : Info;
              return (
                <div key={idx} className={`suggestion-card ${suggestion.type}`} style={{ margin: 0, padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <Icon size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{suggestion.title}</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{suggestion.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
