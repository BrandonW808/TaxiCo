// src/types/express.d.ts
import { ICustomer } from '../models/customer';

declare global {
    namespace Express {
        interface Request {
            customer?: ICustomer;
            token?: string;
            userId?: string;
            isAdmin?: boolean;
        }
    }
}
