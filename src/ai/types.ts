/**
 * Minimal AI client interface. Swap the underlying provider by creating a new
 * implementation — consuming code (categorize, scanTag, suggest) only imports
 * this type and the `defaultClient` from client.ts.
 */
export interface AIClient {
  generateText(prompt: string, imageBase64?: string): Promise<string>
  generateJSON<T>(prompt: string, imageBase64?: string): Promise<T>
}
