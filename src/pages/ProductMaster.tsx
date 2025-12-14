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
import { MasterProduct, Provider, Category } from '../types';

type Tab = 'products' | 'providers' | 'categories';

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
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'categories' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            Categorías
          </button>
        </nav>
      </div>

      {activeTab === 'products' ? <ProductMasterView /> : activeTab === 'providers' ? <ProviderMasterView /> : <CategoryMasterView />}
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
    categoria_id: '',
    descripcion: '',
    stock_critico: 5,
  });

  // Estado para categorías dinámicas
  const [categoriesList, setCategoriesList] = useState<{ value: string, label: string }[]>([]);

  useEffect(() => {
    fetchMasterProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nombre, descripcion')
        .eq('active', true)
        .order('nombre');

      if (error) throw error;

      if (data) {
        const formattedCategories = data.map(cat => ({
          value: cat.id, // Use ID as value
          label: cat.nombre.charAt(0).toUpperCase() + cat.nombre.slice(1).replace(/_/g, ' ')
        }));
        setCategoriesList(formattedCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback a categorías básicas si falla la carga
      // Fallback a categorías básicas si falla la carga
      // setCategoriesList([]); // Better empty than wrong IDs
    }
  };

  const fetchMasterProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('maestro_productos')
        .select('*, categorias(nombre)')
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
        categoria_id: product.categoria_id,
        descripcion: product.descripcion || '',
        stock_critico: product.stock_critico,
      });
    } else {
      setSelectedProduct(null);
      setIsEditing(false);
      setIsEditing(false);
      setFormData({ nombre: '', categoria_id: '', descripcion: '', stock_critico: 5 });
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.categorias?.nombre || 'Sin Categoría'}</td>
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
          <Input label="Nombre del Producto" name="nombre" value={formData.nombre} onChange={(e) => setFormData(p => ({ ...p, nombre: e.target.value }))} required />
          <Select label="Categoría" name="categoria_id" options={categoriesList} value={formData.categoria_id} onChange={(e) => setFormData(p => ({ ...p, categoria_id: e.target.value }))} required />
          <Input label="Descripción" name="descripcion" value={formData.descripcion} onChange={(e) => setFormData(p => ({ ...p, descripcion: e.target.value }))} />
          <Input label="Stock Crítico" name="stock_critico" type="number" value={formData.stock_critico} onChange={(e) => setFormData(p => ({ ...p, stock_critico: Number(e.target.value) }))} required />
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
          <Input label="Nombre del Proveedor" name="nombre" value={formData.nombre} onChange={(e) => setFormData(p => ({ ...p, nombre: e.target.value }))} required />
          <Input label="Dirección" name="direccion" value={formData.direccion} onChange={(e) => setFormData(p => ({ ...p, direccion: e.target.value }))} />
          <Select label="Clasificación" name="clasificacion" options={classifications} value={formData.clasificacion} onChange={(e) => setFormData(p => ({ ...p, clasificacion: e.target.value }))} required />
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" isLoading={loading}>{isEditing ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function CategoryMasterView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'bodega';

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast.error('Error al cargar categorías.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return toast.error('No tienes permiso.');

    setLoading(true);
    try {
      const categoryData = {
        nombre: formData.nombre.toLowerCase().trim().replace(/\s+/g, '_'),
        descripcion: formData.descripcion,
      };

      if (isEditing && selectedCategory) {
        const { error } = await supabase
          .from('categorias')
          .update(categoryData)
          .eq('id', selectedCategory.id);
        if (error) throw error;
        toast.success('Categoría actualizada.');
      } else {
        const { error } = await supabase.from('categorias').insert([categoryData]);
        if (error) throw error;
        toast.success('Nueva categoría creada.');
      }
      setShowModal(false);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar la categoría.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage || !confirm('¿Seguro que quieres eliminar esta categoría?')) return;

    try {
      const { error } = await supabase.from('categorias').delete().eq('id', id);
      if (error) throw error;
      toast.success('Categoría eliminada.');
      fetchCategories();
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message);
    }
  };

  const openModal = (category?: Category) => {
    if (category) {
      setSelectedCategory(category);
      setIsEditing(true);
      setFormData({
        nombre: category.nombre,
        descripcion: category.descripcion || '',
      });
    } else {
      setSelectedCategory(null);
      setIsEditing(false);
      setFormData({ nombre: '', descripcion: '' });
    }
    setShowModal(true);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        {canManage && (
          <Button onClick={() => openModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Categoría
          </Button>
        )}
      </div>
      <Card>
        <div className="p-4 bg-blue-50 text-blue-700 text-sm rounded mb-4">
          Nota: Las categorías se usan internamente en minúsculas y con guiones bajos (ej: material_quirurgico).
          El sistema convertirá automáticamente el nombre ingresado.
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código / Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cat.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cat.descripcion || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cat.active ? 'Activo' : 'Inactivo'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {canManage && (
                      <div className="flex space-x-2">
                        <button onClick={() => openModal(cat)} className="text-green-600 hover:text-green-900"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(cat.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={isEditing ? 'Editar Categoría' : 'Agregar Categoría'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre de la Categoría"
            name="nombre"
            value={formData.nombre}
            onChange={(e) => setFormData(p => ({ ...p, nombre: e.target.value }))}
            required
            placeholder="Ej: Material Quirurgico"
          />
          <Input label="Descripción" name="descripcion" value={formData.descripcion} onChange={(e) => setFormData(p => ({ ...p, descripcion: e.target.value }))} />

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" isLoading={loading}>{isEditing ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}