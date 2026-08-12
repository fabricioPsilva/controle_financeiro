import React, { useState } from 'react';
import { Wallet, Key, User, ShieldAlert } from 'lucide-react';
import { loginUser, registerUserPassword } from '../utils/storage';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // First access state
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setLoading(true);
    setErrorMsg('');
    
    try {
      const res = await loginUser(username.trim(), password);
      
      if (res.success) {
        onLoginSuccess(res.user);
      } else if (res.code === 'FIRST_ACCESS') {
        setIsFirstAccess(true);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleFirstAccessSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('A senha deve conter pelo menos 4 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await registerUserPassword(username.trim(), newPassword);
      if (res.success) {
        // Automatically log in
        const loginRes = await loginUser(username.trim(), newPassword);
        if (loginRes.success) {
          onLoginSuccess(loginRes.user);
        } else {
          setErrorMsg('Senha cadastrada. Por favor, faça login.');
          setIsFirstAccess(false);
          setPassword('');
        }
      } else {
        setErrorMsg(res.message || 'Erro ao salvar a senha.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao cadastrar senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: '20px'
    }}>
      <div className="card" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '32px',
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header/Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
          }}>
            <Wallet size={28} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Finanças Hub
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {isFirstAccess ? 'Defina sua senha de primeiro acesso' : 'Faça login para gerenciar suas contas'}
          </p>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--color-danger)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        {!isFirstAccess ? (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label>Nome do Usuário</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Ex: admin, fabricio" 
                  style={{ paddingLeft: '38px' }}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Senha</label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Sua senha" 
                  style={{ paddingLeft: '38px' }}
                  disabled={loading}
                />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Se for seu primeiro acesso, deixe a senha em branco e digite seu usuário para cadastrá-la.
              </p>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px', fontWeight: 600, marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          /* First Access Setup Form */
          <form onSubmit={handleFirstAccessSubmit}>
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(99, 102, 241, 0.1)', border: '1px dashed rgba(99, 102, 241, 0.3)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '13px', color: 'var(--text-primary)' }}>
              <span>Olá <strong>{username}</strong>! Este é seu primeiro login. Por favor, crie uma senha para proteger seus dados.</span>
            </div>

            <div className="form-group">
              <label>Nova Senha</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Mínimo 4 caracteres"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Confirmar Nova Senha</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="Repita a senha"
                required
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => {
                  setIsFirstAccess(false);
                  setErrorMsg('');
                }}
                disabled={loading}
              >
                Voltar
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ flex: 2 }}
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Definir Senha'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
