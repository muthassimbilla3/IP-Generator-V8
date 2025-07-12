import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Key, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const [accessKey, setAccessKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKey.trim()) return;

    setLoading(true);
    await login(accessKey.trim());
    setLoading(false);
  };

  const toggleShowKey = () => {
    setShowKey(!showKey);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
            <Key className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            IP Generator System
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your access key to continue
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="access-key" className="sr-only">
              Access Key
            </label>
            <div className="relative">
              <input
                id="access-key"
                name="access-key"
                type={showKey ? "text" : "password"}
                required
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your access key"
              />
              <Key className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              <button
                type="button"
                onClick={toggleShowKey}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !accessKey.trim()}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>Login</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
