import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, User, UsageLog } from '../lib/supabase';
import { Users, Activity, TrendingUp, Calendar, Database, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import QuickLimitSetter from '../components/QuickLimitSetter';
import CooldownManager from '../components/CooldownManager';

interface UserStats {
  user: User;
  totalUsage: number;
  todayUsage: number;
  thisWeekUsage: number;
  usageCount: number;
  lastUsed?: string;
}

export const Status: React.FC = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProxies: 0,
    usedProxies: 0
  });

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      fetchUserStats();
      fetchSystemStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Filter users based on current user role
      const filteredUsers = users?.filter(userData => {
        if (user?.role === 'admin') {
          return true; // Admin can see all users
        } else if (user?.role === 'manager') {
          return userData.role !== 'admin'; // Manager cannot see admin users
        }
        return false;
      }) || [];

      // Fetch all usage logs
      const { data: usageLogs, error: logsError } = await supabase
        .from('usage_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      // Calculate stats for each user
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats: UserStats[] = filteredUsers.map(userData => {
        const userLogs = usageLogs?.filter(log => log.user_id === userData.id) || [];
        
        const totalUsage = userLogs.reduce((sum, log) => sum + log.amount, 0);
        const todayUsage = userLogs
          .filter(log => new Date(log.created_at) >= today)
          .reduce((sum, log) => sum + log.amount, 0);
        const thisWeekUsage = userLogs
          .filter(log => new Date(log.created_at) >= weekAgo)
          .reduce((sum, log) => sum + log.amount, 0);
        const usageCount = userLogs.length;
        const lastUsed = userLogs[0]?.created_at;

        return {
          user: userData,
          totalUsage,
          todayUsage,
          thisWeekUsage,
          usageCount,
          lastUsed
        };
      });

      setUserStats(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      // Count users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Count proxies
      const { count: totalProxies } = await supabase
        .from('proxies')
        .select('*', { count: 'exact', head: true });

      const { count: usedProxies } = await supabase
        .from('proxies')
        .select('*', { count: 'exact', head: true })
        .eq('is_used', true);

      setSystemStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalProxies: totalProxies || 0,
        usedProxies: usedProxies || 0
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const deleteAllProxies = async () => {
    if (!confirm(`Are you sure you want to delete all ${systemStats.totalProxies} proxies from the database? This action cannot be undone.`)) {
      return;
    }

    if (!confirm('This will permanently delete all proxy data. Do you really want to do this?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('proxies')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) throw error;

      toast.success('🗑️ All proxies successfully deleted');
      fetchSystemStats(); // Refresh the stats
    } catch (error) {
      toast.error('❌ Error deleting proxies');
      console.error('Error deleting all proxies:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Only admins and managers can view this page</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const availableProxies = systemStats.totalProxies - systemStats.usedProxies;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">System Status</h1>

        {/* Quick Limit Setter - Only for Admin and Manager */}
        {(user?.role === 'admin' || user?.role === 'manager') && userStats.length > 0 && (
          <div className="mb-6 flex justify-end">
            <QuickLimitSetter 
              users={userStats
                .map(stat => stat.user)
              } 
              onUpdate={fetchUserStats}
              userRole={user.role}
            />
          </div>
        )}

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold text-blue-900">{systemStats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Active Users</p>
                <p className="text-2xl font-bold text-green-900">{systemStats.activeUsers}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Available Proxies</p>
                <p className="text-2xl font-bold text-purple-900">{availableProxies}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Total Proxies</p>
                <p className="text-2xl font-bold text-orange-900">{systemStats.totalProxies}</p>
                {systemStats.totalProxies > 0 && user?.role === 'manager' && (
                  <button
                    onClick={deleteAllProxies}
                    className="mt-2 flex items-center space-x-1 bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-all duration-300 transform hover:scale-105 text-xs font-medium shadow-md hover:shadow-lg"
                  >
                    <Trash2 size={12} />
                    <span>Delete All</span>
                  </button>
                )}
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* User Statistics Table - Only for Admin */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">User Statistics</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Daily Limit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cooldown
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Today's Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      This Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Generation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userStats.map((stat) => (
                    <tr key={stat.user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {stat.user.username}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user?.role === 'admin' || stat.user.role !== 'admin' 
                              ? stat.user.access_key 
                              : '••••••••••••••••'
                            }
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          stat.user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : stat.user.role === 'manager'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {stat.user.role === 'admin' ? 'Admin' : stat.user.role === 'manager' ? 'Manager' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          stat.user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {stat.user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stat.user.daily_limit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          (stat.user.cooldown_minutes || 0) > 0
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {stat.user.cooldown_minutes || 0}ঘ
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <span className="mr-2">{stat.todayUsage}</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (stat.todayUsage / stat.user.daily_limit) * 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stat.thisWeekUsage}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{stat.totalUsage}</div>
                          <div className="text-xs text-gray-500">{stat.usageCount} times</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stat.lastUsed ? new Date(stat.lastUsed).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stat.user.next_generation_at ? (
                          <div>
                            <div className="text-xs">
                              {new Date(stat.user.next_generation_at) > new Date() ? (
                                <span className="text-orange-600 font-medium">
                                  {Math.ceil((new Date(stat.user.next_generation_at).getTime() - Date.now()) / (1000 * 60 * 60))}ঘ বাকি
                                </span>
                              ) : (
                                <span className="text-green-600 font-medium">এখনই পারবে</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(stat.user.next_generation_at).toLocaleString('bn-BD', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-green-600 text-xs font-medium">এখনই পারবে</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <CooldownManager
                            user={stat.user}
                            onUpdate={fetchUserStats}
                            userRole={user?.role || 'user'}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};