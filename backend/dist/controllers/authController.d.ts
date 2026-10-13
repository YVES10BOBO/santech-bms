import { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
export declare function login(req: Request, res: Response): Promise<void>;
export declare function getMe(req: AuthRequest, res: Response): Promise<void>;
export declare function changePassword(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=authController.d.ts.map