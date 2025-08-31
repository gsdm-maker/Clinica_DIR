import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Eye, Edit, Trash2, Move } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Product, Provider, MasterProduct } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import toast from 'react-hot-toast';

// Define a more specific type for the inventory view
type InventoryProduct = Product & {
  maestro_productos: MasterProduct;
  proveedores: Provider;
  stock_por_condicion: { [key: string]: number } | null;
};

export function Inventory() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showSegregateModal, setShowSegregateModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const canManageStock = user?.role === 'admin' || user?.role === 'bodega';

  const [formData, setFormData] = useState({
    maestro_producto_id: '',
    proveedor_id: '',
    stock_actual: 0,
    numero_lote: '',
    fecha_vencimiento: '',
    condicion: 'bueno',
    observaciones: ''
  });

  const [segregateData, setSegregateData] = useState({
    producto_id: '',
    cantidad: 1,
    condicion_origen: 'Bueno',
    condicion_destino: 'Dañado'
  });

  const [masterProductsList, setMasterProductsList] = useState<MasterProduct[]>([]);
  const [providersList, setProvidersList] = useState<Provider[]>([]);

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

  const conditions = [
    { value: 'Bueno', label: 'Bueno' },
    { value: 'Cuarentena', label: 'Cuarentena' },
    { value: 'Vencido', label: 'Vencido' },
    { value: 'Dañado', label: 'Dañado' }
  ];

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // The RPC call now returns a comprehensive view of each product lot
      const { data, error } = await supabase.rpc<InventoryProduct>('get_inventory_stock');

      if (error) {
        console.error('Error fetching inventory:', error);
        throw error;
      }
      
      setProducts(data || []);
    } catch (error: any) {
      toast.error('Error al cargar el inventario. Revise la consola para más detalles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchMasterProductsList();
    fetchProvidersList();
  }, []);

  const filterProducts = () => {
    let filtered = products;
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.maestro_productos?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.proveedores?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numero_lote?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (categoryFilter) {
      filtered = filtered.filter(p => p.maestro_productos?.categoria === categoryFilter);
    }
    if (conditionFilter) {
      // Safely filter by condition, checking if stock_por_condicion exists
      filtered = filtered.filter(p => p.stock_por_condicion && (p.stock_por_condicion[conditionFilter] || 0) > 0);
    }
    setFilteredProducts(filtered);
  };

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, categoryFilter, conditionFilter]);

  const fetchMasterProductsList = async () => {
    try {
      const { data, error } = await supabase.from('maestro_productos').select('id, nombre');
      if (error) throw error;
      setMasterProductsList(data || []);
    } catch (error) {
      toast.error('Error al cargar productos maestros.');
    }
  };

  const fetchProvidersList = async () => {
    try {
      const { data, error } = await supabase.from('proveedores').select('id, nombre');
      if (error) throw error;
      setProvidersList(data || []);
    } catch (error) {
      toast.error('Error al cargar proveedores.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageStock) return;
    setLoading(true);

    try {
      const productData = {
        ...formData,
        stock_actual: Number(formData.stock_actual),
        fecha_ingreso: new Date().toISOString(),
        bloqueado: formData.condicion === 'vencido',
      };

      console.log('Datos a enviar a Supabase:', productData);

      if (isEditing && selectedProduct) {
        // Logic for updating remains the same
        const { error } = await supabase.from('productos').update(productData).eq('id', selectedProduct.id);
        if (error) throw error;
        toast.success('Producto actualizado.');
      } else {
        // Corrected logic for creating a new product
        const { data: newProduct, error: insertError } = await supabase
          .from('productos')
          .insert([productData])
          .select('id')
          .single();

        if (insertError || !newProduct) {
          throw insertError || new Error('No se pudo crear el producto.');
        }

        // Add the initial movement record
        if (user && productData.stock_actual > 0) {
          const { error: movementError } = await supabase.from('movimientos').insert([{
            producto_id: newProduct.id,
            usuario_id: user.id,
            tipo_movimiento: 'entrada',
            cantidad: productData.stock_actual,
            motivo: 'Ingreso inicial de stock',
            condicion: productData.condicion,
          }]);

          if (movementError) {
            // Attempt to clean up if movement creation fails
            await supabase.from('productos').delete().eq('id', newProduct.id);
            throw movementError;
          }
        }
        toast.success('Producto creado con su movimiento inicial.');
      }
      setShowModal(false);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el producto.');
    } finally {
      setLoading(false);
    }
  };

  const handleSegregate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageStock || !segregateData.producto_id) return;
    setLoading(true);

    try {
      const { error } = await supabase.rpc('segregate_stock', {
        p_producto_id: segregateData.producto_id,
        p_cantidad_a_mover: segregateData.cantidad,
        p_condicion_origen: segregateData.condicion_origen,
        p_condicion_destino: segregateData.condicion_destino,
      });

      if (error) {
        console.error('Segregation error:', error);
        throw error;
      }
      toast.success('Stock segregado correctamente.');
      setShowSegregateModal(false);
      fetchProducts(); // Refresh data
    } catch (error: any) {
      toast.error(error.message || 'Error al segregar el stock.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManageStock || !confirm('¿Seguro que quieres eliminar este producto?')) return;

    try {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Producto eliminado.');
      fetchProducts();
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message);
    }
  };

  const openModal = (product?: InventoryProduct, editMode = false) => {
    setIsEditing(editMode);
    if (product) {
      setSelectedProduct(product);
      setFormData({
        maestro_producto_id: product.maestro_producto_id,
        proveedor_id: product.proveedor_id || '',
        stock_actual: product.stock_actual || 0,
        numero_lote: product.numero_lote || '',
        fecha_vencimiento: product.fecha_vencimiento ? format(new Date(product.fecha_vencimiento), 'yyyy-MM-dd') : '',
        condicion: product.condicion || 'bueno',
        observaciones: product.observaciones || '',
      });
    } else {
      setSelectedProduct(null);
      setFormData({ maestro_producto_id: '', proveedor_id: '', stock_actual: 0, numero_lote: '', fecha_vencimiento: '', condicion: 'bueno', observaciones: '' });
    }
    setShowModal(true);
  };

  // CORRECTED: Use product.id for segregation
  const openSegregateModal = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setSegregateData({
      producto_id: product.id, // This is the crucial fix
      cantidad: 1,
      condicion_origen: 'Bueno',
      condicion_destino: 'Dañado'
    });
    setShowSegregateModal(true);
  };

  // CORRECTED: Add safe checks for stock and critical stock
  const getStockStatus = (product: InventoryProduct) => {
    const stock = product.stock_actual || 0;
    if (stock === 0) return { variant: 'danger' as const, label: 'Sin Stock' };
    if (product.maestro_productos?.stock_critico && stock <= product.maestro_productos.stock_critico) {
      return { variant: 'warning' as const, label: 'Stock Crítico' };
    }
    return { variant: 'success' as const, label: 'Stock Normal' };
  };

  const getConditionVariant = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'bueno': return 'success';
      case 'cuarentena': return 'warning';
      case 'vencido': return 'danger';
      case 'dañado': return 'danger';
      default: return 'secondary';
    }
  };

  if (loading && products.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Control de Bodega</h1>
          <p className="text-gray-600 mt-2">Gestión completa del inventario de insumos médicos</p>
        </div>
        {canManageStock && (
          <Button onClick={() => openModal(undefined, true)}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Producto
          </Button>
        )}
      </div>

      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          <Select options={[{ value: '', label: 'Todas las categorías' }, ...categories]} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} />
          <Select options={[{ value: '', label: 'Todas las condiciones' }, ...conditions.map(c => ({ value: c.value, label: c.label }))]} value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} />
          <Button variant="secondary" onClick={() => { setSearchTerm(''); setCategoryFilter(''); setConditionFilter(''); }}>
            <Filter className="w-4 h-4 mr-2" />
            Limpiar Filtros
          </Button>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto / Lote</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock por Condición</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Ingreso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Vencimiento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product);
                return (
                  // CORRECTED: Use product.id for the key
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{product.maestro_productos?.nombre}</div>
                      <div className="text-sm text-gray-500">Lote: {product.numero_lote || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4"><span className="text-sm text-gray-900 capitalize">{product.maestro_productos?.categoria.replace('_', ' ')}</span></td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{product.stock_actual || 0} / {product.maestro_productos?.stock_critico}</div>
                      <Badge variant={stockStatus.variant} size="sm">{stockStatus.label}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {/* CORRECTED: Safely access stock_por_condicion */}
                        {product.stock_por_condicion && Object.entries(product.stock_por_condicion).map(([condicion, stock]) =>
                          stock > 0 && (
                            <Badge key={condicion} variant={getConditionVariant(condicion)} size="sm">
                              {condicion}: {stock}
                            </Badge>
                          )
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{product.proveedores?.nombre || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {product.fecha_ingreso ? format(new Date(product.fecha_ingreso), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {product.fecha_vencimiento ? format(new Date(product.fecha_vencimiento), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button onClick={() => openModal(product, false)} className="text-blue-600"><Eye className="w-4 h-4" /></button>
                        {canManageStock && <>
                          <button onClick={() => openModal(product, true)} className="text-green-600"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(product.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></button>
                          <button onClick={() => openSegregateModal(product)} className="text-purple-600" title="Segregar Stock"><Move className="w-4 h-4" /></button>
                        </>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProducts.length === 0 && <div className="text-center py-12"><p className="text-gray-500">No se encontraron productos</p></div>}
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={isEditing ? (selectedProduct ? 'Editar Producto' : 'Agregar Producto') : 'Ver Producto'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Producto Maestro *" options={masterProductsList.map(mp => ({ value: mp.id, label: mp.nombre }))} value={formData.maestro_producto_id} onChange={(e) => setFormData(p => ({ ...p, maestro_producto_id: e.target.value }))} required disabled={!isEditing} />
            <Select label="Proveedor *" options={providersList.map(p => ({ value: p.id, label: p.nombre }))} value={formData.proveedor_id} onChange={(e) => setFormData(p => ({ ...p, proveedor_id: e.target.value }))} required disabled={!isEditing} />
            <Input label="Stock Actual *" type="number" value={formData.stock_actual} onChange={(e) => setFormData({ ...formData, stock_actual: Number(e.target.value) })} required disabled={!isEditing} />
            <Select label="Condición *" options={conditions.map(c => ({ value: c.value, label: c.label }))} value={formData.condicion} onChange={(e) => setFormData(p => ({ ...p, condicion: e.target.value }))} required disabled={!isEditing} />
            <Input label="N° Lote *" value={formData.numero_lote} onChange={(e) => setFormData(p => ({ ...p, numero_lote: e.target.value }))} required disabled={!isEditing} />
            <Input label="Fecha de Vencimiento *" type="date" value={formData.fecha_vencimiento} onChange={(e) => setFormData(p => ({ ...p, fecha_vencimiento: e.target.value }))} required disabled={!isEditing} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" rows={3} value={formData.observaciones} onChange={(e) => setFormData(p => ({ ...p, observaciones: e.target.value }))} placeholder="Observaciones adicionales..." disabled={!isEditing} />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cerrar</Button>
            {isEditing && <Button type="submit" isLoading={loading}>{selectedProduct ? 'Actualizar' : 'Crear'} Producto</Button>}
          </div>
        </form>
      </Modal>

      <Modal isOpen={showSegregateModal} onClose={() => setShowSegregateModal(false)} title="Segregar Stock" size="md">
        <form onSubmit={handleSegregate} className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">{selectedProduct?.maestro_productos.nombre}</h3>
            <p className="text-sm text-gray-500">Mover stock entre condiciones</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Desde"
              options={conditions.map(c => ({ value: c.value, label: c.label }))}
              value={segregateData.condicion_origen}
              onChange={(e) => setSegregateData(d => ({ ...d, condicion_origen: e.target.value }))}
            />
            <Select
              label="Hacia"
              options={conditions.map(c => ({ value: c.value, label: c.label }))}
              value={segregateData.condicion_destino}
              onChange={(e) => setSegregateData(d => ({ ...d, condicion_destino: e.target.value }))}
            />
          </div>
          <Input
            label="Cantidad a Mover"
            type="number"
            value={segregateData.cantidad}
            onChange={(e) => setSegregateData(d => ({ ...d, cantidad: Number(e.target.value) }))}
            min="1"
            // CORRECTED: Safely access stock for the max attribute
            max={selectedProduct?.stock_por_condicion?.[segregateData.condicion_origen] || selectedProduct?.stock_por_condicion?.[segregateData.condicion_origen.toLowerCase()] || 1}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowSegregateModal(false)}>Cancelar</Button>
            <Button type="submit" isLoading={loading}>Segregar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
