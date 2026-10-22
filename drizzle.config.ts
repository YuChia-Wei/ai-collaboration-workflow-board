import { defineConfig } from 'drizzle-kit';
export default defineConfig({out:'./src/Infrastructure/Persistence/D1/Migrations',schema:'./src/Infrastructure/Persistence/D1/schema.ts',dialect:'sqlite'});
