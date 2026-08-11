import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  CreditCard as CardIcon, 
  Users, 
  User, 
  Wallet,
  ChevronLeft,
  ChevronRight
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
import Profiles from './components/Profiles';

function App() {
  const [activeProfile, setActiveProfile] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, transactions, cards, profiles
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().substring(0, 7); // "YYYY-MM"
  });
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load active profile and its data on start
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      const profile = getActiveProfile();
      setActiveProfile(profile);
      const data = await getProfileData(profile);
      setProfileData(data);
      setLoading(false);
    };
    initApp();
  }, []);

  // Handle changing active profile
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

  if (!profileData) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>Carregando dados...</div>
      </div>
    );
  }

  if (loading) {
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

        {/* Quick profile switch badge */}
        <div 
          className="profile-badge" 
          onClick={() => setActiveTab('profiles')}
          title="Clique para gerenciar perfis"
        >
          <User size={14} />
          <span>Perfil: {activeProfile}</span>
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
        <button 
          className={`nav-tab ${activeTab === 'profiles' ? 'active' : ''}`}
          onClick={() => setActiveTab('profiles')}
        >
          <Users size={16} /> Perfis / Usuários
        </button>
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
        {activeTab === 'profiles' && (
          <Profiles 
            activeProfile={activeProfile} 
            onProfileChange={handleProfileChange} 
          />
        )}
      </main>
    </div>
  );
}

export default App;
