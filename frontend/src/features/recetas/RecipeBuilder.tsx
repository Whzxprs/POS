'use client';

import React, { useState, useEffect } from 'react';
import styles from './RecipeBuilder.module.css';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Save, Calculator } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  net_cost: number;
}

interface Location {
  id: string;
  name: string;
}

export const RecipeBuilder = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Form State
  const [recipeName, setRecipeName] = useState('');
  const [recipeCode, setRecipeCode] = useState('');
  const [stationId, setStationId] = useState('');
  const [targetCostPct, setTargetCostPct] = useState(30);
  const [ingredients, setIngredients] = useState<{ itemId: string; qty: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: invData } = await supabase.from('inventory_items').select('*');
      const { data: locData } = await supabase.from('locations').select('*').eq('is_production_area', true);
      
      if (invData) setItems(invData as any);
      if (locData) setLocations(locData as any);
    };
    fetchData();
  }, []);

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { itemId: '', qty: 1 }]);
  };

  const handleIngredientChange = (index: number, field: string, value: any) => {
    const newIngs = [...ingredients];
    newIngs[index] = { ...newIngs[index], [field]: value };
    setIngredients(newIngs);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Cálculos Automáticos de Escandallo
  const totalNetCost = ingredients.reduce((sum, ing) => {
    const item = items.find(i => i.id === ing.itemId);
    if (!item) return sum;
    return sum + (item.net_cost * ing.qty);
  }, 0);

  const suggestedPrice = targetCostPct > 0 ? (totalNetCost / (targetCostPct / 100)) : 0;

  const handleSave = async () => {
    if (!recipeName || !recipeCode || ingredients.length === 0) {
      alert("Faltan datos de la receta.");
      return;
    }

    // Insert Recipe
    const { data: recipe, error } = await supabase.from('recipes').insert({
      code: recipeCode,
      name: recipeName,
      type: 'menu_item',
      station_id: stationId || null,
      target_cost_pct: targetCostPct,
      sale_price: suggestedPrice
    }).select().single();

    if (error) {
      alert("Error guardando receta: " + error.message);
      return;
    }

    // Insert Ingredients
    const ingsPayload = ingredients.map(ing => {
      const item = items.find(i => i.id === ing.itemId);
      return {
        recipe_id: recipe.id,
        ingredient_item_id: ing.itemId,
        qty: ing.qty,
        unit: item?.unit || 'unidad'
      };
    });

    await supabase.from('recipe_ingredients').insert(ingsPayload);
    alert("¡Ficha técnica guardada con éxito!");
    
    // Reset
    setRecipeName('');
    setRecipeCode('');
    setIngredients([]);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Constructor de Fichas Técnicas (Costeos)</div>
        <button className={styles.addBtn} onClick={handleSave}>
          <Save size={18} /> Guardar Receta
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Código de Receta</label>
            <input 
              className={styles.input} 
              placeholder="Ej. PLA-001" 
              value={recipeCode}
              onChange={e => setRecipeCode(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Nombre del Platillo / Trago</label>
            <input 
              className={styles.input} 
              placeholder="Ej. Margarita Clásica"
              value={recipeName}
              onChange={e => setRecipeName(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Estación de Preparación</label>
            <select 
              className={styles.input}
              value={stationId}
              onChange={e => setStationId(e.target.value)}
            >
              <option value="">-- Seleccionar --</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>% Costo Objetivo (Food Cost)</label>
            <input 
              type="number" 
              className={styles.input} 
              value={targetCostPct}
              onChange={e => setTargetCostPct(Number(e.target.value))}
            />
          </div>
        </div>

        <div className={styles.ingredientSection}>
          <div className={styles.ingredientHeader}>
            <h3 style={{ fontSize: '1.1rem' }}>Ingredientes e Insumos</h3>
            <button className={styles.addBtn} onClick={handleAddIngredient} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
              <Plus size={16} /> Añadir Ingrediente
            </button>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Costo Unitario (Neto)</th>
                <th>Cantidad Usada</th>
                <th>Unidad</th>
                <th>Importe</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing, index) => {
                const selectedItem = items.find(i => i.id === ing.itemId);
                const lineTotal = selectedItem ? selectedItem.net_cost * ing.qty : 0;
                
                return (
                  <tr key={index}>
                    <td>
                      <select 
                        className={styles.input} 
                        style={{ width: '100%' }}
                        value={ing.itemId}
                        onChange={e => handleIngredientChange(index, 'itemId', e.target.value)}
                      >
                        <option value="">Selecciona insumo...</option>
                        {items.map(i => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>${selectedItem ? selectedItem.net_cost.toFixed(2) : '0.00'}</td>
                    <td>
                      <input 
                        type="number" 
                        className={styles.input} 
                        style={{ width: '100px' }}
                        value={ing.qty}
                        onChange={e => handleIngredientChange(index, 'qty', Number(e.target.value))}
                      />
                    </td>
                    <td>{selectedItem ? selectedItem.unit : '-'}</td>
                    <td style={{ fontWeight: 600 }}>${lineTotal.toFixed(2)}</td>
                    <td>
                      <button onClick={() => removeIngredient(index)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {ingredients.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No hay ingredientes. Haz clic en "Añadir Ingrediente" para empezar el costeo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.summarySection}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <span><Calculator size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}/> Costo Neto Total:</span>
              <span>${totalNetCost.toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>% Food Cost Deseado:</span>
              <span>{targetCostPct}%</span>
            </div>
            <div className={styles.summaryTotal}>
              <span>Precio de Venta Sugerido:</span>
              <span>${suggestedPrice.toFixed(2)}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              * El precio sugerido garantiza el porcentaje de costo objetivo seleccionado basado en el costo real extraído del almacén.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
