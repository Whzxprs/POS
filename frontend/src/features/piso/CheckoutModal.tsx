'use client';

import React, { useState } from 'react';
import styles from './CheckoutModal.module.css';
import { X, CreditCard, Banknote, Smartphone, Receipt } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableData: {
    id: number;
    name: string;
    number: number;
    amount: number;
  } | null;
}

// Mock ticket items
const TICKET_ITEMS = [
  { id: 1, name: 'Margarita Custom', notes: 'Don Julio 70, + St. Germain', price: 280.00 },
  { id: 2, name: 'Ribeye 400g', notes: 'Término Medio, Puré Trufado', price: 850.00 },
  { id: 3, name: 'Ensalada César', notes: 'Sin anchoas', price: 180.00 },
  { id: 4, name: 'Agua Mineral', notes: '', price: 60.00 },
];

export const CheckoutModal = ({ isOpen, onClose, tableData }: CheckoutModalProps) => {
  const [tipPercentage, setTipPercentage] = useState<number>(15);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'transfer' | null>('card');

  if (!isOpen || !tableData) return null;

  // Calculos simulados basados en tableData.amount (que lo asume como el Subtotal sin IVA, o Subtotal con IVA)
  // Para la demo, el tableData.amount es el Subtotal.
  const subtotal = TICKET_ITEMS.reduce((acc, item) => acc + item.price, 0); // Ignoramos tableData.amount para que cuadre el mock
  const tax = subtotal * 0.16; // 16% IVA México
  const total = subtotal + tax;
  const tipAmount = total * (tipPercentage / 100);
  const grandTotal = total + tipAmount;

  return (
    <div className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}>
      <div className={styles.modal}>
        
        {/* Lado Izquierdo: El Ticket */}
        <div className={styles.ticketSection}>
          <div className={styles.header}>
            <div>
              <div className={styles.title}>Cuenta: {tableData.name}</div>
              <div className={styles.tableInfo}>Mesa {tableData.number} • Folio #00842</div>
            </div>
            <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={onClose}>
              <X size={24} />
            </button>
          </div>

          <div className={styles.itemList}>
            {TICKET_ITEMS.map(item => (
              <div key={item.id} className={styles.itemRow}>
                <div>
                  <div className={styles.itemName}>{item.name}</div>
                  {item.notes && <div className={styles.itemNotes}>{item.notes}</div>}
                </div>
                <div className={styles.itemPrice}>${item.price.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Lado Derecho: Controles de Pago */}
        <div className={styles.paymentSection}>
          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>IVA (16%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Propina ({tipPercentage}%)</span>
              <span>${tipAmount.toFixed(2)}</span>
            </div>
            <div className={styles.summaryTotal}>
              <span>Total a Cobrar</span>
              <span style={{ color: 'var(--accent-success)' }}>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className={styles.paymentControls}>
            <div>
              <div className={styles.sectionLabel}>Sugerencia Propina</div>
              <div className={styles.tipButtons}>
                {[10, 15, 20].map(pct => (
                  <button 
                    key={pct}
                    className={`${styles.tipBtn} ${tipPercentage === pct ? styles.active : ''}`}
                    onClick={() => setTipPercentage(pct)}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className={styles.sectionLabel}>Método de Pago</div>
              <div className={styles.methodGrid}>
                <button 
                  className={`${styles.methodBtn} ${paymentMethod === 'card' ? styles.active : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard size={24} />
                  Tarjeta
                </button>
                <button 
                  className={`${styles.methodBtn} ${paymentMethod === 'cash' ? styles.active : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote size={24} />
                  Efectivo
                </button>
                <button 
                  className={`${styles.methodBtn} ${paymentMethod === 'transfer' ? styles.active : ''}`}
                  onClick={() => setPaymentMethod('transfer')}
                >
                  <Smartphone size={24} />
                  Transferencia
                </button>
              </div>
            </div>

            <button className={styles.payBtn} onClick={() => {
              // Simular pago procesado
              alert(`Cobro exitoso por $${grandTotal.toFixed(2)} en ${paymentMethod}`);
              onClose();
            }}>
              <Receipt size={24} />
              Procesar Pago
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
