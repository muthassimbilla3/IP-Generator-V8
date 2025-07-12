import React, { useState } from 'react';
import { Users, Plus, Minus, Save, X } from 'lucide-react';
import { supabase, User } from '../lib/supabase';
import toast from 'react-hot-toast';

interface QuickLimitSetterProps {
  users: User[];
  onUpdate: () => void;
  userRole: 'admin' | 'manager' | 'user';
}

const QuickLimitSetter: React.FC<QuickLimitSetterProps> = ({ users, onUpdate, userRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [limits, setLimits] = useState<{ [key: string]: number }>({});
  const [cooldowns, setCooldowns] = useState<{ [key: string]: number }>({});
  const [globalLimit, setGlobalLimit] = useState<number>(500);
  const [globalCooldown, setGlobalCooldown] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // Filter users based on role permissions
  const filteredUsers = users.filter(user => {
    if (userRole === 'admin') {
      return true; // Admin can manage all users
    } else if (userRole === 'manager') {
      return user.role === 'user' || user.role === 'manager'; // Manager can manage users and other managers
    }
    return false;
  });

  const handleOpen = () => {
    // Initialize limits with current user limits
    const initialLimits: { [key: string]: number } = {};
    const initialCooldowns: { [key: string]: number } = {};
    filteredUsers.forEach(user => {
      initialLimits[user.id] = user.daily_limit;
      initialCooldowns[user.id] = user.cooldown_minutes || 0;
    });
    setLimits(initialLimits);
    setCooldowns(initialCooldowns);
    setIsOpen(true);
  };

  const updateLimit = (userId: string, change: number) => {
    setLimits(prev => ({
      ...prev,
      [userId]: Math.max(0, (prev[userId] || 0) + change)
    }));
  };

  const setPresetLimit = (userId: string, limit: number) => {
    setLimits(prev => ({
      ...prev,
      [userId]: limit
    }));
  };

  const updateCooldown = (userId: string, change: number) => {
    setCooldowns(prev => ({
      ...prev,
      [userId]: Math.max(0, (prev[userId] || 0) + change)
    }));
  };

  const setPresetCooldown = (userId: string, cooldown: number) => {
    setCooldowns(prev => ({
      ...prev,
      [userId]: cooldown
    }));
  };

  const applyGlobalSettings = () => {
    const newLimits: { [key: string]: number } = {};
    const newCooldowns: { [key: string]: number } = {};
    
    filteredUsers.forEach(user => {
      newLimits[user.id] = globalLimit;
      newCooldowns[user.id] = globalCooldown;
    });
    
    setLimits(newLimits);
    setCooldowns(newCooldowns);
    toast.success('সবার জন্য একই সেটিংস প্রয়োগ করা হয়েছে!');
  };

  const saveAllLimits = async () => {
    setSaving(true);
    try {
      // Create array of update promises
      const updatePromises = filteredUsers.map(async (user) => {
        const newLimit = limits[user.id] || user.daily_limit;
        const newCooldown = cooldowns[user.id] || user.cooldown_minutes || 0;
        
        const { error } = await supabase
          .from('users')
          .update({ 
            daily_limit: newLimit,
            cooldown_minutes: newCooldown
          })
          .eq('id', user.id);

        if (error) {
          console.error(`Error updating user ${user.username}:`, error);
          throw error;
        }
        
        return { userId: user.id, success: true };
      });

      // Wait for all updates to complete
      const results = await Promise.allSettled(updatePromises);
      
      // Check if any failed
      const failed = results.filter(result => result.status === 'rejected');
      const successful = results.filter(result => result.status === 'fulfilled');
      
      if (failed.length > 0) {
        toast.error(`${failed.length}টি ইউজারের আপডেট ব্যর্থ হয়েছে`);
        console.error('Failed updates:', failed);
      } else {
        toast.success(`সফলভাবে ${successful.length}টি ইউজারের লিমিট এবং কুলডাউন আপডেট হয়েছে!`);
      }
      
      setIsOpen(false);
      onUpdate();
    } catch (error) {
      toast.error('লিমিট আপডেট করতে সমস্যা হয়েছে');
      console.error('Error updating limits:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveOnlyLimits = async () => {
    setSaving(true);
    try {
      // Create array of update promises
      const updatePromises = filteredUsers.map(async (user) => {
        const newLimit = limits[user.id] || user.daily_limit;
        
        const { error } = await supabase
          .from('users')
          .update({ daily_limit: newLimit })
          .eq('id', user.id);

        if (error) {
          console.error(`Error updating user ${user.username}:`, error);
          throw error;
        }
        
        return { userId: user.id, success: true };
      });

      // Wait for all updates to complete
      const results = await Promise.allSettled(updatePromises);
      
      // Check if any failed
      const failed = results.filter(result => result.status === 'rejected');
      const successful = results.filter(result => result.status === 'fulfilled');
      
      if (failed.length > 0) {
        toast.error(`${failed.length}টি ইউজারের আপডেট ব্যর্থ হয়েছে`);
        console.error('Failed updates:', failed);
      } else {
        toast.success(`সফলভাবে ${successful.length}টি ইউজারের লিমিট আপডেট হয়েছে!`);
      }
      
      setIsOpen(false);
      onUpdate();
    } catch (error) {
      toast.error('লিমিট আপডেট করতে সমস্যা হয়েছে');
      console.error('Error updating limits:', error);
    } finally {
      setSaving(false);
    }
  };

  const presetLimits = [100, 200, 300, 500, 1000];
  const presetCooldowns = [0, 1, 2, 3, 6, 12, 24]; // hours

  if (filteredUsers.length === 0) {
    // Show a message instead of hiding completely for managers
    if (userRole === 'manager') {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-yellow-700 text-sm">
              কোনো ইউজার পাওয়া যায়নি যাদের লিমিট সেট করা যায়। শুধুমাত্র সাধারণ ইউজারদের লিমিট ম্যানেজ করতে পারবেন।
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
      >
        <Users className="w-5 h-5" />
        <span className="font-medium">দ্রুত লিমিট সেট করুন</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">দ্রুত লিমিট সেট করুন</h2>
                  <p className="text-blue-100 mt-1">সকল ইউজারের দৈনিক লিমিট এবং কুলডাউন একসাথে সেট করুন</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Global Settings */}
            <div className="p-6 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">সবার জন্য একই সেটিংস</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    গ্লোবাল লিমিট
                  </label>
                  <input
                    type="number"
                    value={globalLimit}
                    onChange={(e) => setGlobalLimit(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    গ্লোবাল কুলডাউন (ঘন্টা)
                  </label>
                  <input
                    type="number"
                    value={globalCooldown}
                    onChange={(e) => setGlobalCooldown(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={applyGlobalSettings}
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    সবার জন্য প্রয়োগ করুন
                  </button>
                </div>
              </div>
            </div>

            {/* Individual User Settings */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{user.username}</h3>
                        <p className="text-sm text-gray-500">
                          বর্তমান লিমিট: {user.daily_limit} | 
                          কুলডাউন: {user.cooldown_minutes || 0}ঘ | স্ট্যাটাস: <span className={user.is_active ? 'text-green-600' : 'text-red-600'}>
                            {user.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {limits[user.id] || 0}
                        </div>
                        <div className="text-xs text-gray-500">নতুন লিমিট</div>
                        <div className="text-lg font-semibold text-purple-600 mt-1">
                          {cooldowns[user.id] || 0}ঘ
                        </div>
                        <div className="text-xs text-gray-500">কুলডাউন</div>
                      </div>
                    </div>

                    {/* Preset Buttons for Limits */}
                    <div className="mb-3">
                      <span className="text-xs text-gray-600 block mb-2">লিমিট প্রিসেট:</span>
                      <div className="flex flex-wrap gap-2">
                        {presetLimits.map((preset) => (
                          <button
                            key={preset}
                            onClick={() => setPresetLimit(user.id, preset)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              limits[user.id] === preset
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preset Buttons for Cooldowns */}
                    <div className="mb-3">
                      <span className="text-xs text-gray-600 block mb-2">কুলডাউন প্রিসেট (ঘন্টা):</span>
                      <div className="flex flex-wrap gap-2">
                        {presetCooldowns.map((preset) => (
                          <button
                            key={preset}
                            onClick={() => setPresetCooldown(user.id, preset)}
                            className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                              cooldowns[user.id] === preset
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {preset}ঘ
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Manual Controls */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Limit Controls */}
                      <div>
                        <div className="text-xs text-gray-600 mb-2 text-center">লিমিট কন্ট্রোল</div>
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => updateLimit(user.id, -50)}
                            className="bg-red-100 text-red-600 hover:bg-red-200 rounded-full p-2 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateLimit(user.id, -10)}
                            className="bg-orange-100 text-orange-600 hover:bg-orange-200 rounded-full p-1 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          
                          <input
                            type="number"
                            value={limits[user.id] || 0}
                            onChange={(e) => setLimits(prev => ({
                              ...prev,
                              [user.id]: Math.max(0, parseInt(e.target.value) || 0)
                            }))}
                            className="w-16 text-center border border-gray-300 rounded-lg px-2 py-1 font-semibold text-xs"
                            min="0"
                          />
                          
                          <button
                            onClick={() => updateLimit(user.id, 10)}
                            className="bg-green-100 text-green-600 hover:bg-green-200 rounded-full p-1 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => updateLimit(user.id, 50)}
                            className="bg-green-100 text-green-600 hover:bg-green-200 rounded-full p-2 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Cooldown Controls */}
                      <div>
                        <div className="text-xs text-gray-600 mb-2 text-center">কুলডাউন কন্ট্রোল</div>
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => updateCooldown(user.id, -6)}
                            className="bg-red-100 text-red-600 hover:bg-red-200 rounded-full p-2 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateCooldown(user.id, -1)}
                            className="bg-orange-100 text-orange-600 hover:bg-orange-200 rounded-full p-1 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          
                          <input
                            type="number"
                            value={cooldowns[user.id] || 0}
                            onChange={(e) => setCooldowns(prev => ({
                              ...prev,
                              [user.id]: Math.max(0, parseInt(e.target.value) || 0)
                            }))}
                            className="w-16 text-center border border-gray-300 rounded-lg px-2 py-1 font-semibold text-xs"
                            min="0"
                          />
                          
                          <button
                            onClick={() => updateCooldown(user.id, 1)}
                            className="bg-green-100 text-green-600 hover:bg-green-200 rounded-full p-1 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => updateCooldown(user.id, 6)}
                            className="bg-green-100 text-green-600 hover:bg-green-200 rounded-full p-2 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t">
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                বাতিল করুন
              </button>
              <button
                onClick={saveOnlyLimits}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center space-x-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>সেভ করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>শুধু লিমিট সেভ করুন</span>
                  </>
                )}
              </button>
              <button
                onClick={saveAllLimits}
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center space-x-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>সেভ করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>সব সেভ করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickLimitSetter;