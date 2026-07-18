import React from "react";
import { createPortal } from "react-dom";

interface ModalPortalProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

export const ModalPortal: React.FC<ModalPortalProps> = ({
  isOpen,
  children,
  className = ""
}) => {
  if (!isOpen) return null;
  return createPortal(
    <div className={`modal modal-open z-[9999] ${className}`}>
      {children}
    </div>,
    document.body
  );
};
