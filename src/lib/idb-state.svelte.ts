import { createSubscriber } from "svelte/reactivity";
import { BROWSER } from "esm-env";
import { get, set, del } from "idb-keyval";

export type ConfigurableWindow = {
  /** Provide a custom `window` object to use in place of the global `window` object. */
  window?: typeof globalThis & Window;
};
const defaultWindow =
  BROWSER && typeof window !== "undefined" ? window : undefined;

type Serializer<T> = {
  serialize: (value: T) => any;
  deserialize: (value: any) => T | undefined;
};

type PersistedStateOptions<T> = {
  /** The serializer to use. Optional since IndexedDB can store objects directly. */
  serializer?: Serializer<T>;
  /** Whether to sync with the state changes from other tabs. Defaults to `true`. */
  syncTabs?: boolean;
} & ConfigurableWindow;

function proxy<T>(
  value: unknown,
  root: T | undefined,
  proxies: WeakMap<WeakKey, unknown>,
  subscribe: VoidFunction | undefined,
  update: VoidFunction | undefined,
  serialize: (root?: T | undefined) => Promise<void>,
): T {
  if (value === null || typeof value !== "object") {
    return value as T;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== null && proto !== Object.prototype && !Array.isArray(value)) {
    return value as T;
  }
  let p = proxies.get(value);
  if (!p) {
    p = new Proxy(value, {
      get: (target, property) => {
        subscribe?.();
        return proxy(
          Reflect.get(target, property),
          root,
          proxies,
          subscribe,
          update,
          serialize,
        );
      },
      set: (target, property, value) => {
        update?.();
        Reflect.set(target, property, value);
        serialize(root).catch((error) => {
          console.error(`Error persisting state change:`, error);
        });
        return true;
      },
    });
    proxies.set(value, p);
  }
  return p as T;
}

/**
 * Creates reactive state that is persisted and synchronized across browser sessions using IndexedDB.
 * @param key The unique key used to store the state in IndexedDB.
 * @param initialValue The initial value of the state if not already present in storage.
 * @param options Configuration options including serializer for custom data handling and whether to sync state changes across tabs.
 */
export class IdbState<T> {
  #current: T | undefined;
  #key: string;
  #serializer?: Serializer<T>;
  #subscribe?: VoidFunction;
  #update: VoidFunction | undefined;
  #proxies = new WeakMap();
  #initialized = false;
  #initPromise: Promise<void> | undefined;
  #channel: BroadcastChannel | undefined;

  constructor(
    key: string,
    initialValue: T,
    options: PersistedStateOptions<T> = {},
  ) {
    const { serializer, syncTabs = false } = options;
    const window = "window" in options ? options.window : defaultWindow;

    this.#current = initialValue;
    this.#key = key;
    this.#serializer = serializer;

    if (!BROWSER || window === undefined) return;

    // Initialize async
    this.#initPromise = this.#init(initialValue);

    this.#subscribe = createSubscriber((update) => {
      this.#update = update;
      // For cross-tab sync with IndexedDB, we could use BroadcastChannel
      if (syncTabs) {
        this.#channel = new BroadcastChannel(`persisted-state-${key}`);
        this.#channel.addEventListener("message", this.#handleBroadcastMessage);
      }
      return () => {
        this.#channel?.removeEventListener(
          "message",
          this.#handleBroadcastMessage,
        );
        this.#channel?.close();
        this.#channel = undefined;
        this.#update = undefined;
      };
    });
  }

  async #init(initialValue: T): Promise<void> {
    if (this.#initialized) return;

    try {
      const existingValue = await get(this.#key);
      if (existingValue !== undefined) {
        this.#current = this.#deserialize(existingValue);
        this.#update?.();
      } else {
        await this.#serialize(initialValue);
      }
      this.#initialized = true;
    } catch (error) {
      console.error(
        `Error initializing persisted state for key "${this.#key}":`,
        error,
      );
      this.#initialized = true; // Mark as initialized even on error to prevent infinite retries
    }
  }

  get current(): T {
    this.#subscribe?.();

    // If not initialized yet, return current value (which starts as initialValue)
    if (!this.#initialized) {
      // Trigger initialization if not already started
      this.#initPromise?.catch((error) => {
        console.error(`Error in background initialization:`, error);
      });
    }

    const root = this.#current;
    return proxy(
      root,
      root,
      this.#proxies,
      this.#subscribe?.bind(this),
      this.#update?.bind(this),
      this.#serialize.bind(this),
    );
  }

  set current(newValue: T) {
    this.#current = newValue;
    this.#serialize(newValue).catch((error) => {
      console.error(`Error persisting state:`, error);
    });
    this.#update?.();
  }

  /**
   * Ensures the state is fully initialized. Useful if you need to wait for initial load.
   */
  async ready(): Promise<void> {
    if (this.#initPromise) {
      await this.#initPromise;
    }
  }

  /**
   * Manually refresh the state from IndexedDB
   */
  async refresh(): Promise<void> {
    try {
      const value = await get(this.#key);
      if (value !== undefined) {
        this.#current = this.#deserialize(value);
        this.#update?.();
      }
    } catch (error) {
      console.error(
        `Error refreshing persisted state for key "${this.#key}":`,
        error,
      );
    }
  }

  /**
   * Clear the persisted state from IndexedDB
   */
  async clear(): Promise<void> {
    try {
      await del(this.#key);
      this.#update?.();
    } catch (error) {
      console.error(
        `Error clearing persisted state for key "${this.#key}":`,
        error,
      );
    }
  }

  #handleBroadcastMessage = (event: MessageEvent): void => {
    if (event.data?.type === "state-update" && event.data?.key === this.#key) {
      this.#current = this.#deserialize(event.data.value);
      this.#update?.();
    }
  };

  #deserialize(value: any): T | undefined {
    if (!this.#serializer) {
      return value as T;
    }

    try {
      return this.#serializer.deserialize(value);
    } catch (error) {
      console.error(
        `Error when deserializing value from persisted store "${this.#key}"`,
        error,
      );
      return;
    }
  }

  async #serialize(value: T | undefined): Promise<void> {
    try {
      if (value !== undefined) {
        const serializedValue = this.#serializer
          ? this.#serializer.serialize(value)
          : value;
        await set(this.#key, serializedValue);

        // Broadcast change to other tabs
        if (this.#channel) {
          try {
            this.#channel.postMessage({
              type: "state-update",
              key: this.#key,
              value: serializedValue,
            });
          } catch (error) {
            // BroadcastChannel might not be supported, ignore silently
          }
        }
      }
    } catch (error) {
      console.error(
        `Error when writing value from persisted store "${this.#key}" to IndexedDB`,
        error,
      );
    }
  }
}
