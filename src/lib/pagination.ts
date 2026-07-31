export type PaginationParams = {
    page?: number | string;
    pageSize?: number | string;
};

export type PaginatedResult<T> = {
    items: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
};

export function parsePaginationParams(params: PaginationParams) {
    const page = Math.max(1, Number(params.page ?? 1));
    const pageSize = Math.min(100, Math.max(10, Number(params.pageSize ?? 25)));
    return { page, pageSize, skip: (page - 1) * pageSize };
}

export function buildPaginatedResult<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number
): PaginatedResult<T> {
    return {
        items,
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
    };
}
