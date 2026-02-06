import { useState } from 'react';
import { Shield, Smartphone, CheckCircle } from 'lucide-react';
import { authService } from '../services/authService';

interface SetupWizardProps {
  onComplete: () => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [adminPhone, setAdminPhone] = useState('');
  const [adminName, setAdminName] = useState('');
  const [error, setError] = useState('');

  const handleSetup = () => {
    setError('');

    if (!adminPhone || !adminName) {
      setError('Please fill in all fields');
      return;
    }

    try {
      authService.initializeWithAdmin(adminPhone, adminName);
      // Auto-login as admin
      authService.login(adminPhone);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-primary-600 rounded-full mb-4">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to Strategic Advisor
          </h1>
          <p className="text-gray-400">Let's set up your secure access</p>
        </div>

        {/* Setup Steps */}
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 shadow-xl">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Step 1: Configure Administrator
                </h2>
                <p className="text-gray-400">
                  Set up the first admin account. This number will have full access to manage all settings and users.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Admin Mobile Number
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      placeholder="+1 (234) 567-8900"
                      className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    This will be your login phone number
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Admin Name
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!adminPhone || !adminName}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Step 2: Confirm Setup
                </h2>
                <p className="text-gray-400">
                  Review your administrator account details
                </p>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Phone Number</p>
                  <p className="text-white font-medium">{authService.formatPhoneNumber(adminPhone)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Name</p>
                  <p className="text-white font-medium">{adminName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Role</p>
                  <p className="text-white font-medium">👑 Administrator (Full Access)</p>
                </div>
              </div>

              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  ℹ️ <strong>Important:</strong> You can add more users later in Settings → User Management
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSetup}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Complete Setup
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="inline-block p-4 bg-green-600 rounded-full">
                <CheckCircle className="w-16 h-16 text-white" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Setup Complete!
                </h2>
                <p className="text-gray-400">
                  Your Strategic Advisor is now ready to use
                </p>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-2 text-left">
                <p className="text-sm text-gray-400">✅ Admin account created</p>
                <p className="text-sm text-gray-400">✅ Access control enabled</p>
                <p className="text-sm text-gray-400">✅ Logged in as {authService.formatPhoneNumber(adminPhone)}</p>
              </div>

              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  💡 <strong>Next steps:</strong><br/>
                  • Configure your companies (Settings → Companies)<br/>
                  • Set up integrations (Settings → Integrations)<br/>
                  • Add more users (Settings → User Management)
                </p>
              </div>

              <button
                onClick={onComplete}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
