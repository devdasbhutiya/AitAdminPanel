import { useEffect } from 'react';
import './Modal.css';

const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'medium',
    showFooter = true,
    footerContent,
    className = ''
}) => {
    // Close on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);

        // Prevent body scroll when modal is open
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className={`modal active ${className}`} onClick={onClose}>
            <div
                className={`modal-content modal-${size}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <span className="material-icons-round">close</span>
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                {showFooter && footerContent && (
                    <div className="modal-footer">
                        {footerContent}
                    </div>
                )}
            </div>
        </div>
    );
};

// Confirm Delete Modal variant
export const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Delete',
    message = 'Are you sure you want to delete this item?',
    warning = 'This action cannot be undone.',
    confirmText = 'Delete',
    confirmClass = 'btn-danger'
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="small"
            showFooter={true}
            footerContent={
                <>
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="button" className={confirmClass} onClick={onConfirm}>
                        {confirmText}
                    </button>
                </>
            }
        >
            <div className="confirm-modal-body">
                <div className="delete-icon">
                    <span className="material-icons-round">warning</span>
                </div>
                <p>{message}</p>
                {warning && <p className="delete-warning">{warning}</p>}
            </div>
        </Modal>
    );
};

export default Modal;
