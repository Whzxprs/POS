'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Wine, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  ClipboardList
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Piso / Mesas', icon: LayoutDashboard },
    { href: '/cocina', label: 'KDS Cocina', icon: UtensilsCrossed },
    { href: '/barra', label: 'KDS Barra', icon: Wine },
    { href: '/tareas', label: 'Tareas / Kanban', icon: ClipboardList },
    { href: '/staff', label: 'Personal', icon: Users },
    { href: '/config', label: 'Configuración', icon: Settings },
  ];

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        <div className={styles.brand}>POS Intel</div>
        <button 
          className={styles.toggleBtn} 
          onClick={onToggle}
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link 
              href={item.href}
              key={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className={styles.label}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.userSection}>
        <div className={styles.avatar}>AM</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>Area Manager</span>
          <span className={styles.userRole}>Turno Matutino</span>
        </div>
      </div>
    </aside>
  );
};
