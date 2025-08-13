import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { MasterProduct, Provider } from '../types';

type Tab = 'products' | 'providers';

export function ProductMaster() {
  const [activeTab, setActiveTab] = useState<Tab>('products');

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maestros</h1>
          <p className="text-gray-600 mt-2">Gestión central de catálogos de la clínica.</p>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'products' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            Maestro de Productos
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'providers' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            Maestro de Proveedores
          </button>
        </nav>
      </div>

      {activeTab === 'products' ? <ProductMasterView /> : <ProviderMasterView />}
    </div>
  );
}

function ProductMasterView() {
  const [masterProducts, setMasterProducts] = useState<MasterProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MasterProduct | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'bodega';

  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'medicamentos',
    descripcion: '',
    stock_critico: 5,
  });

  const categories = [
    { value: 'sueros', label: 'Sueros' },
    { value: 'acidos', label: 'Ácidos' },
    { value: 'medicamentos', label: 'Medicamentos' },
    { value: 'material_quirurgico', label: 'Material Quirúrgico' },
    { value: 'antisepticos', label: 'Antisépticos' },
    { value: 'vendajes', label: 'Vendajes' },
    { value: 'jeringas', label: 'Jeringas' },
    { value: 'otros', label: 'Otros' }
  ];

  useEffect(() => {
    fetchMasterProducts();
  }, []);

  const fetchMasterProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('maestro_productos')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setMasterProducts(data || []);
    } catch (error: any) {
      toast.error('Error al cargar el maestro de productos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return toast.error('No tienes permiso.');

    setLoading(true);
    try {
      const productData = {
        ...formData,
        stock_critico: Number(formData.stock_critico),
      };

      if (isEditing && selectedProduct) {
        const { error } = await supabase
          .from('maestro_productos')
          .update(productData)
          .eq('id', selectedProduct.id);
        if (error) throw error;
        toast.success('Producto maestro actualizado.');
      } else {
        const { error } = await supabase.from('maestro_productos').insert([productData]);
        if (error) throw error;
        toast.success('Nuevo producto maestro creado.');
      }
      setShowModal(false);
      fetchMasterProducts();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el producto.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage || !confirm('¿Seguro que quieres eliminar este producto del catálogo?')) return;

    try {
      const { error } = await supabase.from('maestro_productos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Producto maestro eliminado.');
      fetchMasterProducts();
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message);
    }
  };

  const openModal = (product?: MasterProduct) => {
    if (product) {
      setSelectedProduct(product);
      setIsEditing(true);
      setFormData({
        nombre: product.nombre,
        categoria: product.categoria,
        descripcion: product.descripcion || '',
        stock_critico: product.stock_critico,
      });
    } else {
      setSelectedProduct(null);
      setIsEditing(false);
      setFormData({ nombre: '', categoria: 'medicamentos', descripcion: '', stock_critico: 5 });
    }
    setShowModal(true);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        {canManage && (
          <Button onClick={() => openModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Producto al Catálogo
          </Button>
        )}
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Crítico</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {masterProducts.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.categoria}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.stock_critico}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {canManage && (
                      <div className="flex space-x-2">
                        <button onClick={() => openModal(product)} className="text-green-600 hover:text-green-900"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={isEditing ? 'Editar Producto Maestro' : 'Agregar Producto Maestro'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre del Producto" name="nombre" value={formData.nombre} onChange={(e) => setFormData(p => ({...p, nombre: e.target.value}))} required />
          <Select label="Categoría" name="categoria" options={categories} value={formData.categoria} onChange={(e) => setFormData(p => ({...p, categoria: e.target.value}))} required />
          <Input label="Descripción" name="descripcion" value={formData.descripcion} onChange={(e) => setFormData(p => ({...p, descripcion: e.target.value}))} />
          <Input label="Stock Crítico" name="stock_critico" type="number" value={formData.stock_critico} onChange={(e) => setFormData(p => ({...p, stock_critico: Number(e.target.value)}))} required />
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" isLoading={loading}>{isEditing ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ProviderMasterView() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'bodega';

  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    clasificacion: 'medicamentos',
  });

  const classifications = [
    { value: 'medicamentos', label: 'Medicamentos' },
    { value: 'insumos_generales', label: 'Insumos Generales' },
    { value: 'equipamiento', label: 'Equipamiento' },
    { value: 'servicios', label: 'Servicios' },
    { value: 'otros', label: 'Otros' },
  ];

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setProviders(data || []);
    } catch (error: any) {
      toast.error('Error al cargar los proveedores.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return toast.error('No tienes permiso.');

    setLoading(true);
    try {
      if (isEditing && selectedProvider) {
        const { error } = await supabase
          .from('proveedores')
          .update(formData)
          .eq('id', selectedProvider.id);
        if (error) throw error;
        toast.success('Proveedor actualizado.');
      } else {
        const { error } = await supabase.from('proveedores').insert([formData]);
        if (error) throw error;
        toast.success('Nuevo proveedor creado.');
      }
      setShowModal(false);
      fetchProviders();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el proveedor.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage || !confirm('¿Seguro que quieres eliminar este proveedor?')) return;

    try {
      const { error } = await supabase.from('proveedores').delete().eq('id', id);
      if (error) throw error;
      toast.success('Proveedor eliminado.');
      fetchProviders();
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message);
    }
  };

  const openModal = (provider?: Provider) => {
    if (provider) {
      setSelectedProvider(provider);
      setIsEditing(true);
      setFormData({
        nombre: provider.nombre,
        direccion: provider.direccion || '',
        clasificacion: provider.clasificacion || 'otros',
      });
    } else {
      setSelectedProvider(null);
      setIsEditing(false);
      setFormData({ nombre: '', direccion: '', clasificacion: 'medicamentos' });
    }
    setShowModal(true);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        {canManage && (
          <Button onClick={() => openModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Proveedor
          </Button>
        )}
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clasificación</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {providers.map((provider) => (
                <tr key={provider.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{provider.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{provider.direccion}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{provider.clasificacion}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {canManage && (
                      <div className="flex space-x-2">
                        <button onClick={() => openModal(provider)} className="text-green-600 hover:text-green-900"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(provider.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={isEditing ? 'Editar Proveedor' : 'Agregar Proveedor'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre del Proveedor" name="nombre" value={formData.nombre} onChange={(e) => setFormData(p => ({...p, nombre: e.target.value}))} required />
          <Input label="Dirección" name="direccion" value={formData.direccion} onChange={(e) => setFormData(p => ({...p, direccion: e.target.value}))} />
          <Select label="Clasificación" name="clasificacion" options={classifications} value={formData.clasificacion} onChange={(e) => setFormData(p => ({...p, clasificacion: e.target.value}))} required />
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" isLoading={loading}>{isEditing ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}