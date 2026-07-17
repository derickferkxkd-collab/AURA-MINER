/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMining } from './utils/useMining';
import AuthScreen from './components/AuthScreen';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';
import { AlertTriangle } from 'lucide-react';

export default function App() {
  const {
    db,
    currentUser,
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
  } = useMining();

  return (
    <div className="relative min-h-screen bg-[#07070a]">
      {/* Absolute Security Warning Banner for simulated rate limiting */}
      {rateLimitError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-bounce">
          <div className="bg-red-950 border border-red-500 text-red-200 text-xs font-bold p-3 rounded-xl shadow-2xl shadow-red-950/50 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{rateLimitError}</span>
          </div>
        </div>
      )}

      {/* Main Core View Routing */}
      {!currentUser ? (
        <AuthScreen 
          login={login}
          registerWithInvite={registerWithInvite}
          sandboxLogin={sandboxLogin}
          forceReset={forceReset}
        />
      ) : currentUser.role === 'admin' ? (
        <AdminPanel 
          currentUser={currentUser}
          db={db}
          createUserInvitation={createUserInvitation}
          toggleInvitationStatus={toggleInvitationStatus}
          approveUser={approveUser}
          blockUser={blockUser}
          deleteUser={deleteUser}
          modifyUserBalance={modifyUserBalance}
          publishAnnouncement={publishAnnouncement}
          updateDepositAddresses={updateDepositAddresses}
          approveWithdrawal={approveWithdrawal}
          rejectWithdrawal={rejectWithdrawal}
          approveDeposit={approveDeposit}
          rejectDeposit={rejectDeposit}
          logout={logout}
        />
      ) : (
        <UserDashboard 
          currentUser={currentUser}
          db={db}
          purchaseRig={purchaseRig}
          toggleRigStatus={toggleRigStatus}
          convertBtcToUsdt={convertBtcToUsdt}
          createCryptoDeposit={createCryptoDeposit}
          transferBalance={transferBalance}
          requestWithdrawal={requestWithdrawal}
          readNotification={readNotification}
          logout={logout}
        />
      )}
    </div>
  );
}
