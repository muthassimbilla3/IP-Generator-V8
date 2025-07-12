import React from 'react';
import { Upload, CheckCircle } from 'lucide-react';

interface UploadProgressModalProps {
  isOpen: boolean;
  progress: number;
  isComplete: boolean;
  fileName?: string;
  duplicateCount?: number;
  totalProcessed?: number;
  successCount?: number;
}

const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  isOpen,
  progress,
  isComplete,
  fileName,
  duplicateCount = 0,
  totalProcessed = 0,
  successCount = 0
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
            {isComplete ? (
              <CheckCircle className="h-8 w-8 text-green-600 animate-bounce" />
            ) : (
              <Upload className="h-8 w-8 text-blue-600 animate-pulse" />
            )}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {isComplete ? '🎉 আপলোড সম্পন্ন!' : '📤 ফাইল আপলোড হচ্ছে...'}
          </h3>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            {isComplete 
              ? successCount > 0 
                ? `আপনার ফাইল সফলভাবে আপলোড হয়েছে! ${successCount}টি নতুন IP যোগ হয়েছে।`
                : `আপলোড সম্পন্ন! সব IP ডুপ্লিকেট ছিল।`
              : 'আপলোড হতে একটু সময় লাগবে দয়া করে অপেক্ষা করুন'
            }
          </p>

          {/* File Name */}
          {fileName && (
            <div className="bg-gray-50 rounded-lg p-3 mb-6">
              <p className="text-sm text-gray-700">
                <span className="font-medium">ফাইল:</span> {fileName}
              </p>
            </div>
          )}

          {/* Duplicate Report */}
          {isComplete && duplicateCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    ডুপ্লিকেট IP পাওয়া গেছে
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      <strong>মোট প্রক্রিয়াকৃত:</strong> {totalProcessed}টি IP
                    </p>
                    <p>
                      <strong>নতুন যোগ হয়েছে:</strong> {successCount}টি IP
                    </p>
                    <p>
                      <strong>ডুপ্লিকেট পাওয়া গেছে:</strong> {duplicateCount}টি IP
                    </p>
                    <p className="mt-2 text-xs">
                      ডুপ্লিকেট IP গুলো ডাটাবেসে যোগ করা হয়নি কারণ সেগুলো আগে থেকেই আছে।
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Report without Duplicates */}
          {isComplete && duplicateCount === 0 && successCount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <div>
                  <p className="text-green-800 font-medium">সব IP সফলভাবে যোগ হয়েছে!</p>
                  <p className="text-green-700 text-sm">কোনো ডুপ্লিকেট IP পাওয়া যায়নি।</p>
                </div>
              </div>
            </div>
          )}

          {/* All Duplicate Report */}
          {isComplete && successCount === 0 && duplicateCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-orange-800">
                    সব IP ডুপ্লিকেট!
                  </h3>
                  <div className="mt-2 text-sm text-orange-700">
                    <p>
                      <strong>মোট চেক করা হয়েছে:</strong> {totalProcessed}টি IP
                    </p>
                    <p>
                      <strong>সব IP ডুপ্লিকেট:</strong> {duplicateCount}টি IP
                    </p>
                    <p className="mt-2 text-xs">
                      এই সব IP আগে থেকেই ডাটাবেসে আছে, তাই কোনো নতুন IP যোগ হয়নি।
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">অগ্রগতি</span>
              <span className="text-sm font-bold text-blue-600">{Math.round(progress)}%</span>
            </div>
            
            {/* Progress Bar Container */}
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                
                {/* Moving shine bar */}
                {!isComplete && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-50 animate-[shimmer_2s_infinite]"></div>
                )}
              </div>
            </div>
          </div>

          {/* Loading Animation */}
          {!isComplete && (
            <div className="flex justify-center items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-sm text-gray-500 ml-3 animate-pulse">প্রক্রিয়াকরণ চলছে...</span>
            </div>
          )}

          {/* Success Message */}
          {isComplete && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-blue-500 mr-2" />
                <p className="text-blue-800 font-medium">প্রক্রিয়া সম্পন্ন হয়েছে!</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom CSS for shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default UploadProgressModal;