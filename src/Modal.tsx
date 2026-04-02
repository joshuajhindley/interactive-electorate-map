import { useEffect, type PropsWithChildren } from 'react'
import './Modal.scss'

type ModalProps = PropsWithChildren & {
  onClose: () => void
  className?: string
  header?: string
  maxWidth?: string
}

const Modal: React.FC<ModalProps> = ({ children, onClose, className, header, maxWidth }) => {
  useEffect(() => {
    // prevent background elements scrolling while modal is open
    document.body.style.overflow = 'hidden'

    return () => {
      // restore scroll when modal is closed
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div
        className={`modal-content ${className}`}
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
        style={{ maxWidth: maxWidth }}
      >
        {header && <h2 className='modal-header'>{header}</h2>}
        <span className='close-button' onClick={onClose} aria-label='Close modal'>
          x
        </span>
        {children}
      </div>
    </div>
  )
}

export default Modal
