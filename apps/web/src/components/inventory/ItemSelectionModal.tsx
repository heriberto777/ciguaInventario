import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/atoms/Modal';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { getApiClient } from '@/services/api';

const apiClient = getApiClient();

interface ItemSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedItemCodes: string[]) => void;
    mappingId: string;
    warehouseId: string;
}

interface ItemPreview {
    itemCode: string;
    itemName: string;
    category?: string;
    brand?: string;
    systemQty: number;
}

export const ItemSelectionModal: React.FC<ItemSelectionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    mappingId,
    warehouseId,
}) => {
    const [categories, setCategories] = useState<any[]>([]);
    const [brands, setBrands] = useState<any[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
    const [randomLimit, setRandomLimit] = useState<number | ''>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [items, setItems] = useState<ItemPreview[]>([]);
    const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchClassifications();
        }
    }, [isOpen]);

    const fetchClassifications = async () => {
        try {
            setLoading(true);
            const [catsRes, brandsRes] = await Promise.all([
                apiClient.get('/item-classifications?groupType=CATEGORY'),
                apiClient.get('/item-classifications?groupType=BRAND'),
            ]);
            setCategories(catsRes.data?.data || catsRes.data || []);
            setBrands(brandsRes.data?.data || brandsRes.data || []);
        } catch (error) {
            console.error('Error fetching classifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = async () => {
        try {
            setSearching(true);
            const response = await apiClient.post('/inventory-counts/preview-erp-items', {
                warehouseId,
                mappingId,
                category: selectedCategories.length > 0 ? selectedCategories : undefined,
                brand: selectedBrands.length > 0 ? selectedBrands : undefined,
                randomLimit: randomLimit ? Number(randomLimit) : undefined,
            });

            const newItems = response.data?.items || [];
            setItems(newItems);

            // Por defecto, seleccionar todos los del preview
            setSelectedCodes(new Set(newItems.map((i: any) => i.itemCode)));
        } catch (error) {
            console.error('Error previewing items:', error);
        } finally {
            setSearching(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleSelectAll = () => {
        if (selectedCodes.size === filteredItems.length && filteredItems.length > 0) {
            setSelectedCodes(new Set());
        } else {
            setSelectedCodes(new Set(filteredItems.map(i => i.itemCode)));
        }
    };

    const toggleItem = (code: string) => {
        const next = new Set(selectedCodes);
        if (next.has(code)) {
            next.delete(code);
        } else {
            next.add(code);
        }
        setSelectedCodes(next);
    };

    const handleConfirm = () => {
        onConfirm(Array.from(selectedCodes));
        onClose();
    };

    const handleAddFilter = (type: 'category' | 'brand', value: string) => {
        if (!value) return;
        if (type === 'category') {
            if (!selectedCategories.includes(value)) setSelectedCategories([...selectedCategories, value]);
        } else {
            if (!selectedBrands.includes(value)) setSelectedBrands([...selectedBrands, value]);
        }
    };

    const removeFilter = (type: 'category' | 'brand', value: string) => {
        if (type === 'category') {
            setSelectedCategories(selectedCategories.filter(v => v !== value));
        } else {
            setSelectedBrands(selectedBrands.filter(v => v !== value));
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="🎲 Selección Aleatoria y Filtros Dinámicos"
            size="lg"
            footer={
                <div className="flex justify-between w-full items-center">
                    <span className="text-sm text-gray-500">
                        {selectedCodes.size} ítems seleccionados
                    </span>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" onClick={onClose} className="h-10 px-6">Cancelar</Button>
                        <Button
                            variant="primary"
                            onClick={handleConfirm}
                            disabled={selectedCodes.size === 0}
                            className="h-10 px-6 shadow-md"
                        >
                            Confirmar Selección
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                {/* Filtros */}
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-gray-700 font-semibold">Categorías</Label>
                            <select
                                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                onChange={(e) => {
                                    handleAddFilter('category', e.target.value);
                                    e.target.value = "";
                                }}
                            >
                                <option value="">+ Agregar Categoría...</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.code}>{c.description}</option>
                                ))}
                            </select>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {selectedCategories.map(cat => (
                                    <span key={cat} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                        {cat}
                                        <button onClick={() => removeFilter('category', cat)} className="ml-1 text-blue-500 hover:text-blue-700">&times;</button>
                                    </span>
                                ))}
                                {selectedCategories.length === 0 && <span className="text-xs text-gray-400 italic">Todas</span>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-gray-700 font-semibold">Marcas</Label>
                            <select
                                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                onChange={(e) => {
                                    handleAddFilter('brand', e.target.value);
                                    e.target.value = "";
                                }}
                            >
                                <option value="">+ Agregar Marca...</option>
                                {brands.map((b) => (
                                    <option key={b.id} value={b.code}>{b.description}</option>
                                ))}
                            </select>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {selectedBrands.map(brand => (
                                    <span key={brand} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                                        {brand}
                                        <button onClick={() => removeFilter('brand', brand)} className="ml-1 text-purple-500 hover:text-purple-700">&times;</button>
                                    </span>
                                ))}
                                {selectedBrands.length === 0 && <span className="text-xs text-gray-400 italic">Todas</span>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-gray-700 font-semibold">Límite Aleatorio</Label>
                            <Input
                                type="number"
                                placeholder="Ej: 50"
                                className="h-11 rounded-xl shadow-sm"
                                value={randomLimit}
                                onChange={(e) => setRandomLimit(e.target.value ? parseInt(e.target.value) : '')}
                            />
                            <p className="text-[10px] text-gray-400 mt-1 italic">Vea todos dejando este campo vacío</p>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button
                            variant="primary"
                            className="w-full h-12 rounded-xl text-base shadow-lg shadow-blue-500/20"
                            onClick={handlePreview}
                            isLoading={searching}
                        >
                            🚀 Previsualizar Productos
                        </Button>
                    </div>
                </div>

                {/* Buscador y Tabla de Resultados */}
                <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                            <Input
                                placeholder="Filtrar por código o nombre en los resultados..."
                                className="pl-10 h-10 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {searchTerm && (
                            <Button variant="secondary" size="sm" onClick={() => setSearchTerm('')} className="h-10 px-4">
                                Limpiar
                            </Button>
                        )}
                    </div>

                    <div className="border rounded-xl overflow-hidden bg-white">
                        <div className="max-h-[400px] overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 border-b">
                                            <input
                                                type="checkbox"
                                                checked={filteredItems.length > 0 && selectedCodes.size === filteredItems.length}
                                                onChange={toggleSelectAll}
                                                className="rounded border-gray-300"
                                            />
                                        </th>
                                        <th className="px-4 py-3 border-b font-semibold text-gray-700 whitespace-nowrap">Código</th>
                                        <th className="px-4 py-3 border-b font-semibold text-gray-700 whitespace-nowrap">Descripción</th>
                                        <th className="px-4 py-3 border-b font-semibold text-gray-700 whitespace-nowrap">Categoría</th>
                                        <th className="px-4 py-3 border-b font-semibold text-gray-700 whitespace-nowrap">Marca</th>
                                        <th className="px-4 py-3 border-b font-semibold text-gray-700 text-right whitespace-nowrap">Stock</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                                                {searching ? 'Buscando ítems en el ERP...' : searchTerm ? 'No hay resultados que coincidan con la búsqueda' : 'Usa los filtros y haz clic en Previsualizar'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredItems.map((item) => (
                                            <tr
                                                key={item.itemCode}
                                                className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedCodes.has(item.itemCode) ? 'bg-blue-50/50' : ''}`}
                                                onClick={() => toggleItem(item.itemCode)}
                                            >
                                                <td className="px-4 py-3 border-b">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCodes.has(item.itemCode)}
                                                        onChange={() => { }} // Manejado por tr onClick
                                                        className="rounded border-gray-300 text-blue-600"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 border-b font-mono text-xs">{item.itemCode}</td>
                                                <td className="px-4 py-3 border-b">{item.itemName}</td>
                                                <td className="px-4 py-3 border-b text-xs text-gray-500">{item.category || '-'}</td>
                                                <td className="px-4 py-3 border-b text-xs text-gray-500">{item.brand || '-'}</td>
                                                <td className="px-4 py-3 border-b text-right font-medium">{item.systemQty}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {items.length > 0 && (
                    <p className="text-xs text-gray-500 italic">
                        * Se muestran los primeros 100 resultados de la previsualización. Al confirmar, se cargarán todos los ítems seleccionados.
                    </p>
                )}
            </div>
        </Modal>
    );
};
