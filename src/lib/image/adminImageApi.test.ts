import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import handler, { verifyUserRole } from '../../../api/admin/upload-image';

describe('Admin Image Upload Serverless API (/api/admin/upload-image)', () => {
  describe('HTTP Protocol & Preflight', () => {
    it('rejects non-POST methods with 405 Method Not Allowed', async () => {
      let statusCode = 0;
      let jsonBody: any = null;

      const req = {
        method: 'GET',
        headers: {},
      };

      const res = {
        setHeader: () => {},
        writeHead: (status: number) => { statusCode = status; },
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => { jsonBody = data; },
          };
        },
        end: (data?: string) => {
          if (data && !jsonBody) {
            try { jsonBody = JSON.parse(data); } catch {}
          }
        },
      };

      await handler(req, res);
      assert.equal(statusCode, 405);
      assert.match(jsonBody?.error || '', /method not allowed/i);
    });

    it('rejects requests missing Authorization header with 401 Unauthorized', async () => {
      let statusCode = 0;
      let jsonBody: any = null;

      const req = {
        method: 'POST',
        headers: {},
        body: {},
      };

      const res = {
        setHeader: () => {},
        writeHead: (status: number) => { statusCode = status; },
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => { jsonBody = data; },
          };
        },
        end: (data?: string) => {
          if (data && !jsonBody) {
            try { jsonBody = JSON.parse(data); } catch {}
          }
        },
      };

      await handler(req, res);
      assert.equal(statusCode, 401);
      assert.match(jsonBody?.error || '', /missing or invalid authorization header/i);
    });

    it('rejects invalid or forged Authorization bearer token with 401 Unauthorized', async () => {
      let statusCode = 0;
      let jsonBody: any = null;

      const req = {
        method: 'POST',
        headers: {
          authorization: 'Bearer fake_invalid_jwt_token_12345',
        },
        body: {},
      };

      const res = {
        setHeader: () => {},
        writeHead: (status: number) => { statusCode = status; },
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => { jsonBody = data; },
          };
        },
        end: (data?: string) => {
          if (data && !jsonBody) {
            try { jsonBody = JSON.parse(data); } catch {}
          }
        },
      };

      await handler(req, res);
      assert.equal(statusCode, 401);
      assert.match(jsonBody?.error || '', /invalid or expired authentication session/i);
    });

    it('handles CORS OPTIONS preflight with 204 No Content', async () => {
      let statusCode = 0;
      let ended = false;

      const req = {
        method: 'OPTIONS',
        headers: {},
      };

      const res = {
        setHeader: () => {},
        writeHead: (status: number) => { statusCode = status; },
        status: (code: number) => {
          statusCode = code;
          return {
            end: () => { ended = true; },
          };
        },
        end: () => { ended = true; },
      };

      await handler(req, res);
      assert.equal(statusCode, 204);
      assert.equal(ended, true);
    });
  });

  describe('Server-Side Role Authorization Rules', () => {
    it('rejects null/undefined user', async () => {
      assert.equal(await verifyUserRole(null), false);
      assert.equal(await verifyUserRole(undefined), false);
    });

    it('rejects normal CUSTOMER user role', async () => {
      const customer = {
        id: 'cust-123',
        email: 'customer@gmail.com',
        user_metadata: { role: 'CUSTOMER' },
      };
      assert.equal(await verifyUserRole(customer), false);
    });

    it('rejects STAFF role (only ADMIN and MANAGER are permitted)', async () => {
      const staff = {
        id: 'staff-123',
        email: 'staff@gmail.com',
        user_metadata: { role: 'STAFF' },
      };
      assert.equal(await verifyUserRole(staff), false);
    });

    it('authorizes user with MANAGER role', async () => {
      const manager = {
        id: 'mgr-123',
        email: 'manager@example.com',
        user_metadata: { role: 'MANAGER' },
      };
      assert.equal(await verifyUserRole(manager), true);
    });

    it('authorizes user with ADMIN role', async () => {
      const admin = {
        id: 'adm-123',
        email: 'admin@example.com',
        user_metadata: { role: 'ADMIN' },
      };
      assert.equal(await verifyUserRole(admin), true);
    });

    it('authorizes whitelisted primary admin email', async () => {
      const emailAdmin = {
        id: 'primary-adm-123',
        email: 'palakenterprises198@gmail.com',
        user_metadata: {},
      };
      assert.equal(await verifyUserRole(emailAdmin), true);
    });

    it('authorizes user whose role is stored in Supabase user_roles table', async () => {
      const dbUser = {
        id: 'db-adm-456',
        email: 'dbuser@example.com',
        user_metadata: {},
      };

      const mockSupabase = {
        from: (table: string) => ({
          select: () => ({
            eq: () => Promise.resolve({
              data: table === 'user_roles' ? [{ role: 'ADMIN' }] : null,
            }),
          }),
        }),
      };

      assert.equal(await verifyUserRole(dbUser, mockSupabase), true);
    });
  });
});
