import React, { useState } from 'react';
import { Plus, Trash2, Tag, Search, Filter, Edit2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getInvoiceMonth } from '../utils/invoiceUtils';

export default function Transactions({ profileData, onUpdateProfileData, selectedMonth, editingTransactionId, setEditingTransactionId }) {
  const { transactions = [], creditCards = [] } = profileData;

  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('essential');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(() => {
    return `${selectedMonth}-01`;
  });
  const [tagsInput, setTagsInput] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');

  // Recurrence State
  const [recurrenceType, setRecurrenceType] = useState('single');
  const [installmentsCount, setInstallmentsCount] = useState('3');

  // Editing State
  const [editingId, setEditingId] = useState(null);
  const [editingInstallmentGroupId, setEditingInstallmentGroupId] = useState(null);

  // Grouping / Consolidation Toggle
  const [groupInvoices, setGroupInvoices] = useState(false);

  // Expanded Cards State (for consolidated view)
  const [expandedCardIds, setExpandedCardIds] = useState([]);

  const [filterType, setFilterType] = useState('all');
  const [filterCard, setFilterCard] = useState('all');
  const [filterTag, setFilterTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(() => window.innerWidth > 768);

  const getCategoriesByType = (t) => {
    if (t === 'income') return ['Salário', 'Investimentos', 'Extras', 'Outros'];
    if (t === 'essential') return ['Moradia/Aluguel', 'Supermercado', 'Saúde/Convênio', 'Educação', 'Contas (Água/Luz)', 'Transporte', 'Outros'];
    return ['Restaurante/Lanches', 'Lazer/Viagens', 'Assinaturas/Streaming', 'Compras/Roupas', 'Outros Supérfluos', 'Outros'];
  };

  const handleTypeChange = (e) => {
    const nextType = e.target.value;
    setType(nextType);
    const cats = getCategoriesByType(nextType);
    setCategory(cats[0]);
    if (nextType === 'income') {
      setSelectedCardId('');
    }
  };

  React.useEffect(() => {
    if (!category) {
      setCategory(getCategoriesByType(type)[0]);
    }
  }, [type, category]);

  React.useEffect(() => {
    if (!date.startsWith(selectedMonth) && !editingId) {
      setDate(`${selectedMonth}-01`);
    }
  }, [selectedMonth, editingId]);

  React.useEffect(() => {
    if (editingTransactionId) {
      const t = transactions.find(item => item.id === editingTransactionId);
      if (t) {
        setEditingId(t.id);
        setDescription(t.description);
        setAmount(t.amount);
        setType(t.type);
        setCategory(t.category);
        setDate(t.date);
        setTagsInput(t.tags.filter(tag => tag !== 'fixo' && tag !== 'parcelado' && tag !== 'cartao' && tag !== 'assinatura').join(', '));
        setSelectedCardId(t.cardId || '');
        setRecurrenceType(t.recurrenceType || 'single');
      }
      setEditingTransactionId(null);
    }
  }, [editingTransactionId, transactions, setEditingTransactionId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim() || !amount || !category) return;

    const tags = tagsInput
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    const baseAmount = Number(amount);

    if (editingId) {
      let updatedTransactions;

      if (editingInstallmentGroupId) {
        // Remove all previous items from this group
        const filteredTrans = transactions.filter(t => t.installmentGroupId !== editingInstallmentGroupId);
        
        // Re-generate new installments
        const count = Math.max(2, parseInt(installmentsCount) || 2);
        const generatedTransactions = [];
        const baseDate = new Date(date + 'T00:00:00');

        for (let i = 0; i < count; i++) {
          const installmentDate = new Date(baseDate);
          installmentDate.setMonth(baseDate.getMonth() + i);

          const yyyy = installmentDate.getFullYear();
          const mm = String(installmentDate.getMonth() + 1).padStart(2, '0');
          const dd = String(installmentDate.getDate()).padStart(2, '0');
          const dateString = `${yyyy}-${mm}-${dd}`;

          generatedTransactions.push({
            id: i === 0 ? editingId : `${Date.now()}_inst_${i}`,
            description: `${description.trim()} (Parcela ${i + 1}/${count} - Total R$ ${baseAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`,
            amount: Number((baseAmount / count).toFixed(2)),
            type,
            category,
            date: dateString,
            tags: [...tags, 'parcelado', ...(selectedCardId ? ['cartao'] : [])],
            cardId: selectedCardId || null,
            recurrenceType: 'installment_item',
            installmentGroupId: editingInstallmentGroupId
          });
        }

        updatedTransactions = [...generatedTransactions, ...filteredTrans];
        setEditingInstallmentGroupId(null);
      } else {
        // Normal edit
        updatedTransactions = transactions.map(t => {
          if (t.id === editingId) {
            return {
              ...t,
              description: description.trim(),
              amount: baseAmount,
              type,
              category,
              date,
              tags: [...tags, recurrenceType === 'fixed' ? 'fixo' : recurrenceType === 'subscription' ? 'assinatura' : ''].filter(Boolean),
              cardId: selectedCardId || null,
              recurrenceType: recurrenceType
            };
          }
          return t;
        });
      }

      onUpdateProfileData({
        ...profileData,
        transactions: updatedTransactions
      });

      setEditingId(null);

    } else {
      if (recurrenceType === 'single') {
        const newTransaction = {
          id: Date.now().toString(),
          description: description.trim(),
          amount: baseAmount,
          type,
          category,
          date,
          tags,
          cardId: selectedCardId || null,
          recurrenceType: 'single'
        };

        onUpdateProfileData({
          ...profileData,
          transactions: [newTransaction, ...transactions]
        });

      } else if (recurrenceType === 'installments') {
        const count = Math.max(2, parseInt(installmentsCount) || 2);
        const generatedTransactions = [];
        const baseDate = new Date(date + 'T00:00:00');

        for (let i = 0; i < count; i++) {
          const installmentDate = new Date(baseDate);
          installmentDate.setMonth(baseDate.getMonth() + i);

          const yyyy = installmentDate.getFullYear();
          const mm = String(installmentDate.getMonth() + 1).padStart(2, '0');
          const dd = String(installmentDate.getDate()).padStart(2, '0');
          const dateString = `${yyyy}-${mm}-${dd}`;

          generatedTransactions.push({
            id: `${Date.now()}_inst_${i}`,
            description: `${description.trim()} (Parcela ${i + 1}/${count} - Total R$ ${baseAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`,
            amount: Number((baseAmount / count).toFixed(2)),
            type,
            category,
            date: dateString,
            tags: [...tags, 'parcelado'],
            cardId: selectedCardId || null,
            recurrenceType: 'installment_item',
            installmentGroupId: Date.now().toString()
          });
        }

        onUpdateProfileData({
          ...profileData,
          transactions: [...generatedTransactions, ...transactions]
        });

      } else if (recurrenceType === 'fixed') {
        const newTransaction = {
          id: Date.now().toString(),
          description: description.trim(),
          amount: baseAmount,
          type,
          category,
          date,
          tags: [...tags, 'fixo'],
          cardId: selectedCardId || null,
          recurrenceType: 'fixed'
        };

        onUpdateProfileData({
          ...profileData,
          transactions: [newTransaction, ...transactions]
        });
      } else if (recurrenceType === 'subscription') {
        const newTransaction = {
          id: Date.now().toString(),
          description: description.trim(),
          amount: baseAmount,
          type,
          category,
          date,
          tags: [...tags, 'assinatura'],
          cardId: selectedCardId || null,
          recurrenceType: 'subscription'
        };

        onUpdateProfileData({
          ...profileData,
          transactions: [newTransaction, ...transactions]
        });
      }
    }

    setDescription('');
    setAmount('');
    setTagsInput('');
    setSelectedCardId('');
    setRecurrenceType('single');

    if (window.innerWidth <= 768) {
      setShowForm(false);
    }
  };

  const handleEditClick = (t) => {
    setEditingId(t.id);

    if (t.installmentGroupId) {
      const groupItems = transactions.filter(item => item.installmentGroupId === t.installmentGroupId);
      const totalAmount = groupItems.reduce((sum, item) => sum + Number(item.amount), 0);
      const startDate = groupItems.map(item => item.date).sort()[0] || t.date;
      const cleanDesc = t.description.split(' (Parcela')[0];

      setEditingInstallmentGroupId(t.installmentGroupId);
      setDescription(cleanDesc);
      setAmount(totalAmount);
      setRecurrenceType('installments');
      setInstallmentsCount(groupItems.length.toString());
      setDate(startDate);
    } else {
      setEditingInstallmentGroupId(null);
      setDescription(t.description);
      setAmount(t.amount);
      setRecurrenceType(t.recurrenceType || 'single');
      setDate(t.date);
    }

    setType(t.type);
    setCategory(t.category);
    setTagsInput(t.tags.filter(tag => tag !== 'fixo' && tag !== 'parcelado' && tag !== 'cartao').join(', '));
    setSelectedCardId(t.cardId || '');
    
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingInstallmentGroupId(null);
    setDescription('');
    setAmount('');
    setTagsInput('');
    setSelectedCardId('');
    setRecurrenceType('single');
    setDate(`${selectedMonth}-01`);
    if (window.innerWidth <= 768) {
      setShowForm(false);
    }
  };

  const handleDelete = (t) => {
    if (t.installmentGroupId) {
      const confirmAll = confirm('Esta transação faz parte de uma compra parcelada. Deseja excluir TODAS as parcelas desta compra? (Clique em "Cancelar" se desejar excluir apenas esta parcela individual).');
      let updated;
      if (confirmAll) {
        updated = transactions.filter(item => item.installmentGroupId !== t.installmentGroupId);
      } else {
        if (confirm('Deseja excluir apenas esta parcela individual?')) {
          updated = transactions.filter(item => item.id !== t.id);
        } else {
          return;
        }
      }
      onUpdateProfileData({
        ...profileData,
        transactions: updated
      });
      if (editingId === t.id) {
        cancelEdit();
      }
    } else {
      if (confirm('Tem certeza que deseja excluir esta transação?')) {
        const updated = transactions.filter(item => item.id !== t.id);
        onUpdateProfileData({
          ...profileData,
          transactions: updated
        });
        if (editingId === t.id) {
          cancelEdit();
        }
      }
    }
  };

  const toggleCardExpand = (cardId) => {
    if (expandedCardIds.includes(cardId)) {
      setExpandedCardIds(expandedCardIds.filter(id => id !== cardId));
    } else {
      setExpandedCardIds([...expandedCardIds, cardId]);
    }
  };

  // 1. Filter active month
  const activeMonthTransactions = [];
  transactions.forEach(t => {
    let tMonth = t.date.substring(0, 7);
    if (t.cardId) {
      const card = creditCards.find(c => c.id === t.cardId);
      if (card) {
        tMonth = getInvoiceMonth(t.date, card.closingDay);
      }
    }

    if (t.recurrenceType === 'fixed' || t.recurrenceType === 'subscription') {
      if (selectedMonth >= tMonth) {
        activeMonthTransactions.push({
          ...t,
          date: `${selectedMonth}-${t.date.substring(8, 10)}`
        });
      }
    } else {
      if (tMonth === selectedMonth) {
        activeMonthTransactions.push(t);
      }
    }
  });

  // Apply filters
  const filteredRawTransactions = activeMonthTransactions.filter(t => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesCard = filterCard === 'all' || 
                        (filterCard === 'cash' && !t.cardId) || 
                        t.cardId === filterCard;
    const matchesTag = !filterTag.trim() || 
                       t.tags.some(tag => tag.includes(filterTag.toLowerCase().trim()));
    const matchesSearch = !searchQuery.trim() || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesCard && matchesTag && matchesSearch;
  });

  // 2. Format items for display based on grouping toggle
  const displayItems = [];

  if (groupInvoices && filterCard === 'all') {
    const creditCardGroups = {};
    filteredRawTransactions.forEach(t => {
      if (t.cardId) {
        if (!creditCardGroups[t.cardId]) {
          creditCardGroups[t.cardId] = [];
        }
        creditCardGroups[t.cardId].push(t);
      } else {
        displayItems.push(t);
      }
    });

    Object.keys(creditCardGroups).forEach(cardId => {
      const card = creditCards.find(c => c.id === cardId);
      const items = creditCardGroups[cardId];
      const totalGroupAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);
      const latestDate = items.map(item => item.date).sort().reverse()[0] || `${selectedMonth}-01`;

      displayItems.push({
        id: `group_${cardId}`,
        isGroup: true,
        cardId,
        cardName: card ? card.name : 'Cartão Excluído',
        amount: totalGroupAmount,
        date: latestDate,
        items
      });
    });
  } else {
    // If not grouping (or if a card filter is active), list everything individually
    filteredRawTransactions.forEach(t => {
      displayItems.push(t);
    });
  }

  // Sort displayItems by date (descending)
  displayItems.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
      
      {/* Transaction Input Form */}
      <div className="card" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column' }}>
        <div 
          onClick={() => setShowForm(!showForm)} 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            cursor: 'pointer',
            paddingBottom: showForm ? '12px' : '0',
            borderBottom: showForm ? '1px dashed var(--border-color)' : 'none',
            marginBottom: showForm ? '16px' : '0'
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            {editingId ? <Edit2 size={18} style={{ color: 'var(--color-primary)' }} /> : <Plus size={18} />} 
            {editingId ? 'Editar Lançamento' : 'Lançar Movimentação'}
          </h2>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--border-color)' }}
          >
            {showForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showForm ? 'Recolher' : 'Expandir'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tipo de Transação</label>
            <select value={type} onChange={handleTypeChange}>
              <option value="income">Receita (Entrada)</option>
              <option value="essential">Despesa Essencial (Saída)</option>
              <option value="variable">Despesa Variável / Não Essencial (Saída)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Descrição</label>
            <input 
              type="text" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Ex: Salário Mensal, Netflix, Parcelamento TV"
              required 
            />
          </div>

          <div className="grid grid-2" style={{ gap: '12px' }}>
            <div className="form-group">
              <label>Valor {recurrenceType === 'installments' && !editingId ? 'Total (R$)' : 'Valor (R$)'}</label>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                placeholder="Ex: 150.00"
                required 
                min="0.01" 
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>Data de Início/Ocorrência</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                required 
              />
            </div>
          </div>

          {(!editingId || recurrenceType !== 'installment_item') && (
            <div className="form-group">
              <label>Frequência / Repetição</label>
              <select value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)}>
                <option value="single">Lançamento Único (Apenas este mês)</option>
                {!editingId && <option value="installments">Parcelado (Ex: compras em 10x)</option>}
                <option value="fixed">Fixo / Recorrente (Repete todos os meses)</option>
                <option value="subscription">Assinatura / Mensalidade (Fixo no Cartão)</option>
              </select>
            </div>
          )}

          {recurrenceType === 'installments' && !editingId && (
            <div className="form-group">
              <label>Quantidade de Parcelas</label>
              <input 
                type="number" 
                value={installmentsCount} 
                onChange={(e) => setInstallmentsCount(e.target.value)} 
                min="2" 
                max="96"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Categoria</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {getCategoriesByType(type).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {type !== 'income' && creditCards.length > 0 && (
            <div className="form-group">
              <label>Forma de Pagamento</label>
              <select value={selectedCardId} onChange={(e) => setSelectedCardId(e.target.value)}>
                <option value="">Dinheiro / PIX / Débito</option>
                {creditCards.map(card => (
                  <option key={card.id} value={card.id}>Cartão: {card.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Tags (separadas por vírgula)</label>
            <input 
              type="text" 
              value={tagsInput} 
              onChange={(e) => setTagsInput(e.target.value)} 
              placeholder="Ex: alimentação, urgente, lazer"
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={cancelEdit} style={{ flex: 1 }}>
                <X size={16} /> Cancelar
              </button>
            )}
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
              {editingId ? 'Salvar Alterações' : 'Salvar Transação'}
            </button>
          </div>
          </form>
        )}
      </div>

      {/* Transaction List and Filters */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>
            Lançamentos de {selectedMonth.split('-').reverse().join('/')}
          </h2>
          <span style={{ fontSize: '12px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
            {displayItems.length} faturas/itens exibidos
          </span>
        </div>
        
        {/* Filters Panel */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <div className="grid grid-3" style={{ gap: '12px', marginBottom: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Filter size={12} /> Tipo</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '8px 12px' }}>
                <option value="all">Todos os tipos</option>
                <option value="income">Apenas Receitas</option>
                <option value="essential">Despesas Essenciais</option>
                <option value="variable">Despesas Não Essenciais</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Filter size={12} /> Forma de Pagamento</label>
              <select value={filterCard} onChange={(e) => setFilterCard(e.target.value)} style={{ padding: '8px 12px' }}>
                <option value="all">Qualquer forma</option>
                <option value="cash">Dinheiro / PIX / Débito</option>
                {creditCards.map(card => (
                  <option key={card.id} value={card.id}>Cartão: {card.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Tag size={12} /> Filtrar Tag</label>
              <input 
                type="text" 
                value={filterTag} 
                onChange={(e) => setFilterTag(e.target.value)} 
                placeholder="Ex: alimentação"
                style={{ padding: '8px 12px' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Buscar por descrição ou categoria..."
                style={{ paddingLeft: '40px' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Grouping Toggle */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              <input 
                type="checkbox" 
                checked={groupInvoices} 
                onChange={(e) => setGroupInvoices(e.target.checked)} 
                style={{ width: 'auto', marginRight: '6px' }}
                disabled={filterCard !== 'all'}
              />
              Agrupar faturas de cartão na lista
            </label>
          </div>
        </div>

        {/* Transactions Table */}
        {displayItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            Nenhuma transação encontrada para este mês.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-wrapper desktop-table">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Tipo / Categoria</th>
                    <th>Pagamento</th>
                    <th>Tags</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map(item => {
                    if (item.isGroup) {
                      const isExpanded = expandedCardIds.includes(item.cardId);
                      
                      return (
                        <React.Fragment key={item.id}>
                          <tr style={{ background: 'rgba(99, 102, 241, 0.04)', borderLeft: '3px solid var(--color-primary)' }}>
                            <td>{item.date.split('-').reverse().join('/')}</td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                                Fatura: {item.cardName}
                              </div>
                            </td>
                            <td>
                              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)' }}>
                                Cartão
                              </span>
                            </td>
                            <td>💳 Consolidated</td>
                            <td>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {item.items.length} gastos
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-expense)' }}>
                              - R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button 
                                  onClick={() => toggleCardExpand(item.cardId)} 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  {isExpanded ? 'Ocultar' : 'Ver Detalhes'}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && item.items.map(subItem => {
                            return (
                              <tr key={subItem.id} style={{ background: 'rgba(255, 255, 255, 0.01)', borderLeft: '3px solid rgba(99, 102, 241, 0.2)' }}>
                                <td style={{ paddingLeft: '24px', fontSize: '13px', opacity: 0.8 }}>
                                  {subItem.date.split('-').reverse().join('/')}
                                </td>
                                <td style={{ fontSize: '13px', opacity: 0.9 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {subItem.description}
                                    {subItem.recurrenceType === 'installment_item' && (
                                      <span style={{ fontSize: '9px', background: 'rgba(244, 63, 94, 0.15)', color: 'var(--color-variable)', padding: '1px 4px', borderRadius: '3px' }}>
                                        Parc.
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ fontSize: '13px' }}>
                                  <span className={`badge badge-${subItem.type}`} style={{ fontSize: '9px', padding: '2px 6px', marginRight: '4px' }}>
                                    {subItem.type === 'essential' ? 'Essencial' : 'Variável'}
                                  </span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{subItem.category}</span>
                                </td>
                                <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  💳 Item
                                </td>
                                <td>
                                  <div className="tag-container">
                                    {subItem.tags.filter(tag => tag !== 'cartao').map(tag => (
                                      <span key={tag} className="tag-item" style={{ fontSize: '9px' }}>{tag}</span>
                                    ))}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-expense)', fontSize: '13px' }}>
                                  - R$ {subItem.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                    <button 
                                      onClick={() => handleEditClick(subItem)} 
                                      className="btn btn-secondary" 
                                      style={{ padding: '4px', color: 'var(--color-primary)' }}
                                      title="Editar Item"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(subItem)} 
                                      className="btn btn-secondary" 
                                      style={{ padding: '4px', color: 'var(--color-danger)' }}
                                      title="Excluir Item"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    } else {
                      const isIncome = item.type === 'income';
                      const card = creditCards.find(c => c.id === item.cardId);

                      return (
                        <tr key={item.id}>
                          <td>{item.date.split('-').reverse().join('/')}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {item.description}
                              {item.recurrenceType === 'fixed' && (
                                <span style={{ fontSize: '9px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)', padding: '1px 4px', borderRadius: '3px' }}>
                                  Fixo
                                </span>
                              )}
                              {item.recurrenceType === 'subscription' && (
                                <span style={{ fontSize: '9px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-income)', padding: '1px 4px', borderRadius: '3px' }}>
                                  Assinatura
                                </span>
                              )}
                              {item.recurrenceType === 'installment_item' && (
                                <span style={{ fontSize: '9px', background: 'rgba(244, 63, 94, 0.15)', color: 'var(--color-variable)', padding: '1px 4px', borderRadius: '3px' }}>
                                  Parc.
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-${item.type}`} style={{ marginRight: '6px' }}>
                              {item.type === 'income' ? 'Receita' : item.type === 'essential' ? 'Essencial' : 'Variável'}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.category}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                              {card ? `💳 ${card.name} (Fat. ${getInvoiceMonth(item.date, card.closingDay).split('-').reverse().join('/')})` : '💵 Dinheiro/PIX'}
                            </span>
                          </td>
                          <td>
                            <div className="tag-container">
                              {item.tags.map(tag => (
                                <span key={tag} className="tag-item">{tag}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ 
                            textAlign: 'right', 
                            fontWeight: 600, 
                            color: isIncome ? 'var(--color-income)' : 'var(--color-expense)' 
                          }}>
                            {isIncome ? '+' : '-'} R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button 
                                onClick={() => handleEditClick(item)} 
                                className="btn btn-secondary" 
                                style={{ padding: '6px', color: 'var(--color-primary)' }}
                                title="Editar Transação"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDelete(item)} 
                                className="btn btn-secondary" 
                                style={{ padding: '6px', color: 'var(--color-danger)' }}
                                title="Excluir Transação"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="mobile-cards-list" style={{ display: 'none' }}>
              {displayItems.map(item => {
                if (item.isGroup) {
                  const isExpanded = expandedCardIds.includes(item.cardId);
                  return (
                    <div key={item.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '15px' }}>Fatura: {item.cardName}</span>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.items.length} compras no cartão</div>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--color-expense)', fontSize: '15px' }}>
                          - R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button 
                        onClick={() => toggleCardExpand(item.cardId)} 
                        className="btn btn-secondary" 
                        style={{ width: '100%', padding: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? 'Ocultar Detalhes' : 'Ver Detalhes'}
                      </button>
                      {isExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                          {item.items.map(sub => (
                            <div key={sub.id} style={{ fontSize: '13px', background: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: 500 }}>{sub.description}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sub.date.split('-').reverse().join('/')} | {sub.category}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--color-expense)' }}>- R$ {sub.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                <button onClick={() => handleEditClick(sub)} className="btn btn-secondary" style={{ padding: '4px', color: 'var(--color-primary)' }}><Edit2 size={12} /></button>
                                <button onClick={() => handleDelete(sub)} className="btn btn-secondary" style={{ padding: '4px', color: 'var(--color-danger)' }}><Trash2 size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                } else {
                  const isIncome = item.type === 'income';
                  const card = creditCards.find(c => c.id === item.cardId);
                  return (
                    <div key={item.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '15px' }}>{item.description}</span>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {item.date.split('-').reverse().join('/')}
                          </div>
                        </div>
                        <span style={{ 
                          fontWeight: 700, 
                          fontSize: '16px',
                          color: isIncome ? 'var(--color-income)' : 'var(--color-expense)' 
                        }}>
                          {isIncome ? '+' : '-'} R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className={`badge badge-${item.type}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                            {item.type === 'income' ? 'Receita' : item.type === 'essential' ? 'Essencial' : 'Variável'}
                          </span>
                          {item.recurrenceType === 'fixed' && (
                            <span className="badge" style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)' }}>Fixo</span>
                          )}
                          {item.recurrenceType === 'subscription' && (
                            <span className="badge" style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-income)' }}>Assinatura</span>
                          )}
                          <span style={{ color: 'var(--text-secondary)' }}>{item.category}</span>
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {card ? `💳 ${card.name}` : '💵 Dinheiro/PIX'}
                        </span>
                      </div>

                      {item.tags.length > 0 && (
                        <div className="tag-container" style={{ margin: 0, gap: '4px' }}>
                          {item.tags.map(t => <span key={t} className="tag-item" style={{ fontSize: '9px', padding: '1px 6px' }}>{t}</span>)}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
                        <button 
                          onClick={() => handleEditClick(item)} 
                          className="btn btn-secondary" 
                          style={{ flex: 1, padding: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--color-primary)' }}
                        >
                          <Edit2 size={12} /> Editar
                        </button>
                        <button 
                          onClick={() => handleDelete(item)} 
                          className="btn btn-secondary" 
                          style={{ flex: 1, padding: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={12} /> Excluir
                        </button>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
