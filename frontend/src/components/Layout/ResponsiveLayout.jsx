// frontend/src/components/Layout/ResponsiveLayout.jsx
import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import './ResponsiveLayout.css';

export const ResponsiveLayout = ({ children, sidebar, header }) => {
  const { isMobile, isTablet, isPortrait, orientation } = useResponsive();

  return (
    <div className={`app-layout ${isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'} ${orientation}`}>
      {/* Sidebar conditionnelle */}
      {sidebar && !isMobile && (
        <aside className="sidebar">
          {sidebar}
        </aside>
      )}
      
      {/* Sidebar mobile (drawer) */}
      {isMobile && sidebar && (
        <div className="mobile-drawer">
          {/* Implémentez un drawer menu ici */}
        </div>
      )}
      
      <div className="main-content">
        {header && (
          <header className="header" style={{ height: 'var(--header-height)' }}>
            {header}
          </header>
        )}
        
        <main className={`content ${!sidebar ? 'full-width' : ''}`}>
          {children}
        </main>
      </div>
      
      {/* Navigation bottom pour mobile */}
      {isMobile && (
        <nav className="bottom-navigation">
          {/* Ajoutez votre navigation mobile ici */}
        </nav>
      )}
    </div>
  );
};