import React, { useState } from 'react';
import { Plus, CreditCard, Calendar, Trash2, X, Tag, Edit2, History, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import { getInvoiceMonth } from '../utils/invoiceUtils';

export default function CreditCards({ profileData, onUpdateProfileData, onEditTransaction }) {
  const { creditCards = [], transactions = [] } = profileData;
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('5');
  const [dueDay, setDueDay] = useState('12');

  // Credit Card Editing State
  const [editingCardId, setEditingCardId] = useState(null);

  // Direct card logging states
  const [activeLogCardId, setActiveLogCardId] = useState(null);
  const [cardDesc, setCardDesc] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [cardType, setCardType] = useState('variable'); // variable, essential
  const [cardCategory, setCardCategory] = useState('');
  const [cardDate, setCardDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cardTags, setCardTags] = useState('');
  const [cardRecurrenceType, setCardRecurrenceType] = useState('single'); // single, installments
  const [cardInstallmentsCount, setCardInstallmentsCount] = useState('3');

  // Credit Card Statement Viewer Modal states
  const [viewingInvoiceCardId, setViewingInvoiceCardId] = useState(null);
  const [invoiceMonthFilter, setInvoiceMonthFilter] = useState(() => new Date().toISOString().substring(0, 7));

  const getCategoriesByType = (t) => {
    if (t === 'essential') return ['Moradia/Aluguel', 'Supermercado', 'Saúde/Convênio', 'Educação', 'Contas (Água/Luz)', 'Transporte', 'Outros'];
    return ['Restaurante/Lanches', 'Lazer/Viagens', 'Assinaturas/Streaming', 'Compras/Roupas', 'Outros Supérfluos', 'Outros'];
  };

  React.useEffect(() => {
    setCardCategory(getCategoriesByType(cardType)[0]);
  }, [cardType]);

  const handleAddCardSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !limit) return;
    
    if (editingCardId) {
      const updatedCards = creditCards.map(c => {
        if (c.id === editingCardId) {
          return {
            ...c,
            name: name.trim(),
            limit: Number(limit),
            closingDay: Number(closingDay),
            dueDay: Number(dueDay)
          };
        }
        return c;
      });

      onUpdateProfileData({
        ...profileData,
        creditCards: updatedCards
      });

      setEditingCardId(null);
    } else {
      const newCard = {
        id: Date.now().toString(),
        name: name.trim(),
        limit: Number(limit),
        closingDay: Number(closingDay),
        dueDay: Number(dueDay)
      };

      onUpdateProfileData({
        ...profileData,
        creditCards: [...creditCards, newCard]
      });
    }

    setName('');
    setLimit('');
    setClosingDay('5');
    setDueDay('12');
  };

  const handleEditCardClick = (card) => {
    setEditingCardId(card.id);
    setName(card.name);
    setLimit(card.limit);
    setClosingDay(card.closingDay.toString());
    setDueDay(card.dueDay.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditCard = () => {
    setEditingCardId(null);
    setName('');
    setLimit('');
    setClosingDay('5');
    setDueDay('12');
  };

  const handleLogCardExpense = (e, card) => {
    e.preventDefault();
    if (!cardDesc.trim() || !cardAmount || !cardCategory) return;

    const tags = cardTags
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    const baseAmount = Number(cardAmount);

    if (cardRecurrenceType === 'single') {
      const newTransaction = {
        id: Date.now().toString(),
        description: cardDesc.trim(),
        amount: baseAmount,
        type: cardType,
        category: cardCategory,
        date: cardDate,
        tags: [...tags, 'cartao'],
        cardId: card.id,
        recurrenceType: 'single'
      };

      onUpdateProfileData({
        ...profileData,
        transactions: [newTransaction, ...transactions]
      });

    } else if (cardRecurrenceType === 'installments') {
      const count = Math.max(2, parseInt(cardInstallmentsCount) || 2);
      const generatedTransactions = [];
      const baseDate = new Date(cardDate + 'T00:00:00');

      for (let i = 0; i < count; i++) {
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(baseDate.getMonth() + i);

        const yyyy = installmentDate.getFullYear();
        const mm = String(installmentDate.getMonth() + 1).padStart(2, '0');
        const dd = String(installmentDate.getDate()).padStart(2, '0');
        const dateString = `${yyyy}-${mm}-${dd}`;

        generatedTransactions.push({
          id: `${Date.now()}_inst_${i}`,
          description: `${cardDesc.trim()} (Parcela ${i + 1}/${count} - Total R$ ${baseAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`,
          amount: Number((baseAmount / count).toFixed(2)),
          type: cardType,
          category: cardCategory,
          date: dateString,
          tags: [...tags, 'parcelado', 'cartao'],
          cardId: card.id,
          recurrenceType: 'installment_item',
          installmentGroupId: Date.now().toString()
        });
      }

      onUpdateProfileData({
        ...profileData,
        transactions: [...generatedTransactions, ...transactions]
      });
    } else if (cardRecurrenceType === 'subscription') {
      const newTransaction = {
        id: Date.now().toString(),
        description: cardDesc.trim(),
        amount: baseAmount,
        type: cardType,
        category: cardCategory,
        date: cardDate,
        tags: [...tags, 'assinatura', 'cartao'],
        cardId: card.id,
        recurrenceType: 'subscription'
      };

      onUpdateProfileData({
        ...profileData,
        transactions: [newTransaction, ...transactions]
      });
    }

    setCardDesc('');
    setCardAmount('');
    setCardTags('');
    setActiveLogCardId(null);
    setCardRecurrenceType('single');
  };

  const handleDeleteCard = (cardId) => {
    if (confirm('Deseja excluir este cartão de crédito? ATENÇÃO: Todos os gastos vinculados a este cartão também serão permanentemente excluídos.')) {
      const updatedCards = creditCards.filter(c => c.id !== cardId);
      const updatedTransactions = transactions.filter(t => t.cardId !== cardId);

      onUpdateProfileData({
        ...profileData,
        creditCards: updatedCards,
        transactions: updatedTransactions
      });

      if (editingCardId === cardId) {
        cancelEditCard();
      }
      if (viewingInvoiceCardId === cardId) {
        setViewingInvoiceCardId(null);
      }
    }
  };

  const handleDeleteTransaction = (t) => {
    const isGroup = t.isGroup;
    const msg = isGroup 
      ? 'Tem certeza que deseja excluir esta compra parcelada e TODAS as suas parcelas?'
      : 'Tem certeza que deseja excluir esta transação do cartão?';

    if (confirm(msg)) {
      let updated;
      if (isGroup) {
        updated = transactions.filter(item => item.installmentGroupId !== t.installmentGroupId);
      } else {
        updated = transactions.filter(item => item.id !== t.id);
      }
      onUpdateProfileData({
        ...profileData,
        transactions: updated
      });
    }
  };

  // Get all card transactions, grouped by installmentGroupId if present
  const rawCardTrans = transactions.filter(t => t.cardId);
  const groupedCardTrans = [];
  const installmentGroups = {};

  rawCardTrans.forEach(t => {
    if (t.installmentGroupId) {
      if (!installmentGroups[t.installmentGroupId]) {
        const cleanDesc = t.description.split(' (Parcela')[0];
        installmentGroups[t.installmentGroupId] = {
          id: t.id,
          description: cleanDesc,
          type: t.type,
          category: t.category,
          date: t.date,
          tags: t.tags.filter(tag => tag !== 'parcelado'),
          cardId: t.cardId,
          amount: 0,
          isGroup: true,
          installmentGroupId: t.installmentGroupId,
          installmentsCount: 0
        };
      }
      installmentGroups[t.installmentGroupId].amount += Number(t.amount);
      installmentGroups[t.installmentGroupId].installmentsCount += 1;
      if (t.date < installmentGroups[t.installmentGroupId].date) {
        installmentGroups[t.installmentGroupId].date = t.date;
      }
    } else {
      groupedCardTrans.push(t);
    }
  });

  Object.values(installmentGroups).forEach(g => {
    g.description = `${g.description} (${g.installmentsCount} parcelas)`;
    groupedCardTrans.push(g);
  });

  const cardTransactionsList = groupedCardTrans.sort((a, b) => b.date.localeCompare(a.date));

  // Compute Monthly Invoices History
  const invoicesMap = {};
  transactions
    .filter(t => t.cardId)
    .forEach(t => {
      const card = creditCards.find(c => c.id === t.cardId);
      if (card) {
        // Calculate the actual invoice month based on transaction date and card closing day
        const invoiceMonth = getInvoiceMonth(t.date, card.closingDay);
        const key = `${invoiceMonth}_${t.cardId}`;
        if (!invoicesMap[key]) {
          invoicesMap[key] = {
            month: invoiceMonth,
            cardId: t.cardId,
            amount: 0
          };
        }
        invoicesMap[key].amount += Number(t.amount);
      }
    });

  const monthlyInvoicesList = Object.values(invoicesMap).map(inv => {
    const card = creditCards.find(c => c.id === inv.cardId);
    return {
      ...inv,
      cardName: card ? card.name : 'Cartão Excluído'
    };
  }).sort((a, b) => b.month.localeCompare(a.month));

  const formatMonthLabel = (m) => {
    const [year, month] = m.split('-');
    const monthsName = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${monthsName[parseInt(month) - 1]} de ${year}`;
  };

  const formatMonthLabelShort = (m) => {
    const [year, month] = m.split('-');
    const monthsName = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${monthsName[parseInt(month) - 1]} / ${year}`;
  };

  // Details for active statement viewer
  const statementCard = creditCards.find(c => c.id === viewingInvoiceCardId);
  const statementTransactions = statementCard
    ? transactions.filter(t => t.cardId === statementCard.id && getInvoiceMonth(t.date, statementCard.closingDay) === invoiceMonthFilter)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const statementTotal = statementTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

  // Status of the active statement being viewed
  const getStatementStatus = () => {
    if (!statementCard) return '';
    const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    const currentDay = new Date().getDate();
    
    if (invoiceMonthFilter < currentMonthStr) {
      return { label: 'Fechada (Histórica)', color: 'var(--color-expense)', desc: 'Fatura fechada e paga.' };
    }
    if (invoiceMonthFilter > currentMonthStr) {
      return { label: 'Aberta (Projetada)', color: 'var(--color-primary)', desc: 'Fatura projetada contendo parcelamentos futuros.' };
    }
    // Same month
    if (currentDay > statementCard.closingDay) {
      return { label: 'Fechada', color: 'var(--color-warning)', desc: `Fechou no dia ${statementCard.closingDay}. Vencimento em ${statementCard.dueDay}/${invoiceMonthFilter.split('-')[1]}.` };
    }
    return { label: 'Aberta', color: 'var(--color-success)', desc: `Recebendo lançamentos. Fecha dia ${statementCard.closingDay}.` };
  };

  const statusInfo = getStatementStatus();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="grid grid-2">
        {/* Registry Form */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {editingCardId ? <Edit2 size={18} style={{ color: 'var(--color-primary)' }} /> : <Plus size={18} />} 
            {editingCardId ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'}
          </h2>
          <form onSubmit={handleAddCardSubmit}>
            <div className="form-group">
              <label>Nome do Cartão (ex: Nubank, Inter...)</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Ex: Nubank Principal"
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Limite Total (R$)</label>
              <input 
                type="number" 
                value={limit} 
                onChange={(e) => setLimit(e.target.value)} 
                placeholder="Ex: 5000"
                required 
                min="0"
              />
            </div>

            <div className="grid grid-2" style={{ gap: '12px' }}>
              <div className="form-group">
                <label>Dia de Fechamento</label>
                <select value={closingDay} onChange={(e) => setClosingDay(e.target.value)}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Dia de Vencimento</label>
                <select value={dueDay} onChange={(e) => setDueDay(e.target.value)}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              {editingCardId && (
                <button type="button" className="btn btn-secondary" onClick={cancelEditCard} style={{ flex: 1 }}>
                  <X size={16} /> Cancelar
                </button>
              )}
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                {editingCardId ? 'Salvar Alterações' : 'Adicionar Cartão'}
              </button>
            </div>
          </form>
        </div>

        {/* Credit Cards list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} /> Seus Cartões ({creditCards.length})
          </h2>
          
          {creditCards.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              Nenhum cartão cadastrado ainda.
            </div>
          ) : (
            creditCards.map(card => {
              // Calculate limit usage dynamically based on computed active invoice month
              const currentMonthStr = new Date().toISOString().substring(0, 7);
              const spent = transactions
                .filter(t => t.cardId === card.id && getInvoiceMonth(t.date, card.closingDay) === currentMonthStr)
                .reduce((sum, t) => sum + Number(t.amount), 0);
              
              const available = Math.max(0, card.limit - spent);
              const pct = card.limit > 0 ? (spent / card.limit) * 100 : 0;
              
              let progressClass = '';
              if (pct >= 80) progressClass = 'danger';
              else if (pct >= 30) progressClass = 'warning';

              const isLogging = activeLogCardId === card.id;

              return (
                <div key={card.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="card cc-card" style={{ height: 'auto', minHeight: '170px', gap: '12px', borderColor: editingCardId === card.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: '18px' }}>{card.name}</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          onClick={() => {
                            setViewingInvoiceCardId(card.id);
                            setInvoiceMonthFilter(currentMonthStr);
                          }}
                          className="btn"
                          style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(99, 102, 241, 0.25)', color: 'var(--text-primary)', border: '1px solid var(--color-primary)' }}
                        >
                          <Eye size={12} style={{ marginRight: '4px' }} /> Ver Fatura
                        </button>
                        <button 
                          onClick={() => setActiveLogCardId(isLogging ? null : card.id)}
                          className="btn"
                          style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(255,255,255,0.15)', color: '#fff' }}
                        >
                          {isLogging ? 'Fechar' : 'Lançar Gasto'}
                        </button>
                        <button 
                          onClick={() => handleEditCardClick(card)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          title="Editar Cartão"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCard(card.id)}
                          style={{ background: 'none', border: 'none', color: '#fda4af', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          title="Excluir Cartão"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                        Limite Total: R$ {card.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span>Fatura Atual ({formatMonthLabelShort(currentMonthStr)}): R$ {spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span>Disp: R$ {available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="progress-bar-container">
                        <div 
                          className={`progress-bar ${progressClass}`} 
                          style={{ width: `${Math.min(100, pct)}%` }} 
                        />
                      </div>
                    </div>

                    <div className="cc-details" style={{ marginTop: 'auto' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} /> Fecha dia: {card.closingDay}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} /> Vence dia: {card.dueDay}
                      </span>
                      <span>{pct.toFixed(0)}% Fatura Usada</span>
                    </div>
                  </div>

                  {/* Inline quick transaction logging */}
                  {isLogging && (
                    <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', border: '1px dashed var(--color-primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 600 }}>Lançar Gasto no Cartão: {card.name}</h4>
                        <button onClick={() => setActiveLogCardId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          <X size={14} />
                        </button>
                      </div>

                      <form onSubmit={(e) => handleLogCardExpense(e, card)}>
                        <div className="form-group">
                          <label>Descrição</label>
                          <input 
                            type="text" 
                            value={cardDesc} 
                            onChange={(e) => setCardDesc(e.target.value)} 
                            placeholder="Ex: Uber, Supermercado" 
                            required 
                          />
                        </div>

                        <div className="grid grid-2" style={{ gap: '10px' }}>
                          <div className="form-group">
                            <label>Valor {cardRecurrenceType === 'installments' ? 'Total (R$)' : 'Valor (R$)'}</label>
                            <input 
                              type="number" 
                              value={cardAmount} 
                              onChange={(e) => setCardAmount(e.target.value)} 
                              placeholder="Ex: 150.00" 
                              required 
                              min="0.01" 
                              step="0.01"
                            />
                          </div>
                          <div className="form-group">
                            <label>Data do Gasto</label>
                            <input 
                              type="date" 
                              value={cardDate} 
                              onChange={(e) => setCardDate(e.target.value)} 
                              required 
                            />
                          </div>
                        </div>

                        <div className="grid grid-2" style={{ gap: '10px' }}>
                          <div className="form-group">
                            <label>Frequência / Repetição</label>
                            <select value={cardRecurrenceType} onChange={(e) => setCardRecurrenceType(e.target.value)}>
                              <option value="single">Gasto Único</option>
                              <option value="installments">Parcelado</option>
                              <option value="subscription">Assinatura</option>
                            </select>
                          </div>
                          {cardRecurrenceType === 'installments' && (
                            <div className="form-group">
                              <label>Parcelas</label>
                              <input 
                                type="number" 
                                value={cardInstallmentsCount} 
                                onChange={(e) => setCardInstallmentsCount(e.target.value)} 
                                min="2" max="96" 
                                required 
                              />
                            </div>
                          )}
                        </div>

                        <div className="grid grid-2" style={{ gap: '10px' }}>
                          <div className="form-group">
                            <label>Tipo de Conta</label>
                            <select value={cardType} onChange={(e) => setCardType(e.target.value)}>
                              <option value="variable">Variável / Não Essencial</option>
                              <option value="essential">Essencial</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Categoria</label>
                            <select value={cardCategory} onChange={(e) => setCardCategory(e.target.value)}>
                              {getCategoriesByType(cardType).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Tags (separadas por vírgula)</label>
                          <input 
                            type="text" 
                            value={cardTags} 
                            onChange={(e) => setCardTags(e.target.value)} 
                            placeholder="Ex: comida, uber" 
                          />
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '13px', padding: '8px' }}>
                          Confirmar Gasto no Cartão
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Credit Card invoice statement viewer modal */}
      {viewingInvoiceCardId && statementCard && (
        <div className="modal-overlay" onClick={() => setViewingInvoiceCardId(null)}>
          <div className="modal-content" style={{ maxWidth: '650px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} style={{ color: 'var(--color-primary)' }} />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Extrato de Fatura: {statementCard.name}</h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vencimento dia {statementCard.dueDay} | Fechamento dia {statementCard.closingDay}</p>
                </div>
              </div>
              <button onClick={() => setViewingInvoiceCardId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Invoice Month selector & status banner inside statement */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0, width: '180px' }}>
                <label style={{ fontSize: '11px' }}>Selecionar Mês da Fatura</label>
                <input 
                  type="month" 
                  value={invoiceMonthFilter} 
                  onChange={(e) => e.target.value && setInvoiceMonthFilter(e.target.value)} 
                  style={{ padding: '6px 12px' }}
                />
              </div>

              {statusInfo && (
                <div style={{ textAlign: 'right' }}>
                  <span className="badge" style={{ background: `${statusInfo.color}20`, color: statusInfo.color, padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    {statusInfo.label === 'Aberta' ? <CheckCircle size={10} /> : <AlertCircle size={10} />} {statusInfo.label}
                  </span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{statusInfo.desc}</div>
                </div>
              )}
            </div>

            {/* List of statement entries */}
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {statementTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Nenhum gasto faturado nesta competência.
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th>Categoria</th>
                        <th style={{ textAlign: 'right' }}>Valor</th>
                        <th style={{ textAlign: 'center' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementTransactions.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontSize: '13px' }}>{t.date.split('-').reverse().join('/')}</td>
                          <td style={{ fontSize: '13px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {t.description}
                              {t.recurrenceType === 'installment_item' && (
                                <span style={{ fontSize: '9px', background: 'rgba(244, 63, 94, 0.15)', color: 'var(--color-variable)', padding: '1px 4px', borderRadius: '3px' }}>
                                  Parc.
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: '13px' }}>
                            <span className={`badge badge-${t.type}`} style={{ fontSize: '9px', padding: '2px 6px', marginRight: '4px' }}>
                              {t.type === 'essential' ? 'Essencial' : 'Variável'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t.category}</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-expense)', fontSize: '13px' }}>
                            - R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button 
                                onClick={() => {
                                  onEditTransaction(t.id);
                                  setViewingInvoiceCardId(null);
                                }} 
                                className="btn btn-secondary" 
                                style={{ padding: '4px', color: 'var(--color-primary)' }}
                                title="Editar Gasto"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button 
                                onClick={() => handleDeleteTransaction(t.id)} 
                                className="btn btn-secondary" 
                                style={{ padding: '4px', color: 'var(--color-danger)' }}
                                title="Excluir Gasto"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', marginTop: '16px', paddingTop: '16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {statementTransactions.length} lançamentos na fatura
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total da Fatura: </span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-expense)' }}>
                  R$ {statementTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Invoice History & General Card expenses list */}
      <div className="grid grid-2">
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} style={{ color: 'var(--color-primary)' }} /> Histórico Mensal de Faturas
          </h2>
          {monthlyInvoicesList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Nenhuma fatura fechada ou gasto em cartão.
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Mês / Período</th>
                    <th>Cartão</th>
                    <th style={{ textAlign: 'right' }}>Total Faturado</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyInvoicesList.map((inv, idx) => (
                    <tr key={idx}>
                      <td>{formatMonthLabel(inv.month)}</td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{inv.cardName}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-expense)' }}>
                        R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={18} style={{ color: 'var(--color-primary)' }} /> Histórico de Gastos em Cartão
          </h2>
          {cardTransactionsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Nenhum gasto com cartão registrado ainda.
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Cartão</th>
                    <th>Descrição</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cardTransactionsList.slice(0, 10).map(t => {
                    const card = creditCards.find(c => c.id === t.cardId);
                    return (
                      <tr key={t.id}>
                        <td style={{ fontSize: '13px' }}>{t.date.split('-').reverse().join('/')}</td>
                        <td style={{ fontSize: '13px' }}>
                          <span style={{ fontWeight: 600, color: '#a855f7' }}>
                            {card ? card.name : 'Cartão Excluído'}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px' }}>{t.description}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-expense)', fontSize: '13px' }}>
                          - R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button 
                              onClick={() => onEditTransaction(t.id)} 
                              className="btn btn-secondary" 
                              style={{ padding: '4px', color: 'var(--color-primary)' }}
                              title="Editar Gasto"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTransaction(t)} 
                              className="btn btn-secondary" 
                              style={{ padding: '4px', color: 'var(--color-danger)' }}
                              title="Excluir Gasto"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
