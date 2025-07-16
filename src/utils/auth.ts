import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '@/config';
import { Role } from '@/types';

export class AuthUtil {
  static getJwtSecret(): string {
    if (!config.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    return config.jwtSecret;
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.bcryptSaltRounds);
  }

  static async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static generateToken(payload: {
    id: string;
    email: string;
    role: Role;
  }): string {
    const options: SignOptions = {
      expiresIn: config.jwtExpiresIn,
      issuer: 'taxicom-backend',
      subject: payload.id
    };

    return jwt.sign(payload, this.getJwtSecret(), options);
  }

  static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, this.getJwtSecret()) as JwtPayload;
  }

  static decodeToken(token: string): JwtPayload | null {
    return jwt.decode(token) as JwtPayload | null;
  }

  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded?.exp) return true;
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  static getTokenAge(token: string): number {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded?.iat) return Infinity;
      return Date.now() - (decoded.iat * 1000);
    } catch {
      return Infinity;
    }
  }
}

// Token blacklist (in production, use Redis or database)
export class TokenBlacklist {
  private static blacklist = new Set<string>();

  static add(token: string): void {
    this.blacklist.add(token);
    
    // Remove token after 24 hours
    setTimeout(() => {
      this.blacklist.delete(token);
    }, 24 * 60 * 60 * 1000);
  }

  static has(token: string): boolean {
    return this.blacklist.has(token);
  }

  static remove(token: string): void {
    this.blacklist.delete(token);
  }

  static clear(): void {
    this.blacklist.clear();
  }

  static size(): number {
    return this.blacklist.size;
  }
}
