import { defineConfig } from 'drizzle-kit';
export default defineConfig({out:'./schema/migrations',schema:'./schema/schema.ts',dialect:'sqlite'});
