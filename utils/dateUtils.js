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
