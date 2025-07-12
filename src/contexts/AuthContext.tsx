import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, User } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (accessKey: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from Supabase
  const fetchUserData = async (accessKey: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('access_key', accessKey)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          const userData = await fetchUserData(parsedUser.access_key);
          
          if (userData) {
            setUser(userData);
            // Update stored user data with latest from server
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            // If user not found or inactive, clear local storage
            localStorage.removeItem('user');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error in initializeAuth:', error);
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (accessKey: string): Promise<boolean> => {
    try {
      const userData = await fetchUserData(accessKey);

      if (!userData) {
        toast.error('Invalid access key');
        return false;
      }

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      toast.success(`Welcome, ${userData.username}!`);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
      return false;
    }
  };

  const logout = () => {
    try {
      setUser(null);
      localStorage.removeItem('user');
      toast.success('Successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error logging out');
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
