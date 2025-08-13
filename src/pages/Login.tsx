import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Activity } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signUp } = useAuth();
  const navigate = useNavigate();

  // Estado para registro
  const [showRegister, setShowRegister] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('bodega');
  const [regLoading, setRegLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      // Error handling is done in the login function
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    try {
      await signUp(regEmail, regPassword, regName, regRole);
      setShowRegister(false);
      setEmail(regEmail);
      setPassword(regPassword);
    } catch (error) {
      // Error handling is done in signUp
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white p-3 rounded-full">
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Gestión Insumos Médicos
          </h1>
          <p className="text-blue-100">
            Sistema de control de stock e inventario médico
          </p>
        </div>

        <Card>
          {!showRegister ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                    Iniciar Sesión
                  </h2>
                </div>

                <Input
                  label="Correo Electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="usuario@hospital.cl"
                />

                <Input
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />

                <Button
                  type="submit"
                  className="w-full"
                  isLoading={loading}
                >
                  Iniciar Sesión
                </Button>
              </form>
              <div className="text-center mt-4">
                <button
                  className="text-blue-600 hover:underline text-sm"
                  onClick={() => setShowRegister(true)}
                >
                  ¿No tienes cuenta? Regístrate
                </button>
              </div>
            </>
          ) : (
            <>
              <form onSubmit={handleRegister} className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                    Registro de Usuario
                  </h2>
                </div>
                <Input
                  label="Nombre Completo"
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                  placeholder="Nombre y Apellido"
                />
                <Input
                  label="Correo Electrónico"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  placeholder="usuario@hospital.cl"
                />
                <Input
                  label="Contraseña"
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={regRole}
                    onChange={e => setRegRole(e.target.value)}
                  >
                    <option value="bodega">Bodega</option>
                    <option value="admin">Admin</option>
                    <option value="auditor">Auditor</option>
                    <option value="enfermero">Enfermero</option>
                    <option value="visualizador">Visualizador</option>
                  </select>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  isLoading={regLoading}
                >
                  Registrarse
                </Button>
              </form>
              <div className="text-center mt-4">
                <button
                  className="text-blue-600 hover:underline text-sm"
                  onClick={() => setShowRegister(false)}
                >
                  ¿Ya tienes cuenta? Inicia sesión
                </button>
              </div>
            </>
          )}

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Usuarios de Prueba:</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Admin:</strong> admin@hospital.cl / admin123</p>
              <p><strong>Bodega:</strong> bodega@hospital.cl / bodega123</p>
              <p><strong>Auditor:</strong> auditor@hospital.cl / auditor123</p>
              <p><strong>Enfermero:</strong> enfermero@hospital.cl / enfermero123</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}