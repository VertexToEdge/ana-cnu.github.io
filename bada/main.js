const getMonthlyCommits = async () => {
  const repoOwner = "ANA-CNU";
  const repoName = "ANA-Daily-Algorithm";
  const baseApiUrl = "https://api.github.com";
  const perPage = 100; // Maximum per_page value
  let page = 1;

  // Determine the current year and month in UTC+9 (Japan Standard Time)
  const currentDateInKST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );

  currentDateInKST.setDate(1); // Set the date to the first day of the month
  currentDateInKST.setHours(0, 0, 0, 0); // Set the time to 15:00:00

  const sinceYear = currentDateInKST.getFullYear();
  const sinceMonth = currentDateInKST.getUTCMonth() + 1; // Months are 0-indexed
  const sinceDate = currentDateInKST.getUTCDate();
  const sinceHours = currentDateInKST.getUTCHours();
  const sinceMinutes = currentDateInKST.getUTCMinutes();
  const maximumRequest = 20;
  let requestCount = 0;

  const monthlyCommits = [];

  while (requestCount < maximumRequest) {
    // Build the URL to list commits for the current month on the current page
    const commitsUrl = `${baseApiUrl}/repos/${repoOwner}/${repoName}/commits?since=${sinceYear}-${sinceMonth
      .toString()
      .padStart(2, "0")}-${sinceDate.toString().padStart(2,"0")}T${sinceHours.toString().padStart(2,"0")}:${sinceMinutes.toString().padStart(2,"0")}:00Z&page=${page}&per_page=${perPage}`;

    // Fetch commits for the current page
    const response = await fetch(commitsUrl);
    requestCount++;

    if (!response.ok) {
      throw new Error("Failed to fetch commits");
    }

    const rateLimitRemaining = response.headers.get("X-Ratelimit-Remaining");
    document.getElementById("remainingRefreshCount").textContent =
      rateLimitRemaining;

    const commits = await response.json();
    monthlyCommits.push(...commits);

    // If there are fewer commits than perPage, it means we've reached the last page
    if (commits.length < perPage) {
      break;
    }
    // Increment the page number for the next request
    page++;
  }

  return monthlyCommits;
};

const filterCommitsByAuthor = (monthlyCommits) => {
  const commitDateByAuthor = {};
  const filteredCommits = [];

  monthlyCommits.forEach((commit) => {
    const name = commit.commit.author.name;

    const commitDateUTC = new Date(commit.commit.author.date);
    commitDateUTC.setHours(commitDateUTC.getHours() + 9);

    // Extract the date (YYYY-MM-DD) portion
    const commitDateStr = commitDateUTC.toISOString().split("T")[0];

    if (!commitDateByAuthor[name]) {
      commitDateByAuthor[name] = new Set();
    }

    if (!commitDateByAuthor[name].has(commitDateStr)) {
      commitDateByAuthor[name].add(commitDateStr);
      filteredCommits.push(commit);
    }
  });

  return filteredCommits;
};

const getSolveCountByUser = (monthlyCommits) => {
  monthlyCommits = filterCommitsByAuthor(monthlyCommits);
  const solveCountByUser = {};

  monthlyCommits.forEach((commit) => {
    const userName = commit.commit.author.name;

    if (solveCountByUser[userName]) {
      solveCountByUser[userName]++;
    } else {
      solveCountByUser[userName] = 1;
    }
  });

  return solveCountByUser;
};

const displaySolveCountRank = (solveCountByUser) => {
  const sortedUser = Object.entries(solveCountByUser).sort(
    (a, b) => b[1] - a[1]
  );

  const commitCountsElement = document.getElementById("commitCounts");
  sortedUser.forEach(([userName, commitCount]) => {
    commitCountsElement.innerHTML += `<li>${userName}: ${commitCount} 문제</li>`;
  });
};

const getPrizeRank = (solveCountByUser) => {
  const weightedUserNames = [];
  let seed = "";

  for (const [userName, commitCount] of Object.entries(solveCountByUser)) {
    for (let i = 0; i < commitCount; i++) {
      weightedUserNames.push(userName);
    }
  }

  seed = `ANA-${weightedUserNames.length}}`
  const shuffledUserNames = shuffleWithSeed(weightedUserNames, seed);
  const prizeRank = [...new Set(shuffledUserNames)];

  return prizeRank;
};

const displayPrizeRank = (uniqueUserNames, solveCountByUser) => {
  const commitCountsElement = document.getElementById("commitCountsShuffled");
  uniqueUserNames.forEach((userName) => {
    commitCountsElement.innerHTML += `<li>${userName}: ${solveCountByUser[userName]} 문제</li>`;
  });
};

const getRecentSolved = (monthlyCommits) => {
  monthlyCommits = filterCommitsByAuthor(monthlyCommits);
  const recentSolved = [];

  monthlyCommits.forEach((commit) => {
    const userName = commit.commit.author.name;
    const commitDate = new Date(commit.commit.author.date);

    recentSolved.push({
      userName,
      commitDate,
    });
  });

  return recentSolved;
};

const displayRecentSolved = (recentSolved) => {
  const recentSolvedElement = document.getElementById("recentSolved");
  recentSolved.forEach(({ userName, commitDate }) => {
    recentSolvedElement.innerHTML += `<li>${userName}: ${commitDate.toLocaleString()}</li>`;
  });
};

const filterBlackList = (monthlyCommits) => {
  const blackList = ["sion-k", "Sion Kim", "Seongbin Hong"];
  const filteredCommits = [];

  monthlyCommits.forEach((commit) => {
    const name = commit.commit.author.name;

    if (!blackList.includes(name)) {
      filteredCommits.push(commit);
    }
  });

  return filteredCommits;
};

function shuffleWithSeed(arr, seed) {
  const rng = new Math.seedrandom(seed);
  const seedRand = (func, min, max) => {
    return Math.floor(func() * (max - min + 1)) + min;
  };
  const resp = [];
  const keys = Object.keys(Array.from(new Array(arr.length)));
  for (let i = 0; i < arr.length; i++) {
    const r = seedRand(rng, 0, keys.length - 1);
    const g = keys[r];
    keys.splice(r, 1);
    resp.push(arr[Number(g)]);
  }
  return resp;
}

getMonthlyCommits().then((monthlyCommits) => {
  monthlyCommits = filterBlackList(monthlyCommits);

  const solveCountByUser = getSolveCountByUser(monthlyCommits);
  displaySolveCountRank(solveCountByUser);

  const prizeRank = getPrizeRank(solveCountByUser);
  displayPrizeRank(prizeRank, solveCountByUser);

  const recentSolved = getRecentSolved(monthlyCommits);
  displayRecentSolved(recentSolved);
});
