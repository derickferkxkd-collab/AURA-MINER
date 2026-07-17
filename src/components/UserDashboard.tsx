/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Coins, 
  TrendingUp, 
  Activity, 
  Clock, 
  LogOut, 
  Plus, 
  Play, 
  Pause, 
  Bell, 
  ShieldCheck, 
  ShieldAlert,
  User,
  RefreshCw, 
  Zap, 
  FileText, 
  Megaphone,
  Check,
  ArrowUpRight,
  Users
} from 'lucide-react';
import { DatabaseState, User as DBUser, MiningRig, Movement, ActivityLog } from '../utils/db';
import AuraLogo from './AuraLogo';

interface UserDashboardProps {
  currentUser: DBUser;
  db: DatabaseState;
  purchaseRig: (rigName: string, hashrate: number, cost: number, watts: number) => { success: boolean; error?: string };
  toggleRigStatus: (rigId: string) => { success: boolean; error?: string };
  convertBtcToUsdt: (btcAmount: number) => { success: boolean; error?: string };
  createCryptoDeposit: (asset: 'USDT' | 'BTC' | 'ETH' | 'TRX', cryptoAmount: number, network: string) => { success: boolean; error?: string; txId?: string; address?: string };
  transferBalance: (recipientEmail: string, amount: number) => { success: boolean; error?: string };
  requestWithdrawal: (asset: 'USDT' | 'BTC', amount: number, network: string, targetAddress: string) => { success: boolean; error?: string };
  readNotification: (notifId: string) => void;
  logout: () => void;
  adminViewMode?: 'admin' | 'user';
  setAdminViewMode?: (mode: 'admin' | 'user') => void;
}

// Preset ASICs for Sale
const RIGS_CATALOGUE = [
  { name: "ASIC Antminer S21 Pro", hashrate: 234, cost: 3200, power: 3500, description: "Última generación. Máxima eficiencia energética." },
  { name: "Whatsminer M63S Liquid", hashrate: 390, cost: 5800, power: 6200, description: "Refrigeración líquida industrial para hashing sostenido." },
  { name: "Avalon Nano 3 Prime", hashrate: 15, cost: 250, power: 140, description: "Dispositivo de micro-minería para entusiastas." },
  { name: "Antminer S19 XP Hydro", hashrate: 255, cost: 3900, power: 5300, description: "Alta densidad de hash rate con tecnología hidrónica." }
];

export default function UserDashboard({
  currentUser,
  db,
  purchaseRig,
  toggleRigStatus,
  convertBtcToUsdt,
  createCryptoDeposit,
  transferBalance,
  requestWithdrawal,
  readNotification,
  logout,
  adminViewMode,
  setAdminViewMode
}: UserDashboardProps) {
  
  // Tab/Screen states
  const [activeTab, setActiveTab] = useState<'mining' | 'shop' | 'logs' | 'announcements' | 'deposit' | 'transfer' | 'withdraw'>('mining');
  
  // Swap tool states
  const [btcToConvert, setBtcToConvert] = useState<string>('');
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapSuccess, setSwapSuccess] = useState<string | null>(null);

  // Shop purchase message states
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  // Deposit service states
  const [depositAsset, setDepositAsset] = useState<'USDT' | 'BTC' | 'ETH' | 'TRX'>('USDT');
  const [depositNetwork, setDepositNetwork] = useState<string>('TRC20');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [generatedAddress, setGeneratedAddress] = useState<string>('');
  const [generatedTxId, setGeneratedTxId] = useState<string>('');
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Auto-adjust network when asset changes
  useEffect(() => {
    if (depositAsset === 'BTC') {
      setDepositNetwork('Bitcoin');
    } else if (depositAsset === 'ETH') {
      setDepositNetwork('ERC20');
    } else if (depositAsset === 'TRX') {
      setDepositNetwork('TRC20');
    } else if (depositAsset === 'USDT') {
      setDepositNetwork('TRC20'); // default USDT network
    }
  }, [depositAsset]);

  const handleGenerateAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError(null);
    setDepositSuccess(null);
    setCopiedText(false);

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setDepositError("Por favor ingrese una cantidad de criptomoneda válida mayor a 0.");
      return;
    }

    const res = createCryptoDeposit(depositAsset, amount, depositNetwork);
    if (res.success && res.address && res.txId) {
      setGeneratedAddress(res.address);
      setGeneratedTxId(res.txId);
      setDepositSuccess(`¡Dirección de depósito generada correctamente!`);
    } else {
      setDepositError(res.error || "Fallo al iniciar el depósito.");
    }
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Internal transfer states
  const [transferEmail, setTransferEmail] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferSuccess(null);
    setTransferError(null);

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setTransferError("Por favor ingrese un monto válido mayor a 0.");
      return;
    }

    const res = transferBalance(transferEmail, amount);
    if (res.success) {
      setTransferSuccess(`¡Transferencia de $${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT enviada con éxito a ${transferEmail}!`);
      setTransferEmail('');
      setTransferAmount('');
    } else {
      setTransferError(res.error || "Fallo al realizar la transferencia.");
    }
  };

  // Withdrawal States
  const [withdrawAsset, setWithdrawAsset] = useState<'USDT' | 'BTC'>('USDT');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawNetwork, setWithdrawNetwork] = useState<string>('TRC20');
  const [withdrawAddress, setWithdrawAddress] = useState<string>('');
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  useEffect(() => {
    if (withdrawAsset === 'BTC') {
      setWithdrawNetwork('Bitcoin');
    } else {
      setWithdrawNetwork('TRC20');
    }
  }, [withdrawAsset]);

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawSuccess(null);
    setWithdrawError(null);

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError("Por favor ingrese un monto de retiro válido mayor a 0.");
      return;
    }

    if (!withdrawAddress.trim()) {
      setWithdrawError("Por favor ingrese una dirección de destino válida.");
      return;
    }

    const res = requestWithdrawal(withdrawAsset, amount, withdrawNetwork, withdrawAddress);
    if (res.success) {
      setWithdrawSuccess(`¡Solicitud de retiro registrada con éxito! Tu retiro de ${amount} ${withdrawAsset} está bajo revisión de seguridad y requiere aprobación de un administrador para procesar la transacción externa.`);
      setWithdrawAmount('');
      setWithdrawAddress('');
    } else {
      setWithdrawError(res.error || "Fallo al solicitar el retiro.");
    }
  };

  // Notifications display toggle
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState<boolean>(false);

  // Generate dynamic chart wave data points
  const [chartData, setChartData] = useState<number[]>([120, 145, 130, 160, 150, 180, 195]);

  // Read current user's hardware
  const userRigs = db.miningRigs.filter(r => r.userId === currentUser.id);
  const activeUserRigs = userRigs.filter(r => r.status === 'running');
  
  // Calculate stats
  const totalHashrate = activeUserRigs.reduce((acc, curr) => acc + curr.hashrate, 0);
  const totalPowerConsumption = activeUserRigs.reduce((acc, curr) => acc + curr.powerConsumption, 0);
  
  // Projected daily earnings: 1 MH/s yields ~0.0000012 BTC/day
  const projectedDailyBtc = activeUserRigs.reduce((acc, curr) => acc + (curr.hashrate * curr.efficiency), 0);
  const projectedDailyUsdt = projectedDailyBtc * db.config.btcPriceUsdt;

  // Filter logs & notifications
  const userLogs = db.activityLogs.filter(l => l.userId === currentUser.id);
  const userMovements = db.movements.filter(m => m.userId === currentUser.id);
  
  const notifications = db.notifications.filter(
    n => n.userId === 'all' || n.userId === currentUser.id
  );
  const unreadNotificationsCount = notifications.filter(n => !n.readBy.includes(currentUser.id)).length;

  // Simulate incremental changes to graph wave
  useEffect(() => {
    const chartInterval = setInterval(() => {
      setChartData(prev => {
        const nextVal = Math.max(20, totalHashrate > 0 ? totalHashrate + (Math.random() - 0.5) * 15 : 10 + Math.random() * 5);
        const copy = [...prev.slice(1), parseFloat(nextVal.toFixed(1))];
        return copy;
      });
    }, 5000);
    return () => clearInterval(chartInterval);
  }, [totalHashrate]);

  const handleSwap = (e: React.FormEvent) => {
    e.preventDefault();
    setSwapError(null);
    setSwapSuccess(null);
    
    const amount = parseFloat(btcToConvert);
    if (isNaN(amount) || amount <= 0) {
      setSwapError("Ingrese una cantidad de BTC válida.");
      return;
    }
    
    const res = convertBtcToUsdt(amount);
    if (res.success) {
      setSwapSuccess(`¡Conversión exitosa! Se han acreditado $${(amount * db.config.btcPriceUsdt).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USDT.`);
      setBtcToConvert('');
    } else {
      setSwapError(res.error || "Fallo en la conversión.");
    }
  };

  const handleBuyRig = (rig: typeof RIGS_CATALOGUE[0]) => {
    setPurchaseError(null);
    setPurchaseSuccess(null);

    const res = purchaseRig(rig.name, rig.hashrate, rig.cost, rig.power);
    if (res.success) {
      setPurchaseSuccess(`¡Rig ${rig.name} adquirido y conectado con éxito!`);
      // Add data point immediately to reflect power spike
      setChartData(prev => [...prev.slice(1), totalHashrate + rig.hashrate]);
    } else {
      setPurchaseError(res.error || "Fondos insuficientes o límite de seguridad alcanzado.");
    }
  };

  const handleToggleRig = (id: string) => {
    toggleRigStatus(id);
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 flex flex-col font-sans relative selection:bg-red-500/30">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 right-0 w-[45%] h-[40%] rounded-full bg-red-950/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[35%] h-[35%] rounded-full bg-zinc-900/10 blur-[120px] pointer-events-none" />

      {/* Primary Navigation Header */}
      <header className="bg-zinc-950/75 border-b border-zinc-900 sticky top-0 z-40 backdrop-blur-md px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <AuraLogo size={42} showText={false} />
            <div>
              <span className="font-extrabold tracking-wider text-base bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">AURA</span>
              <span className="text-red-500 text-xs font-semibold ml-1.5 uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-950/40 border border-red-500/15">MINER</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View switching links/buttons for admin */}
            {currentUser.role === 'admin' && (
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
                  <User className="w-3.5 h-3.5" />
                  Vista Usuario
                </button>
              </div>
            )}

            {/* Real-time Indicator ticker */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/40 border border-zinc-800 text-[11px] text-zinc-400">
              <TrendingUp className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>BTC/USDT Live:</span>
              <span className="font-bold font-mono text-zinc-200">${db.config.btcPriceUsdt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>

            {/* Notification bell */}
            <button
              onClick={() => setShowNotificationsDrawer(!showNotificationsDrawer)}
              className="relative p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
              )}
            </button>

            {/* User badge */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-zinc-800">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-zinc-300">{currentUser.name}</div>
                <div className="text-[9px] text-red-400 uppercase tracking-widest font-mono">Miner Account</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-red-950 border border-red-500/30 flex items-center justify-center text-red-500 font-extrabold text-xs">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
            </div>

            {/* Log out */}
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

      {/* Main Layout Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 z-10">
        
        {/* Core Financial Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Balance USDT */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Coins className="w-32 h-32 text-red-500" />
            </div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Saldo en Dólares</span>
              <div className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400">USDT</div>
            </div>
            <div className="my-3">
              <div className="text-3xl font-extrabold font-mono tracking-tight text-white">
                ${currentUser.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Saldo disponible para compra de hardware en la nube.</p>
            </div>
            <div className="border-t border-zinc-900/60 pt-3 text-[10px] text-zinc-400 flex justify-between">
              <span>Bono inicial asignado:</span>
              <span className="font-mono text-zinc-300">${currentUser.initialBalance} USDT</span>
            </div>
          </div>

          {/* Balance BTC (Real-time dynamic accumulator) */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Cpu className="w-32 h-32 text-red-500" />
            </div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase tracking-widest font-bold text-red-400">Bitcoin Acumulado</span>
              <div className="px-2 py-0.5 rounded bg-red-950/30 border border-red-500/20 text-[10px] font-bold text-red-400">LIVE BTC</div>
            </div>
            <div className="my-3">
              <div className="text-3xl font-extrabold font-mono tracking-tight text-red-500 animate-pulse">
                {currentUser.btcBalance.toFixed(8)}
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">
                Valor estimado: <span className="text-zinc-200 font-bold">${(currentUser.btcBalance * db.config.btcPriceUsdt).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USDT</span>
              </p>
            </div>
            <div className="border-t border-zinc-900/60 pt-3 text-[10px] text-zinc-400 flex justify-between">
              <span>Rigs Activos:</span>
              <span className="text-red-400 font-bold">{activeUserRigs.length} / {userRigs.length} en línea</span>
            </div>
          </div>

          {/* Quick Swap Converter */}
          <div className="bg-zinc-950/60 border border-red-500/10 hover:border-red-500/20 rounded-xl p-5 shadow-[0_4px_25px_rgba(0,0,0,0.5)] flex flex-col justify-between transition-all">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-red-500" />
              Conversor Instantáneo a USDT
            </h3>
            
            <form onSubmit={handleSwap} className="my-3 space-y-2">
              <div className="relative">
                <input
                  type="number"
                  step="0.000001"
                  value={btcToConvert}
                  onChange={(e) => setBtcToConvert(e.target.value)}
                  placeholder="Cantidad de BTC a liquidar"
                  className="w-full bg-zinc-900/60 border border-zinc-800 text-xs rounded-lg py-2 pl-3 pr-16 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-500/40"
                />
                <button
                  type="button"
                  onClick={() => setBtcToConvert(currentUser.btcBalance.toFixed(6))}
                  className="absolute right-2 top-1.5 px-2 py-0.5 rounded bg-zinc-800 text-[9px] hover:bg-zinc-700 font-bold text-zinc-400 transition-colors"
                >
                  MAX
                </button>
              </div>

              {btcToConvert && !isNaN(parseFloat(btcToConvert)) && (
                <div className="text-[10px] text-zinc-500 text-right">
                  Recibirá aprox: <span className="text-zinc-300 font-bold font-mono">${(parseFloat(btcToConvert) * db.config.btcPriceUsdt).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USDT</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-zinc-900 hover:bg-red-950 border border-zinc-800 hover:border-red-500/40 text-[11px] font-bold py-1.5 rounded-lg text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                Cambiar BTC a USDT
              </button>
            </form>

            {swapError && <div className="text-[10px] text-red-400">{swapError}</div>}
            {swapSuccess && <div className="text-[10px] text-zinc-400">{swapSuccess}</div>}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-900 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('mining')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'mining' 
                ? 'border-red-500 text-red-500 bg-red-950/5' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Minería Activa
          </button>
          <button
            onClick={() => setActiveTab('shop')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'shop' 
                ? 'border-red-500 text-red-500 bg-red-950/5' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Adquirir ASIC ({RIGS_CATALOGUE.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'logs' 
                ? 'border-red-500 text-red-500 bg-red-950/5' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Historial y Seguridad
          </button>
          <button
            onClick={() => setActiveTab('deposit')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'deposit' 
                ? 'border-red-500 text-red-500 bg-red-950/5' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Coins className="w-4 h-4" />
            Depositar Cripto <span className="text-[9px] bg-red-500 text-white font-black px-1.5 py-0.2 rounded shrink-0 uppercase tracking-widest animate-pulse ml-1">NEW</span>
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'transfer' 
                ? 'border-red-500 text-red-500 bg-red-950/5' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <RefreshCw className="w-4 h-4 text-red-500" />
            Transferir Saldo <span className="text-[9px] bg-red-500 text-white font-black px-1.5 py-0.2 rounded shrink-0 uppercase tracking-widest ml-1">ENVIAR</span>
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'withdraw' 
                ? 'border-red-500 text-red-500 bg-red-950/5' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-red-500" />
            Retirar Fondos <span className="text-[9px] bg-red-500 text-white font-black px-1.5 py-0.2 rounded shrink-0 uppercase tracking-widest ml-1">RETIRO</span>
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'announcements' 
                ? 'border-red-500 text-red-500 bg-red-950/5' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            Anuncios Corporativos ({db.config.announcements.length})
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="space-y-6">
          
          {/* TAB 1: Mining simulation */}
          {activeTab === 'mining' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left & Middle Column: Hash rate Chart & Active rigs list */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* SVG Performance Chart */}
                <div className="bg-zinc-950/50 border border-zinc-900 rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-200">Rendimiento de Hash Rate en Tiempo Real</h3>
                      <p className="text-[11px] text-zinc-500">Fluctuación de potencia de cálculo global (MH/s) en tiempo real</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-red-500 font-mono">{totalHashrate} MH/s</div>
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500">Capacidad Contratada</span>
                    </div>
                  </div>

                  {/* SVG Chart */}
                  <div className="h-44 w-full bg-zinc-900/10 rounded-lg relative overflow-hidden border border-zinc-900/80 flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25"/>
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0"/>
                        </linearGradient>
                      </defs>
                      {/* Area */}
                      <path
                        d={`M 0 100 
                            L 0 ${100 - (chartData[0]/3)} 
                            L 16.6 ${100 - (chartData[1]/3)} 
                            L 33.3 ${100 - (chartData[2]/3)} 
                            L 50 ${100 - (chartData[3]/3)} 
                            L 66.6 ${100 - (chartData[4]/3)} 
                            L 83.3 ${100 - (chartData[5]/3)} 
                            L 100 ${100 - (chartData[6]/3)} 
                            L 100 100 Z`}
                        fill="url(#chartGlow)"
                      />
                      {/* Line */}
                      <path
                        d={`M 0 ${100 - (chartData[0]/3)} 
                            L 16.6 ${100 - (chartData[1]/3)} 
                            L 33.3 ${100 - (chartData[2]/3)} 
                            L 50 ${100 - (chartData[3]/3)} 
                            L 66.6 ${100 - (chartData[4]/3)} 
                            L 83.3 ${100 - (chartData[5]/3)} 
                            L 100 ${100 - (chartData[6]/3)}`}
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Chart overlay dots */}
                    <div className="absolute inset-x-0 bottom-1 flex justify-between px-1 text-[8px] text-zinc-600 font-mono">
                      <span>t-30s</span>
                      <span>t-25s</span>
                      <span>t-20s</span>
                      <span>t-15s</span>
                      <span>t-10s</span>
                      <span>t-5s</span>
                      <span className="text-red-500 animate-pulse font-bold">LIVÉ</span>
                    </div>
                  </div>
                </div>

                {/* My Hardware list */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nodos de Hardware en Operación ({userRigs.length})</h3>
                  
                  {userRigs.length === 0 ? (
                    <div className="bg-zinc-950/40 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
                      <Cpu className="w-10 h-10 text-zinc-700 mx-auto mb-2 animate-bounce" />
                      <div className="text-zinc-400 text-xs font-bold">Ningún rig de minería activo</div>
                      <p className="text-[11px] text-zinc-600 max-w-xs mx-auto mt-1">Diríjase a la pestaña "Adquirir ASIC" para arrendar su primer nodo de procesamiento y comenzar a recibir Bitcoin.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userRigs.map((rig) => (
                        <div key={rig.id} className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-800 transition-all">
                          <div>
                            <div className="flex justify-between items-start">
                              <h4 className="text-xs font-bold text-zinc-200">{rig.name}</h4>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                                rig.status === 'running' 
                                  ? 'bg-red-950/40 border border-red-500/20 text-red-400' 
                                  : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                              }`}>
                                {rig.status === 'running' ? 'En línea' : 'Pausado'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] text-zinc-500">
                              <div>Potencia: <span className="font-mono text-zinc-300 font-bold">{rig.hashrate} MH/s</span></div>
                              <div>Consumo: <span className="font-mono text-zinc-300">{rig.powerConsumption}W</span></div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center border-t border-zinc-900/60 pt-3 mt-3">
                            <span className="text-[9px] text-zinc-600">Arrendado el {new Date(rig.purchasedAt).toLocaleDateString()}</span>
                            <button
                              onClick={() => handleToggleRig(rig.id)}
                              className={`px-3 py-1 text-[10px] rounded font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                                rig.status === 'running'
                                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400'
                                  : 'bg-red-950 hover:bg-red-900 text-red-400 border border-red-500/20'
                              }`}
                            >
                              {rig.status === 'running' ? (
                                <>
                                  <Pause className="w-3 h-3 text-zinc-500" />
                                  Pausar
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 text-red-500" />
                                  Encender
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Mini Stats and Quick info */}
              <div className="space-y-6">
                
                {/* Rig Statistics card */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Rendimiento Operativo</h3>
                  
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Hash Rate Activo:</span>
                      <span className="font-mono font-bold text-zinc-200">{totalHashrate} MH/s</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Consumo Energético:</span>
                      <span className="font-mono text-zinc-300">{(totalPowerConsumption / 1000).toFixed(2)} kW/h</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Estimado Diario:</span>
                      <span className="font-mono text-red-400 font-bold">+{projectedDailyBtc.toFixed(6)} BTC</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Estimado USDT/día:</span>
                      <span className="font-mono text-zinc-200 font-bold">+${projectedDailyUsdt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                  </div>

                  {totalHashrate > 0 && (
                    <div className="p-3 bg-red-950/10 border border-red-500/10 rounded-lg flex gap-2.5 items-start">
                      <Zap className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                      <p className="text-[10px] text-zinc-400 leading-relaxed">
                        Los ASIC están minando activamente. El balance se actualiza automáticamente cada 3 segundos en segundo plano.
                      </p>
                    </div>
                  )}
                </div>

                {/* Referral Program Card */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Sistema de Referidos (Comisión 7%)</h3>
                  </div>
                  
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    ¡Invita a tus socios y gana una comisión directa del <strong className="text-amber-400">7%</strong> sobre cada depósito en USDT o Bitcoin que realicen una vez sea verificado y aprobado por el Administrador!
                  </p>

                  <div className="space-y-3 bg-zinc-900/30 p-3.5 rounded-lg border border-zinc-900/60 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">Tu Código de Invitación / Referido</span>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          readOnly
                          value={currentUser.email}
                          className="bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1 text-zinc-300 font-mono text-[11px] flex-1 focus:outline-none select-all"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(currentUser.email);
                          }}
                          className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-[10px] rounded font-bold cursor-pointer transition-colors"
                        >
                          Copiar
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-1">
                        Tus invitados deben ingresar tu correo en el campo de patrocinador al registrarse.
                      </p>
                    </div>

                    {currentUser.referredBy && (
                      <div className="border-t border-zinc-900/60 pt-2.5 mt-2 flex justify-between items-center text-[10px]">
                        <span className="text-zinc-500">Tu Patrocinador:</span>
                        <span className="font-mono text-amber-500 font-bold bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-500/5">
                          {db.users.find(u => u.id === currentUser.referredBy)?.name || currentUser.referredBy}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Summary of Referred friends */}
                  <div className="text-[11px] flex justify-between items-center text-zinc-400">
                    <span>Socios Referidos:</span>
                    <span className="font-mono font-extrabold text-zinc-200 bg-zinc-900 px-2 py-0.5 rounded">
                      {db.users.filter(u => u.referredBy === currentUser.id).length}
                    </span>
                  </div>
                </div>

                {/* Node Status network monitor */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Monitor de Red Global</h3>
                  
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Latencia de Red:</span>
                      <span className="font-mono text-zinc-400">12 ms (Estable)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Dificultad de Minado:</span>
                      <span className="font-mono text-zinc-400">83.15 T</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Servidores Cloud:</span>
                      <span className="text-zinc-300 font-semibold">Texas, Islandia, Reikiavik</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Protección Perimetral:</span>
                      <span className="text-red-400 font-bold flex items-center gap-1 text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
                        SSL/CSRF Activo
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: ASIC Shop */}
          {activeTab === 'shop' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Hardware Cloud ASIC disponible</h3>
                  <p className="text-[11px] text-zinc-500">Arriende nodos de cómputo remotos utilizando su saldo en USDT</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500">Su saldo disponible:</span>
                  <div className="text-sm font-extrabold text-zinc-100 font-mono">${currentUser.balance.toLocaleString()} USDT</div>
                </div>
              </div>

              {purchaseError && (
                <div className="p-3 bg-red-950/40 border border-red-500/20 text-red-200 text-xs rounded-lg">
                  {purchaseError}
                </div>
              )}
              {purchaseSuccess && (
                <div className="p-3 bg-zinc-900/80 border border-red-500/30 text-zinc-200 text-xs rounded-lg">
                  {purchaseSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {RIGS_CATALOGUE.map((rig, i) => {
                  const canAfford = currentUser.balance >= rig.cost;
                  return (
                    <div 
                      key={i} 
                      className="bg-zinc-950/60 border border-zinc-800 hover:border-red-500/20 rounded-2xl p-5 flex flex-col justify-between transition-all relative group shadow-lg"
                    >
                      {/* Decorative layout highlights */}
                      <div className="absolute top-0 right-10 w-20 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent group-hover:via-red-500" />
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-bold text-zinc-100 group-hover:text-red-400 transition-colors">{rig.name}</h4>
                          <span className="text-xs font-mono font-bold text-red-500 bg-red-950/20 px-2 py-0.5 rounded border border-red-500/10">
                            {rig.hashrate} MH/s
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{rig.description}</p>
                        
                        <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-900/40 rounded-xl text-xs text-zinc-500 border border-zinc-900">
                          <div>
                            Consumo: <span className="text-zinc-300 font-semibold block">{rig.power} W</span>
                          </div>
                          <div>
                            Bono diario: <span className="text-zinc-300 font-semibold block font-mono">+{(rig.hashrate * 0.0000012).toFixed(6)} BTC</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-6 pt-4 border-t border-zinc-900/60">
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase font-semibold">Precio de arriendo</span>
                          <div className="text-base font-extrabold text-zinc-100 font-mono">${rig.cost.toLocaleString()} USDT</div>
                        </div>

                        <button
                          onClick={() => handleBuyRig(rig)}
                          disabled={!canAfford}
                          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                            canAfford 
                              ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_12px_rgba(239,68,68,0.2)]' 
                              : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          Arrendar Nodo
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: History & logs */}
          {activeTab === 'logs' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Financial movements */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Historial Financiero</h3>
                
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                  {userMovements.length === 0 ? (
                    <div className="p-6 text-center text-zinc-500 text-xs">Sin movimientos financieros registrados.</div>
                  ) : (
                    <div className="divide-y divide-zinc-900">
                      {userMovements.map((mov) => {
                        const isNegative = mov.amount < 0;
                        return (
                          <div key={mov.id} className="p-3.5 flex justify-between items-center hover:bg-zinc-900/20 transition-colors">
                            <div className="space-y-1">
                              <div className="text-xs font-bold text-zinc-300">{mov.description}</div>
                              <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3" />
                                {new Date(mov.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className={`font-mono text-xs font-bold ${isNegative ? 'text-red-500' : 'text-zinc-200'}`}>
                                {isNegative ? '' : '+'}{mov.amount.toFixed(mov.asset === 'BTC' ? 6 : 2)}
                              </span>
                              <span className="text-[9px] font-bold text-zinc-500 ml-1">{mov.asset}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Security Audit actions */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Registro de Telemetría y Seguridad</h3>
                
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 font-mono text-[10px] max-h-96 overflow-y-auto space-y-3">
                  <div className="text-[11px] text-red-500 border-b border-zinc-900 pb-2 flex items-center justify-between">
                    <span>SECURITY CONSOLE LOG</span>
                    <span className="text-zinc-600">IP DE RED: {currentUser.id === 'user-1' ? '192.168.1.45' : 'Dinámica'}</span>
                  </div>

                  {userLogs.length === 0 ? (
                    <div className="text-zinc-600 text-center py-4">No security logs recorded.</div>
                  ) : (
                    <div className="space-y-2">
                      {userLogs.map((log) => (
                        <div key={log.id} className="border-l-2 border-red-500/30 pl-2 py-0.5 hover:border-red-500 transition-colors">
                          <div className="text-zinc-500">[{new Date(log.timestamp).toLocaleTimeString()}] IP: {log.ipAddress}</div>
                          <div className="text-zinc-300 font-bold uppercase">{log.action}</div>
                          <div className="text-zinc-400 text-[9px]">{log.details}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Crypto Deposits and Blockchain Confirmations */}
          {activeTab === 'deposit' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left side: Deposit form & QR code */}
                <div className="lg:col-span-2 space-y-6 animate-fadeIn">
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                      <Coins className="w-24 h-24 text-red-500" />
                    </div>
                    
                    <h3 className="text-base font-extrabold text-zinc-200 mb-1 flex items-center gap-2">
                      <Coins className="w-5 h-5 text-red-500" />
                      Pasarela de Carga de Criptoactivos
                    </h3>
                    <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                      Carga fondos de manera segura a tu billetera de minería en la nube. Selecciona tu moneda, ingresa el monto y transfiere a la dirección generada. Los fondos se acreditarán en USDT automáticamente al recibir **3 confirmaciones** en la blockchain.
                    </p>

                    <form onSubmit={handleGenerateAddress} className="space-y-5">
                      {/* Grid selector of assets */}
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-2">Seleccione Moneda</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { id: 'USDT', name: 'Tether USDT', icon: '💲', color: 'text-green-500' },
                            { id: 'BTC', name: 'Bitcoin', icon: '₿', color: 'text-amber-500' },
                            { id: 'ETH', name: 'Ethereum', icon: 'Ξ', color: 'text-indigo-400' },
                            { id: 'TRX', name: 'TRON TRX', icon: '♦', color: 'text-red-500' }
                          ].map((coin) => (
                            <button
                              key={coin.id}
                              type="button"
                              onClick={() => {
                                setDepositAsset(coin.id as any);
                                setGeneratedAddress('');
                                setDepositSuccess(null);
                              }}
                              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-22 ${
                                depositAsset === coin.id
                                  ? 'bg-red-950/15 border-red-500/50 shadow-sm shadow-red-950/20'
                                  : 'bg-zinc-900/40 border-zinc-900 hover:border-zinc-800'
                              }`}
                            >
                              <span className="text-xl">{coin.icon}</span>
                              <div>
                                <div className="text-[11px] font-extrabold text-zinc-200">{coin.id}</div>
                                <div className="text-[9px] text-zinc-500 font-medium">{coin.name}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Network & Amount fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-1.5">Red de Blockchain</label>
                          {depositAsset === 'USDT' ? (
                            <select
                              value={depositNetwork}
                              onChange={(e) => {
                                setDepositNetwork(e.target.value);
                                setGeneratedAddress('');
                                setDepositSuccess(null);
                              }}
                              className="w-full bg-zinc-900 border border-zinc-850 text-xs rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-red-500/30"
                            >
                              <option value="TRC20">TRON Network (TRC-20)</option>
                              <option value="ERC20">Ethereum Network (ERC-20)</option>
                            </select>
                          ) : (
                            <div className="w-full bg-zinc-900/60 border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-400 font-semibold">
                              {depositNetwork} Network
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-1.5">Monto a Depositar</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.0001"
                              value={depositAmount}
                              onChange={(e) => {
                                setDepositAmount(e.target.value);
                                setGeneratedAddress('');
                                setDepositSuccess(null);
                              }}
                              placeholder={`Ej: ${depositAsset === 'BTC' ? '0.005' : depositAsset === 'ETH' ? '0.1' : '150'}`}
                              className="w-full bg-zinc-900 border border-zinc-850 text-xs rounded-lg p-2.5 pr-14 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-red-500/30"
                            />
                            <span className="absolute right-3.5 top-2.5 text-xs font-bold text-zinc-500">{depositAsset}</span>
                          </div>
                        </div>
                      </div>

                      {depositAmount && !isNaN(parseFloat(depositAmount)) && (
                        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-900/80 text-[11px] text-zinc-400 flex justify-between items-center">
                          <span>Valor estimado de acreditación en USDT:</span>
                          <span className="font-mono font-bold text-white">
                            ${(
                              parseFloat(depositAmount) *
                              (depositAsset === 'USDT' ? 1 : depositAsset === 'BTC' ? db.config.btcPriceUsdt : depositAsset === 'ETH' ? 3450 : 0.165)
                            ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                          </span>
                        </div>
                      )}

                      {!generatedAddress && (
                        <button
                          type="submit"
                          className="w-full bg-zinc-900 hover:bg-red-950 border border-zinc-850 hover:border-red-500/40 text-xs font-bold py-3 rounded-lg text-zinc-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-4 h-4 text-red-500 animate-pulse" />
                          Obtener Dirección de Pago
                        </button>
                      )}
                    </form>

                    {depositError && (
                      <div className="mt-4 p-3.5 rounded-lg bg-red-950/20 border border-red-500/20 text-xs text-red-400">
                        {depositError}
                      </div>
                    )}

                    {/* QR and Address detail display */}
                    {generatedAddress && (
                      <div className="mt-6 border-t border-zinc-900/80 pt-6 space-y-5">
                        <div className="flex flex-col sm:flex-row gap-5 items-center">
                          {/* Dynamically requested working QR code */}
                          <div className="bg-white p-2.5 rounded-lg shrink-0 border border-zinc-300">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${generatedAddress}`}
                              alt="QR Depósito"
                              className="w-[130px] h-[130px]"
                            />
                          </div>

                          <div className="space-y-3 w-full">
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider font-extrabold text-zinc-500 mb-1">Dirección de Depósito Única ({depositAsset})</label>
                              <div className="flex bg-zinc-900 rounded-lg p-2 border border-zinc-850 justify-between items-center gap-2">
                                <span className="font-mono text-xs text-zinc-300 break-all select-all">{generatedAddress}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyAddress(generatedAddress)}
                                  className="px-3 py-1 rounded bg-zinc-800 text-[10px] hover:bg-zinc-750 font-extrabold text-zinc-400 hover:text-white shrink-0 transition-all cursor-pointer"
                                >
                                  {copiedText ? "¡Copiado!" : "Copiar"}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[9px] uppercase tracking-wider font-extrabold text-zinc-500 mb-0.5">Identificador del Depósito (TXID)</label>
                              <div className="text-[11px] font-mono text-zinc-500 break-all">{generatedTxId}</div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/10 p-2.5 rounded-lg border border-red-500/10">
                              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping shrink-0" />
                              <span className="text-[11px]">Esperando pago en Blockchain... El validador se activará automáticamente al detectar la transacción.</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Active validation node logs */}
                <div className="space-y-6">
                  
                  {/* Miner Ledger info */}
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 shadow-xl">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-red-500 animate-pulse" />
                      Nodos de Validación AURA
                    </h4>
                    <p className="text-[11px] text-zinc-500 leading-relaxed mb-4">
                      Nuestros servidores automáticos escanean de forma continua la Blockchain de Bitcoin, Ethereum y TRON para validar las recargas.
                    </p>
                    <div className="space-y-2 text-[10px] font-mono">
                      <div className="flex justify-between p-1.5 bg-zinc-900/30 border-b border-zinc-900/60 text-zinc-400">
                        <span>Nodo Principal:</span>
                        <span className="text-green-500 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                          ● Activo (Estocolmo)
                        </span>
                      </div>
                      <div className="flex justify-between p-1.5 bg-zinc-900/30 border-b border-zinc-900/60 text-zinc-400">
                        <span>Confirmaciones Requeridas:</span>
                        <span className="text-zinc-200">3 Bloques</span>
                      </div>
                      <div className="flex justify-between p-1.5 bg-zinc-900/30 border-b border-zinc-900/60 text-zinc-400">
                        <span>Tiempo Promedio:</span>
                        <span className="text-zinc-200">~12 Segundos</span>
                      </div>
                    </div>
                  </div>

                  {/* Blockchain Live Stats */}
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 shadow-xl">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Estadísticas de Red</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                          <span>Capacidad Blockchain</span>
                          <span className="text-zinc-300 font-bold">99.98%</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-900 rounded overflow-hidden">
                          <div className="h-full bg-red-500" style={{ width: '99.98%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                          <span>Latencia Global</span>
                          <span className="text-zinc-300 font-bold">42 ms</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-900 rounded overflow-hidden">
                          <div className="h-full bg-red-500" style={{ width: '82%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom: User's Deposit History & Live confirm state */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-6 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-500" />
                  Historial de Depósitos Recientes
                </h3>

                {userMovements.filter(m => m.type === 'deposit').length === 0 ? (
                  <div className="text-zinc-600 text-center py-8 text-xs">Aún no se registran depósitos en esta cuenta. Genera una dirección de depósito para comenzar.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500 uppercase text-[9px] tracking-wider">
                          <th className="py-2.5 font-bold">Fecha / ID</th>
                          <th className="py-2.5 font-bold">Monto Cripto</th>
                          <th className="py-2.5 font-bold">Valor (USDT)</th>
                          <th className="py-2.5 font-bold">Identificador de Tx (TXID)</th>
                          <th className="py-2.5 font-bold">Bloques / Confirmaciones</th>
                          <th className="py-2.5 font-bold text-right">Estado de Red</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/60">
                        {userMovements
                          .filter(m => m.type === 'deposit')
                          .map((mov) => {
                            const isCompleted = mov.status === 'completed';
                            
                            return (
                              <tr key={mov.id} className="hover:bg-zinc-900/30 transition-colors">
                                <td className="py-3">
                                  <div className="font-bold text-zinc-300">{new Date(mov.timestamp).toLocaleDateString()}</div>
                                  <div className="text-[9px] text-zinc-600 font-mono">{mov.id}</div>
                                </td>
                                <td className="py-3">
                                  <span className="font-extrabold text-zinc-200">{mov.cryptoAmount}</span>{' '}
                                  <span className="text-[10px] text-zinc-500 font-bold">{mov.asset}</span>
                                </td>
                                <td className="py-3 font-mono font-extrabold text-zinc-200">
                                  ${mov.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 font-mono text-[10px] text-zinc-500 break-all select-all">
                                  {mov.txId ? `${mov.txId.substring(0, 16)}...` : 'N/A'}
                                </td>
                                <td className="py-3">
                                  {isCompleted ? (
                                    <div className="flex items-center gap-1 text-green-500 font-bold font-mono">
                                      <span>3 / 3</span>
                                      <span className="text-[10px] text-zinc-500">(Verificado)</span>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5 text-amber-500 font-bold font-mono">
                                        <span className="animate-pulse">{mov.confirmations || 0} / 3</span>
                                        <span className="text-[9px] text-zinc-500 font-sans">(Confirmando...)</span>
                                      </div>
                                      <div className="w-20 h-1 bg-zinc-900 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-amber-500 transition-all duration-1000" 
                                          style={{ width: `${((mov.confirmations || 0) / 3) * 100}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 text-right">
                                  {isCompleted ? (
                                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-green-950/50 text-green-400 border border-green-500/20 rounded">
                                      COMPLETADO
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-amber-950/30 text-amber-400 border border-amber-500/10 rounded animate-pulse">
                                      VALIDANDO
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: Internal Balance Transfers */}
          {activeTab === 'transfer' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Transfer Form Panel */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                      <RefreshCw className="w-24 h-24 text-red-500 animate-spin-slow" />
                    </div>
                    
                    <h3 className="text-base font-extrabold text-zinc-200 mb-1 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-red-500" />
                      Transferencia de Saldo Interno
                    </h3>
                    <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                      Envía saldo en USDT de forma instantánea y sin comisiones a cualquier otro usuario registrado en la plataforma utilizando únicamente su dirección de correo electrónico.
                    </p>

                    {transferError && (
                      <div className="p-3.5 rounded-lg bg-red-950/20 border border-red-500/20 text-xs text-red-400 mb-5 animate-pulse">
                        {transferError}
                      </div>
                    )}
                    {transferSuccess && (
                      <div className="p-3.5 rounded-lg bg-green-950/20 border border-green-500/20 text-xs text-green-400 mb-5 animate-fadeIn">
                        {transferSuccess}
                      </div>
                    )}

                    <form onSubmit={handleTransferSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                            Correo del Destinatario
                          </label>
                          <input
                            type="email"
                            value={transferEmail}
                            onChange={(e) => setTransferEmail(e.target.value)}
                            placeholder="Ej: usuario@correo.com"
                            required
                            className="w-full bg-zinc-900 border border-zinc-850 text-xs rounded-lg p-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-500/40"
                          />
                          <span className="text-[10px] text-zinc-500">
                            Asegúrese de ingresar el correo exacto con el que el usuario se registró.
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                            Monto a Transferir (USDT)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              value={transferAmount}
                              onChange={(e) => setTransferAmount(e.target.value)}
                              placeholder="0.00"
                              required
                              className="w-full bg-zinc-900 border border-zinc-850 text-xs rounded-lg p-2.5 pr-12 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-500/40"
                            />
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[10px] font-bold text-zinc-500 font-mono">
                              USDT
                            </div>
                          </div>
                          <div className="flex justify-between text-[10px] text-zinc-500">
                            <span>Disponible: <strong className="text-zinc-300">${currentUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</strong></span>
                            <button
                              type="button"
                              onClick={() => setTransferAmount(currentUser.balance.toString())}
                              className="text-red-500 hover:text-red-400 font-bold cursor-pointer"
                            >
                              Usar Máx
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 bg-zinc-900/40 border border-zinc-850 rounded-lg text-[11px] text-zinc-400 leading-relaxed">
                        ⚠️ <strong className="text-zinc-300">Aviso de seguridad importante:</strong> Todas las transferencias internas son definitivas e irreversibles una vez confirmadas. Compruebe el destinatario minuciosamente antes de realizar el envío.
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 px-6 rounded-lg cursor-pointer transition-colors shadow-md shadow-red-950/20"
                        >
                          Confirmar y Transferir Saldo
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Transfer History */}
                  <div className="bg-zinc-950/50 border border-zinc-900 rounded-xl p-6">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-500" />
                      Historial de Transferencias Internas
                    </h4>

                    {db.movements.filter(m => m.userId === currentUser.id && (m.type === 'transfer_sent' || m.type === 'transfer_received')).length === 0 ? (
                      <div className="text-center py-8 text-xs text-zinc-500 border border-dashed border-zinc-900 rounded-lg">
                        Aún no has realizado ni recibido transferencias internas.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-zinc-500 border-b border-zinc-900/80 text-[10px] uppercase tracking-wider">
                              <th className="pb-2.5 font-bold">Fecha / ID</th>
                              <th className="pb-2.5 font-bold">Tipo</th>
                              <th className="pb-2.5 font-bold">Descripción</th>
                              <th className="pb-2.5 font-bold text-right">Monto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/60">
                            {db.movements
                              .filter(m => m.userId === currentUser.id && (m.type === 'transfer_sent' || m.type === 'transfer_received'))
                              .map((mov) => {
                                const isSent = mov.type === 'transfer_sent';
                                return (
                                  <tr key={mov.id} className="hover:bg-zinc-900/30 transition-colors">
                                    <td className="py-3">
                                      <div className="font-bold text-zinc-300">{new Date(mov.timestamp).toLocaleDateString()} {new Date(mov.timestamp).toLocaleTimeString()}</div>
                                      <div className="text-[9px] text-zinc-600 font-mono">{mov.id}</div>
                                    </td>
                                    <td className="py-3">
                                      {isSent ? (
                                        <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-red-950/40 text-red-400 border border-red-500/10 rounded">
                                          ENVIADO
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-green-950/40 text-green-400 border border-green-500/10 rounded">
                                          RECIBIDO
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 text-zinc-400 text-xs">
                                      {mov.description}
                                    </td>
                                    <td className={`py-3 font-mono font-extrabold text-right ${isSent ? 'text-red-400' : 'text-green-400'}`}>
                                      {isSent ? '-' : '+'}${Math.abs(mov.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side Info Card */}
                <div className="space-y-6">
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Resumen de Saldo</h4>
                    
                    <div className="p-4 bg-zinc-900/50 border border-zinc-850 rounded-lg space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Saldo de Cuenta</span>
                      <div className="text-xl font-extrabold text-zinc-100 font-mono">${currentUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-red-500 font-sans">USDT</span></div>
                    </div>

                    <div className="p-4 bg-zinc-900/50 border border-zinc-850 rounded-lg space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Minas Activas</span>
                      <div className="text-lg font-extrabold text-zinc-200">{activeUserRigs.length} <span className="text-xs text-zinc-500 font-normal font-mono">Sistemas</span></div>
                    </div>

                    <div className="pt-2 text-[11px] text-zinc-500 space-y-3 leading-relaxed">
                      <h5 className="font-extrabold text-zinc-400 text-xs uppercase tracking-wider">Preguntas frecuentes</h5>
                      <div>
                        <p className="font-bold text-zinc-400">¿Tienen costo las transferencias?</p>
                        <p>No, las transferencias internas entre cuentas de la plataforma son completamente gratuitas e instantáneas.</p>
                      </div>
                      <div>
                        <p className="font-bold text-zinc-400">¿Qué pasa si me equivoco de correo?</p>
                        <p>Si envías el saldo a un correo incorrecto pero que corresponde a un usuario registrado, la operación no se podrá cancelar ni revertir. Por favor, verifique dos veces.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 7: External Crypto Withdrawals */}
          {activeTab === 'withdraw' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Withdrawal Form Panel */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                      <ArrowUpRight className="w-24 h-24 text-red-500 animate-pulse" />
                    </div>
                    
                    <h3 className="text-base font-extrabold text-zinc-200 mb-1 flex items-center gap-2">
                      <ArrowUpRight className="w-5 h-5 text-red-500" />
                      Solicitud Formal de Retiro Cripto
                    </h3>
                    <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                      Transfiere tus fondos de minería a cualquier billetera externa de criptomonedas. Por motivos de seguridad y prevención de fraudes, todos los retiros externos requieren la verificación y aprobación manual de un administrador.
                    </p>

                    {withdrawError && (
                      <div className="p-3.5 rounded-lg bg-red-950/20 border border-red-500/20 text-xs text-red-400 mb-5 animate-pulse">
                        {withdrawError}
                      </div>
                    )}
                    {withdrawSuccess && (
                      <div className="p-3.5 rounded-lg bg-green-950/20 border border-green-500/20 text-xs text-green-400 mb-5 animate-fadeIn">
                        {withdrawSuccess}
                      </div>
                    )}

                    <form onSubmit={handleWithdrawSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        
                        {/* Selector de Activo */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                            Activo a Retirar
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setWithdrawAsset('USDT');
                                setWithdrawAmount('');
                              }}
                              className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                withdrawAsset === 'USDT'
                                  ? 'bg-red-500/10 border-red-500 text-red-400 font-extrabold'
                                  : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              USDT (Tether)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setWithdrawAsset('BTC');
                                setWithdrawAmount('');
                              }}
                              className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                withdrawAsset === 'BTC'
                                  ? 'bg-red-500/10 border-red-500 text-red-400 font-extrabold'
                                  : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              BTC (Bitcoin)
                            </button>
                          </div>
                        </div>

                        {/* Red de Retiro */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                            Red de Blockchain
                          </label>
                          {withdrawAsset === 'BTC' ? (
                            <input
                              type="text"
                              value="Bitcoin Mainnet"
                              disabled
                              className="w-full bg-zinc-900 border border-zinc-850 text-xs rounded-lg p-2.5 text-zinc-550 focus:outline-none cursor-not-allowed font-medium"
                            />
                          ) : (
                            <select
                              value={withdrawNetwork}
                              onChange={(e) => setWithdrawNetwork(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-850 text-xs rounded-lg p-2.5 text-zinc-100 focus:outline-none focus:border-red-500/40 cursor-pointer"
                            >
                              <option value="TRC20">TRON (TRC20) - Rápido y Económico</option>
                              <option value="ERC20">Ethereum (ERC20)</option>
                              <option value="BEP20">BNB Chain (BEP20)</option>
                            </select>
                          )}
                        </div>

                        {/* Dirección Externa de Destino */}
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                            Dirección de Billetera Destinataria
                          </label>
                          <input
                            type="text"
                            value={withdrawAddress}
                            onChange={(e) => setWithdrawAddress(e.target.value)}
                            placeholder={withdrawAsset === 'BTC' ? "Ej: bc1q..." : "Ej: TX3..."}
                            required
                            className="w-full bg-zinc-900 border border-zinc-850 text-xs font-mono rounded-lg p-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-500/40"
                          />
                          <span className="text-[10px] text-zinc-550 block leading-relaxed">
                            ⚠️ Asegúrese de que la dirección sea compatible con la red seleccionada ({withdrawNetwork}). El envío de fondos a una dirección incorrecta resultará en la pérdida total y permanente del capital.
                          </span>
                        </div>

                        {/* Monto de Retiro */}
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                            Monto a Retirar
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              value={withdrawAmount}
                              onChange={(e) => setWithdrawAmount(e.target.value)}
                              placeholder="0.00"
                              required
                              className="w-full bg-zinc-900 border border-zinc-850 text-xs rounded-lg p-2.5 pr-16 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-500/40"
                            />
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[10px] font-bold text-zinc-500 font-mono">
                              {withdrawAsset}
                            </div>
                          </div>
                          <div className="flex justify-between text-[10px] text-zinc-500">
                            <span>Disponible: <strong className="text-zinc-300">
                              {withdrawAsset === 'USDT' 
                                ? `$${currentUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
                                : `${currentUser.btcBalance.toFixed(8)} BTC`
                              }
                            </strong></span>
                            <button
                              type="button"
                              onClick={() => {
                                const maxVal = withdrawAsset === 'USDT' ? currentUser.balance : currentUser.btcBalance;
                                setWithdrawAmount(maxVal.toString());
                              }}
                              className="text-red-500 hover:text-red-400 font-bold cursor-pointer"
                            >
                              Retirar Todo (Máx)
                            </button>
                          </div>
                        </div>

                      </div>

                      <div className="p-3.5 bg-zinc-900/40 border border-zinc-850 rounded-lg text-[11px] text-zinc-400 leading-relaxed space-y-1">
                        <p>ℹ️ <strong className="text-zinc-300">Flujo de Aprobación Formal de Retiro:</strong></p>
                        <ol className="list-decimal pl-4 space-y-1 text-zinc-500">
                          <li>Los fondos solicitados se deducen temporalmente de tu balance.</li>
                          <li>El departamento de seguridad audita la cuenta para verificar que no haya anomalías o actividades fraudulentas.</li>
                          <li>Una vez aprobado, el administrador envía la transacción y provee el TxID de la blockchain.</li>
                          <li>En caso de rechazo, los fondos son reintegrados íntegramente de manera instantánea.</li>
                        </ol>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 px-6 rounded-lg cursor-pointer transition-colors shadow-md shadow-red-950/20"
                        >
                          Enviar Solicitud de Retiro
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Withdrawal Request History */}
                  <div className="bg-zinc-950/50 border border-zinc-900 rounded-xl p-6">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-500" />
                      Tus Solicitudes de Retiro Externo
                    </h4>

                    {db.movements.filter(m => m.userId === currentUser.id && m.type === 'withdrawal' && m.targetAddress).length === 0 ? (
                      <div className="text-center py-8 text-xs text-zinc-500 border border-dashed border-zinc-900 rounded-lg">
                        No tienes solicitudes de retiro externo registradas.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-zinc-500 border-b border-zinc-900/80 text-[10px] uppercase tracking-wider">
                              <th className="pb-2.5 font-bold">Fecha / ID</th>
                              <th className="pb-2.5 font-bold">Detalle / Dirección</th>
                              <th className="pb-2.5 font-bold text-center">Estado</th>
                              <th className="pb-2.5 font-bold text-right">Monto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/60">
                            {db.movements
                              .filter(m => m.userId === currentUser.id && m.type === 'withdrawal' && m.targetAddress)
                              .map((mov) => {
                                return (
                                  <tr key={mov.id} className="hover:bg-zinc-900/30 transition-colors">
                                    <td className="py-3.5">
                                      <div className="font-bold text-zinc-300">
                                        {new Date(mov.timestamp).toLocaleDateString()} {new Date(mov.timestamp).toLocaleTimeString()}
                                      </div>
                                      <div className="text-[9px] text-zinc-600 font-mono">{mov.id}</div>
                                    </td>
                                    <td className="py-3.5">
                                      <div className="text-zinc-400 text-xs break-all">
                                        {mov.description}
                                      </div>
                                      <div className="text-[10px] text-zinc-500 font-mono mt-1 break-all select-all">
                                        Wallet: {mov.targetAddress}
                                      </div>
                                      {mov.txId && (
                                        <div className="text-[10px] text-zinc-400 font-mono mt-1 flex items-center gap-1.5">
                                          <span className="text-green-500">TxID:</span>
                                          <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-850 select-all font-mono text-[9px]">{mov.txId}</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-3.5 text-center whitespace-nowrap">
                                      {mov.status === 'pending' && (
                                        <span className="px-2 py-1 text-[9px] font-black uppercase tracking-widest bg-yellow-950/40 text-yellow-500 border border-yellow-500/20 rounded animate-pulse">
                                          PENDIENTE
                                        </span>
                                      )}
                                      {mov.status === 'completed' && (
                                        <span className="px-2 py-1 text-[9px] font-black uppercase tracking-widest bg-green-950/40 text-green-400 border border-green-500/20 rounded">
                                          APROBADO
                                        </span>
                                      )}
                                      {mov.status === 'failed' && (
                                        <span className="px-2 py-1 text-[9px] font-black uppercase tracking-widest bg-red-950/40 text-red-400 border border-red-500/20 rounded">
                                          RECHAZADO
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3.5 font-mono font-extrabold text-right text-red-400 whitespace-nowrap">
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
                    )}
                  </div>
                </div>

                {/* Right Side Info Card */}
                <div className="space-y-6">
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Normas de Retiro</h4>
                    
                    <div className="p-4 bg-zinc-900/50 border border-zinc-850 rounded-lg space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">USDT Disponible</span>
                      <div className="text-xl font-extrabold text-zinc-100 font-mono">${currentUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-red-500 font-sans">USDT</span></div>
                    </div>

                    <div className="p-4 bg-zinc-900/50 border border-zinc-850 rounded-lg space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">BTC Disponible</span>
                      <div className="text-xl font-extrabold text-zinc-100 font-mono">{currentUser.btcBalance.toFixed(8)} <span className="text-xs text-red-500 font-sans">BTC</span></div>
                    </div>

                    <div className="pt-2 text-[11px] text-zinc-500 space-y-3 leading-relaxed">
                      <h5 className="font-extrabold text-zinc-400 text-xs uppercase tracking-wider">Políticas Clave</h5>
                      <div>
                        <p className="font-bold text-zinc-400">¿Cuánto tarda en procesarse?</p>
                        <p>Las solicitudes son auditadas por analistas de cumplimiento para garantizar la integridad de los fondos. El proceso toma generalmente entre 1 y 24 horas.</p>
                      </div>
                      <div>
                        <p className="font-bold text-zinc-400">¿Qué redes de USDT soportan?</p>
                        <p>Recomendamos encarecidamente utilizar TRC20 por sus bajísimas comisiones y alta velocidad de confirmación.</p>
                      </div>
                      <div>
                        <p className="font-bold text-zinc-400">¿Qué pasa si mi solicitud es rechazada?</p>
                        <p>En caso de rechazo (por ejemplo, por ingresar un formato de dirección erróneo o un problema de cumplimiento), los fondos vuelven de inmediato a tu balance general de forma segura.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: Corporate Announcements */}
          {activeTab === 'announcements' && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Anuncios de la Red de Minería</h3>
              
              <div className="space-y-4">
                {db.config.announcements.map((ann) => (
                  <div key={ann.id} className="bg-zinc-950/60 border border-zinc-800/80 hover:border-red-500/10 rounded-xl p-5 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-bold text-zinc-200">{ann.title}</h4>
                      <span className="text-[10px] text-zinc-500 font-mono">{new Date(ann.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Slide-out Notification Drawer Overlay */}
      {showNotificationsDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowNotificationsDrawer(false)} />
          
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-zinc-950 border-l border-zinc-800 shadow-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-900">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-300 flex items-center gap-1.5">
                  <Bell className="w-4.5 h-4.5 text-red-500" />
                  Centro de Notificaciones
                </h3>
                <button 
                  onClick={() => setShowNotificationsDrawer(false)} 
                  className="text-zinc-500 hover:text-zinc-200 text-xs font-bold"
                >
                  [Cerrar]
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-1">
                {notifications.length === 0 ? (
                  <div className="text-xs text-zinc-500 text-center py-10">Ninguna notificación recibida.</div>
                ) : (
                  notifications.map((notif) => {
                    const isRead = notif.readBy.includes(currentUser.id);
                    return (
                      <div 
                        key={notif.id} 
                        onClick={() => readNotification(notif.id)}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isRead 
                            ? 'bg-zinc-900/30 border-zinc-900 text-zinc-400' 
                            : 'bg-red-950/10 border-red-500/20 text-zinc-200 hover:border-red-500/40 shadow-sm shadow-red-950/5'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-bold text-zinc-300 flex items-center gap-1">
                            {!isRead && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />}
                            {notif.title}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500">{new Date(notif.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-zinc-400 leading-relaxed text-[11px]">{notif.message}</p>
                        
                        {!isRead && (
                          <div className="flex justify-end mt-2">
                            <span className="text-[9px] text-red-400 font-bold flex items-center gap-0.5">
                              <Check className="w-3 h-3" />
                              Marcar como leída
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-900 text-center text-[10px] text-zinc-500 leading-relaxed">
              Las notificaciones son enviadas en tiempo real por el equipo de administración.
            </div>
          </div>
        </div>
      )}

      {/* Tiny absolute footer for aesthetic margin rules */}
      <footer className="w-full text-center py-6 text-[10px] text-zinc-600 border-t border-zinc-950 mt-12 bg-zinc-950/30">
        &copy; 2026 AURA Mining Corp. Conexión de red asegurada con tecnología JWT/CSRF.
      </footer>
    </div>
  );
}
