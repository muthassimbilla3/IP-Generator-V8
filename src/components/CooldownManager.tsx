import React, { useState } from 'react';
import { Clock, Plus, Minus, RotateCcw, Save, X } from 'lucide-react';
import { supabase, User } from '../lib/supabase';
import toast from 'react-hot-toast';
import Modal from './Modal';

interface CooldownManagerProps {
  user: User;
  onUpdate: () => void;
  userRole: 'admin' | 'manager' | 'user';
}

const CooldownManager: React.FC<CooldownManagerProps> = ({ user: targetUser, onUpdate, userRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newTime, setNewTime] = useState<Date | null>(null);
  const [timeAdjustment, setTimeAdjustment] = useState(0); // in hours

  const canManage = () => {
    if (userRole === 'admin') return true;
    if (userRole === 'manager' && targetUser.role === 'user') return true;
    return false;
  };

  const handleOpen = () => {
    if (!canManage()) return;
    
    // Initialize with current next generation time or current time
    const currentTime = targetUser.next_generation_at 
      ? new Date(targetUser.next_generation_at)
      : new Date();
    setNewTime(currentTime);
    setTimeAdjustment(0);
    setIsOpen(true);
  };

  const adjustTime = (hours: number) => {
    if (!newTime) return;
    
    const adjustedTime = new Date(newTime.getTime() + hours * 60 * 60 * 1000);
    setNewTime(adjustedTime);
    setTimeAdjustment(prev => prev + hours);
  };

  const resetCooldown = () => {
    setNewTime(new Date());
    setTimeAdjustment(0);
    toast.info('কুলডাউন রিসেট করা হবে (এখনই IP জেনারেট করতে পারবে)');
  };

  const setCustomTime = (hours: number) => {
    const customTime = new Date(Date.now() + hours * 60 * 60 * 1000);
    setNewTime(customTime);
    setTimeAdjustment(hours);
  };

  const saveCooldownTime = async () => {
    if (!newTime || !canManage()) return;

    setLoading(true);
    try {
      const updateData: any = {
        next_generation_at: newTime.toISOString()
      };

      // If setting to current time or past, also update last_generation_at
      if (newTime <= new Date()) {
        updateData.last_generation_at = null;
        updateData.next_generation_at = null;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', targetUser.id)
        .single();

      if (error) throw error;

      if (newTime <= new Date()) {
        toast.success(`${targetUser.username} এর কুলডাউন রিসেট করা হয়েছে!`);
      } else {
        toast.success(`${targetUser.username} এর Next IP Generation টাইম আপডেট করা হয়েছে!`);
      }
      
      setIsOpen(false);
      onUpdate();
    } catch (error) {
      toast.error('টাইম আপডেট করতে সমস্যা হয়েছে');
      console.error('Error updating cooldown time:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getCooldownStatus = () => {
    if (!targetUser.next_generation_at) {
      return { status: 'available', text: 'এখনই IP জেনারেট করতে পারবে', color: 'text-green-600' };
    }

    const nextTime = new Date(targetUser.next_generation_at);
    const now = new Date();
    
    if (nextTime <= now) {
      return { status: 'available', text: 'এখনই IP জেনারেট করতে পারবে', color: 'text-green-600' };
    }

    const remainingMs = nextTime.getTime() - now.getTime();
    const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
    
    return { 
      status: 'cooldown', 
      text: `${remainingHours} ঘন্টা পর IP জেনারেট করতে পারবে`, 
      color: 'text-orange-600' 
    };
  };

  if (!canManage()) {
    return null;
  }

  const cooldownStatus = getCooldownStatus();
  const presetHours = [1, 2, 3, 6, 12, 24, 48];

  return (
    <>
      <button
        onClick={handleOpen}
        className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
          cooldownStatus.status === 'available'
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
        }`}
        title="কুলডাউন ম্যানেজ করুন"
      >
        <Clock className="w-3 h-3" />
        <span>ম্যানেজ</span>
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`${targetUser.username} এর কুলডাউন ম্যানেজ করুন`}>
        <div className="space-y-6">
          {/* Current Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">বর্তমান স্ট্যাটাস</h3>
            <p className={`text-sm font-medium ${cooldownStatus.color}`}>
              {cooldownStatus.text}
            </p>
            {targetUser.next_generation_at && (
              <p className="text-xs text-gray-500 mt-1">
                Next Generation: {formatDateTime(new Date(targetUser.next_generation_at))}
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">দ্রুত অ্যাকশন</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={resetCooldown}
                className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>কুলডাউন রিসেট</span>
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                {[6, 12].map((hours) => (
                  <button
                    key={hours}
                    onClick={() => setCustomTime(hours)}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs"
                  >
                    +{hours}ঘ
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preset Times */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">প্রিসেট টাইম (ঘন্টা)</h3>
            <div className="grid grid-cols-4 gap-2">
              {presetHours.map((hours) => (
                <button
                  key={hours}
                  onClick={() => setCustomTime(hours)}
                  className="bg-purple-100 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                >
                  {hours}ঘ
                </button>
              ))}
            </div>
          </div>

          {/* Manual Time Adjustment */}
          {newTime && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">ম্যানুয়াল অ্যাডজাস্টমেন্ট</h3>
              
              {/* Current New Time Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-blue-800">
                  <strong>নতুন টাইম:</strong> {formatDateTime(newTime)}
                </p>
                {timeAdjustment !== 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    {timeAdjustment > 0 ? '+' : ''}{timeAdjustment} ঘন্টা অ্যাডজাস্ট করা হয়েছে
                  </p>
                )}
              </div>

              {/* Time Adjustment Controls */}
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => adjustTime(-6)}
                  className="bg-red-100 text-red-600 hover:bg-red-200 rounded-full p-2 transition-colors"
                  title="৬ ঘন্টা কমান"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => adjustTime(-1)}
                  className="bg-orange-100 text-orange-600 hover:bg-orange-200 rounded-full p-1 transition-colors"
                  title="১ ঘন্টা কমান"
                >
                  <Minus className="w-3 h-3" />
                </button>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {newTime > new Date() 
                      ? `${Math.ceil((newTime.getTime() - Date.now()) / (1000 * 60 * 60))}ঘ`
                      : 'এখনই'
                    }
                  </div>
                  <div className="text-xs text-gray-500">বাকি সময়</div>
                </div>
                
                <button
                  onClick={() => adjustTime(1)}
                  className="bg-green-100 text-green-600 hover:bg-green-200 rounded-full p-1 transition-colors"
                  title="১ ঘন্টা বাড়ান"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={() => adjustTime(6)}
                  className="bg-green-100 text-green-600 hover:bg-green-200 rounded-full p-2 transition-colors"
                  title="৬ ঘন্টা বাড়ান"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              বাতিল করুন
            </button>
            <button
              onClick={saveCooldownTime}
              disabled={loading || !newTime}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>সেভ করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>সেভ করুন</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CooldownManager;