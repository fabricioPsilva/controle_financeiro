import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, X, Play, HelpCircle } from 'lucide-react';

export default function InteractiveTour({ user, activeTab, setActiveTab, onClose }) {
  const [currentStep, setCurrentStep] = useState(0); // 0: Welcome, 1: Dashboard, 2: Transactions, 3: Cards, 4: Admin, 5: Manual
  const [rect, setRect] = useState(null);
  const resizeRef = useRef(null);

  const steps = [
    {
      title: 'Bem-vindo ao Finanças Hub!',
      content: 'Vamos fazer um tour rápido de 1 minuto para conhecer as principais funcionalidades do seu novo sistema financeiro?',
      targetSelector: null,
      tab: null
    },
    {
      title: 'Painel Geral',
      content: 'Este é o seu painel central. Aqui você acompanha gráficos, resumos de gastos e a aderência das despesas às metas do seu orçamento.',
      targetSelector: '#nav-tab-dashboard',
      tab: 'dashboard'
    },
    {
      title: 'Lançamento de Gastos',
      content: 'Na aba de Lançamentos você gerencia suas receitas e despesas. É possível categorizar os gastos e até lançar compras parceladas.',
      targetSelector: '#nav-tab-transactions',
      tab: 'transactions'
    },
    {
      title: 'Controle de Cartões',
      content: 'Na aba de Cartões você gerencia limites de crédito, visualiza o histórico de faturas e confere o extrato individual de transações do mês.',
      targetSelector: '#nav-tab-cards',
      tab: 'cards'
    },
    ...(user.is_admin ? [{
      title: 'Controle de Acessos',
      content: 'Por ser Administrador, você possui este menu exclusivo para criar usuários (membros da família), inativar contas e resetar senhas.',
      targetSelector: '#nav-tab-admin',
      tab: 'admin'
    }] : []),
    {
      title: 'Manual Completo',
      content: 'Sempre que tiver dúvidas sobre as regras de faturamento, fechamento de cartão ou parcelas, clique em Manual para reler as especificações.',
      targetSelector: '#btn-manual',
      tab: null
    }
  ];

  const activeStep = steps[currentStep];

  const updateHighlightCoordinates = () => {
    if (!activeStep || !activeStep.targetSelector) {
      setRect(null);
      return;
    }

    const element = document.querySelector(activeStep.targetSelector);
    if (element) {
      // Scroll element into view if needed
      element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const bounds = element.getBoundingClientRect();
      setRect({
        top: bounds.top,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height,
        bottom: bounds.bottom
      });
    } else {
      setRect(null);
    }
  };

  // Change tab when step changes if required
  useEffect(() => {
    if (activeStep && activeStep.tab && activeTab !== activeStep.tab) {
      setActiveTab(activeStep.tab);
      // Wait a brief moment for DOM render/tab transition before measuring coordinates
      setTimeout(updateHighlightCoordinates, 150);
    } else {
      updateHighlightCoordinates();
    }
  }, [currentStep, activeTab]);

  // Handle window resizing and scrolls
  useEffect(() => {
    const handleResizeOrScroll = () => {
      updateHighlightCoordinates();
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    onClose();
  };

  // Welcome Step Render (Centered Modal)
  if (currentStep === 0) {
    return (
      <div className="modal-overlay" style={{ zIndex: 999999 }}>
        <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center', padding: '32px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary)',
            margin: '0 auto 16px',
          }}>
            <Play size={24} style={{ fill: 'currentColor', marginLeft: '4px' }} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>{activeStep.title}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            {activeStep.content}
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Pular
            </button>
            <button onClick={handleNext} className="btn btn-primary" style={{ flex: 2 }}>
              Começar Tour
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate tooltip placement (above or below highlight box)
  let tooltipStyle = {
    position: 'fixed',
    width: '280px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 1000000,
    transition: 'all 0.2s ease',
  };

  if (rect) {
    const fitsBelow = rect.bottom + 160 < window.innerHeight;
    if (fitsBelow) {
      tooltipStyle.top = rect.bottom + 12;
      tooltipStyle.left = Math.max(16, Math.min(window.innerWidth - 296, rect.left + rect.width / 2 - 140));
    } else {
      tooltipStyle.bottom = (window.innerHeight - rect.top) + 12;
      tooltipStyle.left = Math.max(16, Math.min(window.innerWidth - 296, rect.left + rect.width / 2 - 140));
    }
  } else {
    // Fallback centered
    tooltipStyle.top = '50%';
    tooltipStyle.left = '50%';
    tooltipStyle.transform = 'translate(-50%, -50%)';
  }

  return (
    <>
      {/* Background Spotlight Mask */}
      {rect && (
        <div style={{
          position: 'fixed',
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          borderRadius: '8px',
          border: '2px solid var(--color-primary)',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.8), 0 0 15px var(--color-primary)',
          zIndex: 999998,
          pointerEvents: 'none',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }} />
      )}

      {/* Tooltip Dialog Card */}
      <div style={tooltipStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-primary)' }}>
            {activeStep.title}
          </h4>
          <button 
            onClick={handleClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}
            title="Fechar Tour"
          >
            <X size={14} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5', marginBottom: '16px' }}>
          {activeStep.content}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Passo {currentStep} de {steps.length - 1}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              onClick={handleBack} 
              className="btn btn-secondary" 
              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
              disabled={currentStep === 1}
            >
              <ChevronLeft size={12} /> Voltar
            </button>
            <button 
              onClick={handleNext} 
              className="btn btn-primary" 
              style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
            >
              {currentStep === steps.length - 1 ? 'Concluir' : 'Avançar'} <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
