<script lang="ts">
  import { tick } from "svelte";
  import ModeSwitcher from "./lib/ModeSwitcher.svelte";
  import OBR from "@owlbear-rodeo/sdk";

  type PRoll = { from?: string; when?: string; roll: string; meta?: string };
  let dicelog: PRoll[] = $state([]);

  function clear() {
    dicelog = [];
  }

  function isRoll(obj: unknown): obj is PRoll {
    return obj != null && typeof obj === "object" && "roll" in obj;
  }

  const fmtr = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
  function fmt(dateStr: string) {
    const date = new Date(dateStr);
    return fmtr.format(date);
  }

  async function setupOBRIntegration() {
    if (OBR.isAvailable) {
      OBR.onReady(() => {
        OBR.broadcast.onMessage(`tools.ttrpg.obr-dicelog/roll`, (msg) => {
          if (typeof msg.data === "string") {
            dicelog.push({
              from: msg.connectionId,
              when: new Date().toISOString(),
              roll: msg.data,
            });
          } else if (isRoll(msg.data)) {
            dicelog.push({
              from: msg.connectionId,
              when: new Date().toISOString(),
              ...msg.data,
            });
          }
        });
      });
    }
  }

  $effect(() => {
    setupOBRIntegration();
  });

  const viewport = document.documentElement;
  $effect.pre(() => {
    dicelog.length;
    const autoscroll =
      viewport &&
      viewport.offsetHeight + viewport.scrollTop > viewport.scrollHeight - 50;
    if (autoscroll) {
      tick().then(() => {
        viewport.scrollTo(0, viewport.scrollHeight);
      });
    }
  });
</script>

<button
  type="button"
  aria-label="Clear Log"
  class="z-10 fixed top-0 left-0 size-10 p-3 rounded-br-md hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-500/30 backdrop-blur-sm"
  onclick={clear}
>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"
    ><path
      fill="currentColor"
      d="M170.5 51.6L151.5 80l145 0-19-28.4c-1.5-2.2-4-3.6-6.7-3.6l-93.7 0c-2.7 0-5.2 1.3-6.7 3.6zm147-26.6L354.2 80 368 80l48 0 8 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-8 0 0 304c0 44.2-35.8 80-80 80l-224 0c-44.2 0-80-35.8-80-80l0-304-8 0c-13.3 0-24-10.7-24-24S10.7 80 24 80l8 0 48 0 13.8 0 36.7-55.1C140.9 9.4 158.4 0 177.1 0l93.7 0c18.7 0 36.2 9.4 46.6 24.9zM80 128l0 304c0 17.7 14.3 32 32 32l224 0c17.7 0 32-14.3 32-32l0-304L80 128zm80 64l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208c0-8.8 7.2-16 16-16s16 7.2 16 16zm80 0l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208c0-8.8 7.2-16 16-16s16 7.2 16 16zm80 0l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208c0-8.8 7.2-16 16-16s16 7.2 16 16z"
    /></svg
  >
</button>
<ModeSwitcher />
<main class="px-4 pb-4 pt-10 mx-auto max-w-xl flex flex-col gap-2">
  {#each dicelog as log, lindex}
    <div
      class=" w-full border border-gray-300 dark:border-gray-600 p-2 rounded-md relative group"
    >
      {#if log.from}<div
          class="bg-gray-300 dark:bg-gray-600 py-1 px-2 mb-2 w-max rounded-tl-md rounded-br-md -ml-2 -mt-2"
        >
          {log.from}
        </div>{/if}
      <span
        class={log.meta === "crit"
          ? `text-green-500`
          : log.meta === "miss"
            ? `text-red-500`
            : ``}>{log.roll}</span
      >
      {#if log.when}<time
          datetime={log.when}
          class="absolute top-1.5 right-8 text-gray-600 dark:text-gray-400 hidden group-hover:block text-sm"
          >{fmt(log.when)}</time
        >{/if}
      <button
        type="button"
        onclick={() => dicelog.splice(lindex, 1)}
        aria-label="Remove entry"
        class="absolute right-2 top-2 size-4 hidden group-hover:block"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"
          ><path
            fill="currentColor"
            d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"
          /></svg
        >
      </button>
    </div>
  {/each}
</main>
