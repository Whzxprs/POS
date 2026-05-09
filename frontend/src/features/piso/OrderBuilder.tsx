'use client';

import React, { useState, useMemo } from 'react';
import styles from './OrderBuilder.module.css';
import { X, Plus, RefreshCw } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

// Tipos base para el constructor
type Ingredient = {
  id: string;
  name: string;
  volume: number; // en ml
  costPerMl: number; // Costo real del insumo
};

type SwapOption = {
  id: string;
  name: string;
  costPerMl: number;
};

// Catálogo de Licores simulado
const LIQUOR_CATALOG: SwapOption[] = [
  { id: 'tq_caz', name: 'Tequila Cazadores', costPerMl: 0.5 },
  { id: 'tq_dj70', name: 'Don Julio 70', costPerMl: 2.5 },
  { id: 'tq_1942', name: 'Don Julio 1942', costPerMl: 8.0 },
  { id: 'liq_cointreau', name: 'Cointreau', costPerMl: 1.2 },
  { id: 'liq_stgermain', name: 'St. Germain', costPerMl: 1.5 },
];

interface OrderBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  // En la vida real, recibiríamos el Item ID seleccionado
}

export const OrderBuilder = ({ isOpen, onClose }: OrderBuilderProps) => {
  const { getSocket } = useSocket();
  
  // Estado base del cocktail (Ej: Margarita)
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: 'tq_caz', name: 'Tequila Cazadores', volume: 45, costPerMl: 0.5 },
    { id: 'liq_cointreau', name: 'Cointreau', volume: 15, costPerMl: 1.2 },
  ]);

  const [activeSwapIndex, setActiveSwapIndex] = useState<number | null>(null);
  
  // Constantes de negocio
  // En gastronomía, el "Food Cost" esperado suele ser ~30%. Si Costo es 30%, Precio = Costo / 0.30. 
  // Usemos la regla: Precio = Costo / 0.25 (Para que el costo represente el 25% del precio, es decir, 75% margen bruto)
  const COST_PERCENTAGE_TARGET = 0.25;

  // Cálculos en tiempo real
  const { totalCost, finalPrice } = useMemo(() => {
    // Sumamos el costo de todos los insumos (ml * costo por ml)
    const cost = ingredients.reduce((acc, ing) => acc + (ing.volume * ing.costPerMl), 0);
    
    // Cálculo de precio de venta sugerido basado en política de costeo
    // Si mi costo total es $30, y quiero que represente el 25% de mi precio final: Precio = 30 / 0.25 = $120.
    const price = cost / COST_PERCENTAGE_TARGET;
    
    return { totalCost: cost, finalPrice: price };
  }, [ingredients]);

  const handleSwap = (newLiquor: SwapOption, index: number) => {
    const updated = [...ingredients];
    // Mantenemos el volumen original, pero cambiamos el licor y el costo
    updated[index] = {
      ...updated[index],
      id: newLiquor.id,
      name: newLiquor.name,
      costPerMl: newLiquor.costPerMl
    };
    setIngredients(updated);
    setActiveSwapIndex(null); // Cerramos el selector
  };

  const handleAddCustom = (volume: number) => {
    // Agregamos un extra (ej. St Germain)
    const newAddon = LIQUOR_CATALOG.find(l => l.id === 'liq_stgermain')!;
    setIngredients([...ingredients, { ...newAddon, volume }]);
  };

  const handleSend = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('new_order', {
        id: Math.random().toString(36).substr(2, 9),
        table: 'Familia Pérez (Mesa 12)',
        pax: 4,
        type: 'Margarita Custom',
        ingredients: ingredients,
        totalCost,
        finalPrice,
        timestamp: new Date().toISOString(),
        status: 'pending',
        allergies: []
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <h2>Margarita Custom</h2>
            <div className={styles.subtitle}>Cocktails de Autor</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Builder Content */}
        <div className={styles.content}>
          
          <div className={styles.sectionTitle}>Ingredientes Base (Modificables)</div>
          
          <div className={styles.ingredientList}>
            {ingredients.map((ing, index) => (
              <div key={`${ing.id}-${index}`}>
                <div className={styles.ingredientCard}>
                  <div className={styles.ingInfo}>
                    <span className={styles.ingName}>{ing.name}</span>
                    <span className={styles.ingDetails}>{ing.volume}ml • ${(ing.costPerMl * ing.volume).toFixed(2)} costo</span>
                  </div>
                  
                  <button 
                    className={styles.swapBtn}
                    onClick={() => setActiveSwapIndex(activeSwapIndex === index ? null : index)}
                  >
                    <RefreshCw size={14} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
                    Swap
                  </button>
                </div>

                {/* Sub-panel de Swap Inteligente */}
                {activeSwapIndex === index && (
                  <div className={styles.selectorModal}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Selecciona un reemplazo (Vol: {ing.volume}ml)
                    </div>
                    {LIQUOR_CATALOG.map(liquor => {
                      const diffCost = (liquor.costPerMl * ing.volume) - (ing.costPerMl * ing.volume);
                      const diffPrice = diffCost / COST_PERCENTAGE_TARGET;
                      
                      return (
                        <div key={liquor.id} className={styles.selectorItem} onClick={() => handleSwap(liquor, index)}>
                          <span className={styles.ingName}>{liquor.name}</span>
                          <span style={{ fontSize: '0.8rem', color: diffPrice > 0 ? 'var(--accent-warning)' : 'var(--text-secondary)' }}>
                            {diffPrice > 0 ? '+' : ''}${diffPrice.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.sectionTitle} style={{ marginTop: '1rem' }}>Añadir Extras (Add-ons)</div>
          
          <button className={styles.addBtn} onClick={() => {
            // Demo de agregar St. Germain
            handleAddCustom(15);
          }}>
            <Plus size={20} />
            Añadir Licor Extra
          </button>

          {/* Quick Volume Selector (visible solo si estamos agregando) */}
          {/* Implementación simplificada para la demo */}

        </div>

        {/* Footer / Costeo Dinámico */}
        <div className={styles.footer}>
          <div className={styles.priceBreakdown}>
            <span>Costo Total Insumos:</span>
            <span>${totalCost.toFixed(2)}</span>
          </div>
          <div className={styles.priceBreakdown}>
            <span>Food Cost Estimado:</span>
            <span>{(COST_PERCENTAGE_TARGET * 100)}%</span>
          </div>
          <div className={styles.priceTotal}>
            <span>Precio Final Cuenta:</span>
            <span style={{ color: 'var(--accent-success)' }}>${finalPrice.toFixed(2)}</span>
          </div>

          <button className={styles.sendBtn} onClick={handleSend}>
            Añadir a la Cuenta
          </button>
        </div>

      </div>
    </div>
  );
};
