export interface PaginatioResponse<T> {
    data: T[];
    meta: {
        nextCursor: string | null;
        hasMore: boolean;
        total?: number;
    };
}

export interface PaginationOptions {
    cursor?: string;
    limit: number;
}

/**
 * @param query 
 * @param defaultLimit 
 * @param maxLimit
 * @returns 
 */
export function parsePagination(query: { cursor?: string; limit?: string }, defaultLimit = 20, maxLimit = 100,): PaginationOptions {
    const limit = Math.min(Math.max(parseInt(query.limit || String(defaultLimit), 10) || defaultLimit, 1), maxLimit,);
    return {
        cursor: query.cursor || undefined,
        limit,
    };
}

/**
 * @param data 
 * @param limit 
 * @param cursorExtractor 
 * @param total 
 */
export function buildPaginationResponse<T>(data: T[], limit: number, cursorExtractor: (item: T) => string, total?: number, ): PaginatioResponse<T> {
    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    const nextCursor = hasMore && items.length > 0 ? cursorExtractor(items[items.length - 1]) : null;
    return {
        data: items,
        meta: {
            nextCursor,
            hasMore,
            ...(total !== undefined && { total }),
        },
    };
}
