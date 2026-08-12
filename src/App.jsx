import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  CreditCard as CardIcon, 
  Users, 
  User, 
  Wallet,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  HelpCircle,
  X
} from 'lucide-react';
import { 
  getActiveProfile, 
  setActiveProfile as saveActiveProfile, 
  getProfileData, 
  saveProfileData 
} from './utils/storage';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import CreditCards from './components/CreditCards';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';

function App() {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('fin_logged_in_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeProfile, setActiveProfile] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, transactions, cards, admin
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().substring(0, 7); // "YYYY-MM"
  });
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Load active profile and its data on start/user login
  useEffect(() => {
    const initApp = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const profile = user.username;
      setActiveProfile(profile);
      const data = await getProfileData(profile);
      setProfileData(data);
      setLoading(false);
    };
    initApp();
  }, [user]);

  // Handle changing active profile (used on login)
  const handleProfileChange = async (newProfile) => {
    setLoading(true);
    setActiveProfile(newProfile);
    saveActiveProfile(newProfile);
    const data = await getProfileData(newProfile);
    setProfileData(data);
    setActiveTab('dashboard');
    setLoading(false);
  };

  // Sync profile data updates to state and localStorage/Supabase
  const handleUpdateProfileData = async (updatedData) => {
    setProfileData(updatedData);
    await saveProfileData(activeProfile, updatedData);
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    setSelectedMonth(prevDate.toISOString().substring(0, 7));
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    setSelectedMonth(nextDate.toISOString().substring(0, 7));
  };

  const formatMonthDisplay = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const monthsName = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthsName[parseInt(month) - 1]} de ${year}`;
  };

  if (!user) {
    return (
      <Login 
        onLoginSuccess={(loggedInUser) => {
          sessionStorage.setItem('fin_logged_in_user', JSON.stringify(loggedInUser));
          setUser(loggedInUser);
        }} 
      />
    );
  }

  if (loading || !profileData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--color-primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Sincronizando com a nuvem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header section */}
      <header className="header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div className="logo-section">
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: 'var(--radius-md)', 
            background: 'var(--color-primary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            <Wallet size={20} />
          </div>
          <h1>Finanças Hub</h1>
        </div>

        {/* Global Month navigation control */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'rgba(255,255,255,0.03)', 
          padding: '4px 12px', 
          borderRadius: 'var(--radius-full)', 
          border: '1px solid var(--border-color)' 
        }}>
          <button 
            onClick={handlePrevMonth} 
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={18} />
          </button>
          
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-primary)', 
              fontWeight: 600, 
              fontSize: '14px', 
              textAlign: 'center', 
              padding: '4px',
              outline: 'none',
              cursor: 'pointer',
              width: '160px'
            }} 
          />

          <button 
            onClick={handleNextMonth} 
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* User profile / Logout badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => setShowHelpModal(true)} 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            title="Ver Manual de Uso"
          >
            <HelpCircle size={13} /> Manual
          </button>
          <div className="profile-badge" style={{ cursor: 'default' }}>
            <User size={14} />
            <span>
              {user.username} {user.is_admin && <span style={{ fontSize: '9px', background: 'rgba(99, 102, 241, 0.2)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', color: 'var(--color-primary)' }}>Admin</span>}
            </span>
          </div>
          <button 
            onClick={() => {
              sessionStorage.removeItem('fin_logged_in_user');
              setUser(null);
              setProfileData(null);
            }} 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--color-danger)' }}
          >
            <LogOut size={13} /> Sair
          </button>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="nav-tabs">
        <button 
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={16} /> Painel
        </button>
        <button 
          className={`nav-tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <Receipt size={16} /> Lançamentos
        </button>
        <button 
          className={`nav-tab ${activeTab === 'cards' ? 'active' : ''}`}
          onClick={() => setActiveTab('cards')}
        >
          <CardIcon size={16} /> Cartões
        </button>
        {user.is_admin && (
          <button 
            className={`nav-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <Settings size={16} /> Administração
          </button>
        )}
      </nav>

      {/* Main content display based on active tab */}
      <main style={{ flex: 1, paddingBottom: '40px' }}>
        {activeTab === 'dashboard' && (
          <Dashboard 
            profileData={profileData} 
            onUpdateProfileData={handleUpdateProfileData} 
            selectedMonth={selectedMonth}
          />
        )}
        {activeTab === 'transactions' && (
          <Transactions 
            profileData={profileData} 
            onUpdateProfileData={handleUpdateProfileData} 
            selectedMonth={selectedMonth}
            editingTransactionId={editingTransactionId}
            setEditingTransactionId={setEditingTransactionId}
          />
        )}
        {activeTab === 'cards' && (
          <CreditCards 
            profileData={profileData} 
            onUpdateProfileData={handleUpdateProfileData} 
            onEditTransaction={(id) => {
              setEditingTransactionId(id);
              setActiveTab('transactions');
            }}
          />
        )}
        {user.is_admin && activeTab === 'admin' && (
          <AdminPanel 
            loggedInUser={user}
          />
        )}
      </main>

      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" style={{ maxWidth: '650px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={20} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Manual de Uso & Funcionalidades</h3>
              </div>
              <button onClick={() => setShowHelpModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '6px', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
              
              <div>
                <h4 style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>1. Acesso e Segurança (Login)</h4>
                <p style={{ color: 'var(--text-secondary)' }}>
                  A aplicação é protegida por senha. Cada usuário cadastrado possui seu próprio banco de dados isolado na nuvem. O usuário administrador padrão é <strong>admin</strong>.
                </p>
              </div>

              <div>
                <h4 style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>2. Painel Administrativo (Exclusivo Admin)</h4>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Usuários administradores visualizam o menu <strong>Administração</strong> no menu inferior. Lá é possível:
                </p>
                <ul style={{ paddingLeft: '20px', marginTop: '6px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Cadastrar novos logins/nomes de usuário (como membros da família).</li>
                  <li>Inativar/Ativar contas (bloqueia o acesso sem excluir os dados históricos da nuvem).</li>
                  <li>Resetar senhas (limpa a senha atual, forçando o usuário a redefini-la no próximo acesso).</li>
                </ul>
              </div>

              <div>
                <h4 style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>3. Primeiro Acesso de Novos Perfis</h4>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Contas recém-criadas pelo administrador começam sem senha. No primeiro acesso, o usuário digita seu nome na tela de login, deixa a senha em branco e o sistema solicitará o cadastro de uma nova senha pessoal de segurança.
                </p>
              </div>

              <div>
                <h4 style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>4. Lançamento de Transações</h4>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Na aba <strong>Lançamentos</strong>, você cadastra suas receitas e despesas. As despesas são classificadas em:
                </p>
                <ul style={{ paddingLeft: '20px', marginTop: '6px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li><strong>Essenciais</strong>: Despesas fixas obrigatórias (Aluguel, Contas, Saúde). Target ideal: 50% da receita.</li>
                  <li><strong>Variáveis</strong>: Lazer, restaurante, compras supérfluas. Target ideal: 30% da receita.</li>
                  <li><strong>Poupança/Reserva</strong>: Dinheiro guardado ou investido. Target ideal: 20% da receita.</li>
                </ul>
              </div>

              <div>
                <h4 style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>5. Controle de Cartões de Crédito</h4>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Na aba <strong>Cartões</strong>, cadastre seus cartões e limites.
                </p>
                <ul style={{ paddingLeft: '20px', marginTop: '6px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li><strong>Cálculo por Fechamento</strong>: Lançar gastos no cartão calcula automaticamente se a despesa entra na fatura deste mês ou rola para o mês seguinte (caso o dia do gasto seja após o dia de fechamento do cartão).</li>
                  <li><strong>Parcelamento</strong>: Lance o valor total da compra e a quantidade de parcelas. O sistema distribui as parcelas nos meses seguintes de forma inteligente, nomeando-as como <i>"Parcela X/N - Total R$"</i>.</li>
                  <li><strong>Ver Extrato</strong>: Clique em <i>"Ver Fatura"</i> para abrir um extrato de cartão detalhado da competência escolhida.</li>
                </ul>
              </div>

              <div>
                <h4 style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>6. Dashboard de Metas</h4>
                <p style={{ color: 'var(--text-secondary)' }}>
                  A aba <strong>Painel</strong> mostra seus KPIs e a aderência das suas despesas às metas do orçamento. Ele acusa em tempo real (verde ou vermelho) se a porcentagem programada está sendo respeitada.
                </p>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', marginTop: '16px', paddingTop: '16px' }}>
              <button onClick={() => setShowHelpModal(false)} className="btn btn-primary" style={{ padding: '8px 20px' }}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
