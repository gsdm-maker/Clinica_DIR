import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Paciente, Entrega } from '../types';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function PatientMedications() {
  const { user } = useAuth();
  const submissionLock = useRef(false);

  // Helper para formatear RUT
  const formatRut = (value: string) => {
    // Eliminar puntos y guiones para trabajar con los datos limpios
    const cleanValue = value.replace(/[^0-9kK]/g, '');
    if (!cleanValue) return '';

    // Si es corto, devolver tal cual
    if (cleanValue.length <= 1) return cleanValue;

    // Separar cuerpo y dígito verificador
    const cuerpo = cleanValue.slice(0, -1);
    const dv = cleanValue.slice(-1);

    // Formatear cuerpo con puntos
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `${cuerpoFormateado}-${dv}`;
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Si el usuario está borrando, permitimos borrar libremente limpiando todo formato
    // Pero si está escribiendo, aplicamos formato
    // Simple approach: siempre formatear el valor limpio
    const formatted = formatRut(rawValue);
    setRut(formatted);
  };

  // Form state
  const [rut, setRut] = useState('');
  const [patientName, setPatientName] = useState('');
  const [medicalIndications, setMedicalIndications] = useState('');
  const [deliveryMonth, setDeliveryMonth] = useState('');
  const [medications, setMedications] = useState([{ maestro_producto_id: '', quantity: '' }]);
  const [isPatientNameEditable, setIsPatientNameEditable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data state
  const [todaysDeliveries, setTodaysDeliveries] = useState<Entrega[]>([]);
  const [masterProducts, setMasterProducts] = useState<{ id: string; nombre: string }[]>([]);

  const lookupPatient = async (searchRut: string) => {
    // Buscar por RUT exacto (tal cual está formateado en el input, asumiendo que en BD se guarda formateado o se deberá limpiar)
    // Para mayor robustez, idealmente buscaríamos por rut limpio, pero asumiendo convención actual:

    // Limpiamos el RUT para la búsqueda si en la base de datos se guarda limpio, 
    // O lo buscamos formateado si se guarda formateado.
    // Dado que el código anterior reemplazaba todo lo que no fuera numérico, asumía guardado "limpio" o semi-limpio.
    // Pero el requerimiento es "formato automático".
    // Asumiremos que vamos a estandarizar a formato con puntos y guion.
    const { data, error } = await supabase.from('pacientes').select('*').eq('rut', searchRut).single();
    if (error && error.code !== 'PGRST116') {
      console.error('Error looking up patient:', error);
      setPatientName('');
      return;
    }
    if (data) {
      setPatientName(data.nombre);
      setIsPatientNameEditable(false);
    } else {
      setPatientName('');
      setIsPatientNameEditable(true);
    }
  };

  useEffect(() => {
    if (rut.length > 0) lookupPatient(rut);
  }, [rut]);

  const fetchTodaysDeliveries = async () => {
    const { data, error } = await supabase.rpc('get_todays_deliveries', {
      p_cache_buster: new Date().toISOString()
    });
    if (error) {
      toast.error("Error al cargar las entregas de hoy.");
      console.error('Error fetching today\'s deliveries:', error);
    } else {
      setTodaysDeliveries(data as Entrega[]);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      // Changed to use inner join to filter by category name from related table
      const { data, error } = await supabase.from('maestro_productos').select('id, nombre, categorias!inner(nombre)').eq('categorias.nombre', 'medicamentos');
      if (error) console.error('Error fetching master products:', error);
      else setMasterProducts(data || []);

      fetchTodaysDeliveries();
    };
    fetchInitialData();
  }, []);

  const handleAddMedication = () => {
    setMedications([...medications, { maestro_producto_id: '', quantity: '' }]);
  };

  const handleRemoveMedication = (index: number) => {
    const newMedications = medications.filter((_, i) => i !== index);
    setMedications(newMedications);
  };

  const handleMedicationChange = (index: number, field: keyof typeof medications[0], value: string) => {
    const newMedications = medications.map((med, i) => (i === index ? { ...med, [field]: value } : med));
    setMedications(newMedications);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionLock.current) return;
    submissionLock.current = true;
    setIsSubmitting(true);

    try {
      if (!user) { throw new Error('Debe iniciar sesión.'); }

      let patientId: string;
      const { data: existingPatient } = await supabase.from('pacientes').select('id').eq('rut', rut).single();

      if (existingPatient) {
        patientId = existingPatient.id;
      } else {
        const { data: newPatient, error } = await supabase.from('pacientes').insert([{ rut, nombre: patientName }]).select('id').single();
        if (error) { throw new Error('Error al crear nuevo paciente.'); }
        patientId = newPatient!.id;
      }

      const { data: newDelivery, error: deliveryError } = await supabase
        .from('entregas')
        .insert([{ paciente_id: patientId, mes_entrega: `${deliveryMonth}-01`, indicaciones_medicas: medicalIndications, usuario_id: user.id }])
        .select('id, created_at, mes_entrega, indicaciones_medicas')
        .single();

      if (deliveryError) { throw new Error('Error al registrar la entrega.'); }

      const selectedProductIds = medications.map(m => m.maestro_producto_id).filter(id => id);
      if (selectedProductIds.length === 0) { throw new Error('Añada al menos un medicamento.'); }

      // Validar que sean medicamentos
      // Use inner join filter for validation as well
      const { data: existingProducts, error: validationError } = await supabase.from('maestro_productos').select('id, categorias!inner(nombre)').in('id', selectedProductIds).eq('categorias.nombre', 'medicamentos');
      if (validationError || existingProducts.length !== selectedProductIds.length) { throw new Error('Uno o más productos seleccionados no son válidos (no son medicamentos).'); }

      const deliveryItemsToInsert = medications
        .filter(m => m.maestro_producto_id && m.quantity)
        .map(m => ({ entrega_id: newDelivery.id, maestro_producto_id: m.maestro_producto_id, cantidad: parseInt(m.quantity) }));

      if (deliveryItemsToInsert.length !== medications.length) { throw new Error('Complete todos los campos de medicamentos.'); }

      const { error: itemsError } = await supabase.from('entregas_items').insert(deliveryItemsToInsert);
      if (itemsError) { throw new Error('Error al registrar los ítems de la entrega.'); }

      const newDeliveryForState: Entrega = {
        ...newDelivery,
        usuario_id: user.id,
        paciente_id: patientId,
        pacientes: { nombre: patientName, rut: rut },
        usuario: { name: user.name || '' },
        entregas_items: deliveryItemsToInsert.map(item => ({
          cantidad: item.cantidad,
          maestro_productos: { nombre: masterProducts.find(p => p.id === item.maestro_producto_id)?.nombre || '' }
        }))
      };
      setTodaysDeliveries(prev => [newDeliveryForState, ...prev]);

      toast.success('Entrega registrada exitosamente!');
      setRut('');
      setPatientName('');
      setMedicalIndications('');
      setDeliveryMonth('');
      setMedications([{ maestro_producto_id: '', quantity: '' }]);

    } catch (error: any) {
      toast.error(error.message);
      console.error('Submission failed:', error);
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };


  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Medicamentos Pacientes</h1>
        <p className="text-gray-600 mt-2">Use este formulario para registrar nuevas entregas de medicamentos.</p>
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Registrar Entrega</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="deliveryMonth" className="block text-sm font-medium text-gray-700 mb-1">Mes de Entrega</label>
            <Input id="deliveryMonth" type="month" value={deliveryMonth} onChange={(e) => setDeliveryMonth(e.target.value)} placeholder="Seleccione mes y año" required />
          </div>
          <div>
            <label htmlFor="rut" className="block text-sm font-medium text-gray-700 mb-1">RUT Paciente (ej: 12.345.678-9)</label>
            <Input id="rut" type="text" value={rut} onChange={handleRutChange} placeholder="12.345.678-9" className="w-full" maxLength={12} />
          </div>
          <div>
            <label htmlFor="patientName" className="block text-sm font-medium text-gray-700 mb-1">Nombre Paciente</label>
            <Input id="patientName" type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Nombre del paciente" className="w-full bg-gray-100" readOnly={!isPatientNameEditable} />
          </div>
          <div>
            <label htmlFor="medicalIndications" className="block text-sm font-medium text-gray-700 mb-1">Indicaciones Médicas</label>
            <textarea id="medicalIndications" value={medicalIndications} onChange={(e) => setMedicalIndications(e.target.value)} rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2" placeholder="Ingrese las indicaciones médicas aquí..."></textarea>
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-800">Medicamentos Entregados</h3>
            {medications.map((med, index) => (
              <div key={index} className="flex items-end space-x-2">
                <div className="flex-grow">
                  <label htmlFor={`product-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                  <Select id={`product-${index}`} value={med.maestro_producto_id} onChange={(e) => handleMedicationChange(index, 'maestro_producto_id', e.target.value)} options={masterProducts.map(mp => ({ value: mp.id, label: mp.nombre }))} placeholder="Seleccione el medicamento" />
                </div>
                <div>
                  <label htmlFor={`quantity-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                  <Input id={`quantity-${index}`} type="number" value={med.quantity} onChange={(e) => handleMedicationChange(index, 'quantity', e.target.value)} placeholder="Cantidad" className="w-24" />
                </div>
                {medications.length > 1 && (
                  <Button type="button" onClick={() => handleRemoveMedication(index)} variant="secondary" className="p-2"><Trash2 className="h-5 w-5 text-red-500" /></Button>
                )}
              </div>
            ))}
            <Button type="button" onClick={handleAddMedication} variant="secondary" className="mt-2"><Plus className="h-4 w-4 mr-2" /> Añadir Medicamento</Button>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Registrando...' : 'Registrar Entrega'}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Entregas Registradas Hoy</h2>
        {todaysDeliveries.length === 0 ? (
          <p className="text-gray-600">No se han registrado entregas hoy.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RUT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes Entrega</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicamentos Entregados</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indicaciones</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registrado Por</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {todaysDeliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.created_at.substring(8, 10)}-{delivery.created_at.substring(5, 7)}-{delivery.created_at.substring(0, 4)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.pacientes?.nombre || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.pacientes?.rut || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{delivery.mes_entrega ? format(new Date(delivery.mes_entrega), 'MMMM yyyy', { locale: es }) : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <ul className="list-disc list-inside">
                        {delivery.entregas_items.map((item, index) => (
                          <li key={index}>{`${item.cantidad} x ${item.maestro_productos.nombre}`}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.indicaciones_medicas || 'Sin indicaciones'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.usuario?.name || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}