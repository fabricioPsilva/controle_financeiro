import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, RotateCcw, ShieldCheck, Users, RefreshCw, UserCheck, UserX } from 'lucide-react';
import { listAllUsers, createNewUser, resetUserPassword, deleteUserAccount, toggleUserStatus } from '../utils/storage';

export default function AdminPanel({ loggedInUser }) {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [newUsername, setNewUsername] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const list = await listAllUsers();
      setUsersList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const cleanName = newUsername.trim().toLowerCase();
    if (!cleanName) return;

    setActionMessage('');
    setErrorMsg('');

    try {
      const res = await createNewUser(cleanName, newIsAdmin);
      if (res.success) {
        setActionMessage(`Usuário "${cleanName}" cadastrado com sucesso!`);
        setNewUsername('');
        setNewIsAdmin(false);
        fetchUsers();
      } else {
        setErrorMsg(res.message || 'Erro ao criar usuário.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro de conexão ao criar usuário.');
    }
  };

  const handleToggleStatus = async (username, currentStatus) => {
    if (username === loggedInUser.username) {
      alert('Você não pode inativar o seu próprio usuário administrador.');
      return;
    }

    const nextStatus = !currentStatus;
    const msg = nextStatus 
      ? `Deseja reativar o acesso do usuário "${username}"?` 
      : `Deseja inativar o acesso do usuário "${username}"? Todos os dados financeiros dele serão preservados na nuvem.`;

    if (confirm(msg)) {
      setActionMessage('');
      setErrorMsg('');
      try {
        const res = await toggleUserStatus(username, nextStatus);
        if (res.success) {
          setActionMessage(`O status do usuário "${username}" foi alterado para ${nextStatus ? 'Ativo' : 'Inativo'}.`);
          fetchUsers();
        } else {
          setErrorMsg(res.message || 'Erro ao alternar status do usuário.');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('Erro de conexão ao alterar status.');
      }
    }
  };

  const handleResetPassword = async (username) => {
    if (confirm(`Deseja resetar a senha de "${username}"? Ele terá que redefinir a senha no próximo acesso.`)) {
      setActionMessage('');
      setErrorMsg('');
      try {
        const res = await resetUserPassword(username);
        if (res.success) {
          setActionMessage(`A senha do usuário "${username}" foi resetada. Ele definirá uma nova senha ao entrar.`);
          fetchUsers();
        } else {
          setErrorMsg(res.message || 'Erro ao resetar senha.');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('Erro de conexão ao resetar senha.');
      }
    }
  };

  const handleDeleteUser = async (username) => {
    if (username === loggedInUser.username) {
      alert('Você não pode excluir a sua própria conta ativa.');
      return;
    }

    if (confirm(`ATENÇÃO: Deseja excluir permanentemente o usuário "${username}" e TODOS os seus dados financeiros? Esta ação é irreversível.`)) {
      setActionMessage('');
      setErrorMsg('');
      try {
        const res = await deleteUserAccount(username);
        if (res.success) {
          setActionMessage(`Usuário "${username}" e seus dados financeiros foram excluídos.`);
          fetchUsers();
        } else {
          setErrorMsg(res.message || 'Erro ao excluir usuário.');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('Erro de conexão ao excluir usuário.');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Alert Banners */}
      {actionMessage && (
        <div className="card" style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--color-success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} /> <span>{actionMessage}</span>
        </div>
      )}

      {errorMsg && (
        <div className="card" style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--color-danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} /> <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-2">
        {/* Create User Form */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={18} /> Novo Perfil / Usuário
          </h2>
          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <label>Nome de Usuário (login)</label>
              <input 
                type="text" 
                value={newUsername} 
                onChange={(e) => setNewUsername(e.target.value)} 
                placeholder="Ex: maria, fabricio" 
                required 
              />
            </div>

            <div className="form-group" style={{ flexDirection: 'row', gap: '10px', alignItems: 'center', marginTop: '12px' }}>
              <input 
                type="checkbox" 
                id="isAdminCheckbox"
                checked={newIsAdmin} 
                onChange={(e) => setNewIsAdmin(e.target.checked)} 
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="isAdminCheckbox" style={{ marginBottom: 0, cursor: 'pointer' }}>
                Conceder privilégios de Administrador
              </label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>
              Criar Usuário
            </button>
          </form>
        </div>

        {/* User Listing */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} /> Usuários Cadastrados
            </h2>
            <button onClick={fetchUsers} className="btn btn-secondary" style={{ padding: '6px' }} title="Recarregar Lista">
              <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              Carregando lista de usuários...
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((user) => (
                    <tr key={user.username} style={{ opacity: user.is_active ? 1 : 0.6 }}>
                      <td style={{ fontWeight: 600 }}>{user.username}</td>
                      <td>
                        <span className={`badge ${user.is_admin ? 'badge-essential' : 'badge-variable'}`} style={{ fontSize: '10px' }}>
                          {user.is_admin ? 'Administrador' : 'Padrão'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${user.is_active ? 'badge-income' : 'badge-danger'}`} style={{ fontSize: '10px', background: user.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }}>
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleToggleStatus(user.username, user.is_active)}
                            className="btn btn-secondary"
                            style={{ padding: '6px', color: user.is_active ? 'var(--color-danger)' : 'var(--color-income)' }}
                            title={user.is_active ? 'Inativar Usuário' : 'Ativar Usuário'}
                            disabled={user.username === loggedInUser.username}
                          >
                            {user.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                          </button>
                          <button 
                            onClick={() => handleResetPassword(user.username)}
                            className="btn btn-secondary"
                            style={{ padding: '6px', color: 'var(--color-warning)' }}
                            title="Resetar Senha"
                          >
                            <RotateCcw size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.username)}
                            className="btn btn-secondary"
                            style={{ padding: '6px', color: 'var(--color-danger)' }}
                            title="Deletar Usuário"
                            disabled={user.username === loggedInUser.username}
                          >
                            <Trash2 size={13} />
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
      </div>
    </div>
  );
}
