import type { Env } from '../env';

export type Category = 'Produce' | 'Meat' | 'Dairy' | 'Pantry' | 'Other';

export type PartnerSlot = 1 | 2;

export interface GroceryItem {
  id: string;
  householdId: string;
  name: string;
  category: Category;
  isChecked: boolean;
  addedByPartnerId: string;
  addedByPartnerSlot: PartnerSlot;
  createdAt: number;
  updatedAt: number;
}

export interface PantryItem {
  id: string;
  householdId: string;
  name: string;
  quantity: string;
  addedByPartnerId: string;
  addedByPartnerSlot: PartnerSlot;
  createdAt: number;
}

export type SyncEvent =
  | { type: 'item_added'; item: GroceryItem }
  | { type: 'item_toggled'; item: GroceryItem }
  | { type: 'item_deleted'; id: string }
  | { type: 'pantry_added'; item: PantryItem }
  | { type: 'pantry_deleted'; id: string }
  | { type: 'hello'; partnerId: string; slot: PartnerSlot; at: number };

interface GroceryItemRow {
  id: string;
  household_id: string;
  name: string;
  category: string;
  is_checked: number;
  added_by_partner_id: string;
  added_by_partner_slot: number;
  created_at: number;
  updated_at: number;
  [key: string]: string | number;
}

interface PantryItemRow {
  id: string;
  household_id: string;
  name: string;
  quantity: string;
  added_by_partner_id: string;
  added_by_partner_slot: number;
  created_at: number;
  [key: string]: string | number;
}

function rowToItem(row: GroceryItemRow): GroceryItem {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    category: row.category as Category,
    isChecked: row.is_checked === 1,
    addedByPartnerId: row.added_by_partner_id,
    addedByPartnerSlot: row.added_by_partner_slot as PartnerSlot,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPantry(row: PantryItemRow): PantryItem {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    quantity: row.quantity,
    addedByPartnerId: row.added_by_partner_id,
    addedByPartnerSlot: row.added_by_partner_slot as PartnerSlot,
    createdAt: row.created_at,
  };
}

function isCategory(value: string): value is Category {
  return value === 'Produce' || value === 'Meat' || value === 'Dairy' || value === 'Pantry' || value === 'Other';
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS grocery_items (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    is_checked INTEGER NOT NULL DEFAULT 0,
    added_by_partner_id TEXT NOT NULL,
    added_by_partner_slot INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_grocery_items_household ON grocery_items(household_id);
  CREATE INDEX IF NOT EXISTS idx_grocery_items_created ON grocery_items(created_at);

  CREATE TABLE IF NOT EXISTS pantry_items (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity TEXT NOT NULL DEFAULT '',
    added_by_partner_id TEXT NOT NULL,
    added_by_partner_slot INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_pantry_items_household ON pantry_items(household_id);
  CREATE INDEX IF NOT EXISTS idx_pantry_items_created ON pantry_items(created_at);
`;

interface ConnectedPartner {
  partnerId: string;
  slot: PartnerSlot;
}

export class HouseholdSync {
  private state: DurableObjectState;
  private env: Env;
  private initialized = false;
  private sockets = new Set<WebSocket>();
  private partnerBySocket = new WeakMap<WebSocket, ConnectedPartner>();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  private async ensureSchema(): Promise<void> {
    if (this.initialized) return;
    await this.state.storage.sql.exec(SCHEMA);
    this.initialized = true;
  }

  private broadcast(event: SyncEvent, exclude?: WebSocket): void {
    const payload = JSON.stringify(event);
    for (const socket of this.sockets) {
      if (socket === exclude) continue;
      if (socket.readyState !== WebSocket.OPEN) continue;
      try {
        socket.send(payload);
      } catch {
      }
    }
  }

  private async readPartnerFromQuery(url: URL): Promise<ConnectedPartner> {
    const partnerId = url.searchParams.get('partnerId') ?? `anon-${crypto.randomUUID().slice(0, 6)}`;
    const slotParam = url.searchParams.get('slot');
    const slot: PartnerSlot = slotParam === '2' ? 2 : 1;
    return { partnerId, slot };
  }

  async fetch(request: Request): Promise<Response> {
    await this.state.blockConcurrencyWhile(async () => {
      await this.ensureSchema();
    });

    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('expected websocket upgrade', { status: 426 });
      }
      const partner = await this.readPartnerFromQuery(url);
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.sockets.add(server);
      this.partnerBySocket.set(server, partner);
      server.accept();
      server.addEventListener('close', () => {
        this.sockets.delete(server);
      });
      server.addEventListener('error', () => {
        this.sockets.delete(server);
      });
      server.send(
        JSON.stringify({ type: 'hello', partnerId: partner.partnerId, slot: partner.slot, at: Date.now() } satisfies SyncEvent),
      );
      return new Response(null, { status: 101, webSocket: client });
    }

    await this.state.blockConcurrencyWhile(async () => {
      await this.ensureSchema();
    });

    const path = url.pathname;
    const method = request.method;

    try {
      if (path === '/items' && method === 'GET') {
        return this.json(await this.getItems());
      }
      if (path === '/items' && method === 'POST') {
        const body = (await request.json()) as {
          name: string;
          category: string;
          addedByPartnerId: string;
          addedByPartnerSlot: number;
        };
        const item = await this.addItem(body);
        this.broadcast({ type: 'item_added', item });
        return this.json(item, 201);
      }
      const toggleMatch = path.match(/^\/items\/([^/]+)\/toggle$/);
      if (toggleMatch && method === 'PATCH') {
        const itemId = toggleMatch[1] as string;
        const item = await this.toggleItem(itemId);
        this.broadcast({ type: 'item_toggled', item });
        return this.json(item);
      }
      const groceryDeleteMatch = path.match(/^\/items\/([^/]+)$/);
      if (groceryDeleteMatch && method === 'DELETE') {
        const itemId = groceryDeleteMatch[1] as string;
        const result = await this.deleteItem(itemId);
        this.broadcast({ type: 'item_deleted', id: result.id });
        return this.json(result);
      }
      if (path === '/regulars' && method === 'GET') {
        return this.json(await this.getRegulars());
      }

      if (path === '/pantry' && method === 'GET') {
        return this.json(await this.getPantryItems());
      }
      if (path === '/pantry' && method === 'POST') {
        const body = (await request.json()) as {
          name: string;
          quantity: string;
          addedByPartnerId: string;
          addedByPartnerSlot: number;
        };
        const item = await this.addPantryItem(body);
        this.broadcast({ type: 'pantry_added', item });
        return this.json(item, 201);
      }
      if (path === '/pantry/bulk' && method === 'POST') {
        const body = (await request.json()) as {
          items: Array<{ name: string; quantity: string }>;
          addedByPartnerId: string;
          addedByPartnerSlot: number;
        };
        const items = await this.addPantryItemsBulk(body);
        for (const item of items) {
          this.broadcast({ type: 'pantry_added', item });
        }
        return this.json(items, 201);
      }
      const pantryDeleteMatch = path.match(/^\/pantry\/([^/]+)$/);
      if (pantryDeleteMatch && method === 'DELETE') {
        const itemId = pantryDeleteMatch[1] as string;
        const result = await this.deletePantryItem(itemId);
        this.broadcast({ type: 'pantry_deleted', id: result.id });
        return this.json(result);
      }

      return this.json({ error: 'not_found', path, method }, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown_error';
      return this.json({ error: 'bad_request', message }, 400);
    }
  }

  private json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  private async getItems(): Promise<GroceryItem[]> {
    const cursor = this.state.storage.sql.exec<GroceryItemRow>(
      'SELECT * FROM grocery_items ORDER BY created_at ASC',
    );
    const rows = Array.from(cursor);
    return rows.map((row) => rowToItem(row));
  }

  private async getRegulars(): Promise<Array<{ name: string; count: number }>> {
    const cursor = this.state.storage.sql.exec<{ name: string; count: number }>(
      'SELECT name, COUNT(*) as count FROM grocery_items GROUP BY name ORDER BY count DESC LIMIT 15',
    );
    return Array.from(cursor);
  }

  private async addItem(body: {
    name: string;
    category: string;
    addedByPartnerId: string;
    addedByPartnerSlot: number;
  }): Promise<GroceryItem> {
    const name = (body.name ?? '').trim();
    if (!name) throw new Error('name is required');
    if (!isCategory(body.category)) throw new Error('invalid category');
    if (body.addedByPartnerSlot !== 1 && body.addedByPartnerSlot !== 2) {
      throw new Error('addedByPartnerSlot must be 1 or 2');
    }

    const householdId = (this.state.id as { toString(): string }).toString();
    const id = crypto.randomUUID();
    const now = Date.now();

    this.state.storage.sql.exec(
      `INSERT INTO grocery_items
        (id, household_id, name, category, is_checked, added_by_partner_id, added_by_partner_slot, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      id,
      householdId,
      name,
      body.category,
      body.addedByPartnerId,
      body.addedByPartnerSlot,
      now,
      now,
    );

    return {
      id,
      householdId,
      name,
      category: body.category,
      isChecked: false,
      addedByPartnerId: body.addedByPartnerId,
      addedByPartnerSlot: body.addedByPartnerSlot as PartnerSlot,
      createdAt: now,
      updatedAt: now,
    };
  }

  private async toggleItem(id: string): Promise<GroceryItem> {
    const cursor = this.state.storage.sql.exec<GroceryItemRow>(
      'SELECT * FROM grocery_items WHERE id = ?',
      id,
    );
    const existing = Array.from(cursor)[0];
    if (!existing) throw new Error('item not found');

    const newIsChecked = existing.is_checked === 1 ? 0 : 1;
    const now = Date.now();
    this.state.storage.sql.exec(
      'UPDATE grocery_items SET is_checked = ?, updated_at = ? WHERE id = ?',
      newIsChecked,
      now,
      id,
    );

    return rowToItem({ ...existing, is_checked: newIsChecked, updated_at: now });
  }

  private async deleteItem(id: string): Promise<{ id: string; deleted: true }> {
    this.state.storage.sql.exec('DELETE FROM grocery_items WHERE id = ?', id);
    return { id, deleted: true };
  }

  private async getPantryItems(): Promise<PantryItem[]> {
    const cursor = this.state.storage.sql.exec<PantryItemRow>(
      'SELECT * FROM pantry_items ORDER BY created_at ASC',
    );
    const rows = Array.from(cursor);
    return rows.map((row) => rowToPantry(row));
  }

  private async addPantryItem(body: {
    name: string;
    quantity: string;
    addedByPartnerId: string;
    addedByPartnerSlot: number;
  }): Promise<PantryItem> {
    const name = (body.name ?? '').trim();
    if (!name) throw new Error('name is required');
    if (body.addedByPartnerSlot !== 1 && body.addedByPartnerSlot !== 2) {
      throw new Error('addedByPartnerSlot must be 1 or 2');
    }

    const householdId = (this.state.id as { toString(): string }).toString();
    const id = crypto.randomUUID();
    const now = Date.now();

    this.state.storage.sql.exec(
      `INSERT INTO pantry_items
        (id, household_id, name, quantity, added_by_partner_id, added_by_partner_slot, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      householdId,
      name,
      body.quantity ?? '',
      body.addedByPartnerId,
      body.addedByPartnerSlot,
      now,
    );

    return {
      id,
      householdId,
      name,
      quantity: body.quantity ?? '',
      addedByPartnerId: body.addedByPartnerId,
      addedByPartnerSlot: body.addedByPartnerSlot as PartnerSlot,
      createdAt: now,
    };
  }

  private async addPantryItemsBulk(body: {
    items: Array<{ name: string; quantity: string }>;
    addedByPartnerId: string;
    addedByPartnerSlot: number;
  }): Promise<PantryItem[]> {
    const householdId = (this.state.id as { toString(): string }).toString();
    const now = Date.now();
    const results: PantryItem[] = [];

    for (const item of body.items) {
      const name = (item.name ?? '').trim();
      if (!name) continue;

      const id = crypto.randomUUID();
      this.state.storage.sql.exec(
        `INSERT INTO pantry_items
          (id, household_id, name, quantity, added_by_partner_id, added_by_partner_slot, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id,
        householdId,
        name,
        item.quantity ?? '',
        body.addedByPartnerId,
        body.addedByPartnerSlot,
        now,
      );

      results.push({
        id,
        householdId,
        name,
        quantity: item.quantity ?? '',
        addedByPartnerId: body.addedByPartnerId,
        addedByPartnerSlot: body.addedByPartnerSlot as PartnerSlot,
        createdAt: now,
      });
    }

    return results;
  }

  private async deletePantryItem(id: string): Promise<{ id: string; deleted: true }> {
    this.state.storage.sql.exec('DELETE FROM pantry_items WHERE id = ?', id);
    return { id, deleted: true };
  }
}
