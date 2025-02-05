import React from 'react';
import { FaAngleRight } from "react-icons/fa6";


export const ButtonBlue = ({ className, text, onClick, disabled, icon }) => {
  return (
    <div className=''>
      <button
        className={`text-xs font-medium ${className}`}
        onClick={onClick}
        disabled={disabled}
        style={{
          backgroundColor: '#007BFF',
          color: '#fff',
          padding: '8px 10px',
          borderRadius: '8px',
          cursor: 'pointer',
          position: 'relative',
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
          boxShadow: '0 2px 5px rgba(20, 88, 201, 0.17), inset 0 -2px 0.3px rgba(14, 56, 125, 0.18), inset 0 2px 1px rgba(255, 255, 255, 0.22)',
          // border: '1px solid #3963CE'
        }}
      >
        <div className='flex flex-row space-x-1'>
          {icon}
          <h1>{text}</h1>
        </div>
      </button>
    </div>
  );
}
