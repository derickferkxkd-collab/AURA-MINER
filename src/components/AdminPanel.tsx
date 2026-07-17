/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  KeyRound, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Megaphone, 
  Activity, 
  Coins, 
  Cpu, 
  LogOut, 
  Check, 
  X, 
  DollarSign, 
  Calendar, 
  FileText, 
  AlertTriangle,
  Mail,
  User as UserIcon,
  Bell,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { DatabaseState, User, Invitation, Movement, AuditLog, UserStatus } from '../utils/db';
import AuraLogo from './AuraLogo';

interface AdminPanelProps {
  currentUser: User;
  db: DatabaseState;
  createUserInvitation: (code: string, maxUses: number, expiresAt: string | null) => { success: boolean; error?: string };
  toggleInvitationStatus: (inviteId: string) => { success: boolean; error?: string };
  approveUser: (userId: string) => { success: boolean; error?: string };
  blockUser: (userId: string) => { success: boolean; error?: string };
  deleteUser: (userId: string) => { success: boolean; error?: string };
  modifyUserBalance: (userId: string, usdtAmount: number, btcAmount: number, reason: string) => { success: boolean; error?: string };
  publishAnnouncement: (title: string, content: string) => { success: boolean; error?: string };
  updateDepositAddresses: (addresses: { USDT_TRC20: string; USDT_ERC20: string; BTC: string; ETH: string; TRX: string }) => { success: boolean; error?: string };
  approveWithdrawal: (withdrawalId: string, txId: string) => { success: boolean; error?: string };
  rejectWithdrawal: (withdrawalId: string, reason: string) => { success: boolean; error?: string };
  approveDeposit: (depositId: string) => { success: boolean; error?: string };
  rejectDeposit: (depositId: string, reason: string) => { success: boolean; error?: string };
  logout: () => void;
  adminViewMode?: 'admin' | 'user';
  setAdminViewMode?: (mode: 'admin' | 'user') => void;
}

export default function AdminPanel({
  currentUser,
  db,
  createUserInvitation,
  toggleInvitationStatus,
  approveUser,
  blockUser,
  deleteUser,
  modifyUserBalance,
  publishAnnouncement,
  updateDepositAddresses,
  approveWithdrawal,
  rejectWithdrawal,
  approveDeposit,
  rejectDeposit,
  logout,
  adminViewMode,
  setAdminViewMode
}: AdminPanelProps) {
  
  // Navigation tabs
  const [adminTab, setAdminTab] = useState<'metrics' | 'users' | 'invitations' | 'comms' | 'audits' | 'wallets' | 'withdrawals' | 'deposits'>('metrics');

  // Wallet edit form states
  const [walletUsdtTrc20, setWalletUsdtTrc20] = useState<string>(db.config.depositAddresses?.USDT_TRC20 || '');
  const [walletUsdtErc20, setWalletUsdtErc20] = useState<string>(db.config.depositAddresses?.USDT_ERC20 || '');
  const [walletBtc, setWalletBtc] = useState<string>(db.config.depositAddresses?.BTC || '');
  const [walletEth, setWalletEth] = useState<string>(db.config.depositAddresses?.ETH || '');
  const [walletTrx, setWalletTrx] = useState<string>(db.config.depositAddresses?.TRX || '');
  const [walletSuccess, setWalletSuccess] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Modals / Selection states
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  
  // Edit user profile/balance form states
  const [editUsdtAdjust, setEditUsdtAdjust] = useState<string>('0');
  const [editBtcAdjust, setEditBtcAdjust] = useState<string>('0');
  const [editReason, setEditReason] = useState<string>('Ajuste administrativo ordinario');
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [editModalSuccess, setEditModalSuccess] = useState<string | null>(null);

  // Invitation link form states
  const [inviteCode, setInviteCode] = useState<string>('');
  const [inviteMaxUses, setInviteMaxUses] = useState<string>('-1'); // -1 for unlimited
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string>('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [lastGeneratedCode, setLastGeneratedCode] = useState<string | null>(null);

  const handleGenerateAutoCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomStr = '';
    for (let i = 0; i < 6; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const generated = `AURA-${randomStr}`;
    const res = createUserInvitation(generated, -1, null);
    if (res.success) {
      setLastGeneratedCode(generated);
      setInviteSuccess(`¡Código Único "${generated}" autogenerado y activado con éxito!`);
      setInviteError(null);
    } else {
      setInviteError(res.error || "No se pudo autogenerar el código.");
      setInviteSuccess(null);
    }
  };

  // Announcements form states
  const [annTitle, setAnnTitle] = useState<string>('');
  const [annContent, setAnnContent] = useState<string>('');
  const [annError, setAnnError] = useState<string | null>(null);
  const [annSuccess, setAnnSuccess] = useState<string | null>(null);

  // Direct notifications form state (within Comms tab)
  const [notifTargetUserId, setNotifTargetUserId] = useState<string>('all');
  const [notifTitle, setNotifTitle] = useState<string>('');
  const [notifMessage, setNotifMessage] = useState<string>('');

  // Withdrawals administrative control states
  const [withdrawTxIds, setWithdrawTxIds] = useState<Record<string, string>>({});
  const [withdrawRejectReasons, setWithdrawRejectReasons] = useState<Record<string, string>>({});
  const [withdrawStatusMessage, setWithdrawStatusMessage] = useState<{ id: string; success: boolean; text: string } | null>(null);

  // Deposits administrative control states
  const [depositRejectReasons, setDepositRejectReasons] = useState<Record<string, string>>({});
  const [depositStatusMessage, setDepositStatusMessage] = useState<{ id: string; success: boolean; text: string } | null>(null);

  // General counts & calculations
  const totalUsers = db.users.length;
  const activeUsersCount = db.users.filter(u => u.status === 'active').length;
  const pendingUsersCount = db.users.filter(u => u.status === 'pending_approval').length;
  const blockedUsersCount = db.users.filter(u => u.status === 'blocked').length;
  const pendingWithdrawalsCount = db.movements.filter(m => m.type === 'withdrawal' && m.status === 'pending').length;
  const pendingDepositsCount = db.movements.filter(m => m.type === 'deposit' && m.status === 'pending').length;

  const totalUSDTReserves = db.users.reduce((acc, curr) => acc + curr.balance, 0);
  const totalBTCReserves = db.users.reduce((acc, curr) => acc + curr.btcBalance, 0);
  const totalGlobalHashrate = db.miningRigs
    .filter(r => r.status === 'running')
    .reduce((acc, curr) => acc + curr.hashrate, 0);

  // Create Invitation link action
  const handleCreateInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    const maxUsesNum = parseInt(inviteMaxUses);
    const expiresStr = inviteExpiresAt ? new Date(inviteExpiresAt).toISOString() : null;

    const res = createUserInvitation(inviteCode, maxUsesNum, expiresStr);
    if (res.success) {
      setInviteSuccess("¡Enlace de invitación generado con éxito!");
      setInviteCode('');
      setInviteMaxUses('-1');
      setInviteExpiresAt('');
    } else {
      setInviteError(res.error || "No se pudo crear la invitación.");
    }
  };

  // Publish announcement action
  const handlePublishAnnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAnnError(null);
    setAnnSuccess(null);

    if (!annTitle || !annContent) {
      setAnnError("El título y contenido del boletín son obligatorios.");
      return;
    }

    const res = publishAnnouncement(annTitle, annContent);
    if (res.success) {
      setAnnSuccess("Anuncio publicado y enviado por broadcast a todos los usuarios.");
      setAnnTitle('');
      setAnnContent('');
    } else {
      setAnnError(res.error || "No se pudo publicar el boletín.");
    }
  };

  // Adjust balance action inside user editor modal
  const handleModifyBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditModalError(null);
    setEditModalSuccess(null);

    if (!selectedUserForEdit) return;

    const usdtNum = parseFloat(editUsdtAdjust);
    const btcNum = parseFloat(editBtcAdjust);

    if (isNaN(usdtNum) || isNaN(btcNum)) {
      setEditModalError("Los valores ingresados para ajuste deben ser numéricos.");
      return;
    }

    if (!editReason.trim()) {
      setEditModalError("Debe ingresar un motivo para justificar la auditoría.");
      return;
    }

    const res = modifyUserBalance(selectedUserForEdit.id, usdtNum, btcNum, editReason);
    if (res.success) {
      setEditModalSuccess("Saldos actualizados. Se ha registrado una entrada de auditoría.");
      // Refresh local user details in editing reference
      const updatedUserRef = db.users.find(u => u.id === selectedUserForEdit.id);
      if (updatedUserRef) {
        setSelectedUserForEdit(updatedUserRef);
      }
      setEditUsdtAdjust('0');
      setEditBtcAdjust('0');
    } else {
      setEditModalError(res.error || "Error al actualizar saldo.");
    }
  };

  const handleUpdateWallets = (e: React.FormEvent) => {
    e.preventDefault();
    setWalletSuccess(null);
    setWalletError(null);

    if (!walletUsdtTrc20.trim() || !walletUsdtErc20.trim() || !walletBtc.trim() || !walletEth.trim() || !walletTrx.trim()) {
      setWalletError("Todas las direcciones de billetera de depósito son obligatorias.");
      return;
    }

    const res = updateDepositAddresses({
      USDT_TRC20: walletUsdtTrc20.trim(),
      USDT_ERC20: walletUsdtErc20.trim(),
      BTC: walletBtc.trim(),
      ETH: walletEth.trim(),
      TRX: walletTrx.trim()
    });

    if (res.success) {
      setWalletSuccess("¡Direcciones de depósito de la plataforma actualizadas de manera segura!");
    } else {
      setWalletError(res.error || "No se pudieron guardar las direcciones.");
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 flex flex-col font-sans relative selection:bg-red-500/30">
      {/* High-visibility Laser Red Highlight Line for admin portal */}
      <div className="h-1 bg-red-600 w-full sticky top-0 z-50 shadow-[0_2px_15px_rgba(239,68,68,0.5)]" />

      {/* Decorative vector drops */}
      <div className="absolute top-10 left-[20%] w-[40%] h-[40%] rounded-full bg-red-950/10 blur-[130px] pointer-events-none" />

      {/* Admin Header */}
      <header className="bg-zinc-950/80 border-b border-zinc-900 sticky top-1 z-40 backdrop-blur-md px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <AuraLogo size={42} showText={false} />
            <div>
              <span className="font-extrabold tracking-wider text-base text-zinc-100 bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">AURA</span>
              <span className="text-red-500 text-xs font-semibold ml-1.5 uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-950 border border-red-500/35 animate-pulse">ADMIN PORTAL</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View switching links/buttons for admin */}
            <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-lg p-0.5 select-none shrink-0">
              <button
                onClick={() => setAdminViewMode && setAdminViewMode('admin')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  adminViewMode === 'admin'
                    ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Panel Admin
              </button>
              <button
                onClick={() => setAdminViewMode && setAdminViewMode('user')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  adminViewMode === 'user'
                    ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                Vista Usuario
              </button>
            </div>

            <div className="hidden md:block text-right">
              <div className="text-xs font-bold text-red-400">Sesión Administrativa</div>
              <div className="text-[10px] text-zinc-500">{currentUser.name}</div>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="p-2 rounded-lg bg-red-950/20 hover:bg-red-950/50 border border-red-500/10 hover:border-red-500/30 text-red-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 z-10">
        
        {/* Core Quick Admin Tabs */}
        <div className="flex border-b border-zinc-900 gap-1 overflow-x-auto">
          <button
            onClick={() => setAdminTab('metrics')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              adminTab === 'metrics' 
                ? 'border-red-500 text-red-500 bg-red-950/5' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Métricas y Resumen
          </button>
          <button
            onClick={() => setAdminTab('users')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              adminTab === 'users' 
                ? 'border-red-500 text-red-500 bg-red-950/5' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Control de Usuarios ({totalUsers})
            {pendingUsersCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-extrabold animate-bounce">
                {pendingUsersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setAdminTab('invitations')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              adminTab === 'invitations' 
                ? 'border-red-500 text-red-500 bg-red-950/5' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Enlaces de Invitación
          </button>
          <button
            onClick={() => setAdminTab('comms')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              adminTab === 'comms' 
                ? 'border-red-500 text-red-500 bg-red-950/5' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            Boletines y Comunicaciones
          </button>
          <button
            onClick={() => setAdminTab('audits')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              adminTab === 'audits' 
                ? 'border-red-500 text-red-500 bg-red-950/5' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Auditoría de Sistema
          </button>
          <button
            onClick={() => setAdminTab('wallets')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              adminTab === 'wallets' 
                ? 'border-red-500 text-red-500 bg-red-950/5' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Coins className="w-4 h-4 text-red-500 animate-pulse" />
            Direcciones de Depósito <span className="text-[9px] bg-red-600 text-white font-black px-1.5 py-0.2 rounded shrink-0 uppercase tracking-widest ml-1">WALLETS</span>
          </button>
          <button
            onClick={() => setAdminTab('withdrawals')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              adminTab === 'withdrawals' 
                ? 'border-red-500 text-red-500 bg-red-950/5' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-red-500" />
            Control de Retiros
            {pendingWithdrawalsCount > 0 ? (
              <span className="text-[9px] bg-yellow-550 text-yellow-950 font-black px-1.5 py-0.2 rounded shrink-0 uppercase tracking-widest ml-1 animate-pulse">
                {pendingWithdrawalsCount} PENDIENTES
              </span>
            ) : (
              <span className="text-[9px] bg-zinc-800 text-zinc-400 font-black px-1.5 py-0.2 rounded shrink-0 uppercase tracking-widest ml-1">
                RETIROS
              </span>
            )}
          </button>
          <button
            onClick={() => setAdminTab('deposits')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              adminTab === 'deposits' 
                ? 'border-red-500 text-red-500 bg-red-950/5' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
            Control de Depósitos
            {pendingDepositsCount > 0 ? (
              <span className="text-[9px] bg-yellow-550 text-yellow-950 font-black px-1.5 py-0.2 rounded shrink-0 uppercase tracking-widest ml-1 animate-pulse">
                {pendingDepositsCount} PENDIENTES
              </span>
            ) : (
              <span className="text-[9px] bg-zinc-800 text-zinc-400 font-black px-1.5 py-0.2 rounded shrink-0 uppercase tracking-widest ml-1">
                DEPÓSITOS
              </span>
            )}
          </button>
        </div>

        {/* Tab contents */}
        <div className="space-y-6">

          {/* TAB 1: metrics */}
          {adminTab === 'metrics' && (
            <div className="space-y-6">
              
              {/* Core metrics indicators */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Total Global Hashrate */}
                <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Potencia de Minado Global</span>
                  <div className="text-2xl font-extrabold font-mono text-zinc-100 my-2">{totalGlobalHashrate} MH/s</div>
                  <span className="text-[9px] text-red-400 font-bold flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-red-500" />
                    En nodos de Texas & Reikiavik
                  </span>
                </div>

                {/* Total Reserves USDT */}
                <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Reservas Globales USDT</span>
                  <div className="text-2xl font-extrabold font-mono text-zinc-100 my-2">${totalUSDTReserves.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                  <span className="text-[9px] text-zinc-500">Suma total de carteras de usuarios</span>
                </div>

                {/* Total Reserves BTC */}
                <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Reservas Globales BTC</span>
                  <div className="text-2xl font-extrabold font-mono text-red-500 my-2 animate-pulse">{totalBTCReserves.toFixed(6)} BTC</div>
                  <span className="text-[9px] text-zinc-400">Valuado en: ${(totalBTCReserves * db.config.btcPriceUsdt).toLocaleString(undefined, {maximumFractionDigits: 2})} USDT</span>
                </div>

                {/* Users counts */}
                <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Cuentas Registradas</span>
                  <div className="text-2xl font-extrabold font-mono text-zinc-100 my-2">{totalUsers}</div>
                  <span className="text-[9px] text-zinc-500 flex justify-between">
                    <span>{activeUsersCount} Activos</span>
                    <span className="text-red-500">{pendingUsersCount} Pendientes</span>
                  </span>
                </div>

              </div>

              {/* Status and warnings */}
              {pendingUsersCount > 0 && (
                <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl flex items-center justify-between">
                  <div className="flex gap-3 items-center">
                    <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">Hay solicitudes de registro en cola</h4>
                      <p className="text-[10px] text-zinc-400">Hay {pendingUsersCount} usuarios esperando aprobación para acceder y minar.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setAdminTab('users')}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Ver Solicitudes
                  </button>
                </div>
              )}

              {/* Server performance monitors and active connections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Node simulator list */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400">Servidores de Minería en la Nube</h3>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-900 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-zinc-300">ASIC Pool Texas (Industrial Node)</div>
                        <span className="text-[10px] text-zinc-500">Hash Rate Global: 850 MH/s</span>
                      </div>
                      <span className="text-red-500 font-mono font-bold animate-pulse">99.8% ONLINE</span>
                    </div>

                    <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-900 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-zinc-300">Reikiavik Hydro Pool (Nodos Islandia)</div>
                        <span className="text-[10px] text-zinc-500">Hash Rate Global: 580 MH/s</span>
                      </div>
                      <span className="text-red-500 font-mono font-bold animate-pulse">100% ONLINE</span>
                    </div>

                    <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-900 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-zinc-300">Dificultad de Algoritmo SHA256</div>
                        <span className="text-[10px] text-zinc-500">Actualizado dinámicamente</span>
                      </div>
                      <span className="text-zinc-400 font-mono font-bold">83.15 T</span>
                    </div>
                  </div>
                </div>

                {/* Daily registrations & Activity overview */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400">Distribución de Usuarios</h3>
                  
                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Usuarios Activos</span>
                        <span className="text-zinc-300 font-bold">{activeUsersCount} ({((activeUsersCount / totalUsers)*100).toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full" style={{ width: `${(activeUsersCount / totalUsers)*100}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Pendientes de Aprobación</span>
                        <span className="text-zinc-300 font-bold">{pendingUsersCount} ({((pendingUsersCount / totalUsers)*100).toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                        <div className="bg-yellow-600 h-full" style={{ width: `${(pendingUsersCount / totalUsers)*100}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Cuentas Bloqueadas / Suspendidas</span>
                        <span className="text-zinc-300 font-bold">{blockedUsersCount} ({((blockedUsersCount / totalUsers)*100).toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                        <div className="bg-zinc-750 h-full" style={{ width: `${(blockedUsersCount / totalUsers)*100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: users lists */}
          {adminTab === 'users' && (
            <div className="space-y-6">
              
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Gestión General de Cuentas</h3>
                  <p className="text-[11px] text-zinc-500">Modifique balances, apruebe registros o inhabilite accesos de forma inmediata</p>
                </div>
              </div>

              {/* Table list */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl overflow-hidden overflow-x-auto shadow-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-900 text-zinc-400 font-bold border-b border-zinc-800 text-[10px] uppercase tracking-wider">
                      <th className="p-4">Usuario</th>
                      <th className="p-4">Correo</th>
                      <th className="p-4">Rol</th>
                      <th className="p-4 text-right">Saldo USDT</th>
                      <th className="p-4 text-right">Saldo BTC</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {db.users.map((user) => (
                      <tr key={user.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-red-950/50 border border-red-500/20 flex items-center justify-center text-red-500 font-bold text-[10px]">
                              {user.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-zinc-200">{user.name}</div>
                              <div className="text-[9px] text-zinc-500 font-mono">ID: {user.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-zinc-400 font-mono">{user.email}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            user.role === 'admin' 
                              ? 'bg-red-950/50 border border-red-500/30 text-red-400' 
                              : 'bg-zinc-900 text-zinc-400 border border-zinc-850'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-zinc-300 font-bold">${user.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td className="p-4 text-right font-mono text-red-500 font-bold">{user.btcBalance.toFixed(6)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            user.status === 'active' 
                              ? 'bg-red-950/30 border border-red-500/20 text-red-400' 
                              : user.status === 'pending_approval'
                              ? 'bg-yellow-950/30 border border-yellow-500/20 text-yellow-400'
                              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                          }`}>
                            {user.status === 'active' ? 'Activo' : user.status === 'pending_approval' ? 'Pendiente' : 'Bloqueado'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="inline-flex gap-2">
                            {/* Approve button if pending */}
                            {user.status === 'pending_approval' && (
                              <button
                                onClick={() => approveUser(user.id)}
                                title="Aprobar Usuario"
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold flex items-center gap-0.5 transition-all cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Aprobar
                              </button>
                            )}

                            {/* Edit Balances button */}
                            <button
                              onClick={() => {
                                setSelectedUserForEdit(user);
                                setEditUsdtAdjust('0');
                                setEditBtcAdjust('0');
                                setEditModalError(null);
                                setEditModalSuccess(null);
                              }}
                              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Modificar
                            </button>

                            {/* Block/Suspend button */}
                            {user.id !== currentUser.id && (
                              <button
                                onClick={() => blockUser(user.id)}
                                title={user.status === 'blocked' ? 'Reactivar Cuenta' : 'Suspender Cuenta'}
                                className={`p-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                  user.status === 'blocked'
                                    ? 'bg-red-950/40 text-red-400 hover:bg-red-950 border border-red-500/20'
                                    : 'bg-zinc-900 text-zinc-500 hover:text-red-500 border border-zinc-800'
                                }`}
                              >
                                {user.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                              </button>
                            )}

                            {/* Delete button */}
                            {user.id !== currentUser.id && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`¿Seguro que desea eliminar permanentemente al usuario ${user.name}?\nEsta acción es irreversible.`)) {
                                    deleteUser(user.id);
                                  }
                                }}
                                title="Eliminar permanentemente"
                                className="p-1 bg-zinc-950 hover:bg-red-950/30 text-zinc-600 hover:text-red-500 border border-zinc-900 rounded transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 3: Invitation generator */}
          {adminTab === 'invitations' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Creator forms */}
              <div className="space-y-6">
                
                {/* QUICK GENERATOR PANEL */}
                <div className="bg-zinc-950/60 border border-zinc-805 rounded-xl p-5 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <KeyRound className="w-16 h-16 text-red-500" />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg">
                      <KeyRound className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-zinc-200">Generación Rápida</h3>
                      <p className="text-[10px] text-zinc-550">Genera un código único al instante en un solo clic</p>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateAutoCode}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-lg cursor-pointer transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.25)] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] active:scale-95"
                  >
                    <span>⚡ Generar Código Único</span>
                  </button>

                  {lastGeneratedCode && (
                    <div className="bg-zinc-900/60 border border-zinc-850 p-3 rounded-lg space-y-2 animate-fadeIn">
                      <div className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-500">Último Código Autogenerado:</div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-red-400 bg-red-950/25 px-2.5 py-1 rounded border border-red-500/10 select-all flex-1 text-center">
                          {lastGeneratedCode}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(lastGeneratedCode);
                          }}
                          className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[10px] rounded transition-all cursor-pointer"
                        >
                          Copiar
                        </button>
                      </div>
                      <p className="text-[9px] text-zinc-500 leading-relaxed text-center">
                        Este código es de uso ilimitado y ya está activo para nuevos registros.
                      </p>
                    </div>
                  )}
                </div>

                {/* Creator form */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Crear Código de Invitación</h3>
                  
                  {inviteError && <div className="p-2.5 bg-red-950/40 border border-red-500/20 text-red-200 text-xs rounded-lg">{inviteError}</div>}
                  {inviteSuccess && <div className="p-2.5 bg-zinc-900/80 border border-red-500/30 text-zinc-200 text-xs rounded-lg">{inviteSuccess}</div>}
  
                  <form onSubmit={handleCreateInviteSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block">Código Único</label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="E.g. VIP-2026-X"
                      required
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-red-500/40 font-mono tracking-wider"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block">Límite de Usos</label>
                    <select
                      value={inviteMaxUses}
                      onChange={(e) => setInviteMaxUses(e.target.value)}
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none"
                    >
                      <option value="-1">Uso Ilimitado</option>
                      <option value="1">Un Solo Uso (1)</option>
                      <option value="5">Cinco Usos (5)</option>
                      <option value="10">Diez Usos (10)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block">Fecha de Expiración (Opcional)</label>
                    <input
                      type="date"
                      value={inviteExpiresAt}
                      onChange={(e) => setInviteExpiresAt(e.target.value)}
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-red-500/40 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                  >
                    <Plus className="w-4 h-4" />
                    Generar Código
                  </button>
                </form>
              </div>
              </div>

              {/* Active invitations list */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Códigos Activos en Base de Datos</h3>
                
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-850 text-[10px] uppercase tracking-wider">
                        <th className="p-3">Código</th>
                        <th className="p-3">Usos registrados</th>
                        <th className="p-3">Expiración</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {db.invitations.map((inv) => {
                        const isExpired = inv.expiresAt && new Date(inv.expiresAt).getTime() < Date.now();
                        const limitReached = inv.maxUses !== -1 && inv.usedCount >= inv.maxUses;
                        return (
                          <tr key={inv.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="p-3 font-mono font-bold text-red-500">{inv.code}</td>
                            <td className="p-3 text-zinc-300">
                              {inv.usedCount} usos / {inv.maxUses === -1 ? 'Ilimitado' : `${inv.maxUses} máx`}
                            </td>
                            <td className="p-3 text-zinc-500 font-mono">
                              {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : 'Nunca'}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                                inv.isActive && !isExpired && !limitReached
                                  ? 'bg-red-950/30 text-red-400 border border-red-500/20'
                                  : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                              }`}>
                                {isExpired ? 'Expirado' : limitReached ? 'Agotado' : inv.isActive ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => toggleInvitationStatus(inv.id)}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                  inv.isActive 
                                    ? 'bg-zinc-900 text-zinc-400 hover:text-red-500 border border-zinc-850' 
                                    : 'bg-red-950 text-red-400 hover:bg-red-900 border border-red-500/20'
                                }`}
                              >
                                {inv.isActive ? 'Desactivar' : 'Reactivar'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: Broadcasting and Comms */}
          {adminTab === 'comms' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Publication of news */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Publicar Anuncio Global</h3>
                <p className="text-[10px] text-zinc-500">Publica boletines corporativos en el panel de anuncios de todos los mineros.</p>

                {annError && <div className="p-2.5 bg-red-950/40 border border-red-500/20 text-red-200 text-xs rounded-lg">{annError}</div>}
                {annSuccess && <div className="p-2.5 bg-zinc-900/80 border border-red-500/30 text-zinc-200 text-xs rounded-lg">{annSuccess}</div>}

                <form onSubmit={handlePublishAnnSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block">Título del Boletín</label>
                    <input
                      type="text"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="E.g. ⚡ Aumento de Hashrate por Mantenimiento"
                      required
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-red-500/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block">Contenido</label>
                    <textarea
                      rows={5}
                      value={annContent}
                      onChange={(e) => setAnnContent(e.target.value)}
                      placeholder="Rellene los pormenores y detalles del boletín..."
                      required
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-red-500/40 whitespace-pre-wrap"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition-all shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                  >
                    Publicar y Notificar
                  </button>
                </form>
              </div>

              {/* Direct Messages logs overview / announcements */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Anuncios Recientes</h3>
                
                <div className="space-y-4 overflow-y-auto max-h-96">
                  {db.config.announcements.map((ann) => (
                    <div key={ann.id} className="bg-zinc-900/30 border border-zinc-850 rounded-xl p-4 text-xs">
                      <div className="flex justify-between font-bold mb-1.5 text-zinc-300">
                        <span>{ann.title}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{new Date(ann.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-zinc-400 leading-relaxed">{ann.content}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: audits logs */}
          {adminTab === 'audits' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Admin Audit records */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Registro de Auditorías de Administración</h3>
                  
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 font-mono text-[10px] max-h-[500px] overflow-y-auto space-y-3">
                    <div className="text-[11px] text-red-400 border-b border-zinc-900 pb-2">ADMINISTRATIVE ACTION PROTOCOL</div>
                    
                    {db.auditLogs.length === 0 ? (
                      <div className="text-zinc-600 text-center py-6">No audits recorded.</div>
                    ) : (
                      <div className="space-y-2.5">
                        {db.auditLogs.map((aud) => (
                          <div key={aud.id} className="border-l-2 border-red-500 pl-2.5 py-0.5">
                            <div className="text-zinc-500 flex justify-between">
                              <span>[{new Date(aud.timestamp).toLocaleString()}]</span>
                              <span>By: {aud.adminName}</span>
                            </div>
                            <div className="text-zinc-200 font-bold uppercase">{aud.action}</div>
                            {aud.targetUserName && <div className="text-[9px] text-red-400">Destinatario: {aud.targetUserName} (ID: {aud.targetUserId})</div>}
                            <div className="text-zinc-400 mt-0.5">{aud.details}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* All Users Movements */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Bitácora Global de Movimientos Financieros</h3>
                  
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
                    {db.movements.length === 0 ? (
                      <div className="p-6 text-center text-zinc-500 text-xs">Sin transacciones registradas.</div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-zinc-900 text-zinc-500 font-bold border-b border-zinc-850 text-[9px] uppercase tracking-wider">
                            <th className="p-3">Miner</th>
                            <th className="p-3">Operación</th>
                            <th className="p-3 text-right">Cantidad</th>
                            <th className="p-3 font-mono">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900 text-zinc-400">
                          {db.movements.map((mov) => {
                            const isNeg = mov.amount < 0;
                            return (
                              <tr key={mov.id} className="hover:bg-zinc-900/10 transition-colors">
                                <td className="p-3 font-bold text-zinc-300">{mov.userName}</td>
                                <td className="p-3">{mov.description}</td>
                                <td className="p-3 text-right font-mono font-bold">
                                  <span className={isNeg ? 'text-red-500' : 'text-zinc-300'}>
                                    {isNeg ? '' : '+'}{mov.amount.toFixed(mov.asset === 'BTC' ? 6 : 2)}
                                  </span>
                                  <span className="text-[9px] text-zinc-500 ml-0.5">{mov.asset}</span>
                                </td>
                                <td className="p-3 text-[10px] text-zinc-500 font-mono">{new Date(mov.timestamp).toLocaleTimeString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 6: deposit wallets configuration */}
          {adminTab === 'wallets' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                  <Coins className="w-24 h-24 text-red-500" />
                </div>
                
                <h3 className="text-base font-extrabold text-zinc-200 mb-1 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-red-500" />
                  Configuración de Direcciones de Billetera de Depósito
                </h3>
                <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                  Como administrador, tienes el control exclusivo para definir y cambiar las direcciones de billetera de depósito de la plataforma. Cuando un usuario intente depositar fondos, la pasarela de depósito mostrará las direcciones ingresadas aquí.
                </p>

                {walletError && (
                  <div className="p-3.5 rounded-lg bg-red-950/20 border border-red-500/20 text-xs text-red-400 mb-5">
                    {walletError}
                  </div>
                )}
                {walletSuccess && (
                  <div className="p-3.5 rounded-lg bg-green-950/20 border border-green-500/20 text-xs text-green-400 mb-5">
                    {walletSuccess}
                  </div>
                )}

                <form onSubmit={handleUpdateWallets} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400">Tether USDT (Red TRON - TRC20)</label>
                      <input
                        type="text"
                        value={walletUsdtTrc20}
                        onChange={(e) => setWalletUsdtTrc20(e.target.value)}
                        placeholder="Ej: TX3auraminingTRC20xxxxxxxxxxxxxxx"
                        required
                        className="w-full bg-zinc-900 border border-zinc-850 text-xs rounded-lg p-2.5 text-zinc-100 font-mono focus:outline-none focus:border-red-500/40"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400">Tether USDT (Red Ethereum - ERC20)</label>
                      <input
                        type="text"
                        value={walletUsdtErc20}
                        onChange={(e) => setWalletUsdtErc20(e.target.value)}
                        placeholder="Ej: 0x3auraminingERC20xxxxxxxxxxxxxxx"
                        required
                        className="w-full bg-zinc-900 border border-zinc-850 text-xs rounded-lg p-2.5 text-zinc-100 font-mono focus:outline-none focus:border-red-500/40"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400">Bitcoin BTC (Red Nativa)</label>
                      <input
                        type="text"
                        value={walletBtc}
                        onChange={(e) => setWalletBtc(e.target.value)}
                        placeholder="Ej: bc1q3auraminingBTCxxxxxxxxxxxxxxxx"
                        required
                        className="w-full bg-zinc-900 border border-zinc-850 text-xs rounded-lg p-2.5 text-zinc-100 font-mono focus:outline-none focus:border-red-500/40"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400">Ethereum ETH (ERC20)</label>
                      <input
                        type="text"
                        value={walletEth}
                        onChange={(e) => setWalletEth(e.target.value)}
                        placeholder="Ej: 0x3auraminingETHxxxxxxxxxxxxxxxxxx"
                        required
                        className="w-full bg-zinc-900 border border-zinc-850 text-xs rounded-lg p-2.5 text-zinc-100 font-mono focus:outline-none focus:border-red-500/40"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400">TRON TRX (Red Nativa TRC20)</label>
                      <input
                        type="text"
                        value={walletTrx}
                        onChange={(e) => setWalletTrx(e.target.value)}
                        placeholder="Ej: T3auraminingTRXxxxxxxxxxxxxxxxxxxx"
                        required
                        className="w-full bg-zinc-900 border border-zinc-850 text-xs rounded-lg p-2.5 text-zinc-100 font-mono focus:outline-none focus:border-red-500/40"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 px-6 rounded-lg cursor-pointer transition-colors shadow-md shadow-red-950/20"
                    >
                      Guardar Nuevas Direcciones
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 7: withdrawals approval list */}
          {adminTab === 'withdrawals' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Header */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                  <ArrowUpRight className="w-24 h-24 text-red-500" />
                </div>
                
                <h3 className="text-base font-extrabold text-zinc-200 mb-1 flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-red-500" />
                  Módulo de Auditoría y Aprobación de Retiros
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Todos los retiros externos solicitados por los usuarios quedan en estado de espera ("pendiente") por motivos de seguridad. Como administrador, debes auditar la cuenta, realizar la transferencia real a la dirección blockchain correspondiente, y registrar el ID de transacción (TxID) de la red para liberar el retiro. Si sospechas de fraude o detectas un formato inválido, puedes rechazar la solicitud para reintegrar los fondos inmediatamente al balance del usuario.
                </p>
              </div>

              {/* Pending Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  Solicitudes de Retiro Pendientes ({db.movements.filter(m => m.type === 'withdrawal' && m.status === 'pending' && m.targetAddress).length})
                </h4>

                {db.movements.filter(m => m.type === 'withdrawal' && m.status === 'pending' && m.targetAddress).length === 0 ? (
                  <div className="text-center py-12 text-xs text-zinc-500 bg-zinc-950/45 border border-dashed border-zinc-900 rounded-xl">
                    No hay solicitudes de retiro externo pendientes de aprobación en este momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {db.movements
                      .filter(m => m.type === 'withdrawal' && m.status === 'pending' && m.targetAddress)
                      .map((mov) => {
                        const user = db.users.find(u => u.id === mov.userId);
                        return (
                          <div key={mov.id} className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-5 hover:border-yellow-500/20 transition-all flex flex-col md:flex-row justify-between gap-6">
                            
                            {/* User & Request Details */}
                            <div className="space-y-3.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2.5">
                                <span className="text-sm font-extrabold text-zinc-200">{mov.userName}</span>
                                <span className="text-[10px] text-zinc-500 font-mono">({user?.email || "Email no disponible"})</span>
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black tracking-widest uppercase ${
                                  user?.status === 'active' ? 'bg-green-950/30 text-green-400 border border-green-500/10' : 'bg-red-950/30 text-red-400 border border-red-500/10'
                                }`}>
                                  Usuario {user?.status === 'active' ? 'ACTIVO' : 'BLOQUEADO/PENDIENTE'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="space-y-1 bg-zinc-900/40 p-3 rounded-lg border border-zinc-850">
                                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">Detalle de Solicitud</span>
                                  <div className="text-zinc-300 font-mono font-bold">Monto: {Math.abs(mov.amount)} {mov.asset}</div>
                                  <div className="text-[11px] text-zinc-400 mt-1">{mov.description}</div>
                                  <div className="text-[10px] text-zinc-650 font-mono mt-1">ID: {mov.id}</div>
                                </div>

                                <div className="space-y-1 bg-zinc-900/40 p-3 rounded-lg border border-zinc-850">
                                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">Destinatario Blockchain</span>
                                  <div className="text-zinc-300 font-mono font-bold break-all select-all">Dirección: {mov.targetAddress}</div>
                                  <div className="text-[10px] text-zinc-550 mt-1">Saldos de Cuenta Actuales:</div>
                                  <div className="text-[11px] text-zinc-400 font-mono font-bold">
                                    USDT: ${user?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} | BTC: {user?.btcBalance.toFixed(6)}
                                  </div>
                                </div>
                              </div>

                              <div className="text-[10px] text-zinc-650 font-mono">
                                Solicitado el: {new Date(mov.timestamp).toLocaleString()}
                              </div>
                            </div>

                            {/* Actions Form */}
                            <div className="w-full md:w-80 space-y-4 border-t md:border-t-0 md:border-l border-zinc-900 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
                              {withdrawStatusMessage?.id === mov.id && (
                                <div className={`p-2.5 rounded text-xs leading-relaxed ${
                                  withdrawStatusMessage.success 
                                    ? 'bg-green-950/20 border border-green-500/20 text-green-400' 
                                    : 'bg-red-950/20 border border-red-500/20 text-red-400'
                                }`}>
                                  {withdrawStatusMessage.text}
                                </div>
                              )}

                              {/* Approval Box */}
                              <div className="space-y-1.5">
                                <label className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Aprobar con TxID</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Ingrese TxID de la blockchain"
                                    value={withdrawTxIds[mov.id] || ''}
                                    onChange={(e) => setWithdrawTxIds(prev => ({ ...prev, [mov.id]: e.target.value }))}
                                    className="flex-1 bg-zinc-900 border border-zinc-850 rounded text-xs p-2 text-zinc-100 font-mono focus:outline-none focus:border-red-500/45 placeholder-zinc-700"
                                  />
                                  <button
                                    onClick={() => {
                                      const txId = withdrawTxIds[mov.id] || '';
                                      if (!txId.trim()) {
                                        setWithdrawStatusMessage({ id: mov.id, success: false, text: "Por favor ingrese el TxID." });
                                        return;
                                      }
                                      const res = approveWithdrawal(mov.id, txId);
                                      if (res.success) {
                                        setWithdrawStatusMessage({ id: mov.id, success: true, text: "Retiro aprobado correctamente." });
                                        setWithdrawTxIds(prev => {
                                          const next = { ...prev };
                                          delete next[mov.id];
                                          return next;
                                        });
                                      } else {
                                        setWithdrawStatusMessage({ id: mov.id, success: false, text: res.error || "Error al aprobar." });
                                      }
                                    }}
                                    className="px-3 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    Aprobar
                                  </button>
                                </div>
                              </div>

                              {/* Rejection Box */}
                              <div className="space-y-1.5">
                                <label className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Rechazar con Razón</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Razón de rechazo"
                                    value={withdrawRejectReasons[mov.id] || ''}
                                    onChange={(e) => setWithdrawRejectReasons(prev => ({ ...prev, [mov.id]: e.target.value }))}
                                    className="flex-1 bg-zinc-900 border border-zinc-850 rounded text-xs p-2 text-zinc-100 focus:outline-none focus:border-red-500/45 placeholder-zinc-700"
                                  />
                                  <button
                                    onClick={() => {
                                      const reason = withdrawRejectReasons[mov.id] || '';
                                      if (!reason.trim()) {
                                        setWithdrawStatusMessage({ id: mov.id, success: false, text: "Ingrese un motivo de rechazo." });
                                        return;
                                      }
                                      const res = rejectWithdrawal(mov.id, reason);
                                      if (res.success) {
                                        setWithdrawStatusMessage({ id: mov.id, success: true, text: "Retiro rechazado. Fondos devueltos." });
                                        setWithdrawRejectReasons(prev => {
                                          const next = { ...prev };
                                          delete next[mov.id];
                                          return next;
                                        });
                                      } else {
                                        setWithdrawStatusMessage({ id: mov.id, success: false, text: res.error || "Error al rechazar." });
                                      }
                                    }}
                                    className="px-3 bg-red-900 hover:bg-red-950 hover:text-red-300 hover:border-red-500/20 border border-transparent text-zinc-300 font-bold text-xs rounded transition-all cursor-pointer whitespace-nowrap"
                                  >
                                    Rechazar
                                  </button>
                                </div>
                              </div>

                            </div>

                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Audit History section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  Historial Reciente de Retiros Procesados
                </h4>

                {db.movements.filter(m => m.type === 'withdrawal' && m.status !== 'pending' && m.targetAddress).length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-550 bg-zinc-950/30 border border-zinc-900 rounded-xl">
                    No hay retiros externos auditados o procesados previamente.
                  </div>
                ) : (
                  <div className="bg-zinc-950/50 border border-zinc-900 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-zinc-900/40 text-zinc-550 border-b border-zinc-900 text-[10px] uppercase tracking-wider">
                            <th className="p-4 font-bold">Fecha / ID</th>
                            <th className="p-4 font-bold">Usuario</th>
                            <th className="p-4 font-bold">Detalles / Destino</th>
                            <th className="p-4 font-bold text-center">Estado</th>
                            <th className="p-4 font-bold text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/60 text-zinc-450">
                          {db.movements
                            .filter(m => m.type === 'withdrawal' && m.status !== 'pending' && m.targetAddress)
                            .map((mov) => {
                              return (
                                <tr key={mov.id} className="hover:bg-zinc-900/10 transition-colors">
                                  <td className="p-4 whitespace-nowrap">
                                    <div className="font-bold text-zinc-300">
                                      {new Date(mov.timestamp).toLocaleDateString()} {new Date(mov.timestamp).toLocaleTimeString()}
                                    </div>
                                    <div className="text-[9px] text-zinc-600 font-mono mt-0.5">{mov.id}</div>
                                  </td>
                                  <td className="p-4">
                                    <div className="font-bold text-zinc-300">{mov.userName}</div>
                                    <div className="text-[9px] text-zinc-550 font-mono font-bold">UID: {mov.userId}</div>
                                  </td>
                                  <td className="p-4">
                                    <div className="text-xs text-zinc-400 break-all max-w-sm">
                                      {mov.description}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 mt-1 break-all select-all font-mono">
                                      Wallet: {mov.targetAddress}
                                    </div>
                                    {mov.txId && (
                                      <div className="text-[10px] font-mono mt-1 text-zinc-500">
                                        <span className="text-green-500">TxID:</span> <span className="bg-zinc-900/80 border border-zinc-850 px-1 py-0.5 rounded select-all text-[9px] font-bold">{mov.txId}</span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-4 text-center whitespace-nowrap">
                                    {mov.status === 'completed' && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-green-950/40 text-green-400 border border-green-500/10 rounded">
                                        APROBADO
                                      </span>
                                    )}
                                    {mov.status === 'failed' && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-red-950/40 text-red-400 border border-red-500/10 rounded">
                                        RECHAZADO
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-4 font-mono font-extrabold text-right text-red-400 whitespace-nowrap">
                                    -${Math.abs(mov.amount).toLocaleString(undefined, { 
                                      minimumFractionDigits: mov.asset === 'BTC' ? 6 : 2, 
                                      maximumFractionDigits: mov.asset === 'BTC' ? 8 : 2 
                                    })} {mov.asset}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 8: deposits approval list */}
          {adminTab === 'deposits' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Header */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                  <ArrowDownLeft className="w-24 h-24 text-emerald-500" />
                </div>
                
                <h3 className="text-base font-extrabold text-zinc-200 mb-1 flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
                  Módulo de Aprobación de Depósitos y Comisión por Referidos
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  De acuerdo con las reglas de seguridad vigentes, todos los depósitos externos de los usuarios requieren de tu verificación y aprobación explícita como Administrador. Cuando apruebes un depósito, el sistema acreditará automáticamente el saldo en USDT (o BTC si es un depósito directo de Bitcoin) al usuario. Además, si el usuario fue patrocinado por un referido, se otorgará y acreditará de inmediato una comisión del 7% en USDT al patrocinador correspondiente.
                </p>
              </div>

              {/* Pending Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  Solicitudes de Depósito Pendientes ({db.movements.filter(m => m.type === 'deposit' && m.status === 'pending').length})
                </h4>

                {db.movements.filter(m => m.type === 'deposit' && m.status === 'pending').length === 0 ? (
                  <div className="text-center py-12 text-xs text-zinc-500 bg-zinc-950/45 border border-dashed border-zinc-900 rounded-xl">
                    No hay depósitos pendientes de aprobación en este momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {db.movements
                      .filter(m => m.type === 'deposit' && m.status === 'pending')
                      .map((mov) => {
                        const user = db.users.find(u => u.id === mov.userId);
                        return (
                          <div key={mov.id} className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-5 hover:border-emerald-500/20 transition-all flex flex-col md:flex-row justify-between gap-6">
                            
                            {/* User & Request Details */}
                            <div className="space-y-3.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2.5">
                                <span className="text-sm font-extrabold text-zinc-200">{mov.userName}</span>
                                <span className="text-[10px] text-zinc-500 font-mono">({user?.email || "Email no disponible"})</span>
                                {user?.referredBy && (
                                  <span className="text-[10px] text-amber-400 font-mono bg-amber-950/30 border border-amber-500/10 px-1.5 py-0.2 rounded font-black uppercase tracking-wider">
                                    Patrocinado: {db.users.find(u => u.id === user.referredBy)?.name || user.referredBy}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="space-y-1 bg-zinc-900/40 p-3 rounded-lg border border-zinc-850">
                                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">Detalle de Depósito</span>
                                  <div className="text-zinc-300 font-mono font-bold">Monto Crypto: {mov.cryptoAmount || mov.amount} {mov.asset}</div>
                                  <div className="text-zinc-300 font-mono font-semibold text-zinc-400">Valor USDT Equivalente: ${mov.amount.toFixed(2)} USDT</div>
                                  <div className="text-[10px] text-zinc-650 font-mono mt-1">TXID: {mov.txId}</div>
                                </div>

                                <div className="space-y-1 bg-zinc-900/40 p-3 rounded-lg border border-zinc-850">
                                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">Dirección de Destino</span>
                                  <div className="text-zinc-300 font-mono text-[11px] break-all select-all">{mov.targetAddress}</div>
                                  <div className="text-[10px] text-zinc-550 mt-1">Saldos de Cuenta Actuales:</div>
                                  <div className="text-[11px] text-zinc-400 font-mono font-bold">
                                    USDT: ${user?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} | BTC: {user?.btcBalance.toFixed(6)}
                                  </div>
                                </div>
                              </div>

                              <div className="text-[10px] text-zinc-650 font-mono">
                                Iniciado el: {new Date(mov.timestamp).toLocaleString()}
                              </div>
                            </div>

                            {/* Actions Form */}
                            <div className="w-full md:w-80 space-y-4 border-t md:border-t-0 md:border-l border-zinc-900 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
                              {depositStatusMessage?.id === mov.id && (
                                <div className={`p-2.5 rounded text-xs leading-relaxed ${
                                  depositStatusMessage.success 
                                    ? 'bg-green-950/20 border border-green-500/20 text-green-400' 
                                    : 'bg-red-950/20 border border-red-500/20 text-red-400'
                                }`}>
                                  {depositStatusMessage.text}
                                </div>
                              )}

                              {/* Approval Box */}
                              <div className="space-y-1.5">
                                <span className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Validar y Acreditar</span>
                                <button
                                  onClick={() => {
                                    const res = approveDeposit(mov.id);
                                    if (res.success) {
                                      setDepositStatusMessage({ id: mov.id, success: true, text: "Depósito aprobado con éxito. Saldo y comisiones acreditadas." });
                                    } else {
                                      setDepositStatusMessage({ id: mov.id, success: false, text: res.error || "Error al aprobar." });
                                    }
                                  }}
                                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/10"
                                >
                                  <Check className="w-4 h-4" />
                                  Aprobar Depósito
                                </button>
                              </div>

                              {/* Rejection Box */}
                              <div className="space-y-1.5">
                                <label className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Rechazar con Razón</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Razón de rechazo"
                                    value={depositRejectReasons[mov.id] || ''}
                                    onChange={(e) => setDepositRejectReasons(prev => ({ ...prev, [mov.id]: e.target.value }))}
                                    className="flex-1 bg-zinc-900 border border-zinc-850 rounded text-xs p-2 text-zinc-100 focus:outline-none focus:border-red-500/45 placeholder-zinc-700"
                                  />
                                  <button
                                    onClick={() => {
                                      const reason = depositRejectReasons[mov.id] || '';
                                      if (!reason.trim()) {
                                        setDepositStatusMessage({ id: mov.id, success: false, text: "Ingrese un motivo de rechazo." });
                                        return;
                                      }
                                      const res = rejectDeposit(mov.id, reason);
                                      if (res.success) {
                                        setDepositStatusMessage({ id: mov.id, success: true, text: "Depósito rechazado correctamente." });
                                        setDepositRejectReasons(prev => {
                                          const next = { ...prev };
                                          delete next[mov.id];
                                          return next;
                                        });
                                      } else {
                                        setDepositStatusMessage({ id: mov.id, success: false, text: res.error || "Error al rechazar." });
                                      }
                                    }}
                                    className="px-3 bg-red-900 hover:bg-red-950 hover:text-red-300 hover:border-red-500/20 border border-transparent text-zinc-300 font-bold text-xs rounded transition-all cursor-pointer whitespace-nowrap"
                                  >
                                    Rechazar
                                  </button>
                                </div>
                              </div>

                            </div>

                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Deposit History section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  Historial Reciente de Depósitos Procesados
                </h4>

                {db.movements.filter(m => m.type === 'deposit' && m.status !== 'pending').length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-550 bg-zinc-950/30 border border-zinc-900 rounded-xl">
                    No hay depósitos externos auditados o procesados previamente.
                  </div>
                ) : (
                  <div className="bg-zinc-950/50 border border-zinc-900 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-zinc-900/40 text-zinc-550 border-b border-zinc-900 text-[10px] uppercase tracking-wider">
                            <th className="p-4 font-bold">Fecha / ID</th>
                            <th className="p-4 font-bold">Usuario</th>
                            <th className="p-4 font-bold">Detalles / Destino</th>
                            <th className="p-4 font-bold text-center">Estado</th>
                            <th className="p-4 font-bold text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/60 text-zinc-450">
                          {db.movements
                            .filter(m => m.type === 'deposit' && m.status !== 'pending')
                            .map((mov) => {
                              return (
                                <tr key={mov.id} className="hover:bg-zinc-900/10 transition-colors">
                                  <td className="p-4 whitespace-nowrap">
                                    <div className="font-bold text-zinc-300">
                                      {new Date(mov.timestamp).toLocaleDateString()} {new Date(mov.timestamp).toLocaleTimeString()}
                                    </div>
                                    <div className="text-[9px] text-zinc-650 font-mono mt-0.5">{mov.id}</div>
                                  </td>
                                  <td className="p-4">
                                    <div className="font-bold text-zinc-300">{mov.userName}</div>
                                    <div className="text-[9px] text-zinc-550 font-mono font-bold">UID: {mov.userId}</div>
                                  </td>
                                  <td className="p-4">
                                    <div className="text-xs text-zinc-400 break-all max-w-sm">
                                      {mov.description}
                                    </div>
                                    {mov.txId && (
                                      <div className="text-[10px] font-mono mt-1 text-zinc-500">
                                        <span className="text-emerald-500">TxID:</span> <span className="bg-zinc-900/80 border border-zinc-850 px-1 py-0.5 rounded select-all text-[9px] font-bold">{mov.txId}</span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-4 text-center whitespace-nowrap">
                                    {mov.status === 'completed' && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-emerald-950/40 text-emerald-400 border border-emerald-500/10 rounded">
                                        ACREDITADO
                                      </span>
                                    )}
                                    {mov.status === 'failed' && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-red-950/40 text-red-400 border border-red-500/10 rounded">
                                        RECHAZADO
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-4 font-mono font-extrabold text-right text-emerald-400 whitespace-nowrap">
                                    +{mov.cryptoAmount || mov.amount} {mov.asset}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </main>

      {/* Edit User Details & Balance Adjustment Overlay Modal */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedUserForEdit(null)} />
          
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative z-10">
            <div className="flex justify-between items-start mb-6 pb-3 border-b border-zinc-900">
              <div>
                <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-1">
                  <Coins className="w-4 h-4 text-red-500" />
                  Ajustes: {selectedUserForEdit.name}
                </h3>
                <span className="text-[10px] font-mono text-zinc-500">ID: {selectedUserForEdit.id}</span>
              </div>
              <button 
                onClick={() => {
                  setSelectedUserForEdit(null);
                  setEditModalError(null);
                  setEditModalSuccess(null);
                }} 
                className="text-zinc-500 hover:text-zinc-200 font-bold text-xs"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {editModalError && <div className="p-2.5 bg-red-950/40 border border-red-500/20 text-red-200 text-xs rounded-lg mb-4">{editModalError}</div>}
            {editModalSuccess && <div className="p-2.5 bg-zinc-900/80 border border-red-500/30 text-zinc-200 text-xs rounded-lg mb-4">{editModalSuccess}</div>}

            {/* Current status overview inside form */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-zinc-900/50 rounded-xl border border-zinc-900 text-xs text-zinc-500 mb-6">
              <div>
                Saldo actual USDT: <span className="text-zinc-200 block font-mono font-bold">${selectedUserForEdit.balance.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
              </div>
              <div>
                Saldo actual BTC: <span className="text-red-500 block font-mono font-bold">{selectedUserForEdit.btcBalance.toFixed(6)} BTC</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleModifyBalanceSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block">Modificar USDT (Suma o resta)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editUsdtAdjust}
                    onChange={(e) => setEditUsdtAdjust(e.target.value)}
                    required
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:border-red-500/40 font-mono"
                  />
                  <span className="text-[9px] text-zinc-600">Ejemplo: -500 para restar, 500 para sumar.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block">Modificar BTC (Suma o resta)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={editBtcAdjust}
                    onChange={(e) => setEditBtcAdjust(e.target.value)}
                    required
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:border-red-500/40 font-mono"
                  />
                  <span className="text-[9px] text-zinc-600">Ejemplo: -0.05 para restar.</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500 block">Motivo del Ajuste (Auditoría obligatoria)</label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="E.g. Corrección de saldo inicial"
                  required
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-red-500/40"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-lg cursor-pointer transition-colors shadow-md shadow-red-950/20"
              >
                Aplicar Ajuste y Firmar Auditoría
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin general footer */}
      <footer className="w-full text-center py-6 text-[10px] text-zinc-600 border-t border-zinc-950 mt-12 bg-zinc-950/30">
        &copy; 2026 AURA Mining Corp. Panel de supervisión de hardware ASIC y enrutamiento JWT.
      </footer>
    </div>
  );
}
