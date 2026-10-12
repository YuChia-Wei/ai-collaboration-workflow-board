import { defineConfig } from 'drizzle-kit';
export default defineConfig({out:'./backend/schema/migrations',schema:'./backend/schema/schema.ts',dialect:'sqlite'});
