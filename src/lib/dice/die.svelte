<script lang="ts">
    import { knownDie } from "./index";
    import Icon from "../icon.svelte";

    type Props = {
        sides: number;
        class?: string;
    };
    let { sides, class: className }: Props = $props();
    let icon = $derived(knownDie(sides) ? `dice-d${sides}` : "dice-unknown");
</script>

<Icon {icon} class={className} />
