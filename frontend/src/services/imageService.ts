import * as ImagePicker from "expo-image-picker";
import { API_URL } from "./api";
import { getAuth } from "../storage/authStorage";

export interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Abre a galeria do dispositivo e retorna a URI local selecionada.
 * Retorna null se o usuário cancelou ou não deu permissão.
 */
export async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

/**
 * Faz upload de uma imagem local para o Cloudinary via backend.
 * Retorna a URL pública da imagem ou lança erro.
 */
export async function uploadImage(localUri: string): Promise<UploadResult> {
  const auth = await getAuth();
  if (!auth) throw new Error("Usuário não autenticado.");

  // Monta o FormData com o arquivo
  const formData = new FormData();
  const filename = localUri.split("/").pop() ?? "photo.jpg";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  formData.append("image", {
    uri: localUri,
    name: filename,
    type: mimeType,
  } as any);

  const response = await fetch(`${API_URL}/upload/image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      // NÃO setar Content-Type — o fetch define automaticamente com boundary
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Erro ao fazer upload.");

  return data as UploadResult;
}