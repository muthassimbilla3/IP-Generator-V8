import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, UsageLog } from '../lib/supabase';
import { User, Calendar, TrendingUp, Clock } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [stats, setStats] = useState({
    totalUsage: 0,
    todayUsage: 0,
    thisWeekUsage: 0,
    usageCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUsageData();
    }
  }, [user]);

  const fetchUsageData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch all usage logs
      const { data: logs, error } = await supabase
        .from('usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsageLogs(logs || []);

      // Calculate statistics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const totalUsage = logs?.reduce((sum, log) => sum + log.amount, 0) || 0;
      const todayUsage = logs?.filter(log => 
        new Date(log.created_at) >= today
      ).reduce((sum, log) => sum + log.amount, 0) || 0;
      const thisWeekUsage = logs?.filter(log => 
        new Date(log.created_at) >= weekAgo
      ).reduce((sum, log) => sum + log.amount, 0) || 0;
      const usageCount = logs?.length || 0;

      setStats({
        totalUsage,
        todayUsage,
        thisWeekUsage,
        usageCount
      });
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const remainingLimit = user ? user.daily_limit - stats.todayUsage : 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="bg-blue-100 rounded-full p-3">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user?.username}</h1>
              <p className="text-gray-600">
                {user?.role === 'admin' ? 'Admin' : 'User'} • 
                {user?.is_active ? ' Active' : ' Inactive'}
              </p>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Today's Usage</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">{stats.todayUsage}</div>
              <div className="text-xs text-blue-600">Remaining: {remainingLimit}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">This Week</span>
              </div>
              <div className="text-2xl font-bold text-green-900">{stats.thisWeekUsage}</div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">Total</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">{stats.totalUsage}</div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-600">Total Times</span>
              </div>
              <div className="text-2xl font-bold text-orange-900">{stats.usageCount}</div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Access Key</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <code className="text-sm font-mono">{user?.access_key}</code>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Daily Limit</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <span className="text-sm">{user?.daily_limit} IPs per day</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cooldown Period</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <span className="text-sm">
                  {user?.cooldown_minutes ? `${user.cooldown_minutes} ঘন্টা` : 'কোনো কুলডাউন নেই'}
                </span>
              </div>
            </div>
            {user?.next_generation_at && new Date(user.next_generation_at) > new Date() && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Next IP Generation</label>
                <div className="mt-1 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <span className="text-sm text-orange-700">
                    {new Date(user.next_generation_at).toLocaleString('bn-BD', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Created</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <span className="text-sm">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
            {user?.last_generation_at && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Last IP Generation</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <span className="text-sm">
                    {new Date(user.last_generation_at).toLocaleString('bn-BD', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  user?.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Usage History */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage History</h2>
          
          {usageLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No IP usage yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Number of IPs
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usageLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.amount} IPs
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
};