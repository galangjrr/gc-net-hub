# Backend Migration & Integration Plan

Migrasi database dan API ke Supabase.

## User Review Required

> [!WARNING]
> Go backend dihapus (`main.go`, `handlers.go`, `db.go`, `models.go`).
> Menggunakan Supabase Postgres untuk database, auth, dan RLS.

## Proposed Changes

### Database Schema (Normalisasi "Satu Fakta, Satu Tempat")
- [NEW] **Tabel `pcs`**: `id` (PK), `name` (VARCHAR), `status` (ENUM: 'available', 'occupied').
- [NEW] **Tabel `pakets`**: `id` (PK), `name` (VARCHAR), `price` (INT), `duration_minutes` (INT), `fixed_start_time` (TIME).
- [NEW] **Tabel `players`**: `id` (PK), `name` (VARCHAR).
- [NEW] **Tabel `inventory`**: `id` (PK), `name` (VARCHAR), `price` (INT), `stock` (INT), `category` (ENUM: 'food', 'drink', 'other').
- [NEW] **Tabel `bookings`**: 
  - `id` (PK), `player_id` (FK), `pc_id` (FK), `paket_id` (FK)
  - `price` (INT), `status` (ENUM), `payment_status` (ENUM)
- [NEW] **Tabel `logs`**:
  - `id` (PK), `booking_id` (FK), `action` (ENUM), `cancel_reason` (VARCHAR)

### Security & Auth
- [NEW] **Database:** Supabase Postgres.
- [NEW] **Auth:** Supabase Auth (Login Admin).
- [NEW] **RLS Policy:** `anon` (SELECT), `authenticated` (CRUD).

### Backend (Database & Services)
- [NEW] Setup Supabase project (Postgres, Auth, Edge Functions jika perlu).
- [DELETE] File Go lama (`main.go`, `handlers.go`, `db.go`, `models.go`).

### Frontend-Backend Integration
- [NEW] Setup Supabase Client di Next.js (client & server).
- [NEW] Integrasi Supabase client di API routes Next.js untuk query database.

## Verification Plan
### Manual Verification
- Cek migrasi tabel Supabase berhasil.
- Cek query CRUD dari Supabase Client berjalan.
- Cek RLS aktif memblokir akses yang tidak diizinkan.
