// frontend/src/components/Common/ResponsiveTable.jsx
import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import './ResponsiveTable.css';

export const ResponsiveTable = ({ columns, data, mobileCardRenderer }) => {
  const { isMobile } = useResponsive();

  if (isMobile) {
    // Vue carte sur mobile
    return (
      <div className="mobile-cards">
        {data.map((item, index) => (
          <div key={index} className="card">
            {mobileCardRenderer ? mobileCardRenderer(item) : (
              <>
                {columns.map(col => (
                  <div key={col.key} className="card-row">
                    <span className="card-label">{col.title}:</span>
                    <span className="card-value">{item[col.dataIndex]}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Vue tableau sur tablette/desktop
  return (
    <div className="responsive-table-wrapper">
      <table className="responsive-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>{col.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              {columns.map(col => (
                <td key={col.key}>{item[col.dataIndex]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};