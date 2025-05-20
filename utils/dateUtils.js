// Arquivo: utils/dateUtils.js
exports.splitDateRange = function* (start, end, deltaDays = 30) {
  let current = new Date(start);
  const until = new Date(end);

  while (current < until) {
    const next = new Date(Math.min(new Date(current).setDate(current.getDate() + deltaDays), until));
    yield [current.toISOString().split('T')[0], next.toISOString().split('T')[0]];
    current = new Date(next);
  }
};

exports.formatDate = (date) => new Date(date).toISOString().split('T')[0];

exports.getAllDaysBetween = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dates = [];

  while (startDate <= endDate) {
    dates.push(startDate.toISOString().split('T')[0].replace(/-/g, ''));
    startDate.setDate(startDate.getDate() + 1);
  }

  return dates;
}

exports.buildDates = (qtdDays) => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(0, 0, 0, 0);

    const since = new Date(endDate);
    since.setDate(since.getDate() - qtdDays);
    return { since, endDate };
}