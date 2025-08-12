import React, { useState } from 'react';
import { Check, User, Phone, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { LoginDto, RegisterDto } from '../types';

interface AuthFormProps {
  mode: 'login' | 'register';
  onToggleMode: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ mode, onToggleMode }) => {
  const { login, register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    teamId: 'main_team'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        await login({ phone: formData.phone } as LoginDto);
      } else {
        await register(formData as RegisterDto);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Equipment Checker</h1>
          <p className="text-gray-400">
            {mode === 'login' 
              ? 'Enter your phone number to access equipment' 
              : 'Enter your details to join your team'
            }
          </p>
        </div>

        {/* Form */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="input-primary pl-10"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="input-primary pl-10"
                  placeholder="Enter your phone number"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Used for login and team identification
              </p>
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="teamId" className="block text-sm font-medium text-gray-300 mb-2">
                  Team ID
                </label>
                <div className="relative">
                  <Users className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    id="teamId"
                    name="teamId"
                    value={formData.teamId}
                    onChange={handleInputChange}
                    className="input-primary pl-10"
                    placeholder="Enter your team ID"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Use the same Team ID as your colleagues to access shared equipment
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {mode === 'login' 
                ? "Don't have an account? " 
                : "Already have an account? "
              }
              <button
                type="button"
                onClick={onToggleMode}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            Simple team equipment management • No passwords required
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;