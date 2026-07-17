/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, User, Cpu, KeyRound, AlertTriangle, Sparkles, ArrowRight, RefreshCw, Info } from 'lucide-react';
import { UserStatus } from '../utils/db';
import AuraLogo from './AuraLogo';

interface AuthScreenProps {
  login: (email: string, passwordHash: string) => { success: boolean; error?: string };
  registerWithInvite: (name: string, email: string, passwordHash: string, inviteCode: string) => { success: boolean; error?: string; status?: UserStatus };
  sandboxLogin: (role: 'admin' | 'user') => void;
  forceReset: () => void;
}

export default function AuthScreen({ login, registerWithInvite, sandboxLogin, forceReset }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [showCredentialsInfo, setShowCredentialsInfo] = useState<boolean>(true);

  // Form states
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string>('');

  // UI States
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    setTimeout(() => {
      if (isRegister) {
        if (!name || !email || !password || !inviteCode) {
          setError("Por favor, rellene todos los campos requeridos.");
          setLoading(false);
          return;
        }
        const result = registerWithInvite(name, email, password, inviteCode);
        if (result.success) {
          setSuccessMsg("¡Registro enviado con éxito! Tu cuenta está en estado 'Pendiente de aprobación'. Un administrador deberá aprobarla antes de poder iniciar sesión.");
          // Clear registration inputs
          setName('');
          setEmail('');
          setPassword('');
          setInviteCode('');
          setIsRegister(false);
        } else {
          setError(result.error || "Ocurrió un error inesperado al procesar el registro.");
        }
      } else {
        if (!email || !password) {
          setError("El correo y la contraseña son obligatorios.");
          setLoading(false);
          return;
        }
        const result = login(email, password);
        if (!result.success) {
          setError(result.error || "Error de inicio de sesión.");
        }
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 flex flex-col justify-between items-center relative overflow-hidden p-4 font-sans selection:bg-red-500/30">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-red-800/10 blur-[120px] pointer-events-none" />
      
      {/* Outer Border Frame */}
      <div className="absolute inset-0 border border-red-500/5 pointer-events-none m-2 rounded-2xl" />

      {/* Header Branding */}
      <div className="w-full max-w-md mx-auto pt-4 pb-2 text-center z-10 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-red-950/30 border border-red-500/20 backdrop-blur-md mb-4 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
          <Cpu className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="text-xs uppercase font-semibold tracking-widest text-red-400">Enterprise Cloud Mining v2.0</span>
        </div>
        
        {/* Styled Logo Component */}
        <AuraLogo size={160} showText={true} className="mb-2" />
        
        <p className="text-zinc-400 text-xs mt-2 max-w-sm mx-auto">
          Plataforma de procesamiento de hash rate descentralizada y segura.
        </p>
      </div>

      {/* Auth Card Container */}
      <div className="w-full max-w-md mx-auto z-10 my-4">
        <div className="bg-zinc-950/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-[2xl] relative group shadow-red-950/10">
          {/* Subtle top laser border */}
          <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

          <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-red-500" />
            {isRegister ? 'Registro de Cuenta' : 'Acceso Autorizado'}
          </h2>
          <p className="text-xs text-zinc-400 mb-6">
            {isRegister 
              ? 'Complete el formulario utilizando un enlace o código de invitación activo.' 
              : 'Ingrese sus credenciales de seguridad para firmar el token de sesión.'}
          </p>

          {/* Form Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-500/20 text-red-200 text-xs rounded-lg flex items-start gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-zinc-900/80 border border-red-500/30 text-zinc-200 text-xs rounded-lg flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Core Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 block">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4.5 h-4.5 text-zinc-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g. Carlos Mendoza"
                    required
                    className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-500/60 focus:outline-none rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 block">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4.5 h-4.5 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-500/60 focus:outline-none rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 block">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4.5 h-4.5 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-500/60 focus:outline-none rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 transition-all"
                />
              </div>
            </div>

            {isRegister && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 block">Invitación o Patrocinador</label>
                  <span className="text-[10px] text-red-500 font-semibold">* Requerido</span>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 w-4.5 h-4.5 text-zinc-500" />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Código o Email de quien te invitó"
                    required
                    className="w-full bg-zinc-900/60 border border-red-500/20 focus:border-red-500 focus:outline-none rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-650 transition-all text-ellipsis"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-semibold text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.35)] mt-6"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Solicitar Registro' : 'Firmar Acceso con JWT'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Card Toggle Links */}
          <div className="mt-6 pt-5 border-t border-zinc-900 flex justify-between items-center text-xs">
            <span className="text-zinc-500">
              {isRegister ? '¿Ya tiene una cuenta?' : '¿No tiene invitación?'}
            </span>
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-red-400 hover:text-red-300 font-semibold cursor-pointer underline transition-colors"
            >
              {isRegister ? 'Iniciar Sesión' : 'Registrarse con Código'}
            </button>
          </div>
        </div>
      </div>

      

      {/* Footer credits */}
      <div className="w-full text-center py-4 border-t border-zinc-950 text-zinc-600 text-[10px] z-10">
        &copy; 2026 AURA Mining Corp. Conexión SSL de 256 bits certificada. Algoritmo criptográfico SHA-255.
      </div>
    </div>
  );
}
