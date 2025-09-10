<script lang="ts">
    import { tick } from "svelte";
    import ModeSwitcher from "./lib/ModeSwitcher.svelte";
    import OBR from "@owlbear-rodeo/sdk";
    import { bus } from "./lib/bus";
    import { PersistedState } from "runed";
    import { IdbState } from "./lib/idb-state.svelte";
    import Icon from "./lib/icon.svelte";
    import type { RollResult } from "./lib/dice/type";
    import DiceRoll from "./lib/dice/dice-roll.svelte";
    import Bus from "./lib/bus.svelte";

    type PRoll = {
        from?: string;
        when?: string;
        roll?: RollResult;
        label?: string;
        rollModifier?: number;
        rollId?: string;
    };
    let dicelog = new IdbState<PRoll[]>("dice-log", []);
    let enlarge = new PersistedState<boolean>("enlarge-state", false);
    const rollcache = new Set<string>();

    function clear() {
        dicelog.current = [];
        rollcache.clear();
    }

    function isRoll(obj: unknown): obj is PRoll {
        return obj != null && typeof obj === "object" && "roll" in obj;
    }

    const fmtr = new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
    });
    function fmt(dateStr: string) {
        const date = new Date(dateStr);
        return fmtr.format(date);
    }

    function handleMessage(msg: { connectionId: string; data: unknown }) {
        if (typeof msg.data === "string") {
            dicelog.current.push({
                from: msg.connectionId,
                when: new Date().toISOString(),
                label: msg.data,
            });
        } else if (isRoll(msg.data)) {
            if (msg.data.rollId) {
                if (rollcache.has(msg.data.rollId)) {
                    return;
                }
                rollcache.add(msg.data.rollId);
            }
            dicelog.current.push({
                from: msg.connectionId,
                when: new Date().toISOString(),
                ...msg.data,
            });
        }
    }

    async function setupOBRIntegration() {
        if (OBR.isAvailable) {
            OBR.onReady(() => {
                OBR.broadcast.onMessage(
                    `tools.ttrpg.obr-dicelog/roll`,
                    handleMessage,
                );
            });
        }
    }

    $effect(() => {
        setupOBRIntegration();
    });

    bus.on<{ connectionId: string; data: unknown }>(
        "tools.ttrpg.obr-dicelog/roll",
        handleMessage,
    );

    const viewport = document.documentElement;
    $effect.pre(() => {
        dicelog.current.length;
        const autoscroll =
            viewport &&
            viewport.offsetHeight + viewport.scrollTop >
                viewport.scrollHeight - 50;
        if (autoscroll) {
            tick().then(() => {
                viewport.scrollTo(0, viewport.scrollHeight);
            });
        }
    });
</script>

<Bus src="https://bus.ttrpg.tools" />
<button
    type="button"
    aria-label="Clear Log"
    title="Clear Log"
    class="z-10 fixed top-0 left-0 size-10 p-2 rounded-br-md hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-500/30 backdrop-blur-sm"
    onclick={clear}
>
    <Icon icon="trash" class="size-full" />
</button>
<button
    type="button"
    aria-label="Toggle Enlarged Text"
    title="Toggle Enlarged Text"
    class={[
        "z-10 fixed top-0 left-1/2 -translate-x-1/2 size-10 p-2 cursor-pointer rounded-b-md hover:bg-gray-500/30 backdrop-blur-sm",
        enlarge.current && "text-emerald-500",
    ]}
    onclick={() => (enlarge.current = !enlarge.current)}
    ><Icon icon="enlarge" class="size-full" /></button
>
<ModeSwitcher />
<main
    class="px-2 pb-4 pt-12 mx-auto max-w-xl flex flex-col gap-2 group data-[enlarge=true]:text-2xl"
    data-enlarge={enlarge.current}
>
    {#each dicelog.current as log, lindex}
        <div
            class=" w-full border border-gray-300 dark:border-gray-600 p-2 rounded-md relative group"
        >
            {#if log.from}
                <div
                    class="bg-gray-300 dark:bg-gray-600 py-1 px-2 mb-2 w-max rounded-tl-md rounded-br-md -ml-2 -mt-2"
                >
                    {log.from}
                </div>
            {/if}
            {#if log.roll}
                <DiceRoll
                    formula={log.roll.formula}
                    result={log.roll}
                    label={log.label}
                    rollModifier={log.rollModifier}
                    enlarge={enlarge.current}
                />
            {:else if log.label}
                <span>{log.label}</span>
            {/if}

            {#if log.when}<time
                    datetime={log.when}
                    class="absolute top-1.5 right-8 text-gray-600 dark:text-gray-400 block text-sm"
                    >{fmt(log.when)}</time
                >{/if}
            <button
                type="button"
                onclick={() => dicelog.current.splice(lindex, 1)}
                aria-label="Remove entry"
                class="absolute right-2 top-2 size-4 block"
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
