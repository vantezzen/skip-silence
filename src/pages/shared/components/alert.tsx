import React from 'react';

import "./alert.scss";

const Alert = ({ children } : { children: React.ReactNode }) => {
  return (
    <div className="alert">
      { children }
    </div>
  );
};

export default Alert;
