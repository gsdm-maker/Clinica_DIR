import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Import supabase client
import { Paciente, Entrega } from '../types'; // Simplified imports
import { useAuth } from '../contexts/AuthContext'; // To get current user ID

export default function PatientMedications() {
  const { user } = useAuth(); // Get current user from AuthContext

  const [rut, setRut] = useState('');
  const [patientName, setPatientName] = useState('');
  const [medicalIndications, setMedicalIndications] = useState('');
  const [deliveryMonth, setDeliveryMonth] = useState('');
  const [medications, setMedications] = useState([{ maestro_producto_id: '', quantity: '' }]);
  const [deliveries, setDeliveries] = useState<Entrega[]>([]);
  const [isPatientNameEditable, setIsPatientNameEditable] = useState(true);
  const [masterProducts, setMasterProducts] = useState<{ id: string; nombre: string }[]>([]);

  const lookupPatient = async (searchRut: string) => {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .eq('rut', searchRut)
      .single();

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
    if (rut.length > 0) {
      lookupPatient(rut);
    }
  }, [rut]);

  useEffect(() => {
    const fetchMasterProducts = async () => {
      const { data, error } = await supabase
        .from('maestro_productos')
        .select('id, nombre')
        .eq('categoria', 'medicamentos');

      if (error) {
        console.error('Error fetching master products:', error);
        return;
      }
      setMasterProducts(data || []);
    };
    fetchMasterProducts();
  }, []);

  const handleAddMedication = () => {
    setMedications([...medications, { maestro_producto_id: '', quantity: '' }]);
  };

  const handleRemoveMedication = (index: number) => {
    const newMedications = medications.filter((_, i) => i !== index);
    setMedications(newMedications);
  };

  const handleMedicationChange = (index: number, field: keyof typeof medications[0], value: string) => {
    const newMedications = medications.map((med, i) => {
      if (i === index) {
        return { ...med, [field]: value };
      }
      return med;
    });
    setMedications(newMedications);
  };

  const fetchDeliveries = async () => {
    const { data, error } = await supabase
      .from('entregas')
      .select('*, pacientes(nombre, rut), usuario:users(name), entregas_items(cantidad, maestro_productos(nombre))')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching deliveries:', error);
      return;
    }
    setDeliveries(data as Entrega[]);
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('Debe iniciar sesión para registrar una entrega.');
      return;
    }

    let patientId: string;
    const { data: existingPatient } = await supabase.from('pacientes').select('id').eq('rut', rut).single();

    if (existingPatient) {
      patientId = existingPatient.id;
    } else {
      const { data: newPatient, error: newPatientError } = await supabase
        .from('pacientes')
        .insert([{ rut, nombre: patientName }])
        .select('id')
        .single();

      if (newPatientError) {
        console.error('Error creating new patient:', newPatientError);
        alert('Error al crear nuevo paciente.');
        return;
      }
      patientId = newPatient.id;
    }

    const currentYear = new Date().getFullYear();
    const formattedDeliveryMonth = `${currentYear}-${deliveryMonth}-01`;

    const { data: newDelivery, error: deliveryError } = await supabase
      .from('entregas')
      .insert([{ paciente_id: patientId, mes_entrega: formattedDeliveryMonth, indicaciones_medicas: medicalIndications, usuario_id: user.id }])
      .select('id')
      .single();

    if (deliveryError) {
      console.error('Error creating new delivery:', deliveryError);
      alert('Error al registrar la entrega.');
      return;
    }

    const selectedProductIds = medications.map(med => med.maestro_producto_id).filter(id => id);

    if (selectedProductIds.length === 0) {
      alert('Por favor, añada al menos un medicamento a la entrega.');
      return;
    }

    const { data: existingProducts, error: validationError } = await supabase
      .from('maestro_productos')
      .select('id')
      .in('id', selectedProductIds)
      .eq('categoria', 'medicamentos');

    if (validationError || existingProducts.length !== selectedProductIds.length) {
      console.error('Error validating products:', validationError);
      alert('Error: Uno o más productos seleccionados ya no existen o han sido modificados. Por favor, refresque la página e intente de nuevo.');
      return;
    }

    const deliveryItemsToInsert = medications
      .filter(med => med.maestro_producto_id && med.quantity)
      .map(med => ({ entrega_id: newDelivery.id, maestro_producto_id: med.maestro_producto_id, cantidad: parseInt(med.quantity) }));

    if (deliveryItemsToInsert.length !== medications.length) {
      alert('Por favor, complete el producto y la cantidad para todos los medicamentos.');
      return;
    }

    const { error: itemsError } = await supabase.from('entregas_items').insert(deliveryItemsToInsert);

    if (itemsError) {
      console.error('Error inserting delivery items:', itemsError);
      alert('Error al registrar los ítems de la entrega.');
      return;
    }

    alert('Entrega registrada exitosamente!');
    setRut('');
    setPatientName('');
    setMedicalIndications('');
    setDeliveryMonth('');
    setMedications([{ maestro_producto_id: '', quantity: '' }]);
    fetchDeliveries();
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(0, i);
    return { value: (i + 1).toString().padStart(2, '0'), label: date.toLocaleString('es-ES', { month: 'long' }) };
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Medicamentos Pacientes</h1>
        <p className="text-gray-600 mt-2">Registro de medicamentos entregados a pacientes.</p>
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Registrar Entrega de Medicamentos</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="deliveryMonth" className="block text-sm font-medium text-gray-700 mb-1">Mes de Entrega</label>
            <Select id="deliveryMonth" value={deliveryMonth} onChange={(e) => setDeliveryMonth(e.target.value)} options={months} placeholder="Seleccione el mes" />
          </div>

          <div>
            <label htmlFor="rut" className="block text-sm font-medium text-gray-700 mb-1">RUT Paciente (sin guion)</label>
            <Input id="rut" type="text" value={rut} onChange={(e) => setRut(e.target.value.replace(/[^0-9Kk]/g, ''))} placeholder="Ej: 123456789" className="w-full" />
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
                  <Button type="button" onClick={() => handleRemoveMedication(index)} variant="ghost" className="p-2">
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" onClick={handleAddMedication} variant="outline" className="mt-2">
              <Plus className="h-4 w-4 mr-2" /> Añadir Medicamento
            </Button>
          </div>

          <Button type="submit" className="w-full">Registrar Entrega</Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Historial de Entregas</h2>
        {deliveries.length === 0 ? (
          <p className="text-gray-600">No hay entregas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RUT</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes Entrega</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicamentos Entregados</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indicaciones</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registrado Por</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(delivery.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.pacientes?.nombre || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.pacientes?.rut || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{months.find(m => m.value === delivery.mes_entrega.substring(5, 7))?.label || delivery.mes_entrega}</td>
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
