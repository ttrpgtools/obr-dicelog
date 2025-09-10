import { defineConfig } from "vite";
import tailwind from "@tailwindcss/vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwind(), svelte()],
});
