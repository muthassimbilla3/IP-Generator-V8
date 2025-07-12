import React from 'react';
import Modal from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
      default:
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="sm:flex sm:items-start">
        <div className="mt-3 text-center sm:mt-0 sm:text-left">
          <div className="mt-2">
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>
      </div>
      <div className="mt-6 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
        <button
          type="button"
          onClick={onConfirm}
          className={`inline-flex w-full justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all transform hover:scale-105 focus:ring-2 focus:ring-offset-2 sm:w-auto ${getVariantStyles()}`}
        >
          {confirmText}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto transition-all"
        >
          {cancelText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
