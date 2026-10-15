import { NativeModules, Platform } from 'react-native';

const { FaceEmbeddingModule } = NativeModules;

export interface FaceEmbeddingExtractionOptions {
  base64?: string;
  uri?: string;
}

/**
 * Check if native MobileFaceNet ONNX inference is available on the current device.
 */
export async function isNativeFaceInferenceAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android' || !FaceEmbeddingModule) {
    return false;
  }
  try {
    const isAvailable = await FaceEmbeddingModule.isModelAvailable();
    return Boolean(isAvailable);
  } catch {
    return false;
  }
}

/**
 * Extract genuine 128-dimensional L2-normalized facial embedding using MobileFaceNet ONNX.
 *
 * Replaces synthetic vector generation with genuine on-device deep neural network inference.
 * Rejects with a clear error if native inference cannot be performed.
 */
export async function extractFaceEmbedding(
  options: FaceEmbeddingExtractionOptions
): Promise<number[]> {
  if (Platform.OS !== 'android') {
    throw new Error('Facial biometric verification is supported strictly on Android devices.');
  }

  if (!FaceEmbeddingModule) {
    throw new Error(
      'Native FaceEmbeddingModule is not loaded. Ensure the app is launched via the native Android build (npx expo run:android).'
    );
  }

  if (options.base64) {
    const rawVector = await FaceEmbeddingModule.extractEmbeddingFromBase64(options.base64);
    if (!Array.isArray(rawVector) || rawVector.length !== 128) {
      throw new Error(`Inference returned unexpected embedding dimension: ${rawVector?.length}`);
    }
    return rawVector.map((v: number) => Number(v));
  }

  if (options.uri) {
    const rawVector = await FaceEmbeddingModule.extractEmbeddingFromFile(options.uri);
    if (!Array.isArray(rawVector) || rawVector.length !== 128) {
      throw new Error(`Inference returned unexpected embedding dimension: ${rawVector?.length}`);
    }
    return rawVector.map((v: number) => Number(v));
  }

  throw new Error('Either base64 or uri must be provided for facial feature extraction.');
}
