import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Stethoscope, Activity, HeartPulse, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loginEmail = email.includes('@') ? email : `${email}@clinica.cl`;
      await login(loginEmail, password);
    } catch (error) {
      toast.error('Credenciales incorrectas. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Sección Izquierda - Visual y Abstracta */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center">
        {/* Decorative Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900 to-slate-900 opacity-90 z-10" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />

        <div className="relative z-20 text-white p-12 max-w-lg">
          <div className="mb-8 flex items-center space-x-3 text-blue-400">
            <Activity className="h-10 w-10" />
            <span className="text-sm font-semibold tracking-wider uppercase">Sistema Clínico Seguro</span>
          </div>
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Gestión Inteligente de Insumos.
          </h1>
          <p className="text-lg text-slate-300 mb-8 font-light">
            Control eficiente de stock, trazabilidad completa y optimización de recursos médicos en un solo lugar.
          </p>

          <div className="grid grid-cols-2 gap-4 text-sm text-slate-400">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-teal-400" />
              <span>Acceso Seguro</span>
            </div>
            <div className="flex items-center space-x-2">
              <HeartPulse className="h-5 w-5 text-teal-400" />
              <span>Monitoreo 24/7</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sección Derecha - Formulario Minimalista */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <div className="max-w-md w-full">
          <div className="flex justify-center lg:justify-start mb-10">
            <div className="h-12 w-12 bg-gradient-to-tr from-blue-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Stethoscope className="h-7 w-7 text-white" />
            </div>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Bienvenido</h2>
            <p className="text-slate-500">Ingrese sus credenciales para continuar.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Input
                label="Usuario o Email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ej: sdiaze"
                autoComplete="username"
                className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
              />

              <div className="relative">
                <Input
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button type="button" className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors">
                ¿Olvidó su contraseña?
              </button>
            </div>

            <Button
              type="submit"
              isLoading={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
            >
              Ingresar al Sistema
            </Button>
          </form>

          <div className="mt-8 text-center text-xs text-slate-400">
            &copy; 2026 Clínica GSDM. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </div>
  );
}