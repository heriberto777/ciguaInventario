# 🛠️ GUÍA DE CORRECCIÓN - EJEMPLOS Y SOLUCIONES

## 📋 Índice Rápido

1. [Template Mutation Completo](#template-mutation-completo)
2. [Patrones de Validación](#patrones-de-validación)
3. [Error Handling](#error-handling)
4. [Confirmaciones Custom](#confirmaciones-custom)
5. [Estados Consistentes](#estados-consistentes)

---

## Template Mutation Completo

### ❌ ANTES (Problema)
```tsx
const deleteMutation = useMutation({
  mutationFn: async (id: string) => {
    const res = await apiClient.delete(`/items/${id}`);
    return res.data;
  },
  onSuccess: () => {
    refetch();
  },
  // ❌ NO onError
  // ❌ NO validación pre-mutate
});

const handleDelete = (id: string) => {
  // ❌ Sin confirmación clara
  deleteMutation.mutate(id);
};

// ❌ Sin disabled
<button onClick={() => handleDelete(item.id)}>
  {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
</button>
```

### ✅ DESPUÉS (Corrección)
```tsx
const [deleteError, setDeleteError] = useState<string | null>(null);

const deleteMutation = useMutation({
  mutationFn: async (id: string) => {
    // Pre-validación
    if (!id?.trim()) {
      throw new Error('ID is required');
    }

    const res = await apiClient.delete(`/items/${id}`);
    if (!res.data) throw new Error('No data returned');
    return res.data;
  },
  onSuccess: () => {
    toast.success('Item deleted successfully');
    setDeleteError(null);
    refetch();
  },
  onError: (error: any) => {
    const message = error?.response?.data?.message || error.message || 'Failed to delete';
    setDeleteError(message);
    toast.error(message);
  },
});

const handleDelete = (id: string) => {
  setDeleteError(null);
  deleteMutation.mutate(id);
};

// ✅ Con disabled
<button
  onClick={() => handleDelete(item.id)}
  disabled={deleteMutation.isPending}
  className={deleteMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}
>
  {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
</button>

{deleteError && (
  <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded">
    {deleteError}
  </div>
)}
```

---

## Patrones de Validación

### Patrón 1: Validación Pre-Submit
```tsx
// Para formularios simples
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  // Validación 1: Campos requeridos
  if (!formData.name?.trim()) {
    setError('Name is required');
    return;
  }

  // Validación 2: Email válido
  if (!isValidEmail(formData.email)) {
    setError('Email is not valid');
    return;
  }

  // Validación 3: Longitud
  if (formData.name.length < 3) {
    setError('Name must be at least 3 characters');
    return;
  }

  // Validación 4: Valores únicos
  if (items.some(item => item.name === formData.name)) {
    setError('Name already exists');
    return;
  }

  // Si pasó todas las validaciones
  setError(null);
  createMutation.mutate(formData);
};

<form onSubmit={handleSubmit}>
  <input
    value={formData.name}
    onChange={e => {
      setFormData({ ...formData, name: e.target.value });
      setError(null); // Limpiar error cuando el usuario empieza a escribir
    }}
  />
  {error && <p className="text-red-600">{error}</p>}
  <button type="submit" disabled={createMutation.isPending || !formData.name?.trim()}>
    {createMutation.isPending ? 'Guardando...' : 'Guardar'}
  </button>
</form>
```

### Patrón 2: Validación en Mutation
```tsx
const createMutation = useMutation({
  mutationFn: async (data: IForm) => {
    // Validación en mutation permite validar contra base de datos
    const existingRes = await apiClient.get(`/items?name=${data.name}`);
    if (existingRes.data.length > 0) {
      throw new Error('Name already exists in database');
    }

    const res = await apiClient.post('/items', data);
    return res.data;
  },
  onSuccess: () => {
    toast.success('Creado exitosamente');
    refetch();
  },
  onError: (error: any) => {
    setError(error.message);
    toast.error(error.message);
  },
});
```

### Patrón 3: Validación Incremental
```tsx
const [formErrors, setFormErrors] = useState({
  name: '',
  email: '',
  phone: '',
});

const validateField = (field: string, value: string) => {
  let error = '';

  switch (field) {
    case 'name':
      if (!value?.trim()) error = 'Name is required';
      if (value?.length < 3) error = 'Name must be at least 3 characters';
      break;
    case 'email':
      if (!value?.trim()) error = 'Email is required';
      if (!isValidEmail(value)) error = 'Email is not valid';
      break;
    case 'phone':
      if (!value?.trim()) error = 'Phone is required';
      if (!isValidPhone(value)) error = 'Phone is not valid';
      break;
  }

  setFormErrors(prev => ({ ...prev, [field]: error }));
  return error === '';
};

const handleInputChange = (field: string, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }));
  validateField(field, value);
};

const handleSubmit = () => {
  // Validar todos los campos
  let isValid = true;
  Object.entries(formData).forEach(([field, value]) => {
    if (!validateField(field, value as string)) {
      isValid = false;
    }
  });

  if (!isValid) return;

  createMutation.mutate(formData);
};

<form>
  <div>
    <input
      value={formData.name}
      onChange={e => handleInputChange('name', e.target.value)}
    />
    {formErrors.name && <p className="text-red-600 text-sm">{formErrors.name}</p>}
  </div>

  <div>
    <input
      value={formData.email}
      onChange={e => handleInputChange('email', e.target.value)}
    />
    {formErrors.email && <p className="text-red-600 text-sm">{formErrors.email}</p>}
  </div>

  <button
    type="submit"
    onClick={handleSubmit}
    disabled={
      createMutation.isPending ||
      Object.values(formErrors).some(err => err !== '') ||
      !Object.values(formData).every(val => val?.trim())
    }
  >
    {createMutation.isPending ? 'Guardando...' : 'Guardar'}
  </button>
</form>
```

---

## Error Handling

### Patrón 1: Error Local + Toast
```tsx
const [error, setError] = useState<string | null>(null);

const deleteMutation = useMutation({
  mutationFn: async (id: string) => {
    const res = await apiClient.delete(`/items/${id}`);
    return res.data;
  },
  onSuccess: () => {
    toast.success('Deleted successfully');
    setError(null);
    refetch();
  },
  onError: (error: any) => {
    const message = error?.response?.data?.message || error.message || 'Error';
    setError(message);
    toast.error(message);
  },
});

// En JSX
{error && (
  <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded flex justify-between">
    <span>{error}</span>
    <button onClick={() => setError(null)}>×</button>
  </div>
)}
```

### Patrón 2: Error con Retry
```tsx
const createMutation = useMutation({
  mutationFn: async (data) => {
    const res = await apiClient.post('/items', data);
    return res.data;
  },
  onSuccess: () => {
    toast.success('Created successfully');
    refetch();
  },
  onError: (error: any) => {
    setError({
      message: error.message,
      timestamp: new Date(),
      retryable: error.response?.status === 500, // Solo reintentar errores del servidor
    });
  },
});

{error && (
  <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded">
    <p>{error.message}</p>
    {error.retryable && (
      <button
        onClick={() => {
          setError(null);
          createMutation.mutate(formData);
        }}
        className="mt-2 bg-red-600 text-white px-3 py-1 rounded"
      >
        Reintentar
      </button>
    )}
  </div>
)}
```

### Patrón 3: Error Categorizado
```tsx
type ErrorType = 'VALIDATION' | 'NETWORK' | 'SERVER' | 'UNKNOWN';

const getErrorType = (error: any): ErrorType => {
  if (error.response?.status === 400) return 'VALIDATION';
  if (error.code === 'ERR_NETWORK') return 'NETWORK';
  if (error.response?.status >= 500) return 'SERVER';
  return 'UNKNOWN';
};

const getErrorMessage = (error: any, type: ErrorType): string => {
  switch (type) {
    case 'VALIDATION':
      return error.response?.data?.message || 'Please check your input';
    case 'NETWORK':
      return 'Network error. Please check your connection.';
    case 'SERVER':
      return 'Server error. Please try again later.';
    default:
      return error.message || 'Unknown error';
  }
};

const deleteMutation = useMutation({
  mutationFn: async (id: string) => {
    const res = await apiClient.delete(`/items/${id}`);
    return res.data;
  },
  onError: (error: any) => {
    const type = getErrorType(error);
    const message = getErrorMessage(error, type);

    setError({ message, type });
    toast.error(message);

    // Log para debugging
    if (type === 'SERVER') {
      console.error('Server error:', error);
    }
  },
});

// En JSX
{error && (
  <div className={`p-3 rounded border ${
    error.type === 'NETWORK' ? 'bg-yellow-50 border-yellow-200' :
    error.type === 'SERVER' ? 'bg-red-50 border-red-200' :
    'bg-orange-50 border-orange-200'
  }`}>
    {error.message}
  </div>
)}
```

---

## Confirmaciones Custom

### Patrón 1: Dialog Simple
```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const [confirmDelete, setConfirmDelete] = useState(false);

const deleteMutation = useMutation({
  mutationFn: async (id: string) => {
    const res = await apiClient.delete(`/items/${id}`);
    return res.data;
  },
  onSuccess: () => {
    toast.success('Deleted successfully');
    setConfirmDelete(false);
    refetch();
  },
  onError: (error: any) => {
    toast.error(error.message);
  },
});

<AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
  <AlertDialogContent>
    <AlertDialogTitle>Delete Item</AlertDialogTitle>
    <AlertDialogDescription>
      Are you sure? This action cannot be undone.
    </AlertDialogDescription>
    <div className="flex justify-end gap-2">
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={() => deleteMutation.mutate(itemId)}
        disabled={deleteMutation.isPending}
        className="bg-red-600 hover:bg-red-700"
      >
        {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
      </AlertDialogAction>
    </div>
  </AlertDialogContent>
</AlertDialog>

<button onClick={() => setConfirmDelete(true)}>Delete</button>
```

### Patrón 2: Confirmación con Información Contextual
```tsx
const [deleteConfirm, setDeleteConfirm] = useState<{
  open: boolean;
  item: any | null;
}>({
  open: false,
  item: null,
});

const handleDeleteClick = (item: any) => {
  setDeleteConfirm({ open: true, item });
};

<AlertDialog open={deleteConfirm.open} onOpenChange={(open) =>
  setDeleteConfirm({ ...deleteConfirm, open })
}>
  <AlertDialogContent>
    <AlertDialogTitle>Delete "{deleteConfirm.item?.name}"</AlertDialogTitle>
    <AlertDialogDescription>
      <div className="space-y-2">
        <p>Are you sure you want to delete this item?</p>
        <div className="bg-gray-50 p-2 rounded text-sm">
          <p><strong>Code:</strong> {deleteConfirm.item?.code}</p>
          <p><strong>Type:</strong> {deleteConfirm.item?.type}</p>
          <p><strong>Created:</strong> {new Date(deleteConfirm.item?.createdAt).toLocaleDateString()}</p>
        </div>
        <p className="text-red-600 font-semibold">⚠️ This action cannot be undone.</p>
      </div>
    </AlertDialogDescription>
    <div className="flex justify-end gap-2">
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={() => {
          deleteMutation.mutate(deleteConfirm.item.id);
        }}
        disabled={deleteMutation.isPending}
        className="bg-red-600 hover:bg-red-700"
      >
        {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
      </AlertDialogAction>
    </div>
  </AlertDialogContent>
</AlertDialog>
```

---

## Estados Consistentes

### Patrón 1: Pending vs Loading
```tsx
// ❌ MAL: Usar isLoading e isPending inconsistentemente
const query = useQuery({
  queryKey: ['items'],
  queryFn: () => apiClient.get('/items'),
});

const mutation = useMutation({
  mutationFn: async (data) => apiClient.post('/items', data),
});

// ¿Cuál usar en los botones?
<button disabled={query.isLoading || mutation.isPending}>
  Confuso: ¿isLoading o isPending?
</button>

// ✅ BIEN: Usar variable clara
const isOperating = query.isLoading || mutation.isPending;

<button disabled={isOperating}>
  {isOperating ? 'Procesando...' : 'Guardar'}
</button>
```

### Patrón 2: Estados de Formulario
```tsx
const [formState, setFormState] = useState<'idle' | 'validating' | 'submitting'>('idle');

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validar
  setFormState('validating');
  const errors = validate(formData);

  if (Object.keys(errors).length > 0) {
    setFormErrors(errors);
    setFormState('idle');
    return;
  }

  // Enviar
  setFormState('submitting');
  createMutation.mutate(formData);
};

const isDisabled = formState === 'validating' || formState === 'submitting';

<form onSubmit={handleSubmit}>
  <input disabled={isDisabled} />
  <button disabled={isDisabled}>
    {formState === 'validating' && 'Validando...'}
    {formState === 'submitting' && 'Guardando...'}
    {formState === 'idle' && 'Guardar'}
  </button>
</form>
```

### Patrón 3: Estados Compartidos
```tsx
// Para páginas con múltiples operaciones (crear/editar/eliminar)
const [operationState, setOperationState] = useState<{
  type: 'create' | 'update' | 'delete' | null;
  id?: string;
  status: 'idle' | 'pending' | 'success' | 'error';
  error?: string;
}>({
  type: null,
  status: 'idle',
});

const createMutation = useMutation({
  mutationFn: async (data) => {
    setOperationState({ type: 'create', status: 'pending' });
    const res = await apiClient.post('/items', data);
    return res.data;
  },
  onSuccess: (data) => {
    setOperationState({ type: 'create', status: 'success' });
    setTimeout(() => setOperationState({ type: null, status: 'idle' }), 2000);
    refetch();
  },
  onError: (error: any) => {
    setOperationState({
      type: 'create',
      status: 'error',
      error: error.message,
    });
  },
});

// En JSX
const isCreating = operationState.type === 'create' && operationState.status === 'pending';

<button disabled={isCreating}>
  {isCreating ? 'Creando...' : 'Crear'}
</button>

{operationState.type === 'create' && operationState.status === 'error' && (
  <div className="bg-red-50 p-3 rounded text-red-800">
    {operationState.error}
  </div>
)}
```

---

## Lista de Verificación Rápida

Para cada botón que hace mutación:

- [ ] ¿Tiene `disabled={mutation.isPending}`?
- [ ] ¿Cambia el texto durante operación?
- [ ] ¿Hay `onError` handler en mutation?
- [ ] ¿Se muestra error al usuario?
- [ ] ¿Se valida antes de `mutate()`?
- [ ] ¿Se hace confirmación para operaciones destructivas?
- [ ] ¿Hay toast/notification de éxito?
- [ ] ¿El estado se resetea después?

---

Generado: 21 de febrero de 2026
