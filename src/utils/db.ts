/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'user';
export type UserStatus = 'pending_approval' | 'active' | 'blocked';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // Simulated hashed password
  role: UserRole;
  status: UserStatus;
  balance: number; // in USDT
  btcBalance: number; // in BTC
  initialBalance: number;
  createdAt: string;
}

export interface Invitation {
  id: string;
  code: string;
  maxUses: number; // -1 for unlimited
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface Movement {
  id: string;
  userId: string;
  userName: string;
  type: 'mining' | 'admin_adjustment' | 'signup_bonus' | 'withdrawal' | 'deposit' | 'transfer_sent' | 'transfer_received';
  amount: number; // For USDT representation
  asset: 'USDT' | 'BTC' | 'ETH' | 'TRX';
  description: string;
  timestamp: string;
  status?: 'pending' | 'confirming' | 'completed' | 'failed';
  txId?: string;
  confirmations?: number;
  cryptoAmount?: number;
  targetAddress?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetUserId?: string;
  targetUserName?: string;
  details: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string | 'all';
  title: string;
  message: string;
  readBy: string[]; // List of user IDs that read it
  createdAt: string;
}

export interface MiningRig {
  id: string;
  userId: string;
  name: string;
  hashrate: number; // MH/s
  powerConsumption: number; // Watts
  status: 'running' | 'paused';
  cost: number; // USDT cost
  efficiency: number; // BTC/day per MH/s simulated
  purchasedAt: string;
}

export interface AppConfig {
  btcPriceUsdt: number;
  siteName: string;
  maintenanceMode: boolean;
  announcements: { id: string; title: string; content: string; createdAt: string }[];
  depositAddresses: {
    USDT_TRC20: string;
    USDT_ERC20: string;
    BTC: string;
    ETH: string;
    TRX: string;
  };
}

export interface DatabaseState {
  users: User[];
  invitations: Invitation[];
  movements: Movement[];
  activityLogs: ActivityLog[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  miningRigs: MiningRig[];
  config: AppConfig;
}

// Default Seed Data
const DEFAULT_CONFIG: AppConfig = {
  btcPriceUsdt: 92450.75,
  siteName: "AURA Mining Corp",
  maintenanceMode: false,
  announcements: [
    {
      id: "ann-1",
      title: "🚀 Lanzamiento de Nueva Plataforma de Minería",
      content: "Bienvenido a la versión v2.0 de AURA Mining. Hemos optimizado la tasa de retorno de los rigs de minería ASIC S21 Pro.",
      createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
    },
    {
      id: "ann-2",
      title: "⚡ Mantenimiento Programado de Nodos",
      content: "La red de minería en la nube de Reikiavik experimentará una actualización rutinaria sin interrupción del hash rate contratado.",
      createdAt: new Date().toISOString()
    }
  ],
  depositAddresses: {
    USDT_TRC20: "TX3auraminingTRC20xxxxxxxxxxxxxxx",
    USDT_ERC20: "0x3auraminingERC20xxxxxxxxxxxxxxx",
    BTC: "bc1q3auraminingBTCxxxxxxxxxxxxxxxx",
    ETH: "0x3auraminingETHxxxxxxxxxxxxxxxxxx",
    TRX: "T3auraminingTRXxxxxxxxxxxxxxxxxxxx"
  }
};

const SEED_USERS: User[] = [
  {
    id: "user-admin",
    name: "Administrador General",
    email: "admin@auramining.com",
    passwordHash: "admin123", // Simulated bcrypt
    role: "admin",
    status: "active",
    balance: 50000.00,
    btcBalance: 0.25,
    initialBalance: 50000.00,
    createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString()
  },
  {
    id: "user-1",
    name: "Carlos Mendoza",
    email: "carlos@gmail.com",
    passwordHash: "user123",
    role: "user",
    status: "active",
    balance: 1250.00,
    btcBalance: 0.0154,
    initialBalance: 1000.00,
    createdAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString()
  },
  {
    id: "user-2",
    name: "Sofía Rodríguez",
    email: "sofia@hotmail.com",
    passwordHash: "user123",
    role: "user",
    status: "pending_approval",
    balance: 500.00,
    btcBalance: 0,
    initialBalance: 500.00,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: "user-3",
    name: "Juan Pérez (Bloqueado)",
    email: "juan@yahoo.com",
    passwordHash: "user123",
    role: "user",
    status: "blocked",
    balance: 15.30,
    btcBalance: 0.0002,
    initialBalance: 100.00,
    createdAt: new Date(Date.now() - 3600000 * 24 * 15).toISOString()
  }
];

const SEED_INVITATIONS: Invitation[] = [
  {
    id: "inv-1",
    code: "AURA-WELCOME-2026",
    maxUses: -1, // Unlimited
    usedCount: 2,
    expiresAt: null,
    isActive: true,
    createdBy: "user-admin",
    createdAt: new Date(Date.now() - 3600000 * 24 * 20).toISOString()
  },
  {
    id: "inv-2",
    code: "VIP-ONE-TIME-ONLY",
    maxUses: 1,
    usedCount: 0,
    expiresAt: new Date(Date.now() + 3600000 * 24 * 7).toISOString(), // 7 days from now
    isActive: true,
    createdBy: "user-admin",
    createdAt: new Date().toISOString()
  },
  {
    id: "inv-3",
    code: "EXPIRED-CODE",
    maxUses: 5,
    usedCount: 1,
    expiresAt: new Date(Date.now() - 3600000 * 24).toISOString(), // Expired yesterday
    isActive: true,
    createdBy: "user-admin",
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
  }
];

const SEED_RIGS: MiningRig[] = [
  {
    id: "rig-1",
    userId: "user-1",
    name: "Antminer S19 XP (Texas Node)",
    hashrate: 140, // MH/s
    powerConsumption: 3010,
    status: "running",
    cost: 4500,
    efficiency: 0.0000012, // BTC per day per MH/s
    purchasedAt: new Date(Date.now() - 3600000 * 24 * 9).toISOString()
  },
  {
    id: "rig-2",
    userId: "user-1",
    name: "Whatsminer M50S (Iceland Node)",
    hashrate: 126,
    powerConsumption: 3276,
    status: "running",
    cost: 3800,
    efficiency: 0.0000011,
    purchasedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
  },
  {
    id: "rig-admin-1",
    userId: "user-admin",
    name: "Industrial Node ASIC S21 Pro x5",
    hashrate: 1170, // Huge
    powerConsumption: 17500,
    status: "running",
    cost: 25000,
    efficiency: 0.0000013,
    purchasedAt: new Date(Date.now() - 3600000 * 24 * 25).toISOString()
  }
];

const SEED_MOVEMENTS: Movement[] = [
  {
    id: "mov-1",
    userId: "user-1",
    userName: "Carlos Mendoza",
    type: "signup_bonus",
    amount: 1000.00,
    asset: "USDT",
    description: "Bono de registro por enlace de invitación",
    timestamp: new Date(Date.now() - 3600000 * 24 * 10).toISOString()
  },
  {
    id: "mov-2",
    userId: "user-1",
    userName: "Carlos Mendoza",
    type: "admin_adjustment",
    amount: 250.00,
    asset: "USDT",
    description: "Saldo inicial de demostración asignado por el Admin",
    timestamp: new Date(Date.now() - 3600000 * 24 * 9).toISOString()
  },
  {
    id: "mov-3",
    userId: "user-1",
    userName: "Carlos Mendoza",
    type: "mining",
    amount: 0.0054,
    asset: "BTC",
    description: "Simulación de ganancias acumuladas de minería",
    timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
  }
];

const SEED_AUDITS: AuditLog[] = [
  {
    id: "aud-1",
    adminId: "user-admin",
    adminName: "Administrador General",
    action: "CREATE_INVITATION",
    details: "Creación de enlace de invitación ilimitado: AURA-WELCOME-2026",
    timestamp: new Date(Date.now() - 3600000 * 24 * 20).toISOString()
  },
  {
    id: "aud-2",
    adminId: "user-admin",
    adminName: "Administrador General",
    action: "ADJUST_BALANCE",
    targetUserId: "user-1",
    targetUserName: "Carlos Mendoza",
    details: "Asignación manual de saldo de +250 USDT",
    timestamp: new Date(Date.now() - 3600000 * 24 * 9).toISOString()
  },
  {
    id: "aud-3",
    adminId: "user-admin",
    adminName: "Administrador General",
    action: "BLOCK_USER",
    targetUserId: "user-3",
    targetUserName: "Juan Pérez (Bloqueado)",
    details: "Bloqueo por sospecha de actividad inusual",
    timestamp: new Date(Date.now() - 3600000 * 24 * 8).toISOString()
  }
];

const SEED_ACTIVITY: ActivityLog[] = [
  {
    id: "act-1",
    userId: "user-1",
    userName: "Carlos Mendoza",
    action: "LOGIN",
    details: "Inicio de sesión correcto en la plataforma",
    ipAddress: "192.168.1.45",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: "act-2",
    userId: "user-2",
    userName: "Sofía Rodríguez",
    action: "REGISTER",
    details: "Registro exitoso con código VIP-ONE-TIME-ONLY (Pendiente de aprobación)",
    ipAddress: "186.23.90.11",
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
  }
];

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "not-1",
    userId: "all",
    title: "🔒 Seguridad de Cuenta Reforzada",
    message: "Hemos habilitado la protección CSRF y rate-limiting en nuestros endpoints simulados.",
    readBy: ["user-1"],
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: "not-2",
    userId: "user-1",
    title: "⚡ Rig de Minería Activado",
    message: "Tu Antminer S19 XP ya está conectado a los servidores de Texas.",
    readBy: [],
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  }
];

const LOCAL_STORAGE_KEY = "aura_mining_db";

export function loadDatabase(): DatabaseState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const state: DatabaseState = {
        users: SEED_USERS,
        invitations: SEED_INVITATIONS,
        movements: SEED_MOVEMENTS,
        activityLogs: SEED_ACTIVITY,
        auditLogs: SEED_AUDITS,
        notifications: SEED_NOTIFICATIONS,
        miningRigs: SEED_RIGS,
        config: DEFAULT_CONFIG
      };
      saveDatabase(state);
      return state;
    }
    const parsed = JSON.parse(raw);
    if (parsed && parsed.config && !parsed.config.depositAddresses) {
      parsed.config.depositAddresses = { ...DEFAULT_CONFIG.depositAddresses };
      saveDatabase(parsed);
    }
    return parsed;
  } catch (error) {
    console.error("Error loading database:", error);
    return {
      users: SEED_USERS,
      invitations: SEED_INVITATIONS,
      movements: SEED_MOVEMENTS,
      activityLogs: SEED_ACTIVITY,
      auditLogs: SEED_AUDITS,
      notifications: SEED_NOTIFICATIONS,
      miningRigs: SEED_RIGS,
      config: DEFAULT_CONFIG
    };
  }
}

export function saveDatabase(state: DatabaseState): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Error saving database:", error);
  }
}

export function resetDatabaseToDefault(): DatabaseState {
  const state: DatabaseState = {
    users: SEED_USERS,
    invitations: SEED_INVITATIONS,
    movements: SEED_MOVEMENTS,
    activityLogs: SEED_ACTIVITY,
    auditLogs: SEED_AUDITS,
    notifications: SEED_NOTIFICATIONS,
    miningRigs: SEED_RIGS,
    config: DEFAULT_CONFIG
  };
  saveDatabase(state);
  return state;
}
