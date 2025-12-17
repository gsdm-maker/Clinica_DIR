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
  categoria?: string; // Display name (legacy or fallback)
  categoria_id?: string; // For filtering
}

export default function Entries() {
  const [loading, setLoading] = useState(false);
  // Default to 'bulk' (Ingreso de Mercancía) as requested
  const [entryMode, setEntryMode] = useState<EntryMode>('bulk');

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

  // Fetch categories state
  const [categories, setCategories] = useState<{ id: string, nombre: string }[]>([]);

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
      fetchCategories();
    } else if (entryMode === 'bulk') {
      resetFormData();
      resetExistingStockForm();
      fetchMasterProducts();
      fetchProviders();
      fetchCategories();
    }
  }, [entryMode]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nombre')
        .eq('active', true)
        .order('nombre', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }

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
        .select('*, categorias(id, nombre)')
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
          categoria: selectedMasterProduct.categorias?.nombre || '',
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

  const [tempProduct, setTempProduct] = useState<BulkProductEntry>({
    maestro_producto_id: '',
    cantidad: 1,
    numero_lote: '',
    fecha_vencimiento: '',
    condicion: 'bueno',
    observaciones: '',
    categoria_id: '',
  });

  // Helper to get unique categories from loaded products
  const availableCategories = React.useMemo(() => {
    return categories.map(c => ({ value: c.id, label: c.nombre }));
  }, [categories]);

  const handleTempProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTempProduct(prev => {
      const updated = { ...prev, [name]: value };

      // Handle Category change
      if (name === 'categoria_id') {
        updated.maestro_producto_id = '';
        updated.categoria = '';
      }

      // Handle Master Product change
      if (name === 'maestro_producto_id') {
        const selectedMaster = masterProducts.find(mp => mp.id === value);
        if (selectedMaster) {
          updated.categoria = selectedMaster.categorias?.nombre || '';
          updated.categoria_id = selectedMaster.categorias?.id || updated.categoria_id;
        }
      }
      return updated;
    });
  };

  const addTempProductToList = () => {
    if (!tempProduct.maestro_producto_id || !tempProduct.cantidad || !tempProduct.numero_lote || !tempProduct.fecha_vencimiento) {
      toast.error('Completa los campos obligatorios del producto (Producto, Cantidad, Lote, Vencimiento).');
      return;
    }

    // Check for duplicate lot in current list
    const isDuplicate = bulkEntryData.products.some(p => p.numero_lote.toUpperCase() === tempProduct.numero_lote.toUpperCase());
    if (isDuplicate) {
      toast.error(`El lote ${tempProduct.numero_lote} ya está en la lista.`);
      return;
    }

    setBulkEntryData(prev => ({
      ...prev,
      products: [...prev.products, { ...tempProduct }] // Add copy
    }));

    // Reset temp form
    setTempProduct({
      maestro_producto_id: '',
      cantidad: 1,
      numero_lote: '',
      fecha_vencimiento: '',
      condicion: 'bueno',
      observaciones: '',
      categoria_id: '',
    });
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
        {canAddBulk && (
          <button
            onClick={() => setEntryMode('bulk')}
            className={`w-full rounded-md px-3 py-2 text-sm font-medium ${entryMode === 'bulk' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:bg-white/50'}`}>
            Ingreso de Mercancía
          </button>
        )}
        <button
          onClick={() => setEntryMode('existing')}
          className={`w-full rounded-md px-3 py-2 text-sm font-medium ${entryMode === 'existing' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:bg-white/50'}`}>
          Añadir a Stock Existente
        </button>
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
                <Select label="Producto del Catálogo (Obligatorio)" name="maestro_producto_id" options={masterProducts.map(p => ({ value: p.id, label: p.nombre }))} value={formData.maestro_producto_id} onChange={handleFormChange} required disabled={!canAddNew || loading} />
                <div className="flex flex-col justify-end">
                  <div className="flex items-end space-x-2">
                    <Select label="Proveedor (Obligatorio)" name="proveedor_id" options={providers.map(p => ({ value: p.id, label: p.nombre }))} value={formData.proveedor_id} onChange={handleFormChange} required disabled={!canAddNew || loading} className="flex-grow" />
                  </div>
                  <div className="text-right mt-1">
                    <button type="button" onClick={() => setShowProviderModal(true)} className="text-sm text-blue-600 hover:text-blue-800 underline">Crear Nuevo Proveedor</button>
                  </div>
                </div>
                <Input label="N° Lote (Obligatorio)" name="numero_lote" value={formData.numero_lote} onChange={handleFormChange} required disabled={!canAddNew || loading} />
                <Input label="Fecha de Vencimiento (Obligatorio)" name="fecha_vencimiento" type="date" value={formData.fecha_vencimiento} onChange={handleFormChange} required disabled={!canAddNew || loading} />
                <Input label="Cantidad Inicial (Obligatorio)" name="stock_actual" type="number" min={1} value={formData.stock_actual} onChange={handleFormChange} required disabled={!canAddNew || loading} />

                <div>
                  <Input label="Stock Crítico" name="stock_critico" type="number" value={formData.stock_critico} readOnly disabled={true} className="bg-gray-100" />
                  <p className="text-xs text-gray-500 mt-1">Información precargada del maestro.</p>
                </div>
                <div>
                  <Input label="Categoría" name="categoria" value={formData.categoria} readOnly disabled={true} className="bg-gray-100 capitalize" />
                  <p className="text-xs text-gray-500 mt-1">Información precargada del maestro.</p>
                </div>

                <Select label="Condición (Obligatorio)" name="condicion" options={[{ value: 'bueno', label: 'Bueno' }, { value: 'cuarentena', label: 'Cuarentena' }]} value={formData.condicion} onChange={handleFormChange} required disabled={!canAddNew || loading} />
              </div>
              <textarea name="observaciones" value={formData.observaciones} onChange={handleFormChange} placeholder="Observaciones..." className="w-full border rounded px-3 py-2" disabled={!canAddNew || loading} />
              <Input label="Número de Guía (Opcional)" name="numero_guia" value={formData.numero_guia} onChange={handleFormChange} disabled={!canAddNew || loading} />
            </div>
          ) : entryMode === 'bulk' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Ingreso de Mercancía (Masivo)</h3>
              {!canAddBulk && <p className="text-red-500">No tienes permiso.</p>}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4">
                <p className="text-sm text-yellow-800 font-medium">⚠️ El número de guía es obligatorio para ingresos masivos.</p>
              </div>
              <Input
                label="Número de Guía (Obligatorio)"
                name="numero_guia"
                value={bulkEntryData.numero_guia}
                onChange={handleBulkEntryChange}
                required
                disabled={loading}
                className="border-2 border-blue-200"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-end gap-2">
                  <div className="flex-grow">
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
                  <Button type="button" onClick={() => setShowProviderModal(true)} variant="secondary" className="mb-[2px] whitespace-nowrap">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Nuevo Proveedor
                  </Button>
                </div>
              </div>

              <h3 className="text-lg font-medium mt-6">Productos a Ingresar</h3>
              <h3 className="text-lg font-medium mt-6 mb-4">Agregar Producto</h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Select
                      label="Categoría"
                      name="categoria_id"
                      options={availableCategories}
                      value={tempProduct.categoria_id || ''}
                      onChange={handleTempProductChange}
                      disabled={loading}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Select
                      label="Producto"
                      name="maestro_producto_id"
                      options={masterProducts
                        .filter(mp => {
                          if (!tempProduct.categoria_id) return true;
                          const directMatch = mp.categoria_id === tempProduct.categoria_id;
                          let joinedMatch = false;
                          if (mp.categorias) {
                            if (Array.isArray(mp.categorias)) {
                              joinedMatch = mp.categorias[0]?.id === tempProduct.categoria_id;
                            } else {
                              // @ts-ignore
                              joinedMatch = mp.categorias.id === tempProduct.categoria_id;
                            }
                          }
                          return directMatch || joinedMatch;
                        })
                        .map(p => ({ value: p.id, label: p.nombre }))}
                      value={tempProduct.maestro_producto_id}
                      onChange={handleTempProductChange}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input
                    label="Cantidad"
                    name="cantidad"
                    type="number"
                    min={1}
                    value={tempProduct.cantidad}
                    onChange={handleTempProductChange}
                    disabled={loading}
                  />
                  <Input
                    label="N° Lote"
                    name="numero_lote"
                    value={tempProduct.numero_lote}
                    onChange={handleTempProductChange}
                    disabled={loading}
                  />
                  <Input
                    label="Vencimiento"
                    name="fecha_vencimiento"
                    type="date"
                    value={tempProduct.fecha_vencimiento}
                    onChange={handleTempProductChange}
                    disabled={loading}
                  />
                  <Select
                    label="Condición"
                    name="condicion"
                    options={[{ value: 'bueno', label: 'Bueno' }, { value: 'cuarentena', label: 'Cuarentena' }]}
                    value={tempProduct.condicion}
                    onChange={handleTempProductChange}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                  <textarea
                    name="observaciones"
                    value={tempProduct.observaciones}
                    onChange={handleTempProductChange}
                    placeholder="Observaciones opcionales..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    disabled={loading}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={addTempProductToList} disabled={loading} variant="secondary">
                    <Plus className="w-4 h-4 mr-2" /> Agregar a la Lista
                  </Button>
                </div>
              </div>


              <h3 className="text-lg font-medium mt-8">Productos a Ingresar ({bulkEntryData.products.length})</h3>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lote</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venc.</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cond.</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {bulkEntryData.products.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-sm text-gray-500 text-center">
                          No hay productos en la lista. Agrega uno usando el formulario de arriba.
                        </td>
                      </tr>
                    ) : (
                      bulkEntryData.products.map((product, index) => {
                        const productName = masterProducts.find(m => m.id === product.maestro_producto_id)?.nombre || 'Desconocido';
                        return (
                          <tr key={index}>
                            <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">{productName}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{product.numero_lote}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{product.cantidad}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{product.fecha_vencimiento}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 capitalize">{product.condicion}</td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <button
                                type="button"
                                onClick={() => removeProductLine(index)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" isLoading={loading} disabled={loading || (entryMode === 'existing' && (!canAddExisting || !selectedProductId || quantity <= 0)) || (entryMode === 'bulk' && (!canAddBulk || !bulkEntryData.proveedor_id || !bulkEntryData.numero_guia || bulkEntryData.products.length === 0))}>
              {entryMode === 'existing' ? 'Añadir Stock' : 'Registrar Ingreso'}
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
        <Input label="Nombre del Proveedor" name="nombre" value={formData.nombre} onChange={(e) => setFormData(p => ({ ...p, nombre: e.target.value }))} required />
        <Input label="Dirección" name="direccion" value={formData.direccion} onChange={(e) => setFormData(p => ({ ...p, direccion: e.target.value }))} />
        <Select label="Clasificación" name="clasificacion" options={[{ value: 'medicamentos', label: 'Medicamentos' }, { value: 'insumos_generales', label: 'Insumos Generales' }, { value: 'equipamiento', label: 'Equipamiento' }, { value: 'servicios', label: 'Servicios' }, { value: 'otros', label: 'Otros' }]} value={formData.clasificacion} onChange={(e) => setFormData(p => ({ ...p, clasificacion: e.target.value }))} required />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={loading}>Crear Proveedor</Button>
        </div>
      </form>
    </Modal>
  );
}