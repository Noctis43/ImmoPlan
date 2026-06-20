export function jsonSafeStringify(value: unknown): string {
    if (value=== undefined) {
        return 'null';
    }
    return JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v));
}