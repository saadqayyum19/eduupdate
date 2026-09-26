import { useEffect, useState } from 'react';
import { useDebounced } from './useDebounced';

/**
 * Search + pagination state shared by every list page, so each screen behaves the
 * same: typing resets to page 1, and the search term is debounced for snappy typing.
 */
export function useTableState(defaultPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 250);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  return {
    page,
    pageSize,
    search,
    debouncedSearch,
    setPage,
    setPageSize,
    setSearch,
  };
}
