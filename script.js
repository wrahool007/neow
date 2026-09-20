/* ==========================================================================
   Near-Earth Object Watch
   Fetches a 7-day feed of near-Earth asteroids from NASA's NeoWs API,
   transforms it into Chart.js-friendly arrays, and renders three charts:
     1. A stacked bar chart of daily asteroid counts (hazardous vs. safe)
     2. A line chart of the closest approach distance recorded each day
     3. A radar chart comparing the week's four largest asteroids
   ========================================================================== */

// Personal API Key with 1000 requests/hour which is more than enough for my project, this personal 
// key has been generted by signing up the NASA API and they will email you the API key
const API_KEY = "fhJPI9SVSkRgDaAZyoDBGKhnTYm2CyM7c4cCk8TE";

// DOM references, grabbed once up front.
const statusEl = document.getElementById("statusMessage");
const statTotalEl = document.getElementById("statTotal");
const statHazardousEl = document.getElementById("statHazardous");
const statClosestEl = document.getElementById("statClosest");

/**
 * Formats a Date object as YYYY-MM-DD, which is what the NeoWs feed
 * endpoint expects for start_date and end_date.
 */
function toISODate(date) {
  return date.toISOString().split("T")[0];
}

/**
 * Builds the feed URL for a rolling 7-day window ending today.
 * (NeoWs caps the feed endpoint at a 7-day range per request.)
 */
function buildFeedUrl() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  const startDate = toISODate(start);
  const endDate = toISODate(end);

  return `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${API_KEY}`;
}

/**
 * Transforms the raw NeoWs feed response into arrays Chart.js can consume.
 * The API groups asteroids by date under `near_earth_objects`, so we walk
 * each date bucket and aggregate the numbers we care about.
 */
function transformFeedData(feedData) {
  const dateKeys = Object.keys(feedData.near_earth_objects).sort();

  const labels = [];
  const hazardousCounts = [];
  const safeCounts = [];
  const closestApproachLD = []; // in lunar distances

  let totalCount = 0;
  let totalHazardous = 0;
  let overallClosest = { distance: Infinity, name: "" };

  dateKeys.forEach((dateKey) => {
    const asteroidsToday = feedData.near_earth_objects[dateKey];

    let hazardousToday = 0;
    let safeToday = 0;
    let closestToday = Infinity;

    asteroidsToday.forEach((asteroid) => {
      if (asteroid.is_potentially_hazardous_asteroid) {
        hazardousToday += 1;
      } else {
        safeToday += 1;
      }

      // Each asteroid can have multiple close-approach entries; NeoWs
      // already reports miss distance in lunar distances for us.
      asteroid.close_approach_data.forEach((approach) => {
        const lunarDistance = parseFloat(approach.miss_distance.lunar);
        if (lunarDistance < closestToday) {
          closestToday = lunarDistance;
        }
        if (lunarDistance < overallClosest.distance) {
          overallClosest = { distance: lunarDistance, name: asteroid.name };
        }
      });
    });

    // Label formatted like "Mon 9/15" for compact, readable axis ticks.
    const displayDate = new Date(`${dateKey}T00:00:00`);
    labels.push(
      displayDate.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })
    );

    hazardousCounts.push(hazardousToday);
    safeCounts.push(safeToday);
    closestApproachLD.push(Number.isFinite(closestToday) ? Number(closestToday.toFixed(1)) : null);

    totalCount += hazardousToday + safeToday;
    totalHazardous += hazardousToday;
  });

  return {
    labels,
    hazardousCounts,
    safeCounts,
    closestApproachLD,
    totalCount,
    totalHazardous,
    overallClosest,
  };
}

/**
 * NeoWs names look like "260277 (2004 TR12)" or "(2017 XD)". The part in
 * parentheses is the shorter, more readable provisional designation —
 * much better for chart legends than the full catalog name.
 */
function shortAsteroidName(rawName) {
  const match = rawName.match(/\(([^)]+)\)/);
  return match ? match[1] : rawName;
}

/**
 * Flattens the feed into one entry per unique asteroid, picks the four
 * largest (by average estimated diameter), and normalizes four metrics
 * to a 0-100 scale relative to just those four — which is what the radar
 * chart needs to draw comparable shapes.
 */
function buildAsteroidProfiles(feedData) {
  const seenIds = new Set();
  const allAsteroids = [];

  Object.values(feedData.near_earth_objects).forEach((dayList) => {
    dayList.forEach((asteroid) => {
      if (seenIds.has(asteroid.id)) return; // some objects have >1 approach in range
      seenIds.add(asteroid.id);

      const approach = asteroid.close_approach_data[0];
      const km = asteroid.estimated_diameter.kilometers;

      allAsteroids.push({
        name: shortAsteroidName(asteroid.name),
        diameterKm: (km.estimated_diameter_min + km.estimated_diameter_max) / 2,
        velocityKph: parseFloat(approach.relative_velocity.kilometers_per_hour),
        missDistanceLD: parseFloat(approach.miss_distance.lunar),
        hazardous: asteroid.is_potentially_hazardous_asteroid,
      });
    });
  });

  const topFour = [...allAsteroids].sort((a, b) => b.diameterKm - a.diameterKm).slice(0, 4);

  const maxDiameter = Math.max(...topFour.map((a) => a.diameterKm));
  const maxVelocity = Math.max(...topFour.map((a) => a.velocityKph));
  const distances = topFour.map((a) => a.missDistanceLD);
  const minDistance = Math.min(...distances);
  const maxDistance = Math.max(...distances);
  const distanceRange = maxDistance - minDistance || 1; // avoid divide-by-zero

  return topFour.map((asteroid) => ({
    name: asteroid.name,
    scores: {
      Size: Math.round((asteroid.diameterKm / maxDiameter) * 100),
      Speed: Math.round((asteroid.velocityKph / maxVelocity) * 100),
      Proximity: Math.round(((maxDistance - asteroid.missDistanceLD) / distanceRange) * 100),
      "Hazard flag": asteroid.hazardous ? 100 : 15,
    },
  }));
}

/**
 * Renders the hero stat readouts above the charts.
 */
function renderHeroStats(data) {
  statTotalEl.textContent = data.totalCount;
  statHazardousEl.textContent = data.totalHazardous;
  statClosestEl.textContent = Number.isFinite(data.overallClosest.distance)
    ? `${data.overallClosest.distance.toFixed(1)} LD`
    : "—";
}

/**
 * Renders the stacked bar chart of daily asteroid counts.
 */
function renderDailyCountChart(data) {
  const ctx = document.getElementById("dailyCountChart");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: "Potentially hazardous",
          data: data.hazardousCounts,
          backgroundColor: "#e85d4e",
          borderRadius: 4,
        },
        {
          label: "Non-hazardous",
          data: data.safeCounts,
          backgroundColor: "#4fc3b0",
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          ticks: { color: "#b3aec4", font: { size: 10 } },
          grid: { color: "#34324f" },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { color: "#b3aec4", precision: 0, font: { size: 10 } },
          grid: { color: "#34324f" },
          title: { display: true, text: "Asteroids tracked", color: "#b3aec4", font: { size: 10 } },
        },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#ede9e3", boxWidth: 10, font: { size: 10 }, padding: 8 },
        },
        tooltip: {
          callbacks: {
            footer: (items) => {
              const total = items.reduce((sum, item) => sum + item.parsed.y, 0);
              return `Total that day: ${total}`;
            },
          },
        },
      },
    },
  });
}

/**
 * Renders the line chart of closest approach distance per day.
 */
function renderClosestApproachChart(data) {
  const ctx = document.getElementById("closestApproachChart");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: "Closest approach (lunar distances)",
          data: data.closestApproachLD,
          borderColor: "#e8a33d",
          backgroundColor: "rgba(232, 163, 61, 0.15)",
          pointBackgroundColor: "#e8a33d",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: "#b3aec4", font: { size: 10 } },
          grid: { color: "#34324f" },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#b3aec4", font: { size: 10 } },
          grid: { color: "#34324f" },
          title: { display: true, text: "Distance (LD)", color: "#b3aec4", font: { size: 10 } },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => `${item.parsed.y} lunar distances`,
          },
        },
      },
    },
  });
}

/**
 * Renders the radar chart comparing this week's four largest asteroids
 * across size, speed, proximity, and hazard flag.
 */
function renderAsteroidProfileChart(profiles) {
  const ctx = document.getElementById("asteroidProfileChart");
  const axisLabels = ["Size", "Speed", "Proximity", "Hazard flag"];
  const palette = ["#e8a33d", "#4fc3b0", "#e85d4e", "#8f8fd6"];

  new Chart(ctx, {
    type: "radar",
    data: {
      labels: axisLabels,
      datasets: profiles.map((profile, i) => {
        const color = palette[i % palette.length];
        return {
          label: profile.name,
          data: axisLabels.map((axis) => profile.scores[axis]),
          borderColor: color,
          backgroundColor: "transparent", // no fill — overlapping fills get muddy with 4 datasets
          borderWidth: 2,
          pointBackgroundColor: color,
          pointRadius: 3,
          pointHoverRadius: 5,
        };
      }),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: 8 },
      scales: {
        r: {
          min: 0,
          max: 100,
          angleLines: { color: "#3d3b5c" },
          grid: { color: "#3d3b5c" },
          pointLabels: { color: "#ede9e3", font: { size: 13, weight: "500" } },
          ticks: { display: false, backdropColor: "transparent" },
        },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#ede9e3", boxWidth: 10, font: { size: 11 }, padding: 10 },
        },
      },
    },
  });
}

/**
 * Entry point: fetch, transform, render. Errors (including DEMO_KEY rate
 * limiting) are surfaced in the status line instead of failing silently.
 */
async function init() {
  statusEl.textContent = "Fetching this week's near-Earth objects from NASA...";

  try {
    const response = await fetch(buildFeedUrl());

    if (!response.ok) {
      throw new Error(
        response.status === 429
          ? "NASA's DEMO_KEY rate limit was hit. Wait a bit or add a personal API key."
          : `NASA API returned an error (status ${response.status}).`
      );
    }

    const feedData = await response.json();
    const transformed = transformFeedData(feedData);

    renderHeroStats(transformed);
    renderDailyCountChart(transformed);
    renderClosestApproachChart(transformed);
    renderAsteroidProfileChart(buildAsteroidProfiles(feedData));

    statusEl.textContent = "";
  } catch (error) {
    statusEl.textContent = `Couldn't load asteroid data: ${error.message}`;
    statusEl.classList.add("is-error");
    console.error(error);
  }
}

init();
