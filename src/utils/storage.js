import { supabase, isSupabaseConfigured } from './supabaseClient';

const DEFAULT_PROFILES = ['Padrão'];

const DEFAULT_BUDGET_CONFIG = [
  { id: 'essential', label: 'Despesas Essenciais', target: 50, matchType: 'type', matchValue: 'essential' },
  { id: 'variable', label: 'Despesas Variáveis', target: 30, matchType: 'type', matchValue: 'variable' },
  { id: 'savings', label: 'Poupança / Reserva', target: 20, matchType: 'type', matchValue: 'savings' }
];

// Helper to hash passwords simply (client-side SHA-256 equivalent or simple obfuscation for security)
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
    // Seed default admin with no password
    const defaultUsers = [{ username: 'admin', password_hash: null, is_admin: true }];
    localStorage.setItem('fin_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  }
  return JSON.parse(users);
};

const saveLocalUsers = (users) => {
  localStorage.setItem('fin_users', JSON.stringify(users));
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
    return data;
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
    const updated = [...localUsers, { username: normUser, password_hash: null, is_admin: isAdmin }];
    saveLocalUsers(updated);
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('users')
      .insert({ username: normUser, password_hash: null, is_admin: isAdmin });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error creating user:', err);
    return { success: false, message: 'Erro ao cadastrar usuário no banco.' };
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
    // Delete authentication record
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('username', normUser);
    if (userError) throw userError;

    // Delete associated data record
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
  // Profiles list is derived from the users list
  const users = await listAllUsers();
  return users.map(u => u.username);
};

export const saveProfiles = async (profiles) => {
  // Handled dynamically by creating new users via the AdminPanel
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
