// Cada elemento es un paso de migración: nunca se edita uno ya publicado,
// solo se agregan nuevos al final.
export const MIGRATIONS: readonly string[][] = [
  // v1 — tablas iniciales de medicamentos y tomas
  [
    `CREATE TABLE medications (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      presentation TEXT NOT NULL CHECK (presentation IN ('pen', 'tablet')),
      unit_label TEXT NOT NULL,
      created_at TEXT NOT NULL,
      archived_at TEXT
    );`,
    `CREATE TABLE dose_schedules (
      id TEXT PRIMARY KEY NOT NULL,
      medication_id TEXT NOT NULL REFERENCES medications(id),
      dose_description TEXT NOT NULL,
      time_of_day TEXT NOT NULL,
      frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly')),
      day_of_week INTEGER,
      active_from TEXT NOT NULL,
      active_to TEXT
    );`,
    `CREATE TABLE dose_history (
      id TEXT PRIMARY KEY NOT NULL,
      medication_id TEXT NOT NULL REFERENCES medications(id),
      dose_description TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      note TEXT
    );`,
    `CREATE TABLE doses_taken (
      id TEXT PRIMARY KEY NOT NULL,
      medication_id TEXT NOT NULL REFERENCES medications(id),
      scheduled_time TEXT NOT NULL,
      taken_at TEXT NOT NULL,
      dose_description TEXT NOT NULL,
      injection_site TEXT CHECK (injection_site IN ('abdomen', 'thigh', 'arm')),
      side_effect_note TEXT
    );`,
    `CREATE TABLE inventory (
      id TEXT PRIMARY KEY NOT NULL,
      medication_id TEXT NOT NULL REFERENCES medications(id),
      remaining_units REAL NOT NULL,
      unit_type TEXT NOT NULL CHECK (unit_type IN ('tablets', 'pen_doses')),
      last_updated_at TEXT NOT NULL
    );`,
  ],
  // v2 — inventario: cantidad física por toma (clicks/tabletas), separada de la
  // dosis clínica. `inventory` se reconstruye sin `unit_type` (la unidad sale de
  // la presentación); en v1 nada la escribía, así que estaba vacía.
  [
    `ALTER TABLE dose_schedules ADD COLUMN quantity_per_dose REAL;`,
    `ALTER TABLE dose_history ADD COLUMN quantity_per_dose REAL;`,
    `ALTER TABLE doses_taken ADD COLUMN quantity_taken REAL;`,
    `DROP TABLE inventory;`,
    `CREATE TABLE inventory (
      id TEXT PRIMARY KEY NOT NULL,
      medication_id TEXT NOT NULL UNIQUE REFERENCES medications(id),
      remaining_units REAL NOT NULL,
      last_updated_at TEXT NOT NULL
    );`,
  ],
  // v3 — perfil local de una sola fila. Que exista la fila significa que ya
  // se pasó por la bienvenida. En la fase 3 corresponde al perfil en Supabase.
  [
    `CREATE TABLE user_profile (
      id TEXT PRIMARY KEY NOT NULL,
      display_name TEXT,
      created_at TEXT NOT NULL
    );`,
  ],
];
