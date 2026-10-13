import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
export declare function getClients(req: AuthRequest, res: Response): Promise<void>;
export declare function getClient(req: AuthRequest, res: Response): Promise<void>;
export declare function createClient(req: AuthRequest, res: Response): Promise<void>;
export declare function updateClient(req: AuthRequest, res: Response): Promise<void>;
export declare function deleteClient(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=clientsController.d.ts.map