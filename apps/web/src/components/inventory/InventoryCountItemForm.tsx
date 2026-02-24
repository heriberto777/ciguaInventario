import React from 'react';
import Button from './Button';
import Input from './Input';

interface InventoryCountItemFormProps {
  onAdd: (item: any) => void;
  locations: any[];
}

export const InventoryCountItemForm: React.FC<InventoryCountItemFormProps> = ({
  onAdd,
  locations,
}) => {
  const [formData, setFormData] = React.useState({
    locationId: '',
    itemCode: '',
    itemName: '',
    uom: 'PZ',
    systemQty: 0,
    countedQty: 0,
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['systemQty', 'countedQty'].includes(name) ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setFormData({
      locationId: '',
      itemCode: '',
      itemName: '',
      uom: 'PZ',
      systemQty: 0,
      countedQty: 0,
      notes: '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Agregar Artículo al Conteo</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Ubicación</label>
          <select
            name="locationId"
            value={formData.locationId}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Seleccionar ubicación</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.code} - {loc.description}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Código de Artículo"
          name="itemCode"
          value={formData.itemCode}
          onChange={handleChange}
          required
        />

        <Input
          label="Nombre del Artículo"
          name="itemName"
          value={formData.itemName}
          onChange={handleChange}
        />

        <div>
          <label className="block text-sm font-medium mb-1">UOM</label>
          <select
            name="uom"
            value={formData.uom}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="PZ">Piezas</option>
            <option value="KG">Kilogramos</option>
            <option value="LT">Litros</option>
            <option value="M">Metros</option>
          </select>
        </div>

        <Input
          label="Cantidad en Sistema"
          name="systemQty"
          type="number"
          step="0.01"
          value={formData.systemQty}
          onChange={handleChange}
          required
        />

        <Input
          label="Cantidad Contada"
          name="countedQty"
          type="number"
          step="0.01"
          value={formData.countedQty}
          onChange={handleChange}
          required
        />

        <div className="col-span-2">
          <Input
            label="Notas"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
          />
        </div>
      </div>

      {formData.systemQty !== formData.countedQty && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-4">
          <p className="text-sm text-yellow-800">
            Varianza: {formData.countedQty - formData.systemQty} ({formData.systemQty > 0 ? (((formData.countedQty - formData.systemQty) / formData.systemQty) * 100).toFixed(1) : '0'}%)
          </p>
        </div>
      )}

      <Button type="submit" variant="success">
        Agregar Artículo
      </Button>
    </form>
  );
};
