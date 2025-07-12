import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const Profile: React.FC = () => {
  const { user } = useAuth();

  // Redirect admin and manager to admin page
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'manager')) {
      window.location.href = '/admin';
    }
  }, [user]);

  // Don't render anything for admin/manager users
  if (user && (user.role === 'admin' || user.role === 'manager')) {
    return null;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">User Profile</h1>
          
          <div className="bg-green-50 rounded-lg p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-green-800 mb-2">
                Welcome, {user?.username}!
              </h2>
              <p className="text-green-700">
                You have unlimited access to the IP Generator system.
              </p>
              <p className="text-green-600 text-sm mt-2">
                No daily limits • No cooldowns • Generate as many IPs as you need
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};