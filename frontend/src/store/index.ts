import { configureStore, combineReducers } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";

import authReducer         from "./slices/authSlice";
import plannerReducer      from "./slices/plannerSlice";
import recipesReducer      from "./slices/recipesSlice";
import shoppingListReducer from "./slices/shoppingListSlice";
import timerReducer        from "./slices/timerSlice";

// RNF3/RNF6 — persistir listas de compras e planejamento no AsyncStorage
const rootReducer = combineReducers({
  auth:         authReducer,
  recipes:      recipesReducer,
  planner:      persistReducer({ key: "planner",      storage: AsyncStorage }, plannerReducer),
  shoppingList: persistReducer({ key: "shoppingList", storage: AsyncStorage }, shoppingListReducer),
  timers:       timerReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
