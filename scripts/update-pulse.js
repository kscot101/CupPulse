const fs = require("fs");
const path = require("path");

const outputPath = path.join(process.cwd(), "data", "pulse.json");

const teams = [
  { name: "France", flag: "🇫🇷", attack: 96, defense: 91, depth: 94, transition: 95, readiness: "A", trend: "Rising", daily: { recentForm: 94, lastMatchImpact: 96, injuryRisk: 8, restAdvantage: 88 } },
  { name: "Brazil", flag: "🇧🇷", attack: 95, defense: 88, depth: 93, transition: 94, readiness: "A", trend: "Rising", daily: { recentForm: 93, lastMatchImpact: 95, injuryRisk: 12, restAdvantage: 84 } },
  { name: "Argentina", flag: "🇦🇷", attack: 93, defense: 87, depth: 91, transition: 89, readiness: "A", trend: "Steady", daily: { recentForm: 85, lastMatchImpact: 82, injuryRisk: 14, restAdvantage: 75 } },
  { name: "England", flag: "🏴", attack: 88, defense: 89, depth: 90, transition: 86, readiness: "A-", trend: "Rising", daily: { recentForm: 90, lastMatchImpact: 91, injuryRisk: 10, restAdvantage: 82 } },
  { name: "Spain", flag: "🇪🇸", attack: 90, defense: 86, depth: 89, transition: 84, readiness: "A-", trend: "Rising", daily: { recentForm: 91, lastMatchImpact: 92, injuryRisk: 7, restAdvantage: 85 } },
  { name: "Portugal", flag: "🇵🇹", attack: 88, defense: 84, depth: 88, transition: 87, readiness: "B+", trend: "Steady", daily: { recentForm: 82, lastMatchImpact: 80, injuryRisk: 16, restAdvantage: 72 } },
  { name: "Germany", flag: "🇩🇪", attack: 87, defense: 84, depth: 86, transition: 82, readiness: "B+", trend: "Steady", daily: { recentForm: 81, lastMatchImpact: 78, injuryRisk: 18, restAdvantage: 70 } },
  { name: "Netherlands", flag: "🇳🇱", attack: 84, defense: 88, depth: 86, transition: 85, readiness: "B+", trend: "Rising", daily: { recentForm: 88, lastMatchImpact: 89, injuryRisk: 9, restAdvantage: 83 } }
];

function clamp(value, min = 1, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function knockoutToNumber(grade) {
  const grades = { "A": 94, "A-": 90, "B+": 86, "B": 82, "B-": 78, "C+": 74, "C": 70 };
  return grades[grade] || 82;
}

function trendToNumber(trend) {
  if (trend === "Rising") return 92;
  if (trend === "Steady") return 86;
  if (trend === "Falling") return 78;
  return 84;
}

function calculateDailyFormScore(team) {
  const baseTrend = trendToNumber(team.trend);
  const daily = team.daily || {};
  const recentForm = daily.recentForm || baseTrend;
  const lastMatchImpact = daily.lastMatchImpact || baseTrend;
  const injuryRisk = daily.injuryRisk || 10;
  const restAdvantage = daily.restAdvantage || 80;
  const healthScore = 100 - injuryRisk;

  return Math.round(clamp(
    recentForm * 0.55 +
    lastMatchImpact * 0.25 +
    healthScore * 0.10 +
    restAdvantage * 0.10
  ));
}

function calculatePulseScore(team) {
  const knockoutScore = knockoutToNumber(team.readiness);
  const dailyForm = calculateDailyFormScore(team);

  return Math.round(clamp(
    team.attack * 0.30 +
    team.defense * 0.25 +
    team.depth * 0.15 +
    team.transition * 0.15 +
    knockoutScore * 0.10 +
    dailyForm * 0.05
  ));
}

let previous = { teams: [] };
if (fs.existsSync(outputPath)) {
  try {
    previous = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  } catch (error) {
    previous = { teams: [] };
  }
}

const previousByName = new Map((previous.teams || []).map(team => [team.name, team.pulse]));

const updatedTeams = teams.map(team => {
  const pulse = calculatePulseScore(team);
  const previousPulse = previousByName.has(team.name) ? previousByName.get(team.name) : pulse;
  const movement = pulse - previousPulse;

  return {
    name: team.name,
    flag: team.flag,
    pulse,
    previousPulse,
    movement,
    status: movement > 0 ? "hot" : movement < 0 ? "cold" : "flat",
    attack: team.attack,
    defense: team.defense,
    depth: team.depth,
    transition: team.transition,
    readiness: team.readiness,
    dailyForm: calculateDailyFormScore(team)
  };
});

const output = {
  lastUpdated: new Date().toISOString(),
  source: "CupPulse GitHub Action",
  teams: updatedTeams,
  hotTeams: updatedTeams.filter(team => team.movement > 0).sort((a, b) => b.movement - a.movement),
  coldTeams: updatedTeams.filter(team => team.movement < 0).sort((a, b) => a.movement - b.movement),
  biggestMovers: [...updatedTeams].sort((a, b) => Math.abs(b.movement) - Math.abs(a.movement))
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
console.log("Updated data/pulse.json");
