<script lang="ts">
    import Icon from "../icon.svelte";
    import Die from "./die.svelte";
    import type { RollResult } from "./type";

    type Props = {
        formula: string;
        label?: string;
        rollModifier?: number;
        result: RollResult;
        enlarge?: boolean;
    };
    let {
        formula,
        label = "",
        rollModifier = 0,
        result,
        enlarge = false,
    }: Props = $props();

    const modDisplay =
        Math.abs(rollModifier) === 1 ? "" : ` ${Math.abs(rollModifier)}`;
</script>

<div class="flex flex-col gap-2 group" data-enlarge={enlarge}>
    <div class="">
        Rolled {formula}{label ? ` (${label})` : ``}
        {rollModifier === 0
            ? ``
            : `with${modDisplay} ${rollModifier < 0 ? `dis` : ""}advantage`}
    </div>
    <div class="flex items-center gap-4">
        <div
            class="text-2xl font-bold group-data-[enlarge=true]:text-5xl {result.isCrit
                ? `text-green-500`
                : result.isMiss
                  ? `text-red-500`
                  : ``}"
        >
            {result.value}
        </div>
        <div class="flex gap-2 rounded-md border border-gray-400 p-2">
            {#each result.dice as die}
                <div class="flex flex-col items-center gap-1">
                    {#if die.type === "vicious"}
                        <Icon
                            icon="dice-vicious"
                            class="size-4 group-data-[enlarge=true]:size-8"
                        />
                    {:else if die.type === "exploded"}
                        <Icon
                            icon="dice-explode"
                            class="size-4 group-data-[enlarge=true]:size-8"
                        />
                    {:else if die.type === "dropped"}
                        <Icon
                            icon="x"
                            class="size-4 group-data-[enlarge=true]:size-8"
                        />
                    {:else}
                        <Die
                            sides={die.sides}
                            class="size-4 group-data-[enlarge=true]:size-8"
                        />
                    {/if}
                    <div
                        class="{die.isMax ? `text-green-500` : ''} {die.isMin
                            ? `text-red-500`
                            : ``}"
                    >
                        {die.value}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>
