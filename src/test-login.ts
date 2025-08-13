import 'dotenv/config';
import { supabase } from './lib/supabase-node.js';

// Cambia estos valores por un usuario real de tu Supabase
const email = 'sebadiazespindola57@gmail.com';
const password = 'Sebyta14';

async function testLogin() {
  try {
    console.log('[testLogin] Intentando login', { email });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    console.log('[testLogin] Resultado login:', { data, error });
    if (error) {
      console.error('[testLogin] Error:', error);
    } else {
      console.log('[testLogin] Login exitoso. Usuario:', data.user);
    }
  } catch (err) {
    console.error('[testLogin] Excepción:', err);
  }
}

testLogin();
