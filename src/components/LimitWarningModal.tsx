import React from 'react';
import { AlertTriangle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';

interface LimitWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  uploadedCount: number;
}

const LimitWarningModal: React.FC<LimitWarningModalProps> = ({
  isOpen,
  onClose,
  uploadedCount
}) => {
  const navigate = useNavigate();

  const handleGoToStatus = () => {
    onClose();
    navigate('/status');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="আপলোড সম্পন্ন">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <AlertTriangle className="h-6 w-6 text-green-600" />
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          🎉 সফলভাবে {uploadedCount}টি IP আপলোড হয়েছে!
        </h3>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
            <div className="text-left">
              <p className="text-yellow-800 font-semibold">গুরুত্বপূর্ণ সূচনা!</p>
              <p className="text-yellow-700 text-sm mt-1">
                নতুন IP আপলোড করার পর ইউজারদের আজকের লিমিট সেট করুন।
              </p>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            পরে করব
          </button>
          <button
            onClick={handleGoToStatus}
            className="px-6 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>আজকের লিমিট সেট করুন</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LimitWarningModal;