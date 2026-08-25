"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  brands as seedBrands,
  channels as seedChannels,
  storeConnections as seedStores,
  conversations as seedConversations,
  messagesByConversation as seedMessages,
  orders as seedOrders,
  abandonedCarts as seedCarts,
  mlQuestions as seedMl,
  leads as seedLeads,
  campaigns as seedCampaigns,
} from "./mock-data";
import {
  pipelineStages as seedStages,
  deals as seedDeals,
  agents as seedAgents,
  queues as seedQueues,
  quickReplies as seedQuickReplies,
  helpdeskSettings as seedHelpdesk,
  products as seedProducts,
  businessLabels as seedLabels,
  broadcasts as seedBroadcasts,
} from "./mock-crm";
import type {
  Brand,
  Channel,
  StoreConnection,
  Conversation,
  Message,
  Order,
  AbandonedCart,
  MLQuestion,
  Lead,
  Campaign,
  BusinessSettings,
  IntegrationConfig,
  IntegrationKey,
  PipelineStage,
  Deal,
  DealNote,
  DealTask,
  Agent,
  Queue,
  QuickReply,
  HelpdeskSettings,
  Product,
  BusinessLabel,
  Broadcast,
  TicketNote,
} from "./types";

const uid = (p: string) =>
  `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

const defaultSettings: BusinessSettings = {
  businessName: "",
  ownerName: "",
  email: "",
  phone: "",
  country: "Argentina",
  currency: "ARS",
  timezone: "America/Argentina/Buenos_Aires",
};

interface DataState {
  onboardingDone: boolean;
  usingSampleData: boolean;
  settings: BusinessSettings;
  integrations: Record<string, IntegrationConfig>;

  brands: Brand[];
  channels: Channel[];
  stores: StoreConnection[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  orders: Order[];
  carts: AbandonedCart[];
  mlQuestions: MLQuestion[];
  leads: Lead[];
  campaigns: Campaign[];

  // CRM / helpdesk
  pipelineStages: PipelineStage[];
  deals: Deal[];
  agents: Agent[];
  queues: Queue[];
  quickReplies: QuickReply[];
  helpdesk: HelpdeskSettings;
  products: Product[];
  labels: BusinessLabel[];
  broadcasts: Broadcast[];

  // onboarding
  completeOnboarding: (opts: {
    sample: boolean;
    settings?: Partial<BusinessSettings>;
    firstBrand?: { name: string; logo: string; color: string; industry: string };
  }) => void;
  resetToSample: () => void;

  // settings + integrations
  updateSettings: (patch: Partial<BusinessSettings>) => void;
  saveIntegration: (key: IntegrationKey, fields: Record<string, string>, enabled: boolean) => void;

  // brands
  addBrand: (b: Omit<Brand, "id"> & { id?: string }) => string;
  updateBrand: (id: string, patch: Partial<Brand>) => void;
  removeBrand: (id: string) => void;

  // channels
  addChannel: (c: Omit<Channel, "id" | "unread" | "lastSync"> & Partial<Channel>) => void;
  removeChannel: (id: string) => void;

  // stores
  addStore: (s: Omit<StoreConnection, "id" | "ordersToday" | "abandonedCarts"> & Partial<StoreConnection>) => void;
  removeStore: (id: string) => void;

  // orders
  addOrder: (o: Order) => void;

  // carts
  updateCart: (id: string, patch: Partial<AbandonedCart>) => void;

  // ml
  answerMl: (id: string) => void;

  // leads
  addLead: (l: Omit<Lead, "id" | "capturedAt"> & Partial<Lead>) => void;

  // campaigns
  addCampaign: (c: Omit<Campaign, "id">) => void;

  // conversations
  sendMessage: (convId: string, text: string) => void;
  markRead: (convId: string) => void;

  // tickets (Whaticket)
  setTicketStatus: (convId: string, status: Conversation["status"]) => void;
  assignTicket: (convId: string, agentId: string) => void;
  setTicketQueue: (convId: string, queueId: string) => void;
  addTicketNote: (convId: string, text: string, author: string) => void;
  rateTicket: (convId: string, rating: number) => void;

  // deals (Kommo pipeline)
  addDeal: (d: Omit<Deal, "id" | "createdAt" | "notes" | "tasks"> & Partial<Deal>) => void;
  updateDeal: (id: string, patch: Partial<Deal>) => void;
  moveDeal: (id: string, stageId: string) => void;
  removeDeal: (id: string) => void;
  addDealNote: (id: string, text: string) => void;
  addDealTask: (id: string, text: string, due: string) => void;
  toggleDealTask: (id: string, taskId: string) => void;

  // helpdesk config
  addQueue: (q: Omit<Queue, "id">) => void;
  removeQueue: (id: string) => void;
  addAgent: (a: Omit<Agent, "id" | "online" | "avatar"> & Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  addQuickReply: (shortcut: string, text: string) => void;
  removeQuickReply: (id: string) => void;
  updateHelpdesk: (patch: Partial<HelpdeskSettings>) => void;

  // catalog + labels + broadcasts
  addProduct: (p: Omit<Product, "id"> & Partial<Product>) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  addLabel: (name: string, color: string) => void;
  removeLabel: (id: string) => void;
  addBroadcast: (b: Omit<Broadcast, "id">) => void;
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

// Enrich demo conversations with helpdesk/ticket fields so they look alive.
const QUEUE_IDS = ["q_ventas", "q_soporte", "q_envios", "q_mayorista"];
const AGENT_IDS = ["ag_ivan", "ag_sofi", "ag_marto", "ag_juli"];
function enrichConversations(convs: Conversation[]): Conversation[] {
  return convs.map((c, i) => ({
    ...c,
    protocol: c.protocol ?? `#${2026000 + i * 7}`,
    queueId: c.queueId ?? QUEUE_IDS[i % QUEUE_IDS.length],
    assignedTo: c.assignedTo ?? (c.status === "open" ? AGENT_IDS[i % AGENT_IDS.length] : undefined),
    internalNotes: c.internalNotes ?? [],
    rating: c.rating ?? (c.status === "closed" ? 5 : undefined),
  }));
}

const configDefaults = () => ({
  pipelineStages: structuredCloneSafe(seedStages),
  queues: structuredCloneSafe(seedQueues),
  quickReplies: structuredCloneSafe(seedQuickReplies),
  helpdesk: structuredCloneSafe(seedHelpdesk),
  labels: structuredCloneSafe(seedLabels),
});

const seed = () => ({
  brands: structuredCloneSafe(seedBrands),
  channels: structuredCloneSafe(seedChannels),
  stores: structuredCloneSafe(seedStores),
  conversations: enrichConversations(structuredCloneSafe(seedConversations)),
  messages: structuredCloneSafe(seedMessages),
  orders: structuredCloneSafe(seedOrders),
  carts: structuredCloneSafe(seedCarts),
  mlQuestions: structuredCloneSafe(seedMl),
  leads: structuredCloneSafe(seedLeads),
  campaigns: structuredCloneSafe(seedCampaigns),
  ...configDefaults(),
  agents: structuredCloneSafe(seedAgents),
  deals: structuredCloneSafe(seedDeals),
  products: structuredCloneSafe(seedProducts),
  broadcasts: structuredCloneSafe(seedBroadcasts),
});

const emptyData = () => ({
  brands: [],
  channels: [],
  stores: [],
  conversations: [],
  messages: {},
  orders: [],
  carts: [],
  mlQuestions: [],
  leads: [],
  campaigns: [],
  ...configDefaults(),
  agents: [
    { id: "ag_owner", name: "Vos", email: "", role: "admin" as const, online: true, avatar: "🧑‍💼" },
  ],
  deals: [],
  products: [],
  broadcasts: [],
});

export const useData = create<DataState>()(
  persist(
    (set, get) => ({
      onboardingDone: false,
      usingSampleData: true,
      settings: defaultSettings,
      integrations: {},
      ...seed(),

      completeOnboarding: ({ sample, settings, firstBrand }) => {
        if (sample) {
          set({
            onboardingDone: true,
            usingSampleData: true,
            settings: { ...get().settings, ...settings },
            ...seed(),
          });
        } else {
          const base = emptyData();
          let brands = base.brands as Brand[];
          if (firstBrand) {
            brands = [
              {
                id: uid("b"),
                name: firstBrand.name,
                handle: "@" + firstBrand.name.toLowerCase().replace(/\s+/g, ""),
                color: firstBrand.color,
                logo: firstBrand.logo,
                industry: firstBrand.industry,
              },
            ];
          }
          set({
            onboardingDone: true,
            usingSampleData: false,
            settings: { ...defaultSettings, ...settings },
            integrations: {},
            ...base,
            brands,
          });
        }
      },

      resetToSample: () =>
        set({ usingSampleData: true, onboardingDone: true, ...seed() }),

      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

      saveIntegration: (key, fields, enabled) =>
        set({
          integrations: {
            ...get().integrations,
            [key]: {
              key,
              enabled,
              fields,
              connectedAt: enabled ? new Date().toISOString() : undefined,
            },
          },
        }),

      addBrand: (b) => {
        const id = b.id ?? uid("b");
        set({ brands: [...get().brands, { ...b, id }] });
        return id;
      },
      updateBrand: (id, patch) =>
        set({ brands: get().brands.map((b) => (b.id === id ? { ...b, ...patch } : b)) }),
      removeBrand: (id) =>
        set({
          brands: get().brands.filter((b) => b.id !== id),
          channels: get().channels.filter((c) => c.brandId !== id),
          stores: get().stores.filter((s) => s.brandId !== id),
        }),

      addChannel: (c) =>
        set({
          channels: [
            ...get().channels,
            {
              id: uid("ch"),
              unread: 0,
              lastSync: new Date().toISOString(),
              ...c,
            } as Channel,
          ],
        }),
      removeChannel: (id) =>
        set({ channels: get().channels.filter((c) => c.id !== id) }),

      addStore: (s) =>
        set({
          stores: [
            ...get().stores,
            {
              id: uid("st"),
              ordersToday: 0,
              abandonedCarts: 0,
              ...s,
            } as StoreConnection,
          ],
        }),
      removeStore: (id) => set({ stores: get().stores.filter((s) => s.id !== id) }),

      addOrder: (o) => set({ orders: [o, ...get().orders] }),

      updateCart: (id, patch) =>
        set({ carts: get().carts.map((c) => (c.id === id ? { ...c, ...patch } : c)) }),

      answerMl: (id) =>
        set({
          mlQuestions: get().mlQuestions.map((q) =>
            q.id === id ? { ...q, answered: true } : q
          ),
        }),

      addLead: (l) =>
        set({
          leads: [
            {
              id: uid("l"),
              capturedAt: new Date().toISOString(),
              ...l,
            } as Lead,
            ...get().leads,
          ],
        }),

      addCampaign: (c) => set({ campaigns: [{ id: uid("camp"), ...c }, ...get().campaigns] }),

      sendMessage: (convId, text) => {
        const msgs = get().messages[convId] ?? [];
        set({
          messages: {
            ...get().messages,
            [convId]: [
              ...msgs,
              { id: uid("m"), from: "agent", text, timestamp: new Date().toISOString(), author: "Vos" },
            ],
          },
          conversations: get().conversations.map((c) =>
            c.id === convId ? { ...c, lastMessage: text, unread: 0, timestamp: new Date().toISOString() } : c
          ),
        });
      },
      markRead: (convId) =>
        set({
          conversations: get().conversations.map((c) =>
            c.id === convId ? { ...c, unread: 0 } : c
          ),
        }),

      // ---- Tickets (Whaticket) ----
      setTicketStatus: (convId, status) =>
        set({
          conversations: get().conversations.map((c) =>
            c.id === convId ? { ...c, status } : c
          ),
        }),
      assignTicket: (convId, agentId) =>
        set({
          conversations: get().conversations.map((c) =>
            c.id === convId ? { ...c, assignedTo: agentId } : c
          ),
        }),
      setTicketQueue: (convId, queueId) =>
        set({
          conversations: get().conversations.map((c) =>
            c.id === convId ? { ...c, queueId } : c
          ),
        }),
      addTicketNote: (convId, text, author) =>
        set({
          conversations: get().conversations.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  internalNotes: [
                    ...(c.internalNotes ?? []),
                    { id: uid("tn"), text, author, at: new Date().toISOString() } as TicketNote,
                  ],
                }
              : c
          ),
        }),
      rateTicket: (convId, rating) =>
        set({
          conversations: get().conversations.map((c) =>
            c.id === convId ? { ...c, rating } : c
          ),
        }),

      // ---- Deals (Kommo pipeline) ----
      addDeal: (d) =>
        set({
          deals: [
            {
              id: uid("d"),
              createdAt: new Date().toISOString(),
              notes: [],
              tasks: [],
              ...d,
            } as Deal,
            ...get().deals,
          ],
        }),
      updateDeal: (id, patch) =>
        set({ deals: get().deals.map((d) => (d.id === id ? { ...d, ...patch } : d)) }),
      moveDeal: (id, stageId) =>
        set({ deals: get().deals.map((d) => (d.id === id ? { ...d, stageId } : d)) }),
      removeDeal: (id) => set({ deals: get().deals.filter((d) => d.id !== id) }),
      addDealNote: (id, text) =>
        set({
          deals: get().deals.map((d) =>
            d.id === id
              ? { ...d, notes: [{ id: uid("n"), text, at: new Date().toISOString() } as DealNote, ...d.notes] }
              : d
          ),
        }),
      addDealTask: (id, text, due) =>
        set({
          deals: get().deals.map((d) =>
            d.id === id
              ? { ...d, tasks: [...d.tasks, { id: uid("t"), text, due, done: false } as DealTask] }
              : d
          ),
        }),
      toggleDealTask: (id, taskId) =>
        set({
          deals: get().deals.map((d) =>
            d.id === id
              ? { ...d, tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }
              : d
          ),
        }),

      // ---- Helpdesk config ----
      addQueue: (q) => set({ queues: [...get().queues, { id: uid("q"), ...q }] }),
      removeQueue: (id) => set({ queues: get().queues.filter((q) => q.id !== id) }),
      addAgent: (a) =>
        set({
          agents: [
            ...get().agents,
            { id: uid("ag"), online: false, avatar: "🧑", ...a } as Agent,
          ],
        }),
      removeAgent: (id) => set({ agents: get().agents.filter((a) => a.id !== id) }),
      addQuickReply: (shortcut, text) =>
        set({ quickReplies: [...get().quickReplies, { id: uid("qr"), shortcut, text }] }),
      removeQuickReply: (id) =>
        set({ quickReplies: get().quickReplies.filter((q) => q.id !== id) }),
      updateHelpdesk: (patch) => set({ helpdesk: { ...get().helpdesk, ...patch } }),

      // ---- Catalog + labels + broadcasts ----
      addProduct: (p) =>
        set({
          products: [{ id: uid("p"), ...p } as Product, ...get().products],
        }),
      updateProduct: (id, patch) =>
        set({ products: get().products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),
      removeProduct: (id) => set({ products: get().products.filter((p) => p.id !== id) }),
      addLabel: (name, color) =>
        set({ labels: [...get().labels, { id: uid("lb"), name, color }] }),
      removeLabel: (id) => set({ labels: get().labels.filter((l) => l.id !== id) }),
      addBroadcast: (b) => set({ broadcasts: [{ id: uid("bc"), ...b }, ...get().broadcasts] }),
    }),
    {
      name: "clientany-data",
      version: 1,
    }
  )
);

export const genId = uid;

// Claves de datos que se sincronizan con la nube (todo menos las funciones).
const WORKSPACE_KEYS = [
  "onboardingDone",
  "usingSampleData",
  "settings",
  "integrations",
  "brands",
  "channels",
  "stores",
  "conversations",
  "messages",
  "orders",
  "carts",
  "mlQuestions",
  "leads",
  "campaigns",
  "pipelineStages",
  "deals",
  "agents",
  "queues",
  "quickReplies",
  "helpdesk",
  "products",
  "labels",
  "broadcasts",
] as const;

export function snapshotWorkspace(): Record<string, unknown> {
  const s = useData.getState() as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  WORKSPACE_KEYS.forEach((k) => (out[k] = s[k]));
  return out;
}

export function applyWorkspace(data: Record<string, unknown>) {
  if (!data || typeof data !== "object") return;
  const patch: Record<string, unknown> = {};
  WORKSPACE_KEYS.forEach((k) => {
    if (k in data) patch[k] = data[k];
  });
  useData.setState(patch as Partial<DataState>);
}

// Hydration helper to avoid SSR/client mismatch when reading persisted state.
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (useData.persist.hasHydrated()) setHydrated(true);
    const unsub = useData.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
  return hydrated;
}

// Non-reactive brand lookup for use inside render maps.
export function brandById(id: string) {
  return useData.getState().brands.find((b) => b.id === id);
}

// Reactive brand-scoped filter based on the active brand in the UI store.
export function filterByBrand<T extends { brandId: string }>(items: T[], activeBrandId: string) {
  return activeBrandId === "all" ? items : items.filter((i) => i.brandId === activeBrandId);
}
