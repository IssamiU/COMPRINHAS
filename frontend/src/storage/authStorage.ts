import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@mealsync:auth";

export type AuthData = {
  user: {
    id: number | string;
    name: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
};

export async function saveAuth(data: AuthData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Erro ao salvar auth:", error);
    throw error;
  }
}

export async function getAuth(): Promise<AuthData | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? (JSON.parse(data) as AuthData) : null;
  } catch (error) {
    console.error("Erro ao buscar auth:", error);
    return null;
  }
}

export async function removeAuth(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Erro ao remover auth:", error);
    throw error;
  }
}