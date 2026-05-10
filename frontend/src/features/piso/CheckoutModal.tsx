'use client';

import React, { useState, useEffect } from 'react';
import styles from './CheckoutModal.module.css';
import { X, CreditCard, Banknote, Smartphone, Receipt } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableData: {
    id: number | string;
    name: string;
    number: number | string;
    amount: number;
    orderId?: string;
  } | null;
}

export const CheckoutModal = ({ isOpen, onClose, tableData }: CheckoutModalProps) => {
  const [tipPercentage, setTipPercentage] = useState<number>(15);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'transfer' | null>('card');
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && tableData?.orderId) {
      fetchItems();
    }
  }, [isOpen, tableData]);

  const fetchItems = async () => {
    const { data } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', tableData!.orderId);
    if (data) setItems(data);
  };

  if (!isOpen || !tableData) return null;

  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = subtotal * 0.16; // 16% IVA México
  const total = subtotal + tax;
  const tipAmount = total * (tipPercentage / 100);
  const grandTotal = total + tipAmount;

  const handlePayment = async () => {
    if (!tableData.orderId) return;

    // Ejecutar RPC para cobrar y descontar inventario (mermas)
    const { error } = await supabase.rpc('process_checkout', {
      p_order_id: tableData.orderId,
      p_payment_method: paymentMethod
    });

    if (error) {
      alert("Error al procesar el pago: " + error.message);
    } else {
      // Liberar la mesa
      await supabase.from('tables').update({ status: 'available' }).eq('id', tableData.id);
      alert(`Cobro exitoso por $${grandTotal.toFixed(2)} en ${paymentMethod}. Inventario descontado correctamente.`);
      onClose();
    }
  };

  return (
    <div className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}>
      <div className={styles.modal}>
        
        {/* Lado Izquierdo: El Ticket */}
        <div className={styles.ticketSection}>
          <div className={styles.header}>
            <div>
              <div className={styles.title}>Cuenta: {tableData.name}</div>
              <div className={styles.tableInfo}>Mesa {tableData.number} • Orden {tableData.orderId?.split('-')[0]}</div>
            </div>
            <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={onClose}>
              <X size={24} />
            </button>
          </div>

          <div className={styles.itemList}>
            {items.map(item => (
              <div key={item.id} className={styles.itemRow}>
                <div>
                  <div className={styles.itemName}>{item.quantity}x {item.product_name}</div>
                  {item.notes && <div className={styles.itemNotes}>{item.notes}</div>}
                </div>
                <div className={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
            {items.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>No hay consumo registrado.</div>}
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

            <button className={styles.payBtn} onClick={handlePayment} disabled={items.length === 0}>
              <Receipt size={24} />
              Procesar Pago y Cerrar Mesa
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
