import { supabase, isSupabaseConfigured } from './supabaseClient';

const DEFAULT_PROFILES = ['Padrão'];

const DEFAULT_BUDGET_CONFIG = [
  { id: 'essential', label: 'Despesas Essenciais', target: 50, matchType: 'type', matchValue: 'essential' },
  { id: 'variable', label: 'Despesas Variáveis', target: 30, matchType: 'type', matchValue: 'variable' },
  { id: 'savings', label: 'Poupança / Reserva', target: 20, matchType: 'type', matchValue: 'savings' }
];

// Helper to hash passwords simply
const hashPassword = async (password) => {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Local storage user fallback helpers
const getLocalUsers = () => {
  const users = localStorage.getItem('fin_users');
  if (!users) {
    const defaultUsers = [{ username: 'admin', password_hash: null, is_admin: true, is_active: true, is_pending: false, expiration_date: null, tour_done: false }];
    localStorage.setItem('fin_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  }
  
  const parsed = JSON.parse(users);
  return parsed.map(u => ({ 
    ...u, 
    is_active: u.is_active !== undefined ? u.is_active : true,
    is_pending: u.is_pending !== undefined ? u.is_pending : false,
    expiration_date: u.expiration_date !== undefined ? u.expiration_date : null,
    tour_done: u.tour_done !== undefined ? u.tour_done : false
  }));
};

const saveLocalUsers = (users) => {
  localStorage.setItem('fin_users', JSON.stringify(users));
};

const formatDateBR = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// ----------------------------------------------------
// USER AUTHENTICATION & ADMIN API
// ----------------------------------------------------

export const loginUser = async (username, password) => {
  const normUser = username.trim().toLowerCase();
  
  if (!isSupabaseConfigured) {
    const localUsers = getLocalUsers();
    const user = localUsers.find(u => u.username === normUser);
    if (!user) return { success: false, message: 'Usuário não cadastrado.' };

    const todayStr = new Date().toISOString().split('T')[0];
    if (user.expiration_date && todayStr > user.expiration_date) {
      const updated = localUsers.map(u => u.username === normUser ? { ...u, is_active: false } : u);
      saveLocalUsers(updated);
      return { success: false, message: `Sua conta expirou em ${formatDateBR(user.expiration_date)}. Entre em contato com o administrador.` };
    }

    if (user.is_pending) {
      return { success: false, message: 'Cadastro realizado! Sua conta está aguardando aprovação do administrador.' };
    }

    if (!user.is_active) return { success: false, message: 'Esta conta está inativa. Entre em contato com o administrador.' };
    
    if (user.password_hash === null) {
      return { success: false, code: 'FIRST_ACCESS', user };
    }
    
    const hashed = await hashPassword(password);
    if (user.password_hash === hashed) {
      return { success: true, user };
    }
    return { success: false, message: 'Senha incorreta.' };
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', normUser)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, message: 'Usuário não cadastrado.' };

    const todayStr = new Date().toISOString().split('T')[0];
    if (data.expiration_date && todayStr > data.expiration_date) {
      await toggleUserStatus(data.username, false);
      return { success: false, message: `Sua conta expirou em ${formatDateBR(data.expiration_date)}. Entre em contato com o administrador.` };
    }

    if (data.is_pending) {
      return { success: false, message: 'Cadastro realizado! Sua conta está aguardando aprovação do administrador.' };
    }

    if (!data.is_active) return { success: false, message: 'Esta conta está inativa. Entre em contato com o administrador.' };

    if (data.password_hash === null) {
      return { success: false, code: 'FIRST_ACCESS', user: data };
    }

    const hashed = await hashPassword(password);
    if (data.password_hash === hashed) {
      return { success: true, user: data };
    }
    return { success: false, message: 'Senha incorreta.' };
  } catch (err) {
    console.error('Error logging in user:', err);
    return { success: false, message: 'Erro na conexão com o banco de dados.' };
  }
};

export const loginUserWithBiometrics = async (username) => {
  const normUser = username.trim().toLowerCase();
  
  if (!isSupabaseConfigured) {
    const localUsers = getLocalUsers();
    const user = localUsers.find(u => u.username === normUser);
    if (!user) return { success: false, message: 'Usuário não cadastrado.' };

    const todayStr = new Date().toISOString().split('T')[0];
    if (user.expiration_date && todayStr > user.expiration_date) {
      const updated = localUsers.map(u => u.username === normUser ? { ...u, is_active: false } : u);
      saveLocalUsers(updated);
      return { success: false, message: `Sua conta expirou em ${formatDateBR(user.expiration_date)}. Entre em contato com o administrador.` };
    }

    if (user.is_pending) {
      return { success: false, message: 'Cadastro realizado! Sua conta está aguardando aprovação do administrador.' };
    }

    if (!user.is_active) return { success: false, message: 'Esta conta está inativa. Entre em contato com o administrador.' };
    
    if (user.password_hash === null) {
      return { success: false, message: 'Cadastre sua senha primeiro antes de ativar a biometria.' };
    }
    
    return { success: true, user };
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', normUser)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, message: 'Usuário não cadastrado.' };

    const todayStr = new Date().toISOString().split('T')[0];
    if (data.expiration_date && todayStr > data.expiration_date) {
      await toggleUserStatus(data.username, false);
      return { success: false, message: `Sua conta expirou em ${formatDateBR(data.expiration_date)}. Entre em contato com o administrador.` };
    }

    if (data.is_pending) {
      return { success: false, message: 'Cadastro realizado! Sua conta está aguardando aprovação do administrador.' };
    }

    if (!data.is_active) return { success: false, message: 'Esta conta está inativa. Entre em contato com o administrador.' };

    if (data.password_hash === null) {
      return { success: false, message: 'Cadastre sua senha primeiro antes de ativar a biometria.' };
    }

    return { success: true, user: data };
  } catch (err) {
    console.error('Error logging in user with biometrics:', err);
    return { success: false, message: 'Erro na conexão com o banco de dados.' };
  }
};

export const registerUserPassword = async (username, password) => {
  const normUser = username.trim().toLowerCase();
  const hashed = await hashPassword(password);

  if (!isSupabaseConfigured) {
    const localUsers = getLocalUsers();
    const updated = localUsers.map(u => {
      if (u.username === normUser) {
        return { ...u, password_hash: hashed };
      }
      return u;
    });
    saveLocalUsers(updated);
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ password_hash: hashed })
      .eq('username', normUser);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error registering password:', err);
    return { success: false, message: 'Erro ao registrar a senha no banco.' };
  }
};

export const listAllUsers = async () => {
  if (!isSupabaseConfigured) {
    return getLocalUsers();
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('username', { ascending: true });
    
    if (error) throw error;
    return data.map(u => ({ 
      ...u, 
      is_active: u.is_active !== undefined ? u.is_active : true,
      is_pending: u.is_pending !== undefined ? u.is_pending : false,
      expiration_date: u.expiration_date || null,
      tour_done: u.tour_done !== undefined ? u.tour_done : false
    }));
  } catch (err) {
    console.error('Error listing users:', err);
    return getLocalUsers();
  }
};

export const createNewUser = async (username, isAdmin = false) => {
  const normUser = username.trim().toLowerCase();

  if (!isSupabaseConfigured) {
    const localUsers = getLocalUsers();
    if (localUsers.some(u => u.username === normUser)) {
      return { success: false, message: 'Usuário já existe.' };
    }
    const updated = [...localUsers, { username: normUser, password_hash: null, is_admin: isAdmin, is_active: true, is_pending: false, expiration_date: null, tour_done: false }];
    saveLocalUsers(updated);
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('users')
      .insert({ username: normUser, password_hash: null, is_admin: isAdmin, is_active: true, is_pending: false, expiration_date: null, tour_done: false });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error creating user:', err);
    return { success: false, message: 'Erro ao cadastrar usuário no banco.' };
  }
};

export const registerSelfUser = async (username, password) => {
  const normUser = username.trim().toLowerCase();
  const hashed = await hashPassword(password);

  if (!isSupabaseConfigured) {
    const localUsers = getLocalUsers();
    if (localUsers.some(u => u.username === normUser)) {
      return { success: false, message: 'Nome de usuário já cadastrado.' };
    }
    const updated = [...localUsers, { 
      username: normUser, 
      password_hash: hashed, 
      is_admin: false, 
      is_active: false, 
      is_pending: true,
      expiration_date: null,
      tour_done: false 
    }];
    saveLocalUsers(updated);
    return { success: true };
  }

  try {
    const { data: existing } = await supabase
      .from('users')
      .select('username')
      .eq('username', normUser)
      .maybeSingle();

    if (existing) {
      return { success: false, message: 'Nome de usuário já cadastrado.' };
    }

    const { error } = await supabase
      .from('users')
      .insert({ 
        username: normUser, 
        password_hash: hashed, 
        is_admin: false, 
        is_active: false, 
        is_pending: true,
        expiration_date: null,
        tour_done: false 
      });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error self registering user:', err);
    return { success: false, message: 'Erro ao realizar o cadastro no banco.' };
  }
};

export const approveUserRequest = async (username, expirationDate = null) => {
  const normUser = username.trim().toLowerCase();

  if (!isSupabaseConfigured) {
    const localUsers = getLocalUsers();
    const updated = localUsers.map(u => {
      if (u.username === normUser) {
        return { 
          ...u, 
          is_active: true, 
          is_pending: false, 
          expiration_date: expirationDate || null 
        };
      }
      return u;
    });
    saveLocalUsers(updated);
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        is_active: true, 
        is_pending: false, 
        expiration_date: expirationDate || null 
      })
      .eq('username', normUser);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error approving user request:', err);
    return { success: false, message: 'Erro ao aprovar usuário no banco.' };
  }
};

export const toggleUserStatus = async (username, isActive) => {
  const normUser = username.trim().toLowerCase();

  if (!isSupabaseConfigured) {
    const localUsers = getLocalUsers();
    const updated = localUsers.map(u => {
      if (u.username === normUser) {
        return { ...u, is_active: isActive };
      }
      return u;
    });
    saveLocalUsers(updated);
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ is_active: isActive })
      .eq('username', normUser);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error toggling user status:', err);
    return { success: false, message: 'Erro ao alterar status do usuário no banco.' };
  }
};

export const completeUserTour = async (username) => {
  const normUser = username.trim().toLowerCase();

  if (!isSupabaseConfigured) {
    const localUsers = getLocalUsers();
    const updated = localUsers.map(u => {
      if (u.username === normUser) {
        return { ...u, tour_done: true };
      }
      return u;
    });
    saveLocalUsers(updated);
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ tour_done: true })
      .eq('username', normUser);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error setting tour_done status:', err);
    return { success: false };
  }
};

export const resetUserPassword = async (username) => {
  const normUser = username.trim().toLowerCase();

  if (!isSupabaseConfigured) {
    const localUsers = getLocalUsers();
    const updated = localUsers.map(u => {
      if (u.username === normUser) {
        return { ...u, password_hash: null };
      }
      return u;
    });
    saveLocalUsers(updated);
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ password_hash: null })
      .eq('username', normUser);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error resetting password:', err);
    return { success: false, message: 'Erro ao resetar senha no banco.' };
  }
};

export const deleteUserAccount = async (username) => {
  const normUser = username.trim().toLowerCase();

  if (!isSupabaseConfigured) {
    const localUsers = getLocalUsers();
    const updated = localUsers.filter(u => u.username !== normUser);
    saveLocalUsers(updated);
    localStorage.removeItem(`fin_data_${normUser}`);
    return { success: true };
  }

  try {
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('username', normUser);
    if (userError) throw userError;

    const { error: dataError } = await supabase
      .from('profiles_data')
      .delete()
      .eq('profile_name', normUser);
    if (dataError) throw dataError;

    return { success: true };
  } catch (err) {
    console.error('Error deleting user account:', err);
    return { success: false, message: 'Erro ao deletar usuário do banco.' };
  }
};

// ----------------------------------------------------
// PROFILE DATA STORAGE (SANDBOXED BY USERNAME)
// ----------------------------------------------------

export const getProfiles = async () => {
  const users = await listAllUsers();
  return users.map(u => u.username);
};

export const saveProfiles = async (profiles) => {
  // Handled dynamically
};

export const getActiveProfile = () => {
  const active = localStorage.getItem('fin_active_profile');
  if (!active) {
    localStorage.setItem('fin_active_profile', 'admin');
    return 'admin';
  }
  return active;
};

export const setActiveProfile = (profileName) => {
  localStorage.setItem('fin_active_profile', profileName);
};

export const getProfileData = async (profileName) => {
  const defaultData = {
    transactions: [],
    creditCards: [],
    budgetConfig: [...DEFAULT_BUDGET_CONFIG]
  };

  if (!isSupabaseConfigured) {
    const key = `fin_data_${profileName}`;
    const localData = localStorage.getItem(key);
    if (!localData) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    return sanitizeProfileData(JSON.parse(localData));
  }

  try {
    const { data, error } = await supabase
      .from('profiles_data')
      .select('data')
      .eq('profile_name', profileName)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      await saveProfileData(profileName, defaultData);
      return defaultData;
    }

    return sanitizeProfileData(data.data);
  } catch (err) {
    console.error(`Error fetching profile data for ${profileName} from Supabase:`, err);
    const key = `fin_data_${profileName}`;
    const localData = localStorage.getItem(key);
    return localData ? sanitizeProfileData(JSON.parse(localData)) : defaultData;
  }
};

export const saveProfileData = async (profileName, data) => {
  if (!isSupabaseConfigured) {
    const key = `fin_data_${profileName}`;
    localStorage.setItem(key, JSON.stringify(data));
    return;
  }

  try {
    const { error } = await supabase
      .from('profiles_data')
      .upsert({
        profile_name: profileName,
        data: data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'profile_name' });

    if (error) throw error;
  } catch (err) {
    console.error(`Error saving profile data for ${profileName} to Supabase:`, err);
    const key = `fin_data_${profileName}`;
    localStorage.setItem(key, JSON.stringify(data));
  }
};

const sanitizeProfileData = (parsed) => {
  if (!parsed.transactions) parsed.transactions = [];
  if (!parsed.creditCards) parsed.creditCards = [];
  
  if (!parsed.budgetConfig) {
    parsed.budgetConfig = [...DEFAULT_BUDGET_CONFIG];
  } else if (!Array.isArray(parsed.budgetConfig)) {
    parsed.budgetConfig = [
      { id: 'essential', label: 'Despesas Essenciais', target: parsed.budgetConfig.essential || 50, matchType: 'type', matchValue: 'essential' },
      { id: 'variable', label: 'Despesas Variáveis', target: parsed.budgetConfig.variable || 30, matchType: 'type', matchValue: 'variable' },
      { id: 'savings', label: 'Poupança / Reserva', target: parsed.budgetConfig.savings || 20, matchType: 'type', matchValue: 'savings' }
    ];
  }
  return parsed;
};
