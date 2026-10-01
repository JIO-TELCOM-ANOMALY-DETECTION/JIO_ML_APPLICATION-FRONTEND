import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],test:{environment:'jsdom',setupFiles:'./src/test/setup.ts',globals:true,restoreMocks:true,maxWorkers:1,testTimeout:15000}});
