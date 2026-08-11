import React, { useState, useEffect } from 'react';
import { User, Plus, Trash2, Check } from 'lucide-react';
import { getProfiles, saveProfiles, getProfileData, saveProfileData } from '../utils/storage';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

export default function Profiles({ activeProfile, onProfileChange }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProfileName, setNewProfileName] = useState('');

  // Load profiles on mount
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      const data = await getProfiles();
      setProfiles(data);
      setLoading(false);
    };
    fetchProfiles();
  }, []);

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    const trimmed = newProfileName.trim();
    if (!trimmed) return;
    if (profiles.includes(trimmed)) {
      alert('Já existe um perfil com esse nome.');
      return;
    }
    
    setLoading(true);
    const updated = [...profiles, trimmed];
    setProfiles(updated);
    await saveProfiles(updated);
    
    // Initialize profile data on DB/local
    await getProfileData(trimmed);
    
    setNewProfileName('');
    onProfileChange(trimmed);
    setLoading(false);
  };

  const handleDeleteProfile = async (profileToDelete) => {
    if (profiles.length <= 1) {
      alert('Você deve manter pelo menos um perfil ativo.');
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o perfil "${profileToDelete}" e todos os seus dados financeiros? Esta ação não pode ser desfeita.`)) {
      setLoading(true);
      const updated = profiles.filter(p => p !== profileToDelete);
      setProfiles(updated);
      await saveProfiles(updated);
      
      // Delete database/local profile data
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('profiles_data')
            .delete()
            .eq('profile_name', profileToDelete);
          if (error) throw error;
        } catch (err) {
          console.error(`Error deleting profile ${profileToDelete} from Supabase:`, err);
        }
      } else {
        localStorage.removeItem(`fin_data_${profileToDelete}`);
      }
      
      // If deleted active, switch to first remaining profile
      if (activeProfile === profileToDelete) {
        onProfileChange(updated[0]);
      }
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Sincronizando perfis...
      </div>
    );
  }

  return (
    <div className="grid grid-2">
      <div className="card">
        <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Criar Novo Perfil</h2>
        <form onSubmit={handleCreateProfile}>
          <div className="form-group">
            <label>Nome do Perfil / Usuário</label>
            <input 
              type="text" 
              placeholder="Ex: Fabricio, Maria, Família..."
              value={newProfileName} 
              onChange={(e) => setNewProfileName(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            <Plus size={16} /> Criar Perfil
          </button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Perfis Disponíveis</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {profiles.map((profile) => (
            <div 
              key={profile} 
              className="card" 
              style={{ 
                padding: '12px 16px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderColor: activeProfile === profile ? 'var(--color-primary)' : 'var(--border-color)',
                background: activeProfile === profile ? 'var(--bg-card-hover)' : 'var(--bg-card)'
              }}
            >
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
                onClick={() => onProfileChange(profile)}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: activeProfile === profile ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}>
                  <User size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{profile}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {activeProfile === profile ? 'Perfil Ativo' : 'Clique para selecionar'}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeProfile === profile && (
                  <span style={{ color: 'var(--color-success)', marginRight: '8px' }}>
                    <Check size={18} />
                  </span>
                )}
                {profiles.length > 1 && (
                  <button 
                    onClick={() => handleDeleteProfile(profile)} 
                    className="btn btn-secondary" 
                    style={{ padding: '8px', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                    title="Excluir Perfil"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
