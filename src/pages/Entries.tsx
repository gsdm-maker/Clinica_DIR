import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Product, MasterProduct, Provider } from '../types';
import { Plus, Trash2 } from 'lucide-react';

// Definimos los modos de entrada
type EntryMode = 'existing' | 'new' | 'bulk';

interface BulkProductEntry {
  maestro_producto_id: string;
  cantidad: number;
  numero_lote: string;
  fecha_vencimiento: string;
  condicion: 'bueno' | 'cuarentena';
  observaciones: string;
}

export default function Entries() {
  const [loading, setLoading] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>('existing');
  
  // Estado para el formulario de stock existente
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [motivoExistente, setMotivoExistente] = useState('');

  // Nuevos estados para el maestro de productos y proveedores
  const [masterProducts, setMasterProducts] = useState<MasterProduct[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [showProviderModal, setShowProviderModal] = useState(false);

  // Estado para el formulario de nuevo producto
  const [formData, setFormData] = useState({
    maestro_producto_id: '',
    proveedor_id: '',
    categoria: '',
    stock_critico: 0,
    stock_actual: 1,
    condicion: 'bueno',
    numero_lote: '',
    fecha_vencimiento: '',
    observaciones: '',
    numero_guia: ''
  });

  // Estado para el formulario de entrada masiva
  const [bulkEntryData, setBulkEntryData] = useState({
    proveedor_id: '',
    numero_guia: '',
    products: [] as BulkProductEntry[],
  });

  const { user } = useAuth();
  const canAddExisting = user?.role === 'admin' || user?.role === 'bodega' || user?.role === 'enfermero';
  const canAddNew = user?.role === 'admin' || user?.role === 'bodega';
  const canAddBulk = user?.role === 'admin' || user?.role === 'bodega';

  useEffect(() => {
    if (entryMode === 'existing') {
      resetFormData();
      resetBulkEntryForm();
      fetchProducts();
    } else if (entryMode === 'new') {
      resetExistingStockForm();
      resetBulkEntryForm();
      fetchMasterProducts();
      fetchProviders();
    } else if (entryMode === 'bulk') {
      resetFormData();
      resetExistingStockForm();
      fetchMasterProducts();
      fetchProviders();
    }
  }, [entryMode]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('id, numero_lote, maestro_productos(nombre)')
        .order('numero_lote', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error('Error al cargar la lista de productos');
    }
  };

  const fetchMasterProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('maestro_productos')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setMasterProducts(data || []);
    } catch (error: any) {
      toast.error('Error al cargar el maestro de productos.');
    }
  };

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setProviders(data || []);
    } catch (error: any) {
      toast.error('Error al cargar los proveedores.');
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'maestro_producto_id') {
      const selectedMasterProduct = masterProducts.find(mp => mp.id === value);
      if (selectedMasterProduct) {
        setFormData(prev => ({
          ...prev,
          maestro_producto_id: value,
          categoria: selectedMasterProduct.categoria,
          stock_critico: selectedMasterProduct.stock_critico,
        }));
      } else {
        setFormData(prev => ({ ...prev, maestro_producto_id: '', categoria: '', stock_critico: 0 }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBulkEntryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBulkEntryData(prev => ({ ...prev, [name]: value }));
  };

  const handleProductLineChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newProducts = [...bulkEntryData.products];
    newProducts[index] = { ...newProducts[index], [name]: value };
    setBulkEntryData(prev => ({ ...prev, products: newProducts }));
  };

  const addProductLine = () => {
    setBulkEntryData(prev => ({
      ...prev,
      products: [
        ...prev.products,
        {
          maestro_producto_id: '',
          cantidad: 1,
          numero_lote: '',
          fecha_vencimiento: '',
          condicion: 'bueno',
          observaciones: '',
        },
      ],
    }));
  };

  const removeProductLine = (index: number) => {
    setBulkEntryData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (entryMode === 'existing') {
        await handleAddExistingStock();
      } else if (entryMode === 'new') {
        await handleAddNewProduct();
      } else if (entryMode === 'bulk') {
        await handleBulkEntrySubmit();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar la entrada.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExistingStock = async () => {
    if (!canAddExisting || !selectedProductId || quantity <= 0 || !motivoExistente) {
      throw new Error('Por favor, completa todos los campos requeridos.');
    }

    const { data: product, error: productError } = await supabase
      .from('productos')
      .select('stock_actual')
      .eq('id', selectedProductId)
      .single();

    if (productError || !product) throw new Error('El producto no existe.');

    const newStock = product.stock_actual + Number(quantity);
    const { error: updateError } = await supabase
      .from('productos')
      .update({ stock_actual: newStock, actualizado_en: new Date().toISOString() })
      .eq('id', selectedProductId);

    if (updateError) throw updateError;

    if (user) {
      const { error: movementError } = await supabase.from('movimientos').insert([{
        producto_id: selectedProductId,
        usuario_id: user.id,
        tipo_movimiento: 'entrada',
        cantidad: Number(quantity),
        motivo: motivoExistente,
        condicion: 'Bueno' // Columna obligatoria añadida
      }]);
      if (movementError) throw movementError;
    }

    toast.success('Stock actualizado correctamente.');
    resetExistingStockForm();
  };

  const handleAddNewProduct = async () => {
    if (!canAddNew || !formData.maestro_producto_id || !formData.proveedor_id || !formData.numero_lote) {
      throw new Error('Por favor, completa todos los campos requeridos, incluyendo el número de lote.');
    }

    const upperCaseLote = formData.numero_lote.toUpperCase();

    // 1. Check for duplicate numero_lote more robustly
    const { data: existingProducts, error: loteError } = await supabase
      .from('productos')
      .select('id')
      .eq('numero_lote', upperCaseLote);

    if (loteError) {
      throw new Error(`Error al verificar el lote: ${loteError.message}`);
    }
    if (existingProducts && existingProducts.length > 0) {
      throw new Error(`El número de lote "${upperCaseLote}" ya existe. Por favor, ingrese un número de lote único.`);
    }

    // 2. Insert new product with uppercase numero_lote
    const { data: newProduct, error: insertError } = await supabase
      .from('productos')
      .insert([{
        maestro_producto_id: formData.maestro_producto_id,
        proveedor_id: formData.proveedor_id,
        stock_actual: Number(formData.stock_actual),
        numero_lote: upperCaseLote, // Use uppercase
        fecha_vencimiento: formData.fecha_vencimiento,
        condicion: formData.condicion,
        observaciones: formData.observaciones,
        fecha_ingreso: new Date().toISOString(),
      }])
      .select('id')
      .single();

    if (insertError || !newProduct) throw insertError || new Error('Error al crear el producto.');

    if (user) {
      const { error: movementError } = await supabase.from('movimientos').insert([{
        producto_id: newProduct.id,
        usuario_id: user.id,
        tipo_movimiento: 'entrada',
        cantidad: Number(formData.stock_actual),
        motivo: 'Ingreso de nuevo producto desde proveedor',
        condicion: formData.condicion,
        numero_guia: formData.numero_guia
      }]);
      if (movementError) throw movementError;
    }

    toast.success('Nuevo producto registrado correctamente.');
    resetFormData();
  };

  const handleBulkEntrySubmit = async () => {
    if (!user) {
      throw new Error('Usuario no autenticado.');
    }

    if (!bulkEntryData.proveedor_id || !bulkEntryData.numero_guia || bulkEntryData.products.length === 0) {
      throw new Error('Por favor, completa todos los campos requeridos y añade al menos un producto.');
    }

    try {
      const loteSet = new Set<string>();
      const movementsToInsert = [];

      // First pass: validate all lot numbers for uniqueness in the form
      for (const product of bulkEntryData.products) {
        if (!product.numero_lote) throw new Error('Todos los productos deben tener un número de lote.');
        const upperCaseLote = product.numero_lote.toUpperCase();
        if (loteSet.has(upperCaseLote)) throw new Error(`El número de lote "${upperCaseLote}" está duplicado en el formulario.`);
        loteSet.add(upperCaseLote);
      }

      // Second pass: process entries against the DB
      for (const productEntry of bulkEntryData.products) {
        const upperCaseLote = productEntry.numero_lote.toUpperCase();

        // Check if the lot number exists ANYWHERE in the products table
        const { data: existingLoteProducts, error: loteFetchError } = await supabase
          .from('productos')
          .select('id, maestro_producto_id, stock_actual')
          .eq('numero_lote', upperCaseLote);

        if (loteFetchError) {
          throw loteFetchError;
        }

        let productId;

        if (existingLoteProducts && existingLoteProducts.length > 0) {
          const existingLoteProduct = existingLoteProducts[0];
          // A product with this lot number already exists.
          // We can only add stock if it's for the exact same master product.
          if (existingLoteProduct.maestro_producto_id === productEntry.maestro_producto_id) {
            // It's the same product, so we can add stock.
            const newStock = existingLoteProduct.stock_actual + productEntry.cantidad;
            const { error: updateError } = await supabase
              .from('productos')
              .update({ stock_actual: newStock, actualizado_en: new Date().toISOString() })
              .eq('id', existingLoteProduct.id);
            if (updateError) throw updateError;
            productId = existingLoteProduct.id;
          } else {
            // It's a different product trying to use the same lot number. This is forbidden.
            throw new Error(`El número de lote "${upperCaseLote}" ya está en uso por otro producto y no se puede reutilizar.`);
          }
        } else {
          // The lot number is unique, we can create a new product.
          const { data: newProduct, error: insertProductError } = await supabase
            .from('productos')
            .insert({
              maestro_producto_id: productEntry.maestro_producto_id,
              proveedor_id: bulkEntryData.proveedor_id,
              stock_actual: productEntry.cantidad,
              numero_lote: upperCaseLote,
              fecha_vencimiento: productEntry.fecha_vencimiento,
              condicion: productEntry.condicion,
              observaciones: productEntry.observaciones,
              fecha_ingreso: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (insertProductError || !newProduct) throw insertProductError || new Error('Error al crear el producto.');
          productId = newProduct.id;
        }

        movementsToInsert.push({
          producto_id: productId,
          usuario_id: user.id,
          tipo_movimiento: 'entrada',
          cantidad: productEntry.cantidad,
          motivo: 'Ingreso masivo desde proveedor',
          condicion: productEntry.condicion,
          numero_guia: bulkEntryData.numero_guia,
        });
      }

      // Insert all movements in a single batch operation
      const { error: movementsError } = await supabase.from('movimientos').insert(movementsToInsert);
      if (movementsError) throw movementsError;

      toast.success('Entrada masiva registrada correctamente.');
      resetBulkEntryForm();
    } catch (error: any) {
      throw new Error(error.message || 'Error al registrar la entrada masiva.');
    }
  };

  const resetExistingStockForm = () => {
    setSelectedProductId('');
    setQuantity(0);
    setMotivoExistente('');
  };

  const resetFormData = () => {
    setFormData({
      maestro_producto_id: '',
      proveedor_id: '',
      categoria: '',
      stock_critico: 0,
      stock_actual: 1,
      condicion: 'bueno',
      numero_lote: '',
      fecha_vencimiento: '',
      observaciones: '',
      numero_guia: ''
    });
  };

  const resetBulkEntryForm = () => {
    setBulkEntryData({
      proveedor_id: '',
      numero_guia: '',
      products: [],
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Registro de Entradas</h1>
        <p className="text-gray-600 mt-2">Registra el ingreso de nuevos insumos o devoluciones internas.</p>
      </div>

      <div className="mb-6 flex space-x-2 rounded-lg bg-gray-200 p-1">
        <button 
          onClick={() => setEntryMode('existing')} 
          className={`w-full rounded-md px-3 py-2 text-sm font-medium ${entryMode === 'existing' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:bg-white/50'}`}>
          Añadir a Stock Existente
        </button>
        {canAddNew && (
          <button 
            onClick={() => setEntryMode('new')} 
            className={`w-full rounded-md px-3 py-2 text-sm font-medium ${entryMode === 'new' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:bg-white/50'}`}>
            Registrar Nuevo Producto
          </button>
        )}
        {canAddBulk && (
          <button 
            onClick={() => setEntryMode('bulk')} 
            className={`w-full rounded-md px-3 py-2 text-sm font-medium ${entryMode === 'bulk' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:bg-white/50'}`}>
            Entrada Masiva
          </button>
        )}
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6 p-4">
          {entryMode === 'existing' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Añadir a Stock Existente (Devolución)</h3>
              {!canAddExisting && <p className="text-red-500">No tienes permiso.</p>}
              <div>
                <label htmlFor="product-select" className="block text-sm font-medium text-gray-700 mb-1">Producto (Descripción - Lote)</label>
                <select id="product-select" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required disabled={!canAddExisting || loading}>
                  <option value="" disabled>Selecciona un producto...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.maestro_productos?.nombre} - (Lote: {p.numero_lote || 'N/A'})</option>)}
                </select>
              </div>
              <Input label="Cantidad a Ingresar" type="number" name="cantidad" min={0} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required disabled={!canAddExisting || loading} />
              <Input label="Motivo" name="motivo" value={motivoExistente} onChange={(e) => setMotivoExistente(e.target.value)} required disabled={!canAddExisting || loading} />
            </div>
          ) : entryMode === 'new' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Registrar Nuevo Producto</h3>
              {!canAddNew && <p className="text-red-500">No tienes permiso.</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="Producto del Catálogo" name="maestro_producto_id" options={masterProducts.map(p => ({ value: p.id, label: p.nombre }))} value={formData.maestro_producto_id} onChange={handleFormChange} required disabled={!canAddNew || loading} />
                <div className="flex items-end space-x-2">
                  <Select label="Proveedor" name="proveedor_id" options={providers.map(p => ({ value: p.id, label: p.nombre }))} value={formData.proveedor_id} onChange={handleFormChange} required disabled={!canAddNew || loading} className="flex-grow" />
                  <Button type="button" onClick={() => setShowProviderModal(true)} className="h-10"><Plus className="w-4 h-4"/></Button>
                </div>
                <Input label="N° Lote" name="numero_lote" value={formData.numero_lote} onChange={handleFormChange} required disabled={!canAddNew || loading} />
                <Input label="Fecha de Vencimiento" name="fecha_vencimiento" type="date" value={formData.fecha_vencimiento} onChange={handleFormChange} required disabled={!canAddNew || loading} />
                <Input label="Cantidad Inicial" name="stock_actual" type="number" min={1} value={formData.stock_actual} onChange={handleFormChange} required disabled={!canAddNew || loading} />
                <Input label="Stock Crítico" name="stock_critico" type="number" value={formData.stock_critico} readOnly disabled={true} />
                <Select label="Categoría" name="categoria" options={[{value: 'otros', label: 'Otros'}, {value: 'medicamentos', label: 'Medicamentos'}]} value={formData.categoria} readOnly disabled={true} />
                <Select label="Condición" name="condicion" options={[{value: 'bueno', label: 'Bueno'}, {value: 'cuarentena', label: 'Cuarentena'}]} value={formData.condicion} onChange={handleFormChange} required disabled={!canAddNew || loading} />
              </div>
              <textarea name="observaciones" value={formData.observaciones} onChange={handleFormChange} placeholder="Observaciones..." className="w-full border rounded px-3 py-2" disabled={!canAddNew || loading} />
              <Input label="Número de Guía" name="numero_guia" value={formData.numero_guia} onChange={handleFormChange} disabled={!canAddNew || loading} />
            </div>
          ) : entryMode === 'bulk' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Registrar Entrada Masiva</h3>
              {!canAddBulk && <p className="text-red-500">No tienes permiso.</p>}
              <Input
                label="Número de Guía"
                name="numero_guia"
                value={bulkEntryData.numero_guia}
                onChange={handleBulkEntryChange}
                required
                disabled={loading}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Proveedor"
                  name="proveedor_id"
                  options={providers.map(p => ({ value: p.id, label: p.nombre }))}
                  value={bulkEntryData.proveedor_id}
                  onChange={handleBulkEntryChange}
                  required
                  disabled={loading}
                />
              </div>

              <h3 className="text-lg font-medium mt-6">Productos a Ingresar</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Lote</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Venc.</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condición</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observaciones</th>
                      <th scope="col" className="relative px-6 py-3"><span className="sr-only">Eliminar</span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bulkEntryData.products.map((product, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Select
                            name="maestro_producto_id"
                            options={masterProducts.map(p => ({ value: p.id, label: p.nombre }))}
                            value={product.maestro_producto_id}
                            onChange={(e) => handleProductLineChange(index, e)}
                            required
                            disabled={loading}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            name="cantidad"
                            type="number"
                            min={1}
                            value={product.cantidad}
                            onChange={(e) => handleProductLineChange(index, e)}
                            required
                            disabled={loading}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            name="numero_lote"
                            value={product.numero_lote}
                            onChange={(e) => handleProductLineChange(index, e)}
                            required
                            disabled={loading}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            name="fecha_vencimiento"
                            type="date"
                            value={product.fecha_vencimiento}
                            onChange={(e) => handleProductLineChange(index, e)}
                            required
                            disabled={loading}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Select
                            name="condicion"
                            options={[{ value: 'bueno', label: 'Bueno' }, { value: 'cuarentena', label: 'Cuarentena' }]}
                            value={product.condicion}
                            onChange={(e) => handleProductLineChange(index, e)}
                            required
                            disabled={loading}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <textarea
                            name="observaciones"
                            value={product.observaciones}
                            onChange={(e) => handleProductLineChange(index, e)}
                            placeholder="Observaciones..."
                            className="w-full border rounded px-3 py-2"
                            disabled={loading}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeProductLine(index)}
                            className="text-red-500 hover:text-red-700"
                            disabled={loading}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button type="button" onClick={addProductLine} variant="outline" className="w-full mt-4" disabled={loading}>
                <Plus className="w-4 h-4 mr-2" /> Añadir Fila
              </Button>
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" isLoading={loading} disabled={loading || (entryMode === 'existing' && (!canAddExisting || !selectedProductId || quantity <= 0)) || (entryMode === 'new' && (!canAddNew || !formData.maestro_producto_id || !formData.proveedor_id)) || (entryMode === 'bulk' && (!canAddBulk || !bulkEntryData.proveedor_id || !bulkEntryData.numero_guia || bulkEntryData.products.length === 0))}>
              {entryMode === 'existing' ? 'Añadir Stock' : entryMode === 'new' ? 'Registrar Nuevo Producto' : 'Registrar Entrada Masiva'}
            </Button>
          </div>
        </form>
      </Card>
      {/* ProviderModal is reused from Entries.tsx */}
      <ProviderModal isOpen={showProviderModal} onClose={() => setShowProviderModal(false)} onProviderCreated={fetchProviders} />
    </div>
  );
}

// Reusing ProviderModal from Entries.tsx for consistency
function ProviderModal({ isOpen, onClose, onProviderCreated }: { isOpen: boolean, onClose: () => void, onProviderCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', direccion: '', clasificacion: 'medicamentos' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('proveedores').insert([formData]);
      if (error) throw error;
      toast.success('Proveedor creado.');
      onProviderCreated();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear el proveedor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Nuevo Proveedor">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nombre del Proveedor" name="nombre" value={formData.nombre} onChange={(e) => setFormData(p => ({...p, nombre: e.target.value}))} required />
        <Input label="Dirección" name="direccion" value={formData.direccion} onChange={(e) => setFormData(p => ({...p, direccion: e.target.value}))} />
        <Select label="Clasificación" name="clasificacion" options={[{ value: 'medicamentos', label: 'Medicamentos' }, { value: 'insumos_generales', label: 'Insumos Generales' }, { value: 'equipamiento', label: 'Equipamiento' }, { value: 'servicios', label: 'Servicios' }, { value: 'otros', label: 'Otros' }]} value={formData.clasificacion} onChange={(e) => setFormData(p => ({...p, clasificacion: e.target.value}))} required />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={loading}>Crear Proveedor</Button>
        </div>
      </form>
    </Modal>
  );
}