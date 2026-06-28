let contestsCache = null;
let lastFetched = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

const fetchCodeforces = async () => {
  try {
    const res = await fetch('https://codeforces.com/api/contest.list?gym=false');
    if (!res.ok) throw new Error('Codeforces responded with status: ' + res.status);
    const data = await res.json();
    if (data.status === 'OK') {
      const now = Math.floor(Date.now() / 1000);
      return data.result
        .filter(c => c.phase === 'BEFORE' || (c.startTimeSeconds + c.durationSeconds) > now)
        .map(c => ({
          platform: 'codeforces',
          name: c.name,
          startTime: new Date(c.startTimeSeconds * 1000).toISOString(),
          duration: c.durationSeconds, // seconds
          url: `https://codeforces.com/contest/${c.id}`
        }));
    }
    return [];
  } catch (e) {
    console.error('Error fetching Codeforces contests:', e.message);
    return [];
  }
};

const fetchCodeChef = async () => {
  try {
    const res = await fetch('https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    if (!res.ok) throw new Error('CodeChef responded with status: ' + res.status);
    const data = await res.json();
    if (data.future_contests) {
      return data.future_contests.map(c => ({
        platform: 'codechef',
        name: c.contest_name,
        startTime: new Date(c.contest_start_date_iso).toISOString(),
        duration: parseInt(c.contest_duration) * 60, // minutes to seconds
        url: `https://www.codechef.com/${c.contest_code}`
      }));
    }
    return [];
  } catch (e) {
    console.error('Error fetching CodeChef contests:', e.message);
    return [];
  }
};

const fetchLeetCode = async () => {
  try {
    const query = `
      query {
        allContests {
          title
          titleSlug
          startTime
          duration
        }
      }
    `;
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify({ query })
    });
    if (!res.ok) throw new Error('LeetCode responded with status: ' + res.status);
    const data = await res.json();
    if (data.data && data.data.allContests) {
      const now = Math.floor(Date.now() / 1000);
      return data.data.allContests
        .filter(c => c.startTime > now || (c.startTime + c.duration) > now)
        .map(c => ({
          platform: 'leetcode',
          name: c.title,
          startTime: new Date(c.startTime * 1000).toISOString(),
          duration: c.duration, // seconds
          url: `https://leetcode.com/contest/${c.titleSlug}`
        }));
    }
    return [];
  } catch (e) {
    console.error('Error fetching LeetCode contests:', e.message);
    return [];
  }
};

exports.getUpcomingContests = async (req, res) => {
  try {
    const now = Date.now();
    if (contestsCache && (now - lastFetched < CACHE_DURATION)) {
      return res.status(200).json({
        success: true,
        data: contestsCache,
        cached: true
      });
    }

    // Fetch concurrently
    const [cfResults, ccResults, lcResults] = await Promise.allSettled([
      fetchCodeforces(),
      fetchCodeChef(),
      fetchLeetCode()
    ]);

    let aggregated = [];
    if (cfResults.status === 'fulfilled') aggregated = aggregated.concat(cfResults.value);
    if (ccResults.status === 'fulfilled') aggregated = aggregated.concat(ccResults.value);
    if (lcResults.status === 'fulfilled') aggregated = aggregated.concat(lcResults.value);

    // Sort by startTime ASC
    aggregated.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    // Update cache
    contestsCache = aggregated;
    lastFetched = now;

    res.status(200).json({
      success: true,
      data: aggregated,
      cached: false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
};
