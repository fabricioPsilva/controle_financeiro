import React, { useState } from 'react';
import { Wallet, Key, User, ShieldAlert, CheckCircle, Fingerprint } from 'lucide-react';
import { loginUser, registerUserPassword, registerSelfUser, loginUserWithBiometrics } from '../utils/storage';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // View mode: 'login' | 'signup' | 'first_access'
  const [viewMode, setViewMode] = useState('login');

  // Biometric login states
  const [showBiometricRegisterPrompt, setShowBiometricRegisterPrompt] = useState(false);
  const [tempUserForBiometrics, setTempUserForBiometrics] = useState(null);
  const isBiometricSupported = !!window.PublicKeyCredential;

  // Forms state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const validatePasswordStrength = (pass) => {
    if (!pass || pass.length < 8) {
      return 'A senha deve conter pelo menos 8 caracteres.';
    }
    if (!/[A-Z]/.test(pass)) {
      return 'A senha deve conter pelo menos uma letra maiúscula.';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) {
      return 'A senha deve conter pelo menos um caractere especial (Ex: !, @, #, $, %, etc).';
    }
    return null;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const res = await loginUser(username.trim(), password);
      
      if (res.success) {
        if (isBiometricSupported && localStorage.getItem('fin_bio_reg_' + res.user.username) !== 'true') {
          setTempUserForBiometrics(res.user);
          setShowBiometricRegisterPrompt(true);
        } else {
          onLoginSuccess(res.user);
        }
      } else if (res.code === 'FIRST_ACCESS') {
        setViewMode('first_access');
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

  const handleRegisterBiometrics = async () => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const createCredentialOptions = {
        publicKey: {
          challenge: challenge,
          rp: {
            name: "Finanças Hub",
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode(tempUserForBiometrics.username),
            name: tempUserForBiometrics.username,
            displayName: tempUserForBiometrics.username
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 60000
        }
      };

      const credential = await navigator.credentials.create(createCredentialOptions);
      if (credential) {
        localStorage.setItem('fin_bio_reg_' + tempUserForBiometrics.username, 'true');
        localStorage.setItem('fin_bio_cred_id_' + tempUserForBiometrics.username, btoa(String.fromCharCode(...new Uint8Array(credential.rawId))));
        setSuccessMsg('Biometria ativada com sucesso para este aparelho!');
        setTimeout(() => {
          onLoginSuccess(tempUserForBiometrics);
        }, 1500);
      }
    } catch (err) {
      console.error('Error registering biometrics:', err);
      onLoginSuccess(tempUserForBiometrics);
    } finally {
      setShowBiometricRegisterPrompt(false);
    }
  };

  const handleLoginWithBiometrics = async () => {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      setErrorMsg('Digite seu usuário primeiro para entrar com biometria.');
      return;
    }

    const credIdBase64 = localStorage.getItem('fin_bio_cred_id_' + cleanUser);
    if (!credIdBase64) {
      setErrorMsg('Nenhuma biometria cadastrada neste aparelho para este usuário.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const credId = new Uint8Array(
        atob(credIdBase64)
          .split("")
          .map((c) => c.charCodeAt(0))
      );

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          allowCredentials: [{
            id: credId,
            type: "public-key"
          }],
          userVerification: "required",
          timeout: 60000
        }
      });

      if (assertion) {
        const res = await loginUserWithBiometrics(cleanUser);
        if (res.success) {
          onLoginSuccess(res.user);
        } else {
          setErrorMsg(res.message);
        }
      }
    } catch (err) {
      console.error('Biometric authentication failed:', err);
      setErrorMsg('Falha na autenticação biométrica.');
    } finally {
      setLoading(false);
    }
  };

  const handleFirstAccessSubmit = async (e) => {
    e.preventDefault();
    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      setErrorMsg(strengthError);
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
        const loginRes = await loginUser(username.trim(), newPassword);
        if (loginRes.success) {
          onLoginSuccess(loginRes.user);
        } else {
          setErrorMsg('Senha cadastrada. Por favor, faça login.');
          setViewMode('login');
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

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) return;

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      setErrorMsg(strengthError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await registerSelfUser(cleanUser, newPassword);
      if (res.success) {
        setSuccessMsg('Cadastro realizado com sucesso! Sua conta foi enviada e está aguardando aprovação do administrador.');
        setViewMode('login');
        setUsername(cleanUser);
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(res.message || 'Erro ao realizar o cadastro.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao realizar o cadastro.');
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
            {viewMode === 'first_access' && 'Defina sua senha de primeiro acesso'}
            {viewMode === 'login' && 'Faça login para gerenciar suas contas'}
            {viewMode === 'signup' && 'Solicite acesso ao sistema criando sua conta'}
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

        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: 'var(--color-income)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login View */}
        {viewMode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label>Nome do Usuário</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Usuário" 
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
                  placeholder="Senha" 
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

            {isBiometricSupported && localStorage.getItem('fin_bio_cred_id_' + username.trim().toLowerCase()) && (
              <button 
                type="button" 
                onClick={handleLoginWithBiometrics}
                className="btn btn-secondary" 
                style={{ width: '100%', padding: '12px', fontWeight: 600, marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={loading}
              >
                <Fingerprint size={16} /> Entrar com Biometria
              </button>
            )}

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Não tem uma conta? </span>
              <button 
                type="button" 
                onClick={() => {
                  setViewMode('signup');
                  setErrorMsg('');
                  setSuccessMsg('');
                  setNewPassword('');
                  setConfirmPassword('');
                }} 
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Solicitar Acesso
              </button>
            </div>
          </form>
        )}

        {/* Sign Up View */}
        {viewMode === 'signup' && (
          <form onSubmit={handleSignUpSubmit}>
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(99, 102, 241, 0.1)', border: '1px dashed rgba(99, 102, 241, 0.3)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '13px', color: 'var(--text-primary)' }}>
              <span>Insira seus dados para solicitar o cadastro. O acesso precisará ser validado pelo administrador.</span>
            </div>

            <div className="form-group">
              <label>Nome do Usuário (login)</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Usuário" 
                  style={{ paddingLeft: '38px' }}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Sua Senha</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 especial"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Confirmar Senha</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="Repita a senha"
                required
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => {
                  setViewMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
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
                {loading ? 'Cadastrando...' : 'Cadastrar'}
              </button>
            </div>
          </form>
        )}

        {/* First Access View */}
        {viewMode === 'first_access' && (
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
                placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 especial"
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
                  setViewMode('login');
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

      {/* Biometrics Registration Prompt Modal */}
      {showBiometricRegisterPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '24px', textAlign: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              margin: '0 auto 16px'
            }}>
              <Fingerprint size={32} />
            </div>
            
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>Ativar Acesso por Biometria?</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
              Deseja cadastrar a biometria (digital ou reconhecimento facial) deste dispositivo para entrar mais rápido no sistema nas próximas vezes?
            </p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => {
                  setShowBiometricRegisterPrompt(false);
                  onLoginSuccess(tempUserForBiometrics);
                }} 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
              >
                Agora não
              </button>
              <button 
                onClick={handleRegisterBiometrics}
                className="btn btn-primary" 
                style={{ flex: 1 }}
              >
                Ativar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
