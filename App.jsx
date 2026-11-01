import { useEffect, useState, useCallback } from "react";

const GITHUB_RAW =
  "https://raw.githubusercontent.com/bnbcast/hndaily-digest/main/digest";

const NICHE_SOURCES = [
  {
    id: "lobsters",
    name: "Lobste.rs",
    label: "Computing · Lobsters",
    rss: "https://lobste.rs/rss",
  },
  {
    id: "arstechnica",
    name: "Ars Technica",
    label: "Technology · Ars Technica",
    rss: "https://feeds.arstechnica.com/arstechnica/technology-lab",
  },
  {
    id: "hackaday",
    name: "Hackaday",
    label: "Hardware · Hackaday",
    rss: "https://hackaday.com/blog/feed/",
  },
  {
    id: "devto",
    name: "Dev.to",
    label: "Developer Community · Dev.to",
    rss: "https://dev.to/feed",
  },
  {
    id: "stackoverflow",
    name: "Stack Overflow Blog",
    label: "Engineering · Stack Overflow",
    rss: "https://stackoverflow.blog/feed/",
  },
];

function parseDigestMarkdown(text) {
  const lines = text.split("\n");
  const stories = [];
  for (const line of lines) {
    const m = line.match(/^- \[(.+?)\]\((.+?)\)\s*\((\d+)\s*points\)/);
    if (m) {
      stories.push({ title: m[1], url: m[2], points: Number(m[3]) });
    }
  }
  return stories;
}

function fetchDigest(date) {
  return fetch(`${GITHUB_RAW}/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.toISOString().slice(0, 10)}.md`)
    .then((r) => (r.ok ? r.text() : ""))
    .then(parseDigestMarkdown);
}

function fetchRSS(url) {
  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  return fetch(proxy)
    .then((r) => (r.ok ? r.text() : ""))
    .then((xml) => {
      if (!xml) return [];
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "application/xml");
      const items = [...doc.querySelectorAll("item")].map((item) => ({
        title: item.querySelector("title")?.textContent?.trim() || "",
        url: item.querySelector("link")?.textContent?.trim() || "",
        points: 0,
      }));
      return items.slice(0, 5);
    })
    .catch(() => []);
}

function useFetchDigest(date) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchDigest(date)
      .then((s) => setStories(s))
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  }, [date]);

  return { stories, loading };
}

function useFetchRSS(source) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchRSS(source.rss)
      .then((s) => setStories(s))
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  }, [source.rss]);

  return { stories, loading };
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatDateShort(d) {
  return d.toISOString().slice(0, 10);
}

function SectionHeader({ name, label, count }) {
  return (
    <>
      <h2 className="section-header">{name}</h2>
      <div className="section-source">{label} · {count} stories</div>
    </>
  );
}

function StoryList({ stories, loading, sourceName }) {
  if (loading) {
    return (
      <div className="loading">Loading {sourceName}…</div>
    );
  }
  if (stories.length === 0) {
    return (
      <div className="loading">No stories available for {sourceName}.</div>
    );
  }
  return (
    <>
      {stories.map((s, i) => (
        <div key={i} className="story">
          <h3 className="story-title">
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title}
            </a>
          </h3>
          <p className="story-meta">{s.points > 0 ? `${s.points} points` : "niche source"} · {sourceName}</p>
        </div>
      ))}
    </>
  );
}

function Section({ source, dateStr, loading, stories }) {
  const sourceName = source.id === "hn" ? "Hacker News" : source.name;
  return (
    <section className="section">
      <SectionHeader name={sourceName} label={source.label} count={stories.length} />
      <StoryList stories={stories} loading={loading} sourceName={sourceName} />
    </section>
  );
}

export default function App() {
  const today = new Date();
  const dateStr = formatDateShort(today);
  const dateLabel = formatDate(today);

  const [hnStories, setHNStories] = useState([]);
  const [hnLoading, setHNLoading] = useState(true);
  const [nicheData, setNicheData] = useState(
    NICHE_SOURCES.map(() => ({ stories: [], loading: true })),
  );

  // Fetch latest available digest (try today, then previous days)
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 7;

    function tryDate(offset) {
      if (cancelled || attempts >= maxAttempts) return;
      attempts += 1;
      const d = new Date(today);
      d.setDate(d.getDate() - offset);
      fetchDigest(d)
        .then((stories) => {
          if (cancelled) return;
          if (stories.length > 0) {
            setHNStories(stories);
            setHNLoading(false);
          } else {
            tryDate(offset + 1);
          }
        })
        .catch(() => {
          if (cancelled) return;
          tryDate(offset + 1);
        });
    }

    tryDate(0);
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch niche RSS feeds
  useEffect(() => {
    let cancelled = false;
    NICHE_SOURCES.forEach((source, idx) => {
      fetchRSS(source.rss)
        .then((stories) => {
          if (cancelled) return;
          setNicheData((prev) => {
            const next = [...prev];
            next[idx] = { stories, loading: false };
            return next;
          });
        })
        .catch(() => {
          if (cancelled) return;
          setNicheData((prev) => {
            const next = [...prev];
            next[idx] = { stories: [], loading: false };
            return next;
          });
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const allSections = [
    { id: "hn", name: "Hacker News", label: "Tech · Y Combinator", stories: hnStories, loading: hnLoading },
    ...NICHE_SOURCES.map((source, idx) => ({
      id: source.id,
      name: source.name,
      label: source.label,
      stories: nicheData[idx]?.stories ?? [],
      loading: nicheData[idx]?.loading ?? true,
    })),
  ];

  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <h1 className="masthead-name">THE DAILY DIGEST</h1>
          <div className="masthead-rule"></div>
          <div className="masthead-sub">
            <span className="masthead-date">{dateLabel}</span>
            <span className="masthead-tagline">A daily newspaper for developers · {allSections.length} sources</span>
          </div>
        </div>
      </header>

      <div className="issue-bar">
        <span>Edition: {dateStr}</span>
        <span>Sources: {allSections.map((s) => s.name).join(" · ")}</span>
        <span>Total stories: {allSections.reduce((a, s) => a + s.stories.length, 0)}</span>
      </div>

      <div className="columns">
        {allSections.map((section) => (
          <Section
            key={section.id}
            source={{ id: section.id, name: section.name, label: section.label }}
            dateStr={dateStr}
            loading={section.loading}
            stories={section.stories}
          />
        ))}
      </div>
    </>
  );
}
