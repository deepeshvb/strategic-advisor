import { useState } from 'react';
import { Smartphone, Lock, LogIn } from 'lucide-react';
import { authService } from '../services/authService';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.sendVerificationCode(phoneNumber);
      if (result.success) {
        setStep('code');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.login(phoneNumber, verificationCode);
      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-primary-600 rounded-full mb-4">
            <Lock className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Strategic Advisor</h1>
          <p className="text-gray-400">Secure Access Required</p>
        </div>

        {/* Login Form */}
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 shadow-xl">
          {step === 'phone' ? (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (234) 567-8900"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Enter your authorized mobile number
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !phoneNumber}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-5 h-5" />
                    <span>Send Verification Code</span>
                  </>
                )}
              </button>

              <p className="text-xs text-center text-gray-500">
                A 6-digit verification code will be sent to your phone
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter the 6-digit code sent to {authService.formatPhoneNumber(phoneNumber)}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Login</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setVerificationCode('');
                    setError('');
                  }}
                  className="w-full text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Use different number
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-500">
          Contact your administrator if you need access
        </p>
      </div>
    </div>
  );
}
