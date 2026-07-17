/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
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
  getSimulatedIP, 
  rotateCsrfToken, 
  getCsrfToken 
} from './security';

export function useMining() {
  const [db, setDb] = useState<DatabaseState>(loadDatabase);
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

        // 2b. Crypto Deposits blockchain confirmation simulation
        let completedDeposits: Movement[] = [];
        const updatedMovements = prev.movements.map(mov => {
          if (mov.type === 'deposit' && mov.status === 'confirming') {
            hasChanges = true;
            const currentConf = mov.confirmations ?? 0;
            const nextConf = currentConf + 1;
            if (nextConf >= 3) {
              const completedMov: Movement = {
                ...mov,
                confirmations: 3,
                status: 'completed',
                description: `Depósito acreditado de ${mov.cryptoAmount} ${mov.asset}`
              };
              completedDeposits.push(completedMov);
              return completedMov;
            } else {
              return {
                ...mov,
                confirmations: nextConf
              };
            }
          }
          return mov;
        });

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
  const login = (email: string, passwordHash: string): { success: boolean; error?: string } => {
    if (!enforceSecurity(email, 'login')) return { success: false, error: 'Rate limit' };

    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.passwordHash !== passwordHash) {
      // Security log for failed login attempt
      const newLog: ActivityLog = {
        id: "act-" + Date.now(),
        userId: "anonymous",
        userName: email,
        action: "FAILED_LOGIN",
        details: `Intento fallido de inicio de sesión para el correo: ${email}`,
        ipAddress: getSimulatedIP(),
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
      ipAddress: getSimulatedIP(),
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

    // Find Invite Code
    const inviteIndex = db.invitations.findIndex(inv => inv.code.toUpperCase() === inviteCode.trim().toUpperCase());
    if (inviteIndex === -1) {
      return { success: false, error: "Código de invitación inválido o inexistente." };
    }

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

    // Check if email already registered
    const emailExists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      return { success: false, error: "Este correo electrónico ya se encuentra registrado." };
    }

    // Valid invite! Register user as PENDING_APPROVAL
    const newUserId = "user-" + Math.random().toString(36).substring(2, 9);
    const initialB = 500.00; // Sign-up gift balance in USDT

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
      createdAt: new Date().toISOString()
    };

    // Prepare Movement and Log
    const newMovement: Movement = {
      id: "mov-" + Date.now(),
      userId: newUserId,
      userName: name,
      type: 'signup_bonus',
      amount: initialB,
      asset: 'USDT',
      description: `Bono promocional de registro con código: ${invite.code}`,
      timestamp: new Date().toISOString()
    };

    const newActivity: ActivityLog = {
      id: "act-" + Date.now(),
      userId: newUserId,
      userName: name,
      action: "REGISTER",
      details: `Registro exitoso usando invitación (${invite.code}). Cuenta en espera de aprobación.`,
      ipAddress: getSimulatedIP(),
      timestamp: new Date().toISOString()
    };

    updateDbState(prev => {
      // Update invitation uses
      const updatedInvites = prev.invitations.map((inv, idx) => {
        if (idx === inviteIndex) {
          return { ...inv, usedCount: inv.usedCount + 1 };
        }
        return inv;
      });

      return {
        ...prev,
        users: [...prev.users, newUser],
        invitations: updatedInvites,
        movements: [newMovement, ...prev.movements],
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
        ipAddress: getSimulatedIP(),
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
      ipAddress: getSimulatedIP(),
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
        ipAddress: getSimulatedIP(),
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
      ipAddress: getSimulatedIP(),
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
      description: `Depósito en espera (+${cryptoAmount} ${asset} en ${network})`,
      timestamp: new Date().toISOString(),
      status: 'confirming',
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
      ipAddress: getSimulatedIP(),
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
    readNotification,
    sandboxLogin,
    forceReset
  };
}
