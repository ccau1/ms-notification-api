export default (query: { [key: string]: any }) => {
  return {
    pagination: query.paginate === undefined || query.paginate,
    limit: parseInt(query.limit, 10) || 10,
    ...(query.select ? { select: query.select } : {}),
    ...(query.sort ? { sort: query.sort } : {}),
    ...(query.offset ? { offset: query.offset } : {}),
    ...(query.page ? { page: query.page } : {}),
  };
};
