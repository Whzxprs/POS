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
  ClipboardList,
  LogOut,
  Map as MapIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { href: '/', label: 'Piso / Mesas', icon: LayoutDashboard, roles: ['manager', 'capitan', 'mesero'] },
    { href: '/cocina', label: 'KDS Cocina', icon: UtensilsCrossed, roles: ['manager', 'cocina'] },
    { href: '/barra', label: 'KDS Barra', icon: Wine, roles: ['manager', 'barra'] },
    { href: '/tareas', label: 'Tareas / Kanban', icon: ClipboardList, roles: ['manager', 'capitan'] },
    { href: '/editor', label: 'Mapa / Editor', icon: MapIcon, roles: ['manager', 'capitan'] },
    { href: '/staff', label: 'Personal', icon: Users, roles: ['manager'] },
    { href: '/config', label: 'Configuración', icon: Settings, roles: ['manager'] },
  ];

  // Filtramos por rol
  const allowedItems = navItems.filter(item => user && item.roles.includes(user.role));

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
        {allowedItems.map((item) => {
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
        <div className={styles.avatar}>{user?.name.substring(0,2).toUpperCase()}</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user?.name}</span>
          <span className={styles.userRole}>{user?.role.toUpperCase()}</span>
        </div>
        {!collapsed && (
          <button onClick={logout} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}>
            <LogOut size={20} />
          </button>
        )}
      </div>
    </aside>
  );
};
