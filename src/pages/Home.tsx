import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Proxy } from '../lib/supabase';
import { Download, AlertTriangle, FileText, FileSpreadsheet, Copy, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const [amount, setAmount] = useState(15);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [usageToday, setUsageToday] = useState(0);
  const [showGenerateAllModal, setShowGenerateAllModal] = useState(false);
  const [availableIPCount, setAvailableIPCount] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [nextGenerationTime, setNextGenerationTime] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      fetchTodayUsage();
      checkCooldownStatus();
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldownRemaining > 0) {
      interval = setInterval(() => {
        setCooldownRemaining(prev => {
          if (prev <= 1) {
            setNextGenerationTime(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cooldownRemaining]);

  const checkCooldownStatus = () => {
    if (!user?.id || !user.next_generation_at) {
      setCooldownRemaining(0);
      setNextGenerationTime(null);
      return;
    }

    const nextTime = new Date(user.next_generation_at);
    const now = new Date();
    const remainingMs = nextTime.getTime() - now.getTime();

    if (remainingMs > 0) {
      setCooldownRemaining(Math.ceil(remainingMs / 1000));
      setNextGenerationTime(nextTime);
    } else {
      setCooldownRemaining(0);
      setNextGenerationTime(null);
    }
  };

  const formatCooldownTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}ঘ ${minutes}মি ${secs}সে`;
    } else if (minutes > 0) {
      return `${minutes}মি ${secs}সে`;
    } else {
      return `${secs}সে`;
    }
  };

  const updateUserGenerationTime = async () => {
    if (!user?.id || !user.cooldown_minutes) return;

    // Only start cooldown if user has exhausted their daily limit
    const newUsageToday = usageToday + proxies.length;
    const willExhaustLimit = newUsageToday >= user.daily_limit;
    
    if (!willExhaustLimit) {
      // Don't start cooldown if user still has remaining limit
      return;
    }

    const now = new Date();
    const nextGeneration = new Date(now.getTime() + user.cooldown_minutes * 60 * 60 * 1000);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          last_generation_at: now.toISOString(),
          next_generation_at: nextGeneration.toISOString()
        })
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Update local user state
      user.last_generation_at = now.toISOString();
      user.next_generation_at = nextGeneration.toISOString();
      checkCooldownStatus();
    } catch (error) {
      console.error('Error updating generation time:', error);
    }
  };

  const fetchTodayUsage = async () => {
    if (!user?.id) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('usage_logs')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const total = data?.reduce((sum, log) => sum + log.amount, 0) || 0;
      setUsageToday(total);
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

  const validateAmount = (value: number): boolean => {
    if (value < 1) {
      toast.error('Please enter at least 1 IP');
      return false;
    }
    if (!user) return false;
    
    const remaining = user.daily_limit - usageToday;
    if (value > remaining) {
      toast.error(`Daily limit exceeded! You can only get ${remaining} more IPs today.`);
      return false;
    }
    return true;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setAmount(value);
    }
  };

  const generateProxies = async () => {
    if (!user?.id) return;
    if (!validateAmount(amount)) return;
    if (cooldownRemaining > 0) {
      toast.error(`আপনি আরো ${formatCooldownTime(cooldownRemaining)} পর IP জেনারেট করতে পারবেন`);
      return;
    }

    setLoading(true);
    try {
      // Check for available proxies
      const { data: availableProxies, error } = await supabase
        .from('proxies')
        .select('*')
        .eq('is_used', false)
        .limit(amount);

      if (error) throw error;

      if (!availableProxies || availableProxies.length < amount) {
        toast.error(`Not enough IPs available. Only ${availableProxies?.length || 0} IPs available.`);
        setLoading(false);
        return;
      }

      // Check if any of these proxies are being used by others
      const proxyIds = availableProxies.map(p => p.id);
      const { data: updatedProxies } = await supabase
        .from('proxies')
        .select('*')
        .in('id', proxyIds)
        .eq('is_used', false);

      if (!updatedProxies || updatedProxies.length < amount) {
        toast.error('Other users are using these IPs. Please try again.');
        setLoading(false);
        return;
      }

      setProxies(updatedProxies.slice(0, amount));
      toast.success(`${amount} IPs generated successfully`);
    } catch (error) {
      toast.error('Error generating IPs');
      console.error('Error generating proxies:', error);
    }
    setLoading(false);
  };

  const handleGenerateAllClick = async () => {
    if (!user?.id || remainingLimit <= 0) return;

    try {
      // Check for available proxies first
      const { data: availableProxies, error } = await supabase
        .from('proxies')
        .select('*', { count: 'exact' })
        .eq('is_used', false)
        .limit(remainingLimit);

      if (error) throw error;

      setAvailableIPCount(availableProxies?.length || 0);
      setShowGenerateAllModal(true);
    } catch (error) {
      console.error('Error checking available IPs:', error);
      toast.error('Error checking available IPs');
    }
  };

  const handleGenerateAllConfirm = () => {
    setShowGenerateAllModal(false);
    generateAllRemainingProxies();
  };

  const generateAllRemainingProxies = async () => {
    if (!user?.id || remainingLimit <= 0) return;
    if (cooldownRemaining > 0) {
      toast.error(`আপনি আরো ${formatCooldownTime(cooldownRemaining)} পর IP জেনারেট করতে পারবেন`);
      return;
    }
    
    setLoadingAll(true);
    try {
      // Check for available proxies
      const { data: availableProxies, error } = await supabase
        .from('proxies')
        .select('*')
        .eq('is_used', false)
        .limit(remainingLimit);

      if (error) throw error;

      if (!availableProxies || availableProxies.length === 0) {
        toast.error('No IPs available');
        setLoadingAll(false);
        return;
      }

      if (availableProxies.length < remainingLimit) {
        toast.error(`Not enough IPs available. Only ${availableProxies.length} IPs available.`);
        setLoadingAll(false);
        return;
      }

      // Check if any of these proxies are being used by others
      const proxyIds = availableProxies.map(p => p.id);
      const { data: updatedProxies } = await supabase
        .from('proxies')
        .select('*')
        .in('id', proxyIds)
        .eq('is_used', false);

      if (!updatedProxies || updatedProxies.length === 0) {
        toast.error('Other users are using these IPs. Please try again.');
        setLoadingAll(false);
        return;
      }

      if (updatedProxies.length < remainingLimit) {
        toast.error(`Not enough IPs available. Only ${updatedProxies.length} IPs available.`);
        setLoadingAll(false);
        return;
      }

      setProxies(updatedProxies);
      toast.success(`${updatedProxies.length} IPs generated successfully`);
    } catch (error) {
      toast.error('Error generating IPs');
      console.error('Error generating all proxies:', error);
    }
    setLoadingAll(false);
  };

  const markProxiesAsUsed = async () => {
    if (proxies.length === 0) return;
    if (!user?.id) {
      console.error('User ID not found');
      return;
    }

    // Calculate if this usage will exhaust the daily limit
    const newUsageToday = usageToday + proxies.length;
    const willExhaustLimit = newUsageToday >= (user?.daily_limit || 0);

    try {
      const proxyIds = proxies.map(p => p.id);
      
      // Mark all as used
      const { error: updateError } = await supabase
        .from('proxies')
        .update({
          is_used: true,
          used_by: user.id,
          used_at: new Date().toISOString()
        })
        .in('id', proxyIds);

      if (updateError) throw updateError;

      // Delete from database
      await supabase.from('proxies').delete().in('id', proxyIds);

      // Log usage
      await supabase.from('usage_logs').insert({
        user_id: user.id,
        amount: proxies.length
      });

      // Only start cooldown if this usage exhausts the daily limit
      if (willExhaustLimit && user?.cooldown_minutes) {
        if (!user.id) {
          console.error('User ID not found');
          return;
        }
        
        const now = new Date();
        const nextGeneration = new Date(now.getTime() + user.cooldown_minutes * 60 * 60 * 1000);
        
        const { error } = await supabase
          .from('users')
          .update({
            last_generation_at: now.toISOString(),
            next_generation_at: nextGeneration.toISOString()
          })
          .eq('id', user.id)
          .single();

        if (!error) {
          // Update local user state
          user.last_generation_at = now.toISOString();
          user.next_generation_at = nextGeneration.toISOString();
          checkCooldownStatus();
          
          toast.info(`দৈনিক লিমিট শেষ! ${user.cooldown_minutes} ঘন্টা পর আবার IP জেনারেট করতে পারবেন।`);
        } else {
          console.error('Error updating user cooldown:', error);
        }
      }

      await fetchTodayUsage();
    } catch (error) {
      console.error('Error marking proxies as used:', error);
    }
  };

  const downloadTXT = async () => {
    if (proxies.length === 0) return;

    try {
      const proxyText = proxies.map(p => p.proxy_string).join('\n');
      const blob = new Blob([proxyText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `proxies_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await markProxiesAsUsed();
      setProxies([]);
      toast.success('TXT file downloaded and IPs removed from database');
    } catch (error) {
      toast.error('Error downloading TXT file');
      console.error('Error downloading TXT:', error);
    }
  };

  const downloadExcel = async () => {
    if (proxies.length === 0) return;

    try {
      // Create workbook with proxy data
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(
        proxies.map(p => [p.proxy_string])
      );

      // Set column width
      const maxLength = Math.max(...proxies.map(p => p.proxy_string.length));
      worksheet['!cols'] = [{ wch: maxLength + 2 }];

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'IP Proxies');

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `proxies_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await markProxiesAsUsed();
      setProxies([]);
      toast.success('Excel file downloaded and IPs removed from database');
    } catch (error) {
      toast.error('Error downloading Excel file');
      console.error('Error downloading Excel:', error);
    }
  };

  const copyAllProxies = async () => {
    if (proxies.length === 0) return;

    try {
      // Check if all proxies are still available
      const proxyIds = proxies.map(p => p.id);
      const { data: currentProxies, error } = await supabase
        .from('proxies')
        .select('*')
        .in('id', proxyIds)
        .eq('is_used', false);

      if (error) throw error;

      if (!currentProxies || currentProxies.length !== proxies.length) {
        toast.error('Some IPs have been used by others. Please generate again.');
        return;
      }

      // Copy all to clipboard
      const allProxies = proxies.map(p => p.proxy_string).join('\n');
      await navigator.clipboard.writeText(allProxies);
      
      toast.success(`${proxies.length} IPs copied to clipboard`);

      // Update generation time only if this will exhaust the daily limit
      await markProxiesAsUsed();
      setProxies([]);
    } catch (error) {
      toast.error('Error copying all IPs');
      console.error('Error copying all proxies:', error);
    }
  };

  const remainingLimit = user ? user.daily_limit - usageToday : 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">IP Proxy Generator</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Today's Usage</div>
              <div className="text-2xl font-bold text-blue-900">{usageToday}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Remaining Limit</div>
              <div className="text-2xl font-bold text-green-900">{remainingLimit}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">Daily Limit</div>
              <div className="text-2xl font-bold text-purple-900">{user?.daily_limit}</div>
            </div>
          </div>

          <div className="flex items-center space-x-4 mb-6">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Number of IPs
              </label>
              <input
                type="number"
                id="amount"
                min="1"
                max={Math.min(remainingLimit, 100)}
                value={amount}
                onChange={handleAmountChange}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="pt-6 flex space-x-3">
              <button
                onClick={generateProxies}
                disabled={loading || loadingAll || remainingLimit <= 0 || cooldownRemaining > 0}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </div>
                ) : (
                  'Generate IPs'
                )}
              </button>

              {remainingLimit > 0 && (
                <button
                  onClick={handleGenerateAllClick}
                  disabled={loading || loadingAll || remainingLimit <= 0 || cooldownRemaining > 0}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {loadingAll ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Generating All...</span>
                    </div>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Generate All ({remainingLimit})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Cooldown Warning */}
          {cooldownRemaining > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-400 mr-2" />
                <div>
                  <p className="text-orange-700 text-sm font-medium">
                    অপেক্ষা করুন! আপনি আরো <span className="font-bold">{formatCooldownTime(cooldownRemaining)}</span> পর IP জেনারেট করতে পারবেন
                  </p>
                  {nextGenerationTime && (
                    <p className="text-orange-600 text-xs mt-1">
                      পরবর্তী IP জেনারেশন: {nextGenerationTime.toLocaleString('bn-BD', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {remainingLimit <= 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-red-700 text-sm">
                  Your daily limit has been reached. Please try again tomorrow.
                </p>
              </div>
            </div>
          )}
        </div>

        {proxies.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Generated IPs ({proxies.length})
              </h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={copyAllProxies}
                  className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                >
                  <Copy size={16} />
                  <span>Copy All</span>
                </button>
                <button
                  onClick={downloadTXT}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  <FileText size={16} />
                  <span>Download TXT</span>
                </button>
                <button
                  onClick={downloadExcel}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <FileSpreadsheet size={16} />
                  <span>Download Excel</span>
                </button>
              </div>
            </div>
            
            {/* Single box containing all proxies */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="max-h-96 overflow-y-auto">
                <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap break-all">
                  {proxies.map(proxy => proxy.proxy_string).join('\n')}
                </pre>
              </div>
            </div>

            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-yellow-400 mr-2" />
                <p className="text-yellow-700 text-sm">
                  <strong>Warning:</strong> IPs will be deleted from the database after downloading. 
                  Make sure to download the IPs you need.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Generate All Modal */}
        {showGenerateAllModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 transform transition-all">
              <div className="text-center">
                <Zap className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  সমস্ত IP জেনারেট করুন
                </h3>
                
                {availableIPCount !== null && availableIPCount < remainingLimit ? (
                  <>
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="text-red-700 text-sm text-left">
                          <p className="font-semibold mb-1">পর্যাপ্ত IP নেই!</p>
                          <p>বর্তমানে শুধুমাত্র <span className="font-bold">{availableIPCount}টি</span> IP পাওয়া যাচ্ছে।</p>
                          <p className="mt-1">আপনি কি এই {availableIPCount}টি IP জেনারেট করতে চান?</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 mb-6">
                    আপনি কি নিশ্চিত যে আপনি <span className="font-semibold text-green-600">{remainingLimit}টি</span> IP জেনারেট করতে চান?
                  </p>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-6">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 mr-2 flex-shrink-0" />
                    <p className="text-yellow-700 text-sm text-left">
                      <strong>সতর্কতা:</strong> এই অপারেশনটি আপনার আজকের বাকি থাকা সমস্ত IP লিমিট ব্যবহার করে ফেলবে।
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3 justify-center">
                  <button
                    onClick={() => setShowGenerateAllModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    বাতিল করুন
                  </button>
                  <button
                    onClick={handleGenerateAllConfirm}
                    className="px-4 py-2 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center space-x-2"
                  >
                    <Zap className="w-4 h-4" />
                    <span>জেনারেট করুন</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
