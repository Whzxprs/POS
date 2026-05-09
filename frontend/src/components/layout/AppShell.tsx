'use client';

import React, { useState } from 'react';
import { Sidebar } from '../ui/Sidebar';
import styles from './AppShell.module.css';
import { useAuth } from '../../context/AuthContext';
import { AuthScreen } from '../../features/auth/AuthScreen';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className={styles.appShell}>
      <Sidebar 
        collapsed={collapsed} 
        onToggle={() => setCollapsed(!collapsed)} 
      />
      <main className={`${styles.mainContent} ${collapsed ? styles.mainContentCollapsed : styles.mainContentExpanded}`}>
        <div className={styles.contentWrapper}>
          {children}
        </div>
      </main>
    </div>
  );
};
