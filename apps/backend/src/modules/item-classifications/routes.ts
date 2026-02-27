import { FastifyInstance } from 'fastify';
import { ItemClassificationsController } from './controller';
import { ItemClassificationsService } from './service';
import { tenantGuard } from '../../guards/tenant';

export async function itemClassificationsRoutes(app: FastifyInstance) {
    const service = new ItemClassificationsService(app.prisma);
    const controller = new ItemClassificationsController(service);

    const auth = { preHandler: [tenantGuard] };

    // Listado (con filtro opcional ?groupType=CATEGORY|SUBCATEGORY|BRAND|OTHER)
    app.get('/item-classifications', auth, (req, rep) => controller.list(req, rep));
    // Detalle
    app.get('/item-classifications/:id', auth, (req, rep) => controller.getOne(req, rep));
    // Crear
    app.post('/item-classifications', auth, (req, rep) => controller.create(req, rep));
    // Carga masiva desde Excel → JSON
    app.post('/item-classifications/bulk', auth, (req, rep) => controller.bulkImport(req, rep));
    // Editar
    app.put('/item-classifications/:id', auth, (req, rep) => controller.update(req, rep));
    app.patch('/item-classifications/:id', auth, (req, rep) => controller.update(req, rep));
    // Eliminar (soft)
    app.delete('/item-classifications/:id', auth, (req, rep) => controller.remove(req, rep));

    // Sincronizar desde los artículos existentes
    app.post('/item-classifications/sync-from-items', auth, (req, rep) => controller.syncFromItems(req, rep));
}
