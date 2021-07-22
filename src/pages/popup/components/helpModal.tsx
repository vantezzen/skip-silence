import React from 'react';
import { useState } from 'react';

import "./helpModal.scss";

const HelpModal = ({ children } : { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="help-modal">
      <button className="open-button" onClick={() => setIsOpen(true)}>?</button>

      {isOpen && (
        <div className="help-modal__modal">
          <button className="close-button" onClick={() => setIsOpen(false)}>
            &times;
          </button>

          {children}
        </div>
      )}
    </div>
  );
};

export default HelpModal;
