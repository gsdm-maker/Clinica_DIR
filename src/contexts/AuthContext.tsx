import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (action: string) => boolean;
  signUp: (email: string, password: string, name: string, role: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PERMISSIONS = {
  admin: ['all', 'manage_master_products'],
  bodega: ['manage_stock', 'entries', 'exits', 'view_reports', 'manage_master_products'],
  auditor: ['checklists', 'view_stock', 'view_reports'],
  enfermero: ['patient_medications', 'view_stock'],
  visualizador: ['view_stock', 'view_reports']
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthStateChange = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (!error && userData) {
          setUser(userData);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    handleAuthStateChange(); // Initial check

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Fetch user data from 'users' table only if signed in
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: userData, error }) => {
            if (!error) {
              setUser(userData || null);
            }
          });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Registro de usuario
  const signUp = async (email: string, password: string, name: string, role: string) => {
    try {
      console.log('[signUp] Iniciando registro', { email, name, role });
      // Crear usuario en auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });
      console.log('[signUp] Resultado signUp auth:', { data, error });
      if (error) throw error;
      const userId = data.user?.id;
      if (!userId) throw new Error('No se pudo obtener el id del usuario');
      // Insertar en tabla users
      const { error: errorInsert } = await supabase.from('users').insert([
        {
          id: userId,
          email,
          name,
          role,
          created_at: new Date().toISOString()
        }
      ]);
      console.log('[signUp] Resultado insert users:', { errorInsert });
      if (errorInsert) throw errorInsert;
      toast.success('Usuario registrado correctamente. Revisa tu correo para confirmar la cuenta.');
    } catch (err: any) {
      console.error('[signUp] Error:', err);
      toast.error(err.message || 'Error al registrar usuario');
      throw err;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('[login] Intentando login', { email });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      console.log('[login] Resultado login:', { data, error });
      if (error) throw error;

      // Forzar la actualización del usuario en el estado local
      // para evitar race conditions con el listener onAuthStateChange
      if (data.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userError) {
          toast.error('Error al obtener datos del usuario');
          throw userError;
        }

        if (userData) {
          setUser(userData); // Actualiza el estado inmediatamente
        }
      }
      
      toast.success('Inicio de sesión exitoso');
    } catch (error: any) {
      console.error('[login] Error:', error);
      toast.error(error.message || 'Error al iniciar sesión');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      toast.success('Sesión cerrada');
    } catch (error: any) {
      toast.error('Error al cerrar sesión');
    }
  };

  const hasPermission = (action: string) => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes('all') || permissions.includes(action);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, signUp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}