import "server-only";

export async function loadCollection<T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { code?: string } | null }>, label: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const result = await load(from, from + 499);
    if (result.error || !result.data) {
      console.error(`${label} load failed:`, result.error?.code);
      throw new Error(`${label} could not be loaded. Please refresh or contact ABVN.`);
    }
    rows.push(...result.data);
    if (result.data.length < 500) return rows;
  }
}
