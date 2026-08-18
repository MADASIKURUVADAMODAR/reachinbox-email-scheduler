import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, ShieldCheck, Zap, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';

export const LoginView: React.FC = () => {
  const { loginWithGoogleToken, loginWithCustomUser } = useAuth();
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleDemoLogin = () => {
    loginWithCustomUser({
      id: 'demo-user-123',
      name: 'Alex Rivera',
      email: 'alex.rivera@reachinbox.ai',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Dynamic Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/25 ring-1 ring-white/20 mb-2">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            ReachInbox
          </h1>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            High-performance asynchronous email scheduling engine powered by BullMQ & Redis.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="space-y-1 text-center">
            <h2 className="text-xl font-bold text-slate-100">Welcome back</h2>
            <p className="text-xs text-slate-400">Sign in with your Google account to access dashboard</p>
          </div>

          {/* Real Google OAuth Login */}
          <div className="flex flex-col items-center justify-center space-y-3 pt-2">
            <div className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  setGoogleError(null);
                  if (credentialResponse.credential) {
                    loginWithGoogleToken(credentialResponse.credential);
                  }
                }}
                onError={() => {
                  setGoogleError('Google Sign In failed or was cancelled. Try again or use Demo Sign-in below.');
                }}
                useOneTap
                theme="filled_blue"
                shape="pill"
                size="large"
                text="signin_with"
                width="320"
              />
            </div>

            {googleError && (
              <p className="text-xs text-rose-400 text-center font-medium bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                {googleError}
              </p>
            )}
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">
              or instant evaluation
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Quick Demo Sign In */}
          <Button
            variant="secondary"
            className="w-full justify-center py-3 bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-200"
            leftIcon={<UserCheck className="w-4 h-4 text-blue-400" />}
            rightIcon={<ArrowRight className="w-4 h-4 text-slate-400" />}
            onClick={handleDemoLogin}
          >
            Continue as Evaluator (Demo Account)
          </Button>

          {/* Features Highlights */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>BullMQ Queue</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Hourly Rate Limiting</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400">
          ReachInbox Assignment &bull; Real OAuth & Persistent Sessions Enabled
        </p>
      </div>
    </div>
  );
};
