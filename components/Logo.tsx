import React from 'react';

const Logo: React.FC = () => {
  return (
    <svg width="250" height="80" viewBox="0 0 250 80" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(44, 29)" stroke="#20c997" stroke-width="3" fill="#20c997">
        <circle cx="0" cy="10" r="4"/>
        <circle cx="20" cy="0" r="4"/>
        <circle cx="20" cy="20" r="4"/>
        <line x1="0" y1="10" x2="20" y2="0"/>
        <line x1="0" y1="10" x2="20" y2="20"/>
      </g>
      <text x="84" y="50" fontFamily="Open Sans, Segoe UI, sans-serif" fontSize="32" fontWeight="bold" fill="#E2E8F0">
        Go<tspan fill="#20c997" fontWeight="normal">Prompt</tspan>
      </text>
    </svg>
  );
};

export default Logo;
