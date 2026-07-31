import { useCallback, useRef } from "react";
import type * as XlsxTypes from "xlsx";

export function useXlsx() {
    const xlsxRef = useRef<typeof XlsxTypes | null>(null);

    const getXlsx = useCallback(async () => {
        if (!xlsxRef.current) {
            xlsxRef.current = await import("xlsx");
        }
        return xlsxRef.current;
    }, []);

    return { getXlsx };
}
