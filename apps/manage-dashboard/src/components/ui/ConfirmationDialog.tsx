import React from 'react'
import { Modal, ModalProps } from './Modal'

export interface ConfirmationDialogProps extends Omit<ModalProps, 'children'> {
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel?: () => void
  variant?: 'danger' | 'warning' | 'info'
}

const variantStyles = {
  danger: {
    button: 'bg-red-600 hover:bg-red-700 text-white',
    icon: (
      <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  },
  warning: {
    button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    icon: (
      <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  },
  info: {
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  message,
  confirmText = '確認',
  cancelText = '取消',
  onConfirm,
  onCancel,
  variant = 'info',
  onClose,
  ...modalProps
}) => {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const handleCancel = () => {
    if (onCancel) onCancel()
    onClose()
  }

  const styles = variantStyles[variant]

  return (
    <Modal {...modalProps} onClose={handleCancel} size="sm">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          {styles.icon}
        </div>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-md transition-colors ${styles.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmationDialog
