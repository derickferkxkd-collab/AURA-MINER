/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
  loadDatabase, 
  saveDatabase, 
  User, 
  UserStatus,
  Invitation, 
  Movement, 
  ActivityLog, 
  AuditLog, 
  Notification, 
  MiningRig, 
  AppConfig, 
  DatabaseState, 
  resetDatabaseToDefault 
} from './db';
import { 
  generateToken, 
  verifyToken, 
  checkRateLimit, 
  getClientIP, 
  rotateCsrfToken, 
  getCsrfToken 
} from './security';

export function useMining() {
  const [db, setDb] = useState<DatabaseState>(() => loadDatabase());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => sessionStorage.getItem('aura_auth_token'));
  const [csrfToken, setCsrfTokenState] = useState<string>(getCsrfToken);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  
  // Real-time loop refs
  const lastMiningUpdate = useRef<number>(Date.now());

  // 1. JWT Authentication validation upon loading / token change
  useEffect(() => {
    if (sessionToken) {
      const decoded = verifyToken(sessionToken);
      if (decoded) {
        const user = db.users.find(u => u.id === decoded.sub);
        if (user) {
          if (user.status === 'active') {
            setCurrentUser(user);
          } else {
            // User is blocked or pending approval now
            sessionStorage.removeItem('aura_auth_token');
            setSessionToken(null);
            setCurrentUser(null);
          }
        }
      } else {
        sessionStorage.removeItem('aura_auth_token');
        setSessionToken(null);
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
  }, [sessionToken, db.users]);

  // 2. Real-time Simulation Engine
  // Computes mining gains, blockchain confirmations, and market variations periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setDb(prev => {
        const now = Date.now();
        const deltaSec = (now - lastMiningUpdate.current) / 1000;
        lastMiningUpdate.current = now;

        let hasChanges = false;

        // 2a. Mining Rewards Calculation
        let updatedUsers = prev.users.map(user => {
          // Find running rigs for this user
          const userRigs = prev.miningRigs.filter(r => r.userId === user.id && r.status === 'running');
          if (userRigs.length === 0) return user;

          // Calculate output
          let btcEarned = 0;
          userRigs.forEach(rig => {
            // hashrate in MH/s * efficiency (BTC/day per MH/s) * fraction of day elapsed
            const dailyOutput = rig.hashrate * rig.efficiency;
            const fractionOfDay = deltaSec / 86400;
            btcEarned += dailyOutput * fractionOfDay;
          });

          if (btcEarned > 0) {
            hasChanges = true;
            return {
              ...user,
              btcBalance: user.btcBalance + btcEarned
            };
          }
          return user;
        });

        // 2b. Crypto Deposits blockchain confirmation simulation (Disabled: must be approved manually by Administrator)
        let completedDeposits: Movement[] = [];
        const updatedMovements = prev.movements.map(mov => mov);

        // 2c. Credit User Balances for completed deposits & create alerts
        let finalActivityLogs = [...prev.activityLogs];
        let finalNotifications = [...prev.notifications];

        if (completedDeposits.length > 0) {
          hasChanges = true;
          updatedUsers = updatedUsers.map(user => {
            const userCompleted = completedDeposits.filter(d => d.userId === user.id);
            if (userCompleted.length > 0) {
              const totalAdd = userCompleted.reduce((sum, d) => sum + d.amount, 0);
              return {
                ...user,
                balance: user.balance + totalAdd
              };
            }
            return user;
          });

          completedDeposits.forEach(dep => {
            finalActivityLogs = [
              {
                id: "act-dep-" + dep.id + "-" + Date.now(),
                userId: dep.userId,
                userName: dep.userName,
                action: "DEPOSIT_COMPLETED",
                details: `Depósito verificado en Blockchain: +${dep.cryptoAmount} ${dep.asset} ($${dep.amount.toFixed(2)} USDT acreditados)`,
                ipAddress: "blockchain_node",
                timestamp: new Date().toISOString()
              },
              ...finalActivityLogs
            ];

            finalNotifications = [
              {
                id: "not-dep-" + dep.id + "-" + Date.now(),
                userId: dep.userId,
                title: "✅ Depósito Confirmado",
                message: `Tu depósito de ${dep.cryptoAmount} ${dep.asset} ha sido completamente procesado. Se ha acreditado $${dep.amount.toFixed(2)} USDT a tu cuenta.`,
                readBy: [],
                createdAt: new Date().toISOString()
              },
              ...finalNotifications
            ];
          });
        }

        // Fluctuating Bitcoin Price (+- $15 per interval to keep the charts moving live!)
        const priceChange = (Math.random() - 0.5) * 35;
        const newBtcPrice = Math.max(80000, prev.config.btcPriceUsdt + priceChange);

        const nextState = {
          ...prev,
          users: updatedUsers,
          movements: updatedMovements,
          activityLogs: finalActivityLogs,
          notifications: finalNotifications,
          config: {
            ...prev.config,
            btcPriceUsdt: newBtcPrice
          }
        };

        if (hasChanges || Math.abs(priceChange) > 1) {
          saveDatabase(nextState);
        }
        return nextState;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Sync state wrapper
  const updateDbState = (updater: (prev: DatabaseState) => DatabaseState) => {
    setDb(prev => {
      const next = updater(prev);
      saveDatabase(next);
      return next;
    });
  };

  // 3. Security Check Utility
  const enforceSecurity = (clientId: string, actionName: string): boolean => {
    const check = checkRateLimit(clientId, 25, 30000); // 25 operations max per 30s
    if (!check.allowed) {
      setRateLimitError("Límite de solicitudes excedido. Por seguridad, intente de nuevo en unos segundos.");
      setTimeout(() => setRateLimitError(null), 4000);
      return false;
    }
    return true;
  };

  // 4. AUTH ACTIONS
  const login = async (email: string, passwordHash: string): Promise<{ success: boolean; error?: string }> => {
    if (!enforceSecurity(email, 'login')) return { success: false, error: 'Rate limit' };

    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    const { data: supabaseUser } = await supabase
  .from("users")
  .select("*")
  .eq("email", email)
  .single();
if (!user || user.passwordHash !== passwordHash) {
      // Security log for failed login attempt
      const newLog: ActivityLog = {
        id: "act-" + Date.now(),
        userId: "anonymous",
        userName: email,
        action: "FAILED_LOGIN",
        details: `Intento fallido de inicio de sesión para el correo: ${email}`,
        ipAddress: getClientIP(),
        timestamp: new Date().toISOString()
      };
      updateDbState(prev => ({
        ...prev,
        activityLogs: [newLog, ...prev.activityLogs]
      }));
      return { success: false, error: "Credenciales de acceso incorrectas." };
    }

    if (user.status === 'blocked') {
      return { success: false, error: "Esta cuenta se encuentra suspendida temporalmente." };
    }

    if (user.status === 'pending_approval') {
      return { success: false, error: "Tu cuenta está registrada pero requiere aprobación del administrador." };
    }

    // Success login
    const token = generateToken(user);
    sessionStorage.setItem('aura_auth_token', token);
    setSessionToken(token);
    setCurrentUser(user);

    // Refresh CSRF Token on authentication boundary
    setCsrfTokenState(rotateCsrfToken());

    const newLog: ActivityLog = {
      id: "act-" + Date.now(),
      userId: user.id,
      userName: user.name,
      action: "LOGIN",
      details: "Inicio de sesión exitoso",
      ipAddress: getClientIP(),
      timestamp: new Date().toISOString()
    };
    updateDbState(prev => ({
      ...prev,
      activityLogs: [newLog, ...prev.activityLogs]
    }));

    return { success: true };
  };

  const registerWithInvite = (
    name: string, 
    email: string, 
    passwordHash: string, 
    inviteCode: string
  ): { success: boolean; error?: string; status?: UserStatus } => {
    if (!enforceSecurity(email, 'register')) return { success: false, error: 'Rate limit' };

    // Check if email already registered
    const emailExists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      return { success: false, error: "Este correo electrónico ya se encuentra registrado." };
    }

    let referredByUserId: string | undefined = undefined;
    let usedInviteCode = inviteCode.trim();
    let inviteIndex = db.invitations.findIndex(inv => inv.code.toUpperCase() === usedInviteCode.toUpperCase());

    if (inviteIndex !== -1) {
      const invite = db.invitations[inviteIndex];
      if (!invite.isActive) {
        return { success: false, error: "Este código de invitación ha sido desactivado." };
      }
      if (invite.maxUses !== -1 && invite.usedCount >= invite.maxUses) {
        return { success: false, error: "Este código de invitación ha alcanzado su límite máximo de usos." };
      }
      if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
        return { success: false, error: "Este código de invitación ha expirado." };
      }
      if (invite.createdBy && invite.createdBy !== 'user-admin') {
        referredByUserId = invite.createdBy;
      }
    } else {
      // Check if inviteCode is the email or ID of an existing user
      const referrerUser = db.users.find(u => 
        u.email.toLowerCase() === usedInviteCode.toLowerCase() || 
        u.id.toLowerCase() === usedInviteCode.toLowerCase()
      );
      if (referrerUser) {
        referredByUserId = referrerUser.id;
      } else {
        return { success: false, error: "Código de invitación o correo de patrocinador inválido." };
      }
    }

    // Valid invite! Register user as PENDING_APPROVAL with 0 balance
    const newUserId = "user-" + Math.random().toString(36).substring(2, 9);
    const initialB = 0;

    const newUser: User = {
      id: newUserId,
      name,
      email,
      passwordHash,
      role: 'user',
      status: 'pending_approval', // Strict rule
      balance: initialB,
      btcBalance: 0,
      initialBalance: initialB,
      referredBy: referredByUserId,
      createdAt: new Date().toISOString()
    };
await supabase.from("users").insert({
  id: newUser.id,
  name: newUser.name,
  email: newUser.email,
  password_hash: newUser.passwordHash,
  status: newUser.status,
  balance: newUser.balance
});
    const newActivity: ActivityLog = {
      id: "act-" + Date.now(),
      userId: newUserId,
      userName: name,
      action: "REGISTER",
      details: `Registro exitoso usando código/referido (${usedInviteCode}). Cuenta en espera de aprobación.`,
      ipAddress: getClientIP(),
      timestamp: new Date().toISOString()
    };

    updateDbState(prev => {
      // Update invitation uses if it was a system invitation
      let updatedInvites = prev.invitations;
      if (inviteIndex !== -1) {
        updatedInvites = prev.invitations.map((inv, idx) => {
          if (idx === inviteIndex) {
            return { ...inv, usedCount: inv.usedCount + 1 };
          }
          return inv;
        });
      }

      return {
        ...prev,
        users: [...prev.users, newUser],
        invitations: updatedInvites,
        activityLogs: [newActivity, ...prev.activityLogs]
      };
    });

    return { success: true, status: 'pending_approval' };
  };

  const logout = () => {
    if (currentUser) {
      const newLog: ActivityLog = {
        id: "act-" + Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        action: "LOGOUT",
        details: "Cierre de sesión manual",
        ipAddress: getClientIP(),
        timestamp: new Date().toISOString()
      };
      updateDbState(prev => ({
        ...prev,
        activityLogs: [newLog, ...prev.activityLogs]
      }));
    }
    sessionStorage.removeItem('aura_auth_token');
    setSessionToken(null);
    setCurrentUser(null);
  };

  // 5. USER ACTIONS
  const purchaseRig = (rigName: string, hashrate: number, cost: number, watts: number): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: "No autenticado" };
    if (!enforceSecurity(currentUser.id, 'purchase')) return { success: false, error: 'Rate limit' };

    // Check balance
    if (currentUser.balance < cost) {
      return { success: false, error: `Saldo de USDT insuficiente. Se requieren ${cost} USDT para comprar este rig.` };
    }

    const newRig: MiningRig = {
      id: "rig-" + Math.random().toString(36).substring(2, 9),
      userId: currentUser.id,
      name: rigName,
      hashrate,
      powerConsumption: watts,
      status: 'running',
      cost,
      efficiency: 0.0000012, // BTC per day per MH/s
      purchasedAt: new Date().toISOString()
    };

    const newMovement: Movement = {
      id: "mov-" + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      type: 'withdrawal',
      amount: -cost,
      asset: 'USDT',
      description: `Compra de hardware de minería en la nube: ${rigName}`,
      timestamp: new Date().toISOString()
    };

    const newActivity: ActivityLog = {
      id: "act-" + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      action: "PURCHASE_RIG",
      details: `Adquirió el rig ${rigName} por ${cost} USDT (${hashrate} MH/s)`,
      ipAddress: getClientIP(),
      timestamp: new Date().toISOString()
    };

    updateDbState(prev => {
      // Subtract cost from user
      const updatedUsers = prev.users.map(u => {
        if (u.id === currentUser.id) {
          return { ...u, balance: u.balance - cost };
        }
        return u;
      });

      return {
        ...prev,
        users: updatedUsers,
        miningRigs: [...prev.miningRigs, newRig],
        movements: [newMovement, ...prev.movements],
        activityLogs: [newActivity, ...prev.activityLogs]
      };
    });

    return { success: true };
  };

  const toggleRigStatus = (rigId: string): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: "No autenticado" };
    if (!enforceSecurity(currentUser.id, 'toggle_rig')) return { success: false, error: 'Rate limit' };

    let currentStatus: 'running' | 'paused' = 'paused';

    updateDbState(prev => {
      const updatedRigs = prev.miningRigs.map(rig => {
        if (rig.id === rigId && rig.userId === currentUser.id) {
          currentStatus = rig.status === 'running' ? 'paused' : 'running';
          return { ...rig, status: currentStatus };
        }
        return rig;
      });

      const newActivity: ActivityLog = {
        id: "act-" + Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        action: currentStatus === 'running' ? "START_RIG" : "PAUSE_RIG",
        details: `Cambió estado de rig a ${currentStatus === 'running' ? 'Activo' : 'Pausado'}`,
        ipAddress: getClientIP(),
        timestamp: new Date().toISOString()
      };

      return {
        ...prev,
        miningRigs: updatedRigs,
        activityLogs: [newActivity, ...prev.activityLogs]
      };
    });

    return { success: true };
  };

  // Convert Mined BTC to USDT
  const convertBtcToUsdt = (btcAmount: number): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: "No autenticado" };
    if (btcAmount <= 0) return { success: false, error: "Cantidad inválida" };
    if (currentUser.btcBalance < btcAmount) {
      return { success: false, error: "Saldo de BTC insuficiente para realizar el cambio." };
    }

    const btcPrice = db.config.btcPriceUsdt;
    const usdtEarned = btcAmount * btcPrice;

    const newMovBtc: Movement = {
      id: "mov-" + Date.now() + "-1",
      userId: currentUser.id,
      userName: currentUser.name,
      type: 'withdrawal',
      amount: -btcAmount,
      asset: 'BTC',
      description: `Retiro por conversión a USDT a precio de $${btcPrice.toLocaleString()}/BTC`,
      timestamp: new Date().toISOString()
    };

    const newMovUsdt: Movement = {
      id: "mov-" + Date.now() + "-2",
      userId: currentUser.id,
      userName: currentUser.name,
      type: 'mining',
      amount: usdtEarned,
      asset: 'USDT',
      description: `Ingreso por conversión de ${btcAmount.toFixed(6)} BTC`,
      timestamp: new Date().toISOString()
    };

    const newActivity: ActivityLog = {
      id: "act-" + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      action: "CONVERT_BTC",
      details: `Intercambió ${btcAmount.toFixed(6)} BTC por $${usdtEarned.toFixed(2)} USDT`,
      ipAddress: getClientIP(),
      timestamp: new Date().toISOString()
    };

    updateDbState(prev => {
      const updatedUsers = prev.users.map(u => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            btcBalance: u.btcBalance - btcAmount,
            balance: u.balance + usdtEarned
          };
        }
        return u;
      });

      return {
        ...prev,
        users: updatedUsers,
        movements: [newMovBtc, newMovUsdt, ...prev.movements],
        activityLogs: [newActivity, ...prev.activityLogs]
      };
    });

    return { success: true };
  };

  // Create simulated crypto deposit with blockchain validation simulation
  const createCryptoDeposit = (
    asset: 'USDT' | 'BTC' | 'ETH' | 'TRX',
    cryptoAmount: number,
    network: string
  ): { success: boolean; error?: string; txId?: string; address?: string } => {
    if (!currentUser) return { success: false, error: "No autenticado" };
    if (cryptoAmount <= 0) return { success: false, error: "La cantidad debe ser mayor que cero." };
    if (!enforceSecurity(currentUser.id, 'create_deposit')) return { success: false, error: 'Rate limit' };

    // Calculate rates and USDT value
    const btcPrice = db.config.btcPriceUsdt;
    const ethPrice = 3450.00;
    const trxPrice = 0.165;
    
    let usdtValue = 0;
    if (asset === 'USDT') {
      usdtValue = cryptoAmount;
    } else if (asset === 'BTC') {
      usdtValue = cryptoAmount * btcPrice;
    } else if (asset === 'ETH') {
      usdtValue = cryptoAmount * ethPrice;
    } else if (asset === 'TRX') {
      usdtValue = cryptoAmount * trxPrice;
    }

    // Retrieve configured address set by the Administrator
    let address = "";
    const addresses = db.config.depositAddresses;

    if (asset === 'BTC') {
      address = addresses?.BTC || `bc1qauramining${Math.random().toString(36).substring(2, 10)}9372h7qws`;
    } else if (asset === 'ETH') {
      address = addresses?.ETH || `0xauramining${Math.random().toString(36).substring(2, 10)}b87a8f94`;
    } else if (asset === 'TRX') {
      address = addresses?.TRX || `Tauramining${Math.random().toString(36).substring(2, 10)}Xy891sk`;
    } else if (asset === 'USDT') {
      if (network === 'ERC20') {
        address = addresses?.USDT_ERC20 || `0xauramining${Math.random().toString(36).substring(2, 10)}b87a8f94`;
      } else {
        // TRC20 default
        address = addresses?.USDT_TRC20 || `Tauramining${Math.random().toString(36).substring(2, 10)}Xy891sk`;
      }
    } else {
      address = `Tauramining${Math.random().toString(36).substring(2, 10)}Default`;
    }

    // Generate random mock transaction hash
    const txId = `tx_` + Array.from({length: 32}, () => Math.random().toString(36)[2]).join('').substring(0, 32);

    const newDeposit: Movement = {
      id: "dep-" + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      type: 'deposit',
      amount: usdtValue,
      asset: asset,
      description: `Depósito pendiente de aprobación por el Admin (+${cryptoAmount} ${asset} en ${network})`,
      timestamp: new Date().toISOString(),
      status: 'pending',
      txId: txId,
      confirmations: 0,
      cryptoAmount: cryptoAmount,
      targetAddress: address
    };

    const newActivity: ActivityLog = {
      id: "act-" + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      action: "INITIATE_DEPOSIT",
      details: `Inició solicitud de depósito de ${cryptoAmount} ${asset} en la red ${network}. TXID: ${txId.substring(0, 10)}...`,
      ipAddress: getClientIP(),
      timestamp: new Date().toISOString()
    };

    updateDbState(prev => {
      return {
        ...prev,
        movements: [newDeposit, ...prev.movements],
        activityLogs: [newActivity, ...prev.activityLogs]
      };
    });

    return { success: true, txId, address };
  };

  // 6. ADMIN ACTIONS
  const createUserInvitation = (
    code: string, 
    maxUses: number, 
    expiresAt: string | null
  ): { success: boolean; error?: string } => {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: "No autorizado" };
    if (!enforceSecurity(currentUser.id, 'create_invite')) return { success: false, error: 'Rate limit' };

    const codeClean = code.trim().toUpperCase();
    if (!codeClean) return { success: false, error: "El código de invitación no puede estar vacío." };

    const codeExists = db.invitations.some(inv => inv.code.toUpperCase() === codeClean);
    if (codeExists) {
      return { success: false, error: "Este código de invitación ya está registrado." };
    }

    const newInvite: Invitation = {
      id: "inv-" + Math.random().toString(36).substring(2, 9),
      code: codeClean,
      maxUses,
      usedCount: 0,
      expiresAt: expiresAt || null,
      isActive: true,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString()
    };

    const audit: AuditLog = {
      id: "aud-" + Date.now(),
      adminId: currentUser.id,
      adminName: currentUser.name,
      action: "CREATE_INVITATION",
      details: `Enlace creado: ${codeClean} (Usos máx: ${maxUses === -1 ? 'Ilimitados' : maxUses}, Expiración: ${expiresAt || 'Nuncá'})`,
      timestamp: new Date().toISOString()
    };

    updateDbState(prev => ({
      ...prev,
      invitations: [newInvite, ...prev.invitations],
      auditLogs: [audit, ...prev.auditLogs]
    }));

    return { success: true };
  };

  const toggleInvitationStatus = (inviteId: string): { success: boolean; error?: string } => {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: "No autorizado" };

    let currentAction = "";
    updateDbState(prev => {
      const updated = prev.invitations.map(inv => {
        if (inv.id === inviteId) {
          const nextStatus = !inv.isActive;
          currentAction = nextStatus ? "ACTIVATED" : "DEACTIVATED";
          return { ...inv, isActive: nextStatus };
        }
        return inv;
      });

      const audit: AuditLog = {
        id: "aud-" + Date.now(),
        adminId: currentUser.id,
        adminName: currentUser.name,
        action: "TOGGLE_INVITATION",
        details: `Invitación ID: ${inviteId} cambiada a ${currentAction}`,
        timestamp: new Date().toISOString()
      };

      return {
        ...prev,
        invitations: updated,
        auditLogs: [audit, ...prev.auditLogs]
      };
    });

    return { success: true };
  };

  const approveUser = (userId: string): { success: boolean; error?: string } => {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: "No autorizado" };

    let targetName = "";
    updateDbState(prev => {
      const updated = prev.users.map(u => {
        if (u.id === userId) {
          targetName = u.name;
          return { ...u, status: 'active' as UserStatus };
        }
        return u;
      });

      const audit: AuditLog = {
        id: "aud-" + Date.now(),
        adminId: currentUser.id,
        adminName: currentUser.name,
        action: "APPROVE_USER",
        targetUserId: userId,
        targetUserName: targetName,
        details: `Usuario ${targetName} aprobado y activado.`,
        timestamp: new Date().toISOString()
      };

      // Notify User
      const notification: Notification = {
        id: "not-" + Date.now(),
        userId,
        title: "🎉 ¡Tu cuenta ha sido aprobada!",
        message: "Un administrador ha validado tu invitación. Ya puedes iniciar operaciones de minería.",
        readBy: [],
        createdAt: new Date().toISOString()
      };

      return {
        ...prev,
        users: updated,
        auditLogs: [audit, ...prev.auditLogs],
        notifications: [notification, ...prev.notifications]
      };
    });

    return { success: true };
  };

  const blockUser = (userId: string): { success: boolean; error?: string } => {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: "No autorizado" };
    if (userId === currentUser.id) return { success: false, error: "No puedes bloquearte a ti mismo." };

    let targetName = "";
    let nextStatus: UserStatus = 'blocked';

    updateDbState(prev => {
      const updated = prev.users.map(u => {
        if (u.id === userId) {
          targetName = u.name;
          nextStatus = u.status === 'blocked' ? 'active' : 'blocked';
          return { ...u, status: nextStatus };
        }
        return u;
      });

      const audit: AuditLog = {
        id: "aud-" + Date.now(),
        adminId: currentUser.id,
        adminName: currentUser.name,
        action: nextStatus === 'blocked' ? "BLOCK_USER" : "UNBLOCK_USER",
        targetUserId: userId,
        targetUserName: targetName,
        details: nextStatus === 'blocked' ? `Usuario ${targetName} suspendido.` : `Usuario ${targetName} reactivado.`,
        timestamp: new Date().toISOString()
      };

      return {
        ...prev,
        users: updated,
        auditLogs: [audit, ...prev.auditLogs]
      };
    });

    return { success: true };
  };

  const deleteUser = (userId: string): { success: boolean; error?: string } => {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: "No autorizado" };
    if (userId === currentUser.id) return { success: false, error: "No puedes eliminar tu cuenta administrativa principal." };

    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser) return { success: false, error: "Usuario no encontrado." };

    updateDbState(prev => {
      const updatedUsers = prev.users.filter(u => u.id !== userId);
      const updatedRigs = prev.miningRigs.filter(r => r.userId !== userId);

      const audit: AuditLog = {
        id: "aud-" + Date.now(),
        adminId: currentUser.id,
        adminName: currentUser.name,
        action: "DELETE_USER",
        targetUserId: userId,
        targetUserName: targetUser.name,
        details: `Usuario ${targetUser.name} y sus recursos de minería eliminados permanentemente.`,
        timestamp: new Date().toISOString()
      };

      return {
        ...prev,
        users: updatedUsers,
        miningRigs: updatedRigs,
        auditLogs: [audit, ...prev.auditLogs]
      };
    });

    return { success: true };
  };

  const modifyUserBalance = (
    userId: string, 
    usdtAmount: number, 
    btcAmount: number, 
    reason: string
  ): { success: boolean; error?: string } => {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: "No autorizado" };

    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser) return { success: false, error: "Usuario no encontrado." };

    updateDbState(prev => {
      const updatedUsers = prev.users.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            balance: Math.max(0, u.balance + usdtAmount),
            btcBalance: Math.max(0, u.btcBalance + btcAmount)
          };
        }
        return u;
      });

      // Movements
      const movements: Movement[] = [];
      if (usdtAmount !== 0) {
        movements.push({
          id: "mov-" + Date.now() + "-u",
          userId,
          userName: targetUser.name,
          type: 'admin_adjustment',
          amount: usdtAmount,
          asset: 'USDT',
          description: `Ajuste del Administrador: ${reason}`,
          timestamp: new Date().toISOString()
        });
      }
      if (btcAmount !== 0) {
        movements.push({
          id: "mov-" + Date.now() + "-b",
          userId,
          userName: targetUser.name,
          type: 'admin_adjustment',
          amount: btcAmount,
          asset: 'BTC',
          description: `Ajuste del Administrador: ${reason}`,
          timestamp: new Date().toISOString()
        });
      }

      const audit: AuditLog = {
        id: "aud-" + Date.now(),
        adminId: currentUser.id,
        adminName: currentUser.name,
        action: "ADJUST_BALANCE",
        targetUserId: userId,
        targetUserName: targetUser.name,
        details: `Modificación manual de saldo. USDT: ${usdtAmount >= 0 ? '+' : ''}${usdtAmount}, BTC: ${btcAmount >= 0 ? '+' : ''}${btcAmount}. Motivo: ${reason}`,
        timestamp: new Date().toISOString()
      };

      // Notify user
      const notification: Notification = {
        id: "not-" + Date.now(),
        userId,
        title: "💵 Ajuste de Balance Realizado",
        message: `Se ha realizado un ajuste en tus saldos por el administrador: ${reason}`,
        readBy: [],
        createdAt: new Date().toISOString()
      };

      return {
        ...prev,
        users: updatedUsers,
        movements: [...movements, ...prev.movements],
        auditLogs: [audit, ...prev.auditLogs],
        notifications: [notification, ...prev.notifications]
      };
    });

    return { success: true };
  };

  const publishAnnouncement = (title: string, content: string): { success: boolean; error?: string } => {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: "No autorizado" };

    const newAnn = {
      id: "ann-" + Date.now(),
      title,
      content,
      createdAt: new Date().toISOString()
    };

    const audit: AuditLog = {
      id: "aud-" + Date.now(),
      adminId: currentUser.id,
      adminName: currentUser.name,
      action: "PUBLISH_ANNOUNCEMENT",
      details: `Anuncio publicado: "${title}"`,
      timestamp: new Date().toISOString()
    };

    // Send instant global notification
    const notification: Notification = {
      id: "not-" + Date.now(),
      userId: 'all',
      title: `📣 Nuevo Anuncio: ${title}`,
      message: content,
      readBy: [],
      createdAt: new Date().toISOString()
    };

    updateDbState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        announcements: [newAnn, ...prev.config.announcements]
      },
      auditLogs: [audit, ...prev.auditLogs],
      notifications: [notification, ...prev.notifications]
    }));

    return { success: true };
  };

  const updateDepositAddresses = (addresses: {
    USDT_TRC20: string;
    USDT_ERC20: string;
    BTC: string;
    ETH: string;
    TRX: string;
  }): { success: boolean; error?: string } => {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: "No autorizado" };
    if (!enforceSecurity(currentUser.id, 'update_deposit_addresses')) return { success: false, error: 'Rate limit' };

    const audit: AuditLog = {
      id: "aud-" + Date.now(),
      adminId: currentUser.id,
      adminName: currentUser.name,
      action: "UPDATE_DEPOSIT_ADDRESSES",
      details: `Direcciones de depósito actualizadas: USDT TRC20: ${addresses.USDT_TRC20}, USDT ERC20: ${addresses.USDT_ERC20}, BTC: ${addresses.BTC}, ETH: ${addresses.ETH}, TRX: ${addresses.TRX}`,
      timestamp: new Date().toISOString()
    };

    updateDbState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        depositAddresses: {
          ...prev.config.depositAddresses,
          ...addresses
        }
      },
      auditLogs: [audit, ...prev.auditLogs]
    }));

    return { success: true };
  };

  // Transfer USDT Balance to another user within the platform
  const transferBalance = (
    recipientEmail: string,
    amount: number
  ): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: "No autenticado" };
    if (currentUser.status !== 'active') return { success: false, error: "Tu cuenta no está activa para realizar transferencias." };
    
    const cleanEmail = recipientEmail.trim().toLowerCase();
    if (!cleanEmail) return { success: false, error: "Por favor ingrese el correo electrónico del destinatario." };
    if (cleanEmail === currentUser.email.toLowerCase()) {
      return { success: false, error: "No puedes transferirte saldo a ti mismo." };
    }

    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: "Por favor ingrese un monto válido mayor a 0." };
    }

    if (currentUser.balance < amount) {
      return { success: false, error: "Saldo insuficiente para realizar la transferencia." };
    }

    if (!enforceSecurity(currentUser.id, 'transfer_balance')) {
      return { success: false, error: 'Has superado el límite de intentos. Por favor espera unos momentos.' };
    }

    // Find recipient user
    const recipient = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!recipient) {
      return { success: false, error: "No se encontró ningún usuario con ese correo electrónico registrado." };
    }

    if (recipient.status === 'blocked') {
      return { success: false, error: "El usuario destinatario se encuentra bloqueado." };
    }

    const timestamp = new Date().toISOString();

    // 1. Movement for Sender (negative amount)
    const senderMovement: Movement = {
      id: "mov-" + Date.now() + "-sender",
      userId: currentUser.id,
      userName: currentUser.name,
      type: 'transfer_sent',
      amount: -amount,
      asset: 'USDT',
      description: `Transferencia enviada a ${recipient.name} (${recipient.email})`,
      timestamp,
      status: 'completed'
    };

    // 2. Movement for Recipient (positive amount)
    const recipientMovement: Movement = {
      id: "mov-" + Date.now() + "-recipient",
      userId: recipient.id,
      userName: recipient.name,
      type: 'transfer_received',
      amount: amount,
      asset: 'USDT',
      description: `Transferencia recibida de ${currentUser.name} (${currentUser.email})`,
      timestamp,
      status: 'completed'
    };

    // 3. Sender Notification
    const senderNotif: Notification = {
      id: "notif-" + Math.random().toString(36).substring(2, 9),
      userId: currentUser.id,
      title: "Transferencia enviada correctamente",
      message: `Has transferido con éxito $${amount.toFixed(2)} USDT a ${recipient.name} (${recipient.email}).`,
      readBy: [],
      createdAt: timestamp
    };

    // 4. Recipient Notification
    const recipientNotif: Notification = {
      id: "notif-" + Math.random().toString(36).substring(2, 9),
      userId: recipient.id,
      title: "Transferencia recibida",
      message: `¡Has recibido una transferencia de $${amount.toFixed(2)} USDT de parte de ${currentUser.name}!`,
      readBy: [],
      createdAt: timestamp
    };

    // 5. Activity Log
    const activityLog: ActivityLog = {
      id: "act-" + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      action: "TRANSFER_BALANCE",
      details: `Transfirió $${amount.toFixed(2)} USDT a ${recipient.name} (${recipient.email})`,
      ipAddress: getClientIP(),
      timestamp
    };

    updateDbState(prev => {
      const updatedUsers = prev.users.map(u => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            balance: u.balance - amount
          };
        }
        if (u.id === recipient.id) {
          return {
            ...u,
            balance: u.balance + amount
          };
        }
        return u;
      });

      return {
        ...prev,
        users: updatedUsers,
        movements: [senderMovement, recipientMovement, ...prev.movements],
        notifications: [senderNotif, recipientNotif, ...prev.notifications],
        activityLogs: [activityLog, ...prev.activityLogs]
      };
    });

    return { success: true };
  };

  // Request a formal withdrawal to an external address, awaiting admin approval
  const requestWithdrawal = (
    asset: 'USDT' | 'BTC',
    amount: number,
    network: string,
    targetAddress: string
  ): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: "No autenticado" };
    if (currentUser.status !== 'active') return { success: false, error: "Tu cuenta no está activa para realizar retiros." };

    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: "Por favor ingrese un monto válido mayor a 0." };
    }

    if (!targetAddress.trim()) {
      return { success: false, error: "La dirección de retiro es obligatoria." };
    }

    if (asset === 'USDT') {
      if (currentUser.balance < amount) {
        return { success: false, error: "Saldo de USDT insuficiente." };
      }
    } else if (asset === 'BTC') {
      if (currentUser.btcBalance < amount) {
        return { success: false, error: "Saldo de BTC insuficiente." };
      }
    } else {
      return { success: false, error: "Activo no soportado para retiro." };
    }

    if (!enforceSecurity(currentUser.id, 'request_withdrawal')) {
      return { success: false, error: 'Has superado el límite de intentos. Por favor espera unos momentos.' };
    }

    const timestamp = new Date().toISOString();
    const id = "withdrawal-" + Date.now();

    const withdrawalMovement: Movement = {
      id,
      userId: currentUser.id,
      userName: currentUser.name,
      type: 'withdrawal',
      amount: -amount,
      asset,
      description: `Retiro solicitado de ${amount} ${asset} por red ${network} a la dirección: ${targetAddress}`,
      timestamp,
      status: 'pending',
      targetAddress,
    };

    const activityLog: ActivityLog = {
      id: "act-" + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      action: "REQUEST_WITHDRAWAL",
      details: `Solicitó retiro formal de ${amount} ${asset} a la dirección ${targetAddress}`,
      ipAddress: getClientIP(),
      timestamp
    };

    updateDbState(prev => {
      const updatedUsers = prev.users.map(u => {
        if (u.id === currentUser.id) {
          if (asset === 'USDT') {
            return { ...u, balance: u.balance - amount };
          } else {
            return { ...u, btcBalance: u.btcBalance - amount };
          }
        }
        return u;
      });

      return {
        ...prev,
        users: updatedUsers,
        movements: [withdrawalMovement, ...prev.movements],
        activityLogs: [activityLog, ...prev.activityLogs]
      };
    });

    return { success: true };
  };

  // Approve a pending withdrawal request (Admin Only)
  const approveWithdrawal = (
    withdrawalId: string,
    txId: string
  ): { success: boolean; error?: string } => {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: "No autorizado" };

    const movement = db.movements.find(m => m.id === withdrawalId && m.type === 'withdrawal' && m.status === 'pending');
    if (!movement) return { success: false, error: "No se encontró la solicitud de retiro pendiente." };

    const cleanTxId = txId.trim();
    if (!cleanTxId) return { success: false, error: "Se requiere un ID de transacción (TxID) para aprobar el retiro." };

    const timestamp = new Date().toISOString();

    const audit: AuditLog = {
      id: "aud-" + Date.now(),
      adminId: currentUser.id,
      adminName: currentUser.name,
      action: "APPROVE_WITHDRAWAL",
      targetUserId: movement.userId,
      targetUserName: movement.userName,
      details: `Aprobó el retiro ${withdrawalId} de ${Math.abs(movement.amount)} ${movement.asset}. TxID: ${cleanTxId}`,
      timestamp
    };

    const userNotif: Notification = {
      id: "notif-" + Math.random().toString(36).substring(2, 9),
      userId: movement.userId,
      title: "✅ Retiro Aprobado",
      message: `Tu solicitud de retiro por ${Math.abs(movement.amount)} ${movement.asset} ha sido aprobada por el administrador. TxID: ${cleanTxId}`,
      readBy: [],
      createdAt: timestamp
    };

    updateDbState(prev => {
      const updatedMovements = prev.movements.map(m => {
        if (m.id === withdrawalId) {
          return {
            ...m,
            status: 'completed' as const,
            txId: cleanTxId,
            timestamp
          };
        }
        return m;
      });

      return {
        ...prev,
        movements: updatedMovements,
        auditLogs: [audit, ...prev.auditLogs],
        notifications: [userNotif, ...prev.notifications]
      };
    });

    return { success: true };
  };

  // Reject a pending withdrawal request (Admin Only)
  const rejectWithdrawal = (
    withdrawalId: string,
    reason: string
  ): { success: boolean; error?: string } => {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: "No autorizado" };

    const movement = db.movements.find(m => m.id === withdrawalId && m.type === 'withdrawal' && m.status === 'pending');
    if (!movement) return { success: false, error: "No se encontró la solicitud de retiro pendiente." };

    const cleanReason = reason.trim() || "Rechazado por el administrador";
    const timestamp = new Date().toISOString();

    const audit: AuditLog = {
      id: "aud-" + Date.now(),
      adminId: currentUser.id,
      adminName: currentUser.name,
      action: "REJECT_WITHDRAWAL",
      targetUserId: movement.userId,
      targetUserName: movement.userName,
      details: `Rechazó el retiro ${withdrawalId} de ${Math.abs(movement.amount)} ${movement.asset}. Razón: ${cleanReason}`,
      timestamp
    };

    const userNotif: Notification = {
      id: "notif-" + Math.random().toString(36).substring(2, 9),
      userId: movement.userId,
      title: "❌ Retiro Rechazado",
      message: `Tu solicitud de retiro por ${Math.abs(movement.amount)} ${movement.asset} ha sido rechazada. Razón: ${cleanReason}. Los fondos han sido devueltos a tu balance.`,
      readBy: [],
      createdAt: timestamp
    };

    updateDbState(prev => {
      const updatedMovements = prev.movements.map(m => {
        if (m.id === withdrawalId) {
          return {
            ...m,
            status: 'failed' as const,
            description: `${m.description} - RECHAZADO: ${cleanReason}`,
            timestamp
          };
        }
        return m;
      });

      const updatedUsers = prev.users.map(u => {
        if (u.id === movement.userId) {
          if (movement.asset === 'USDT') {
            return {
              ...u,
              balance: u.balance + Math.abs(movement.amount)
            };
          } else {
            return {
              ...u,
              btcBalance: u.btcBalance + Math.abs(movement.amount)
            };
          }
        }
        return u;
      });

      return {
        ...prev,
        users: updatedUsers,
        movements: updatedMovements,
        auditLogs: [audit, ...prev.auditLogs],
        notifications: [userNotif, ...prev.notifications]
      };
    });

    return { success: true };
  };

  // Approve a pending deposit request (Admin Only) with 7% referral commission
  const approveDeposit = (
    depositId: string
  ): { success: boolean; error?: string } => {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: "No autorizado" };

    const movement = db.movements.find(m => m.id === depositId && m.type === 'deposit' && m.status === 'pending');
    if (!movement) return { success: false, error: "No se encontró la solicitud de depósito pendiente." };

    const timestamp = new Date().toISOString();

    const audit: AuditLog = {
      id: "aud-" + Date.now(),
      adminId: currentUser.id,
      adminName: currentUser.name,
      action: "APPROVE_DEPOSIT",
      targetUserId: movement.userId,
      targetUserName: movement.userName,
      details: `Aprobó el depósito ${depositId} de ${movement.cryptoAmount} ${movement.asset} ($${movement.amount.toFixed(2)} USDT)`,
      timestamp
    };

    const userNotif: Notification = {
      id: "notif-" + Math.random().toString(36).substring(2, 9),
      userId: movement.userId,
      title: "✅ Depósito Aprobado",
      message: `Tu solicitud de depósito por ${movement.cryptoAmount} ${movement.asset} ($${movement.amount.toFixed(2)} USDT) ha sido aprobada por el administrador y acreditada en tu balance.`,
      readBy: [],
      createdAt: timestamp
    };

    updateDbState(prev => {
      const depositor = prev.users.find(u => u.id === movement.userId);
      let updatedUsers = prev.users.map(u => {
        if (u.id === movement.userId) {
          if (movement.asset === 'BTC') {
            return {
              ...u,
              btcBalance: u.btcBalance + (movement.cryptoAmount || 0)
            };
          } else {
            return {
              ...u,
              balance: u.balance + movement.amount
            };
          }
        }
        return u;
      });

      let referralMovement: Movement | null = null;
      let referralNotif: Notification | null = null;

      if (depositor && depositor.referredBy) {
        const referrerId = depositor.referredBy;
        const referrer = prev.users.find(u => u.id === referrerId);
        if (referrer) {
          const commissionAmount = movement.amount * 0.07;
          if (commissionAmount > 0) {
            updatedUsers = updatedUsers.map(u => {
              if (u.id === referrerId) {
                return {
                  ...u,
                  balance: u.balance + commissionAmount
                };
              }
              return u;
            });

            referralMovement = {
              id: "mov-" + Date.now() + "-ref",
              userId: referrerId,
              userName: referrer.name,
              type: 'admin_adjustment',
              amount: commissionAmount,
              asset: 'USDT',
              description: `Comisión de referido (7%) del depósito de ${depositor.name}`,
              timestamp: new Date().toISOString()
            };

            referralNotif = {
              id: "notif-ref-" + Math.random().toString(36).substring(2, 9),
              userId: referrerId,
              title: "🎉 Comisión de Referido Acreditada",
              message: `Has recibido una comisión de ${commissionAmount.toFixed(2)} USDT (7%) por el depósito aprobado de tu referido ${depositor.name}.`,
              readBy: [],
              createdAt: timestamp
            };
          }
        }
      }

      const updatedMovements = prev.movements.map(m => {
        if (m.id === depositId) {
          return {
            ...m,
            status: 'completed' as const,
            description: `Depósito acreditado de ${m.cryptoAmount} ${m.asset}`,
            timestamp
          };
        }
        return m;
      });

      const nextMovements = referralMovement 
        ? [referralMovement, ...updatedMovements] 
        : updatedMovements;

      const nextNotifications = referralNotif 
        ? [referralNotif, userNotif, ...prev.notifications] 
        : [userNotif, ...prev.notifications];

      return {
        ...prev,
        users: updatedUsers,
        movements: nextMovements,
        auditLogs: [audit, ...prev.auditLogs],
        notifications: nextNotifications
      };
    });

    return { success: true };
  };

  // Reject a pending deposit request (Admin Only)
  const rejectDeposit = (
    depositId: string,
    reason: string
  ): { success: boolean; error?: string } => {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: "No autorizado" };

    const movement = db.movements.find(m => m.id === depositId && m.type === 'deposit' && m.status === 'pending');
    if (!movement) return { success: false, error: "No se encontró la solicitud de depósito pendiente." };

    const cleanReason = reason.trim() || "Rechazado por el administrador";
    const timestamp = new Date().toISOString();

    const audit: AuditLog = {
      id: "aud-" + Date.now(),
      adminId: currentUser.id,
      adminName: currentUser.name,
      action: "REJECT_DEPOSIT",
      targetUserId: movement.userId,
      targetUserName: movement.userName,
      details: `Rechazó el depósito ${depositId} de ${movement.cryptoAmount} ${movement.asset}. Razón: ${cleanReason}`,
      timestamp
    };

    const userNotif: Notification = {
      id: "notif-" + Math.random().toString(36).substring(2, 9),
      userId: movement.userId,
      title: "❌ Depósito Rechazado",
      message: `Tu solicitud de depósito por ${movement.cryptoAmount} ${movement.asset} ha sido rechazada por el administrador. Razón: ${cleanReason}`,
      readBy: [],
      createdAt: timestamp
    };

    updateDbState(prev => {
      const updatedMovements = prev.movements.map(m => {
        if (m.id === depositId) {
          return {
            ...m,
            status: 'failed' as const,
            description: `Depósito RECHAZADO: ${cleanReason}`,
            timestamp
          };
        }
        return m;
      });

      return {
        ...prev,
        movements: updatedMovements,
        auditLogs: [audit, ...prev.auditLogs],
        notifications: [userNotif, ...prev.notifications]
      };
    });

    return { success: true };
  };

  // Mark notification as read
  const readNotification = (notifId: string) => {
    if (!currentUser) return;
    updateDbState(prev => {
      const updated = prev.notifications.map(notif => {
        if (notif.id === notifId) {
          if (!notif.readBy.includes(currentUser.id)) {
            return { ...notif, readBy: [...notif.readBy, currentUser.id] };
          }
        }
        return notif;
      });
      return { ...prev, notifications: updated };
    });
  };

  // Sandbox Quick login feature (crucial for developers reviewing this applet)
  const sandboxLogin = (role: 'admin' | 'user') => {
    const targetEmail = role === 'admin' ? "admin@auramining.com" : "carlos@gmail.com";
    const user = db.users.find(u => u.email === targetEmail);
    if (user) {
      const token = generateToken(user);
      sessionStorage.setItem('aura_auth_token', token);
      setSessionToken(token);
      setCurrentUser(user);
      setCsrfTokenState(rotateCsrfToken());

      const newLog: ActivityLog = {
        id: "act-" + Date.now(),
        userId: user.id,
        userName: user.name,
        action: "SANDBOX_LOGIN",
        details: `Inicio de sesión rápido en Sandbox (${role.toUpperCase()})`,
        ipAddress: "127.0.0.1",
        timestamp: new Date().toISOString()
      };
      updateDbState(prev => ({
        ...prev,
        activityLogs: [newLog, ...prev.activityLogs]
      }));
    }
  };

  const forceReset = () => {
    const refreshed = resetDatabaseToDefault();
    setDb(refreshed);
    sessionStorage.removeItem('aura_auth_token');
    setSessionToken(null);
    setCurrentUser(null);
  };

  return {
    db,
    currentUser,
    csrfToken,
    rateLimitError,
    login,
    registerWithInvite,
    logout,
    purchaseRig,
    toggleRigStatus,
    convertBtcToUsdt,
    createCryptoDeposit,
    createUserInvitation,
    toggleInvitationStatus,
    approveUser,
    blockUser,
    deleteUser,
    modifyUserBalance,
    publishAnnouncement,
    updateDepositAddresses,
    transferBalance,
    requestWithdrawal,
    approveWithdrawal,
    rejectWithdrawal,
    approveDeposit,
    rejectDeposit,
    readNotification,
    sandboxLogin,
    forceReset
  };
}
