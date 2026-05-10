'use client';

import React, { useState, useEffect } from 'react';
import styles from './AuthScreen.module.css';
import { useAuth } from '../../context/AuthContext';
import { Delete } from 'lucide-react';

export const AuthScreen = () => {
  const { login } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleKeyPress = async (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      // Auto-submit al llegar a 4 dígitos
      if (newPin.length === 4) {
        const success = await login(newPin);
        if (!success) {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 1000);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className={styles.container}>
      <div className={styles.authBox}>
        <div className={styles.title}>SPV Intelligence</div>
        <div className={styles.subtitle}>Ingresa tu PIN de acceso</div>

        <div className={styles.pinDisplay}>
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`${styles.pinDot} ${pin.length > i ? styles.pinDotActive : ''}`} 
            />
          ))}
        </div>

        <div className={styles.keypad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} className={styles.keyBtn} onClick={() => handleKeyPress(num.toString())}>
              {num}
            </button>
          ))}
          <div /> {/* Espacio vacío */}
          <button className={styles.keyBtn} onClick={() => handleKeyPress('0')}>0</button>
          <button className={`${styles.keyBtn} ${styles.keyBtnAction}`} onClick={handleDelete}>
            <Delete size={24} />
          </button>
        </div>

        <div className={styles.errorText}>
          {error ? 'PIN Incorrecto' : ''}
        </div>
      </div>
    </div>
  );
};
