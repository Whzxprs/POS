'use client';

import React, { useState } from 'react';
import { Sidebar } from '../ui/Sidebar';
import styles from './AppShell.module.css';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);

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
