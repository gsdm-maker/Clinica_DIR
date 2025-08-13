export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'bodega' | 'auditor' | 'enfermero' | 'visualizador';
  created_at: string;
}

export const MOCK_USERS: MockUser[] = [
  {
    id: '1',
    email: 'admin@hospital.cl',
    name: 'Administrador Sistema',
    role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    email: 'bodega@hospital.cl',
    name: 'Encargado Bodega',
    role: 'bodega',
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    email: 'auditor@hospital.cl',
    name: 'Auditor Interno',
    role: 'auditor',
    created_at: new Date().toISOString()
  },
  {
    id: '4',
    email: 'enfermero@hospital.cl',
    name: 'Enfermero Jefe',
    role: 'enfermero',
    created_at: new Date().toISOString()
  },
  {
    id: '5',
    email: 'viewer@hospital.cl',
    name: 'Visualizador',
    role: 'visualizador',
    created_at: new Date().toISOString()
  }
];

export const mockLogin = async (email: string, password: string): Promise<MockUser> => {
  // Simular delay de red
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const user = MOCK_USERS.find(u => u.email === email);
  
  if (!user) {
    throw new Error('Usuario no encontrado');
  }
  
  // Validar contraseñas simples para demo
  const validPasswords = ['admin123', 'bodega123', 'auditor123', 'enfermero123', 'viewer123'];
  if (!validPasswords.includes(password)) {
    throw new Error('Credenciales inválidas');
  }
  
  return user;
};