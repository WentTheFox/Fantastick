export async function runAttempts(attempts: (() => Promise<boolean>)[]): Promise<boolean> {
  const results: boolean[] = [];
  for (const attempt of attempts) {
    const result = await attempt();
    results.push(result);
    if (result) {
      break;
    }
  }
  return results.some(result => result);
}
