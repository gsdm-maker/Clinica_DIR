import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { MasterProduct, Product } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx } from 'clsx';
import { Trash2, ShoppingCart } from 'lucide-react';

// Extender el tipo Product para incluir la relación anidada
type ProductWithMaster = Product & {
  maestro_productos: Pick<MasterProduct, 'nombre'>;
};

export default function Exits() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Data states
  const [allMasterProducts, setAllMasterProducts] = useState<MasterProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [availableLots, setAvailableLots] = useState<ProductWithMaster[]>([]);
  
  // Filter & Form states
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMasterProductId, setSelectedMasterProductId] = useState<string>('');
  const [currentQuantities, setCurrentQuantities] = useState<Map<string, number>>(new Map());
  const [shoppingCart, setShoppingCart] = useState<Map<string, { lot: ProductWithMaster, quantity: number }>>(new Map());
  const [motivo, setMotivo] = useState('');

  // Fetch all master products and derive categories
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const { data, error } = await supabase
          .from('maestro_productos')
          .select('id, nombre, categoria')
          .order('nombre', { ascending: true });
        if (error) throw error;
        
        setAllMasterProducts(data || []);
        const uniqueCategories = Array.from(new Set(data.map(p => p.categoria).filter(Boolean)));
        setCategories(uniqueCategories.sort());

      } catch (error) {
        toast.error('Error al cargar datos maestros.');
      }
    };
    fetchMasterData();
  }, []);

  const filteredMasterProducts = useMemo(() => {
    if (!selectedCategory) {
      return allMasterProducts;
    }
    return allMasterProducts.filter(p => p.categoria === selectedCategory);
  }, [selectedCategory, allMasterProducts]);


  useEffect(() => {
    const fetchAvailableLots = async () => {
      if (!selectedMasterProductId) {
        setAvailableLots([]);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('*, maestro_productos(nombre)')
          .eq('maestro_producto_id', selectedMasterProductId)
          .order('fecha_vencimiento', { ascending: true });
        
        if (error) throw error;
        setAvailableLots(data as ProductWithMaster[] || []);
      } catch (error) {
        toast.error('Error al cargar los lotes.');
        setAvailableLots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableLots();
  }, [selectedMasterProductId]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setSelectedMasterProductId('');
    setAvailableLots([]);
    setCurrentQuantities(new Map());
  };

  const handleMasterProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMasterProductId(e.target.value);
    setCurrentQuantities(new Map());
  };

  const handleQuantityChange = (lotId: string, quantityStr: string) => {
    const newQuantities = new Map(currentQuantities);
    const quantity = parseInt(quantityStr, 10);

    if (quantityStr === '' || isNaN(quantity) || quantity <= 0) {
      newQuantities.delete(lotId);
    } else {
      newQuantities.set(lotId, quantity);
    }
    setCurrentQuantities(newQuantities);
  };

  const handleAddToCart = () => {
    if (currentQuantities.size === 0) {
      toast.error('No has introducido ninguna cantidad para añadir.');
      return;
    }

    const newCart = new Map(shoppingCart);
    let itemsAdded = 0;

    currentQuantities.forEach((quantity, lotId) => {
      const lotToAdd = availableLots.find(lot => lot.id === lotId);
      if (lotToAdd) {
        const existingCartItem = newCart.get(lotId);
        const newQuantity = (existingCartItem ? existingCartItem.quantity : 0) + quantity;
        
        if (newQuantity > lotToAdd.stock_actual) {
            toast.error(`No puedes añadir más de ${lotToAdd.stock_actual} unidades del lote ${lotToAdd.numero_lote}`);
            return;
        }

        newCart.set(lotId, { lot: lotToAdd, quantity: newQuantity });
        itemsAdded++;
      }
    });

    setShoppingCart(newCart);
    setCurrentQuantities(new Map());
    if(itemsAdded > 0) toast.success(`${itemsAdded} tipo(s) de producto(s) añadido(s) al carrito.`);
  };

  const handleRemoveFromCart = (lotId: string) => {
    const newCart = new Map(shoppingCart);
    newCart.delete(lotId);
    setShoppingCart(newCart);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shoppingCart.size === 0) {
      toast.error('El carrito de salida está vacío.');
      return;
    }
    if (!motivo.trim()) {
      toast.error('Por favor, ingresa un motivo o destinatario para la salida.');
      return;
    }
    if (!user) {
      toast.error('No se pudo identificar al usuario.');
      return;
    }

    setLoading(true);

    const salidas = Array.from(shoppingCart.values()).map(item => ({
      producto_id: item.lot.id,
      cantidad: item.quantity,
    }));

    try {
      const { error } = await supabase.rpc('registrar_salida_manual', {
        p_usuario_id: user.id,
        p_motivo: motivo,
        p_salidas: salidas,
      });

      if (error) throw error;

      toast.success('Salida masiva registrada correctamente.');
      setShoppingCart(new Map());
      setMotivo('');
      setSelectedMasterProductId(''); 
      setSelectedCategory('');
      setAvailableLots([]);
      setCurrentQuantities(new Map());

    } catch (error: any) {
      console.error('Error en la salida masiva:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cartItems = Array.from(shoppingCart.values());

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Salida de Productos</h1>
        <p className="text-gray-600 mt-2">Crea un "carrito" de salida añadiendo lotes de diferentes productos.</p>
      </div>

      <Card className="p-6 space-y-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
                label="1. Filtrar por Categoría"
                value={selectedCategory}
                onChange={handleCategoryChange}
                options={categories.map(c => ({ value: c, label: c }))}
                placeholder="Todas las categorías..."
            />
            <Select
                label="2. Seleccionar Producto"
                value={selectedMasterProductId}
                onChange={handleMasterProductChange}
                options={filteredMasterProducts.map(p => ({ value: p.id, label: p.nombre }))}
                placeholder="Elige un producto para ver sus lotes..."
                disabled={!selectedCategory && filteredMasterProducts.length === 0}
            />
        </div>

        {availableLots.length > 0 && (
          <div className="overflow-x-auto pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Lotes Disponibles (Ordenados por vencimiento)</h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Lote</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condición</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Actual</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Venc.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '120px' }}>Cantidad a Retirar</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {availableLots.map((lot, index) => {
                  const isFefoRecommended = index === 0 && lot.stock_actual > 0 && lot.condicion === 'Bueno';
                  const isDispatchable = lot.stock_actual > 0;
                  const rowClassName = clsx({
                    'bg-green-50': isFefoRecommended,
                    'bg-gray-100 text-gray-400': !isDispatchable,
                  });

                  return (
                    <tr key={lot.id} className={rowClassName}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        {lot.numero_lote}
                        {isFefoRecommended && <Badge variant="default" className="ml-2 bg-green-600 text-white">FEFO</Badge>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <Badge variant={lot.condicion === 'Bueno' ? 'default' : 'destructive'}>{lot.condicion}</Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">{lot.stock_actual}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {lot.fecha_vencimiento ? format(new Date(lot.fecha_vencimiento), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Input
                          type="number"
                          min="0"
                          max={lot.stock_actual}
                          value={currentQuantities.get(lot.id) || ''}
                          onChange={(e) => handleQuantityChange(lot.id, e.target.value)}
                          className="text-sm"
                          placeholder="0"
                          disabled={!isDispatchable}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="flex justify-end mt-4">
                <Button type="button" onClick={handleAddToCart} disabled={currentQuantities.size === 0}>
                    <ShoppingCart className="w-4 h-4 mr-2"/>
                    Añadir al Carrito de Salida
                </Button>
            </div>
          </div>
        )}
      </Card>

      {/* SECCIÓN 2: CARRITO DE SALIDA */}
      {cartItems.length > 0 && (
        <Card className="p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Carrito de Salida</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Lote</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {cartItems.map(({ lot, quantity }) => (
                            <tr key={lot.id}>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lot.maestro_productos.nombre}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{lot.numero_lote}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{quantity}</td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveFromCart(lot.id)} className="text-red-600 hover:text-red-800">
                                        <Trash2 className="w-4 h-4"/>
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <form onSubmit={handleSubmit} className="pt-6 border-t border-gray-200 space-y-4">
                <Input
                    label="Motivo o Destinatario General de la Salida"
                    name="motivo"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej: Insumos para Pabellón 1, Despacho a Bodega Central, etc."
                    required
                />
                <div className="flex justify-end">
                    <Button type="submit" isLoading={loading} disabled={loading}>
                        Registrar Salida Masiva
                    </Button>
                </div>
            </form>
        </Card>
      )}
    </div>
  );
}