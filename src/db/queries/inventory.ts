import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { adjustStock, type StockRow } from '@/features/inventory/stock';

import { getDatabase } from '../index';

/** Existencias de cada medicamento con inventario, y lo consumido desde `sinceIso` (UTC). */
export async function listStock(sinceIso: string): Promise<StockRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<StockRow>(
    `SELECT i.medication_id as medicationId,
            i.remaining_units as remaining,
            COALESCE(SUM(d.quantity_taken), 0) as consumedInWindow,
            (SELECT MIN(t.taken_at) FROM doses_taken t
             WHERE t.medication_id = i.medication_id AND t.quantity_taken IS NOT NULL) as trackedSince
     FROM inventory i
     LEFT JOIN doses_taken d ON d.medication_id = i.medication_id AND d.taken_at >= ?
     GROUP BY i.medication_id, i.remaining_units`,
    [sinceIso]
  );
}

/** Guarda el total que le queda al usuario (al comprar o al corregir el conteo). */
export async function setStock(medicationId: string, remaining: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO inventory (id, medication_id, remaining_units, last_updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (medication_id) DO UPDATE SET
       remaining_units = excluded.remaining_units,
       last_updated_at = excluded.last_updated_at`,
    [Crypto.randomUUID(), medicationId, remaining, new Date().toISOString()]
  );
}

/**
 * Suma `delta` a las existencias (negativo al tomar). Recibe `db` para correr
 * dentro de la transacción de quien la llama. Sin inventario registrado no hace nada.
 */
export async function adjustStockBy(
  db: SQLiteDatabase,
  medicationId: string,
  delta: number
): Promise<void> {
  const row = await db.getFirstAsync<{ remaining_units: number }>(
    'SELECT remaining_units FROM inventory WHERE medication_id = ?',
    [medicationId]
  );
  if (!row) return;
  await db.runAsync(
    'UPDATE inventory SET remaining_units = ?, last_updated_at = ? WHERE medication_id = ?',
    [adjustStock(row.remaining_units, delta), new Date().toISOString(), medicationId]
  );
}
