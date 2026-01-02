import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

interface ChangePasswordModalProps {
    isOpen: boolean;
}

export function ChangePasswordModal({ isOpen }: ChangePasswordModalProps) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { logout } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('Las contraseñas no coinciden.');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setLoading(true);
        try {
            // 1. Update Password in Supabase Auth
            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
            if (updateError) throw updateError;

            // 2. Call RPC to clear the flag
            const { error: rpcError } = await supabase.rpc('confirm_password_change');
            if (rpcError) throw rpcError;

            toast.success('Contraseña actualizada correctamente. Por favor inicia sesión nuevamente.');
            await logout();
            window.location.reload();

        } catch (error: any) {
            console.error('Password update error:', error);
            toast.error(error.message || 'Error al actualizar contraseña.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm transition-opacity" aria-hidden="true"></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 text-center mb-4">
                            Cambio de Contraseña Obligatorio
                        </h3>

                        <p className="text-sm text-gray-500 text-center mb-4">
                            Es tu primer inicio de sesión o tu contraseña ha expirado.
                            Por seguridad, debes configurar una nueva contraseña para continuar.
                        </p>

                        <div className="bg-blue-50 p-3 rounded-md mb-6 text-xs text-blue-800">
                            <strong>Requisitos de Seguridad:</strong>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>Mínimo 6 caracteres.</li>
                                <li>Evita usar tu nombre o fecha de nacimiento.</li>
                                <li>Si la olvidas, contacta al Administrador para restablecerla.</li>
                            </ul>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label="Nueva Contraseña"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                placeholder="Mínimo 6 caracteres"
                            />
                            <Input
                                label="Confirmar Contraseña"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Repite la contraseña"
                            />
                            <div className="mt-6">
                                <Button type="submit" className="w-full" isLoading={loading}>
                                    Actualizar Contraseña y Continuar
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
