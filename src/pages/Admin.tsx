import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, UploadHistory, User } from '../lib/supabase';
import { Upload, Trash2, Users, Settings, Plus, Minus, Edit2, Key, RotateCcw, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import LimitWarningModal from '../components/LimitWarningModal';
import UploadProgressModal from '../components/UploadProgressModal';

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState<'prepend' | 'append'>('append');
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    accessKey: '',
    role: 'user' as 'admin' | 'manager' | 'user',
    dailyLimit: 500,
    cooldownMinutes: 0
  });
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    username: '',
    accessKey: '',
    dailyLimit: 0,
    cooldownMinutes: 0
  });
  const [totalProxies, setTotalProxies] = useState(0);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [lastUploadCount, setLastUploadCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadStats, setUploadStats] = useState({
    totalProcessed: 0,
    successCount: 0,
    duplicateCount: 0
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUploadHistory();
      fetchUsers();
      fetchProxyCount();
    }
  }, [user]);

  const fetchUploadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('upload_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUploadHistory(data || []);
    } catch (error) {
      console.error('Error fetching upload history:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProxyCount = async () => {
    try {
      const { count, error } = await supabase
        .from('proxies')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setTotalProxies(count || 0);
    } catch (error) {
      console.error('Error fetching proxy count:', error);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    // Show upload progress modal
    setShowUploadProgress(true);
    setUploadProgress(0);
    setUploadComplete(false);
    setUploadStats({ totalProcessed: 0, successCount: 0, duplicateCount: 0 });
    setLoading(true);
    
    try {
      // Simulate reading file progress
      setUploadProgress(10);
      const text = await file.text();
      setUploadProgress(20);
      
      const proxies = text.split('\n').filter(line => line.trim());

      if (proxies.length === 0) {
        toast.error('ফাইলে কোনো বৈধ প্রক্সি নেই');
        setShowUploadProgress(false);
        setLoading(false);
        return;
      }

      // Fetch existing proxy strings to avoid duplicates
      const { data: existingProxies, error: fetchError } = await supabase
        .from('proxies')
        .select('proxy_string');

      if (fetchError) {
        console.error('Error fetching existing proxies:', fetchError);
        toast.error('Error checking existing proxies');
        setShowUploadProgress(false);
        setLoading(false);
        return;
      }

      // Create a Set for efficient lookup of existing proxy strings
      const existingProxySet = new Set(existingProxies?.map(p => p.proxy_string) || []);
      setUploadProgress(25);

      // Insert proxies with progress tracking and duplicate detection
      const totalProxies = proxies.length;
      let processedCount = 0;
      let successCount = 0;
      let duplicateCount = 0;
      
      for (const proxy of proxies) {
        const trimmedProxy = proxy.trim();
        
        // Check if proxy already exists
        if (existingProxySet.has(trimmedProxy)) {
          duplicateCount++;
        } else {
          try {
            const { error } = await supabase.from('proxies').insert({
              proxy_string: trimmedProxy
            });
            
            if (error) {
              console.error('Error inserting proxy:', trimmedProxy, error);
              duplicateCount++;
            } else {
              successCount++;
              // Add to existing set to prevent duplicates within the same upload
              existingProxySet.add(trimmedProxy);
            }
          } catch (error) {
            console.error('Unexpected error inserting proxy:', trimmedProxy, error);
            duplicateCount++;
          }
        }
        
        processedCount++;
        
        // Update progress (25% to 80% for proxy insertion)
        const insertProgress = 25 + (processedCount / totalProxies) * 55;
        setUploadProgress(insertProgress);
        
        // Small delay to show progress animation
        if (processedCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Update stats
      setUploadStats({
        totalProcessed: totalProxies,
        successCount,
        duplicateCount
      });

      setUploadProgress(85);
      
      // Record upload history
      await supabase.from('upload_history').insert({
        uploaded_by: user.id,
        file_name: file.name,
        proxy_count: successCount, // Only count successfully inserted proxies
        position: 'append'
      });

      setUploadProgress(95);
      
      // Final steps
      await new Promise(resolve => setTimeout(resolve, 500));
      setUploadProgress(100);
      setUploadComplete(true);
      
      // Show appropriate success message
      if (duplicateCount > 0) {
        if (successCount > 0) {
          toast.success(`🎉 ${successCount}টি নতুন IP যোগ হয়েছে! ${duplicateCount}টি ডুপ্লিকেট পাওয়া গেছে।`);
        } else {
          toast.error(`⚠️ সব IP ডুপ্লিকেট! ${duplicateCount}টি IP আগে থেকেই ডাটাবেসে আছে।`);
        }
      } else {
        toast.success(`🎉 সফলভাবে ${successCount}টি IP আপলোড সম্পন্ন হয়েছে!`);
      }
      
      setFile(null);
      
      // Only show limit warning modal if new IPs were actually uploaded
      if (successCount > 0) {
        setLastUploadCount(successCount);
        setShowLimitWarning(true);
      }
      
      fetchUploadHistory();
      fetchProxyCount();
      
      // Hide upload progress after 2 seconds
      setTimeout(() => {
        setShowUploadProgress(false);
        setUploadComplete(false);
        setUploadProgress(0);
      }, 2000);
    } catch (error) {
      toast.error('❌ Error uploading file');
      console.error('Error uploading file:', error);
      setShowUploadProgress(false);
    }
    setLoading(false);
  };

  const deleteUploadHistory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('upload_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Upload history deleted');
      fetchUploadHistory();
    } catch (error) {
      toast.error('Error deleting');
      console.error('Error deleting upload history:', error);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.accessKey) return;

    try {
      const { error } = await supabase.from('users').insert({
        username: newUser.username,
        access_key: newUser.accessKey,
        role: newUser.role,
        daily_limit: newUser.dailyLimit,
        cooldown_minutes: newUser.cooldownMinutes
      });

      if (error) throw error;

      toast.success('New user created');
      setNewUser({
        username: '',
        accessKey: '',
        role: 'user',
        dailyLimit: 500,
        cooldownMinutes: 0
      });
      fetchUsers();
    } catch (error) {
      toast.error('Error creating user');
      console.error('Error creating user:', error);
    }
  };

  const updateUserLimit = async (userId: string, newLimit: number) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ daily_limit: newLimit })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User limit updated');
      fetchUsers();
    } catch (error) {
      toast.error('Error updating limit');
      console.error('Error updating user limit:', error);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User status updated');
      fetchUsers();
    } catch (error) {
      toast.error('Error updating status');
      console.error('Error updating user status:', error);
    }
  };

  const startEditUser = (userData: User) => {
    setEditingUser(userData.id);
    setEditForm({
      username: userData.username,
      accessKey: userData.access_key,
      dailyLimit: userData.daily_limit,
      cooldownMinutes: userData.cooldown_minutes || 0
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({
      username: '',
      accessKey: '',
      dailyLimit: 0,
      cooldownMinutes: 0
    });
  };

  const saveUserEdit = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          username: editForm.username,
          access_key: editForm.accessKey,
          daily_limit: editForm.dailyLimit,
          cooldown_minutes: editForm.cooldownMinutes
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      toast.error('Error updating user');
      console.error('Error updating user:', error);
    }
  };

  const generateNewAccessKey = async (userId: string) => {
    try {
      const newKey = `key_${Math.random().toString(36).substring(2, 15)}`;
      
      const { error } = await supabase
        .from('users')
        .update({ access_key: newKey })
        .eq('id', userId);

      if (error) throw error;

      toast.success('New access key generated');
      fetchUsers();
    } catch (error) {
      toast.error('Error generating new access key');
      console.error('Error generating access key:', error);
    }
  };

  const deleteUser = async (userId: string, username: string) => {
    // Prevent deletion of the current logged-in user
    if (userId === user?.id) {
      toast.error('You cannot delete your own account');
      return;
    }

    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Error deleting user');
      console.error('Error deleting user:', error);
    }
  };

  const deleteAllProxies = async () => {
    if (!confirm(`Are you sure you want to delete all ${totalProxies} proxies from the database? This action cannot be undone.`)) {
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
      fetchProxyCount();
    } catch (error) {
      toast.error('❌ Error deleting proxies');
      console.error('Error deleting all proxies:', error);
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Only admins and managers can view this page</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {user?.role === 'admin' ? 'Admin Panel' : 'Manager Panel'}
        </h1>

        {/* Proxy Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              Ip Uploader
            </h2>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Total Ip: <span className="font-semibold text-blue-600">{totalProxies}</span>
              </div>
              {totalProxies > 0 && (
                <button
                  onClick={deleteAllProxies}
                  className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105 text-sm font-medium shadow-lg hover:shadow-xl"
                >
                  <Database size={16} />
                  <span>Delete All Ip</span>
                </button>
              )}
            </div>
          </div>
          
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                Select TXT File
              </label>
              <input
                type="file"
                id="file"
                accept=".txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            
            <button
              type="submit"
              disabled={!file || loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center space-x-3 font-medium"
            >
              {loading ? (
                <>
                  <div className="relative">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-5 h-5 border-2 border-transparent border-t-blue-200 rounded-full animate-ping"></div>
                  </div>
                  <span className="animate-pulse">Please wait until upload is complete...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Upload</span>
                </>
              )}
            </button>
          </form>
          
          {totalProxies > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-center">
                <Database className="h-4 w-4 text-blue-400 mr-2" />
                <p className="text-blue-700 text-sm">
                  <strong>Database Status:</strong> {totalProxies} proxies available in the system.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* User Management Section - Only for Admin */}
        {user?.role === 'admin' && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="mr-2 h-5 w-5" />
            User Management
          </h2>
          
          {/* Create New User */}
          <form onSubmit={createUser} className="mb-6">
            <h3 className="text-md font-medium text-gray-800 mb-3">Create New User</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Username"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Access Key"
                value={newUser.accessKey}
                onChange={(e) => setNewUser({...newUser, accessKey: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value as 'admin' | 'manager' | 'user'})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <input
                type="number"
                placeholder="Daily Limit"
                value={newUser.dailyLimit}
                onChange={(e) => setNewUser({...newUser, dailyLimit: parseInt(e.target.value)})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="number"
                placeholder="Cooldown (ঘন্টা)"
                value={newUser.cooldownMinutes || 0}
                onChange={(e) => setNewUser({...newUser, cooldownMinutes: parseInt(e.target.value) || 0})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="mt-3 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Create User
            </button>
          </form>

          {/* Users List */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Access Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Daily Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cooldown
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userData) => (
                  <tr key={userData.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {editingUser === userData.id ? (
                        <input
                          type="text"
                          value={editForm.username}
                          onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                        />
                      ) : (
                        userData.username
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingUser === userData.id ? (
                        <input
                          type="text"
                          value={editForm.accessKey}
                          onChange={(e) => setEditForm({...editForm, accessKey: e.target.value})}
                          className="px-2 py-1 border border-gray-300 rounded text-xs w-full font-mono"
                        />
                      ) : (
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {user?.role === 'admin' || userData.role !== 'admin' 
                            ? userData.access_key 
                            : '••••••••••••••••'
                          }
                        </code>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userData.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : userData.role === 'manager'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {userData.role === 'admin' ? 'Admin' : userData.role === 'manager' ? 'Manager' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingUser === userData.id ? (
                        <input
                          type="number"
                          value={editForm.dailyLimit}
                          onChange={(e) => setEditForm({...editForm, dailyLimit: parseInt(e.target.value)})}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-20"
                        />
                      ) : (
                        userData.daily_limit
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingUser === userData.id ? (
                        <input
                          type="number"
                          value={editForm.cooldownMinutes || 0}
                          onChange={(e) => setEditForm({...editForm, cooldownMinutes: parseInt(e.target.value) || 0})}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-20"
                        />
                      ) : (
                        `${userData.cooldown_minutes || 0}ঘ`
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => toggleUserStatus(userData.id, userData.is_active)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          userData.is_active 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {userData.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingUser === userData.id ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => saveUserEdit(userData.id)}
                            className="text-green-600 hover:text-green-800"
                            title="Save changes"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-gray-600 hover:text-gray-800"
                            title="Cancel"
                          >
                            <Minus size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => startEditUser(userData)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit user"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => generateNewAccessKey(userData.id)}
                            className="text-purple-600 hover:text-purple-800"
                            title="Generate new access key"
                          >
                            <RotateCcw size={16} />
                          </button>
                          {userData.role !== 'admin' && userData.id !== user?.id && (
                            <button
                              onClick={() => deleteUser(userData.id, userData.username)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete user"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Upload History Section - Only for Admin */}
        {user?.role === 'admin' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload History</h2>
          
          {uploadHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No upload history</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proxy Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uploadHistory.map((history) => (
                    <tr key={history.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {history.file_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {history.proxy_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          history.position === 'prepend' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {history.position === 'prepend' ? 'Prepend' : 'Append'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(history.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => deleteUploadHistory(history.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Limit Warning Modal */}
      <LimitWarningModal
        isOpen={showLimitWarning}
        onClose={() => setShowLimitWarning(false)}
        uploadedCount={lastUploadCount}
      />

      {/* Upload Progress Modal */}
      <UploadProgressModal
        isOpen={showUploadProgress}
        progress={uploadProgress}
        isComplete={uploadComplete}
        fileName={file?.name}
        duplicateCount={uploadStats.duplicateCount}
        totalProcessed={uploadStats.totalProcessed}
        successCount={uploadStats.successCount}
      />
    </div>
  );
};
