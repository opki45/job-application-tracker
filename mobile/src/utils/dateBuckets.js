// Shared by the Home stat-card sparklines and the Analytics line chart --
// both are "count of applications by date_applied, bucketed over time",
// just at different granularities. Everything here is derived from data
// GET /applications already returns; no new backend endpoint.

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Returns `count` counts, oldest first, for the last `count` weeks
// (including the current one), counting applications whose date_applied
// falls in each week. Used for the small StatCard sparklines.
export function bucketByWeek(applications, count = 7) {
  const today = startOfWeek(new Date());
  const buckets = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(today);
    start.setDate(start.getDate() - i * 7);
    buckets.push({ start, count: 0 });
  }
  for (const app of applications) {
    const d = startOfWeek(parseDate(app.date_applied));
    const bucket = buckets.find((b) => b.start.getTime() === d.getTime());
    if (bucket) bucket.count += 1;
  }
  return buckets.map((b) => b.count);
}

// Same idea at week or month granularity, with labels -- used by the
// Analytics "Applications over time" chart.
export function bucketOverTime(applications, granularity = 'week', count = 8) {
  const startFn = granularity === 'month' ? startOfMonth : startOfWeek;
  const step = (d, n) => {
    const next = new Date(d);
    if (granularity === 'month') next.setMonth(next.getMonth() + n);
    else next.setDate(next.getDate() + n * 7);
    return next;
  };

  const anchor = startFn(new Date());
  const buckets = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = step(anchor, -i);
    const label =
      granularity === 'month'
        ? start.toLocaleDateString('en-US', { month: 'short' })
        : start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    buckets.push({ start, label, count: 0 });
  }

  for (const app of applications) {
    const d = startFn(parseDate(app.date_applied));
    const bucket = buckets.find((b) => b.start.getTime() === d.getTime());
    if (bucket) bucket.count += 1;
  }

  return buckets;
}
