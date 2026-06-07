import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ShoppingList, ShoppingListItem } from "../../types/shopping";

type ShoppingListState = {
  // Chave: userId — cada usuário tem suas próprias listas
  listsByUser: Record<string, ShoppingList[]>;
  // Mantido para compatibilidade com o DashboardScreen
  items: ShoppingListItem[];
};

const initialState: ShoppingListState = {
  listsByUser: {},
  items: [],
};

// Helpers
function getUserLists(state: ShoppingListState, userId: string): ShoppingList[] {
  if (!state.listsByUser[userId]) state.listsByUser[userId] = [];
  return state.listsByUser[userId];
}

function syncItems(state: ShoppingListState, userId: string) {
  state.items = (state.listsByUser[userId] ?? []).flatMap((l) => l.items);
}

const shoppingListSlice = createSlice({
  name: "shoppingList",
  initialState,
  reducers: {
    // ─── Gerenciamento de listas ─────────────────────────────────────────────

    createList: (state, action: PayloadAction<ShoppingList & { userId: string }>) => {
      const { userId, ...list } = action.payload;
      getUserLists(state, userId).push(list);
      syncItems(state, userId);
    },

    renameList: (state, action: PayloadAction<{ id: string; name: string; userId: string }>) => {
      const { id, name, userId } = action.payload;
      const list = getUserLists(state, userId).find((l) => l.id === id);
      if (list) list.name = name;
    },

    deleteList: (state, action: PayloadAction<{ id: string; userId: string }>) => {
      const { id, userId } = action.payload;
      state.listsByUser[userId] = getUserLists(state, userId).filter((l) => l.id !== id);
      syncItems(state, userId);
    },

    // Selector helper — não é reducer, mas mantém compatibilidade
    // As telas usam useSelector para buscar lists do userId atual

    // ─── Itens ──────────────────────────────────────────────────────────────

    setShoppingList: (
      state,
      action: PayloadAction<{ listId: string; items: ShoppingListItem[]; userId: string }>
    ) => {
      const { listId, items, userId } = action.payload;
      const list = getUserLists(state, userId).find((l) => l.id === listId);
      if (list) { list.items = items; syncItems(state, userId); }
    },

    addShoppingListItem: (
      state,
      action: PayloadAction<{ listId: string; item: ShoppingListItem; userId: string }>
    ) => {
      const { listId, item, userId } = action.payload;
      const list = getUserLists(state, userId).find((l) => l.id === listId);
      if (list) { list.items.push(item); syncItems(state, userId); }
    },

    removeShoppingListItem: (
      state,
      action: PayloadAction<{ listId: string; itemId: string; userId: string }>
    ) => {
      const { listId, itemId, userId } = action.payload;
      const list = getUserLists(state, userId).find((l) => l.id === listId);
      if (list) { list.items = list.items.filter((i) => i.id !== itemId); syncItems(state, userId); }
    },

    toggleShoppingListItem: (
      state,
      action: PayloadAction<{ listId: string; itemId: string; userId: string }>
    ) => {
      const { listId, itemId, userId } = action.payload;
      const list = getUserLists(state, userId).find((l) => l.id === listId);
      if (list) {
        const item = list.items.find((i) => i.id === itemId);
        if (item) item.checked = !item.checked;
      }
    },

    updateShoppingListItem: (
      state,
      action: PayloadAction<{ listId: string; item: ShoppingListItem; userId: string }>
    ) => {
      const { listId, item, userId } = action.payload;
      const list = getUserLists(state, userId).find((l) => l.id === listId);
      if (list) {
        const index = list.items.findIndex((i) => i.id === item.id);
        if (index !== -1) { list.items[index] = item; syncItems(state, userId); }
      }
    },

    clearShoppingList: (
      state,
      action: PayloadAction<{ listId: string; userId: string }>
    ) => {
      const { listId, userId } = action.payload;
      const list = getUserLists(state, userId).find((l) => l.id === listId);
      if (list) { list.items = []; syncItems(state, userId); }
    },
  },
});

export const {
  createList,
  renameList,
  deleteList,
  setShoppingList,
  addShoppingListItem,
  removeShoppingListItem,
  toggleShoppingListItem,
  updateShoppingListItem,
  clearShoppingList,
} = shoppingListSlice.actions;

export default shoppingListSlice.reducer;