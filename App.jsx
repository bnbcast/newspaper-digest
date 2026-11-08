import { useEffect, useState, useMemo } from "react";

const REPO_OWNER = "bnbcast";
const REPO_NAME = "hndaily-digest";
const BRANCH = "main";
const GITHUB_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/digest`;

function parseMarkdown(markdown) {
  const lines = markdown.split("\n");
  const dateMatch = lines[0]?.match(/^# (\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : null;
  const items = lines
    .slice(1)
    .filter((line) => line.trim().startsWith("- ["))
    .map((line) => {
      const match = line.match(/^- \[(.*?)\]\((.*?)\)\s*\((\d+)\s*points?\)/);
      if (match) {
        return { title: match[1], url: match[2], points: parseInt(match[3]) };
      }
      return null;
    })
    .filter(Boolean);
  return { date, items };
}

function formatDate(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function Article({ item, index }) {
  const isLead = index === 0;
  return (
    <article className={`article ${isLead ? "lead" : ""}`}>
      <h2 className="article-title">
        <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
      </h2>
      <div className="article-meta">
        <span className="points">{item.points} points</span>
        <span className="source">{new URL(item.url).hostname.replace("www.", "")}</span>
      </div>
    </article>
  );
}

function DaySection({ date, items }) {
  return (
    <section className="day-section" aria-labelledby={`day-${date}`}>
      <header className="day-header">
        <h1 id={`day-${date}`} className="day-title">{formatDate(date)}</h1>
        <div className="day-count">{items.length} stories</div>
      </header>
      <div className="articles-grid">
        {items.map((item, index) => (
          <Article key={item.url} item={item} index={index} />
        ))}
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="skeleton">
      <div className="skeleton-header">
        <div className="skeleton-line long" />
        <div className="skeleton-line short" />
      </div>
      <div className="skeleton-grid">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-article">
            <div className="skeleton-line long" />
            <div className="skeleton-line medium" />
            <div className="skeleton-line short" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <div className="error-icon">📰</div>
      <h2>Couldn't load the newspaper</h2>
      <p>{message}</p>
      <button onClick={onRetry} className="retry-btn">Try again</button>
      <p className="error-hint">Or visit the <a href={`https://github.com/${REPO_OWNER}/${REPO_NAME}`} target="_blank" rel="noopener">GitHub repository</a> directly.</p>
    </div>
  );
}

function Header({ latestDate }) {
  return (
    <header className="newspaper-header">
      <div className="header-content">
        <div className="masthead">
          <h1 className="newspaper-name">The Daily Digest</h1>
          <p className="newspaper-tagline">Curated tech news, delivered daily</p>
        </div>
        <div className="header-meta">
          <div className="date-badge">{latestDate ? formatDate(latestDate) : "Loading..."}</div>
          <a href={`https://github.com/${REPO_OWNER}/${REPO_NAME}`} target="_blank" rel="noopener" className="github-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
            View on GitHub
          </a>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="newspaper-footer">
      <p>Generated daily by <a href={`https://github.com/${REPO_OWNER}/${REPO_NAME}`} target="_blank" rel="noopener">hndaily-digest</a> · Data from Hacker News API</p>
      <p className="footer-note">Not affiliated with Hacker News or Y Combinator</p>
    </footer>
  );
}

export default function App() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDigests = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the digest directory structure
      const yearResponse = await fetch(`${GITHUB_API}?ref=${BRANCH}`);
      if (!yearResponse.ok) throw new Error(`Failed to fetch years: ${yearResponse.status}`);
      const years = await yearResponse.json();

      // Get the latest 2 years
      const yearDirs = years
        .filter((item) => item.type === "dir")
        .sort((a, b) => b.name.localeCompare(a.name))
        .slice(0, 2);

      const allDays = [];

      for (const yearDir of yearDirs) {
        const monthResponse = await fetch(`${GITHUB_API}/${yearDir.name}?ref=${BRANCH}`);
        if (!monthResponse.ok) continue;
        const months = await monthResponse.json();

        const monthDirs = months
          .filter((item) => item.type === "dir")
          .sort((a, b) => b.name.localeCompare(a.name));

        for (const monthDir of monthDirs) {
          const dayResponse = await fetch(`${GITHUB_API}/${yearDir.name}/${monthDir.name}?ref=${BRANCH}`);
          if (!dayResponse.ok) continue;
          const daysFiles = await dayResponse.json();

          const mdFiles = daysFiles
            .filter((item) => item.type === "file" && item.name.endsWith(".md"))
            .sort((a, b) => b.name.localeCompare(a.name))
            .slice(0, 7); // Latest 7 days per month

          for (const file of mdFiles) {
            const contentResponse = await fetch(file.download_url);
            if (!contentResponse.ok) continue;
            const markdown = await contentResponse.text();
            const parsed = parseMarkdown(markdown);
            if (parsed.date && parsed.items.length > 0) {
              allDays.push({ date: parsed.date, items: parsed.items });
            }
          }
        }
      }

      // Sort by date descending and take latest 14 days
      allDays.sort((a, b) => b.date.localeCompare(a.date));
      setDays(allDays.slice(0, 14));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDigests();
  }, []);

  const latestDate = days[0]?.date;

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchDigests} />;
  if (days.length === 0) return <ErrorState message="No digests found" onRetry={fetchDigests} />;

  return (
    <>
      <Header latestDate={latestDate} />
      <main className="newspaper-main">
        {days.map((day) => (
          <DaySection key={day.date} date={day.date} items={day.items} />
        ))}
      </main>
      <Footer />
    </>
  );
}