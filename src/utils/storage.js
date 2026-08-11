import { supabase, isSupabaseConfigured } from './supabaseClient';

const DEFAULT_PROFILES = ['Padrão'];

const DEFAULT_BUDGET_CONFIG = [
  { id: 'essential', label: 'Despesas Essenciais', target: 50, matchType: 'type', matchValue: 'essential' },
  { id: 'variable', label: 'Despesas Variáveis', target: 30, matchType: 'type', matchValue: 'variable' },
  { id: 'savings', label: 'Poupança / Reserva', target: 20, matchType: 'type', matchValue: 'savings' }
];

// Helpers to handle fallback to localStorage
const getLocalProfiles = () => {
  const profiles = localStorage.getItem('fin_profiles');
  if (!profiles) {
    localStorage.setItem('fin_profiles', JSON.stringify(DEFAULT_PROFILES));
    return DEFAULT_PROFILES;
  }
  return JSON.parse(profiles);
};

export const getProfiles = async () => {
  if (!isSupabaseConfigured) {
    return getLocalProfiles();
  }

  try {
    const { data, error } = await supabase
      .from('profiles_data')
      .select('profile_name');
    
    if (error) throw error;

    if (!data || data.length === 0) {
      // Seed default profile
      await saveProfileData(DEFAULT_PROFILES[0], {
        transactions: [],
        creditCards: [],
        budgetConfig: [...DEFAULT_BUDGET_CONFIG]
      });
      return DEFAULT_PROFILES;
    }
    return data.map(row => row.profile_name);
  } catch (err) {
    console.error('Error fetching profiles from Supabase, falling back to local:', err);
    return getLocalProfiles();
  }
};

export const saveProfiles = async (profiles) => {
  if (!isSupabaseConfigured) {
    localStorage.setItem('fin_profiles', JSON.stringify(profiles));
    return;
  }
  // With Supabase, profiles are created dynamically by inserting a profile row,
  // so no explicit sync is needed for the global list of profiles.
};

export const getActiveProfile = () => {
  const active = localStorage.getItem('fin_active_profile');
  if (!active) {
    localStorage.setItem('fin_active_profile', DEFAULT_PROFILES[0]);
    return DEFAULT_PROFILES[0];
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
      // Create profile row if it doesn't exist
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

// Helper to sanitize and migrate schemas
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
