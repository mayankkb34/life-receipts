import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import "./App.css";

const DATASETS = {
  spotify: "/data/spotify_history.csv",
  household: "/data/Daily Household Transactions.csv",
  india: "/data/Augmented_IndiaTransactMultiFacet2024.csv",
};

const icons = {
  Music: "♪",
  Purchase: "₹",
  Place: "⌖",
  Activity: "✦",
};

function parseDate(value) {
  if (!value) return null;

  const text = String(value).trim();

  // Spotify: 2013-07-08 02:44:34
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const d = new Date(text.replace(" ", "T"));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Household: 20/09/2018 12:04:08
  const ddmmyyyy = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):?(\d{2})?)?/
  );

  if (ddmmyyyy) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] =
      ddmmyyyy;

    const d = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );

    return Number.isNaN(d.getTime()) ? null : d;
  }

  // India transaction: 12/26/2023
  const mmddyyyy = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );

  if (mmddyyyy) {
    const [, month, day, year, hour = "0", minute = "0", second = "0"] =
      mmddyyyy;

    const d = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );

    return Number.isNaN(d.getTime()) ? null : d;
  }

  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function dateKey(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function money(value) {
  const n = Number(String(value || 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n)
    ? `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
    : "₹0";
}

function loadCsv(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      worker: false,
      complete: (result) => resolve(result.data),
      error: reject,
    });
  });
}

function App() {
  const [spotify, setSpotify] = useState([]);
  const [household, setHousehold] = useState([]);
  const [india, setIndia] = useState([]);

  const [activeTab, setActiveTab] = useState("overview");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [spotifyData, householdData, indiaData] = await Promise.all([
          loadCsv(DATASETS.spotify),
          loadCsv(DATASETS.household),
          loadCsv(DATASETS.india),
        ]);

        setSpotify(spotifyData);
        setHousehold(householdData);
        setIndia(indiaData);
      } catch (err) {
        console.error(err);
        setError(
          "The datasets could not be loaded. Check that all three CSV files are inside public/data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const musicReceipts = useMemo(() => {
    return spotify
      .filter((row) => row.ts)
      .map((row, index) => {
        const date = parseDate(row.ts);

        return {
          id: `music-${index}`,
          type: "Music",
          date,
          title: row.track_name || "Unknown track",
          subtitle: row.artist_name || "Unknown artist",
          detail: row.album_name || "Unknown album",
          value: Number(row.ms_played || 0),
          dateLabel: date
            ? date.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "Unknown date",
        };
      });
  }, [spotify]);

  const purchaseReceipts = useMemo(() => {
    return household
      .filter((row) => row.Date)
      .map((row, index) => {
        const date = parseDate(row.Date);

        return {
          id: `purchase-${index}`,
          type: "Purchase",
          date,
          title: row.Category || "Transaction",
          subtitle: row.Subcategory || row.Mode || "Purchase",
          detail: row.Note || "",
          value: Number(String(row.Amount || 0).replace(/[^0-9.-]/g, "")),
          dateLabel: date
            ? date.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "Unknown date",
        };
      });
  }, [household]);

  const placeReceipts = useMemo(() => {
    return india
      .filter((row) => row.trans_date)
      .map((row, index) => {
        const date = parseDate(
          row.trans_date + (row.trans_time ? ` ${row.trans_time}` : "")
        );

        return {
          id: `place-${index}`,
          type: "Place",
          date,
          title: row.merchant || "Unknown merchant",
          subtitle: row.city || row.state || "Unknown place",
          detail: row.category || "Transaction",
          value: Number(String(row.amount || 0).replace(/[^0-9.-]/g, "")),
          dateLabel: date
            ? date.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "Unknown date",
        };
      });
  }, [india]);

  const allReceipts = useMemo(
    () => [...musicReceipts, ...purchaseReceipts, ...placeReceipts],
    [musicReceipts, purchaseReceipts, placeReceipts]
  );

  const filteredReceipts = useMemo(() => {
    const q = search.toLowerCase().trim();

    return allReceipts
      .filter((item) => filter === "All" || item.type === filter)
      .filter((item) => {
        if (!q) return true;

        return [
          item.title,
          item.subtitle,
          item.detail,
          item.type,
          item.dateLabel,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const aTime = a.date ? a.date.getTime() : 0;
        const bTime = b.date ? b.date.getTime() : 0;
        return bTime - aTime;
      });
  }, [allReceipts, filter, search]);

  const totalListeningHours = useMemo(() => {
    const milliseconds = musicReceipts.reduce(
      (sum, item) => sum + item.value,
      0
    );

    return Math.round(milliseconds / 3600000);
  }, [musicReceipts]);

  const totalSpending = useMemo(() => {
    return purchaseReceipts.reduce((sum, item) => sum + item.value, 0);
  }, [purchaseReceipts]);

  const topArtist = useMemo(() => {
    const counts = {};

    spotify.forEach((row) => {
      const artist = row.artist_name?.trim();
      if (artist) counts[artist] = (counts[artist] || 0) + 1;
    });

    return (
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "Discovering..."
    );
  }, [spotify]);

  const topCity = useMemo(() => {
    const counts = {};

    india.forEach((row) => {
      const city = row.city?.trim();
      if (city) counts[city] = (counts[city] || 0) + 1;
    });

    return (
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "Unknown"
    );
  }, [india]);

  const connections = useMemo(() => {
    const musicByDay = new Map();
    const purchaseByDay = new Map();
    const placeByDay = new Map();

    musicReceipts.forEach((item) => {
      const key = dateKey(item.date);
      if (key) musicByDay.set(key, (musicByDay.get(key) || 0) + 1);
    });

    purchaseReceipts.forEach((item) => {
      const key = dateKey(item.date);
      if (key) purchaseByDay.set(key, (purchaseByDay.get(key) || 0) + 1);
    });

    placeReceipts.forEach((item) => {
      const key = dateKey(item.date);
      if (key) placeByDay.set(key, (placeByDay.get(key) || 0) + 1);
    });

    const days = new Set([
      ...musicByDay.keys(),
      ...purchaseByDay.keys(),
      ...placeByDay.keys(),
    ]);

    return [...days]
      .map((day) => ({
        day,
        music: musicByDay.get(day) || 0,
        purchases: purchaseByDay.get(day) || 0,
        places: placeByDay.get(day) || 0,
      }))
      .filter((item) => {
        const activeTypes = [
          item.music > 0,
          item.purchases > 0,
          item.places > 0,
        ].filter(Boolean).length;

        return activeTypes >= 2;
      })
      .sort(
        (a, b) =>
          b.music +
          b.purchases +
          b.places -
          (a.music + a.purchases + a.places)
      )
      .slice(0, 8);
  }, [musicReceipts, purchaseReceipts, placeReceipts]);

  const story = useMemo(() => {
    const chapters = [];

    chapters.push({
      number: "01",
      title: "The listening trail",
      text: `Music leaves one of the strongest fingerprints in this dataset. There are ${musicReceipts.length.toLocaleString()} listening records, adding up to roughly ${totalListeningHours.toLocaleString()} hours of playback.`,
    });

    chapters.push({
      number: "02",
      title: "Where attention went",
      text: `${topArtist} appears as the most frequently recorded artist in the listening history. That recurring preference gives the otherwise anonymous data a recognizable rhythm.`,
    });

    chapters.push({
      number: "03",
      title: "The spending trail",
      text: `The household records contain ${purchaseReceipts.length.toLocaleString()} transactions with a combined recorded amount of ${money(totalSpending)}. Categories and notes turn individual payments into behavioural clues.`,
    });

    chapters.push({
      number: "04",
      title: "Places in the story",
      text: `${topCity} is the most frequently appearing city in the transaction dataset. Locations add another layer to the story: activities are not only things that happened, but things that happened somewhere.`,
    });

    chapters.push({
      number: "05",
      title: "When the dots meet",
      text:
        connections.length > 0
          ? `${connections.length} high-activity date patterns were found where at least two different types of digital traces overlap. Those overlaps are where isolated receipts start becoming chapters.`
          : "The datasets contain different kinds of activity, but there are not enough overlapping dates to form strong cross-category connections yet.",
    });

    return chapters;
  }, [
    musicReceipts.length,
    totalListeningHours,
    topArtist,
    purchaseReceipts.length,
    totalSpending,
    topCity,
    connections.length,
  ]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-mark">L</div>
        <p>Reading the receipts...</p>
        <span>Connecting three digital trails</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h1>Something went wrong.</h1>
        <p>{error}</p>
        <p>
          Check <strong>public/data</strong> and make sure the three CSV files
          are there.
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          <div className="brand-mark">L</div>
          <div>
            <strong>LIFE//RECEIPTS</strong>
            <small>THE STORY BEHIND THE DATA</small>
          </div>
        </div>

        <nav>
          {["overview", "explore", "connections", "story"].map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "nav-active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="profile-mark">M</div>
      </header>

      <main>
        {activeTab === "overview" && (
          <section className="page">
            <div className="hero">
              <p className="eyebrow">DIGITAL LIFE / DATA STORY</p>
              <h1>
                Your life,
                <br />
                <em>in receipts.</em>
              </h1>
              <p className="hero-text">
                Hundreds of tiny moments. Songs, purchases, places and
                transactions — connected into one story.
              </p>

              <button
                className="primary-button"
                onClick={() => setActiveTab("explore")}
              >
                Explore the story <span>→</span>
              </button>
            </div>

            <div className="section-heading">
              <div>
                <p className="eyebrow">THE BIG PICTURE</p>
                <h2>What the data remembers.</h2>
              </div>
              <span>{allReceipts.length.toLocaleString()} receipts</span>
            </div>

            <div className="stats-grid">

  <div className="stat-card">
    <span className="stat-icon">♪</span>
    <small className="stat-label">LISTENING TIME</small>
    <strong className="stat-value">
      {totalListeningHours.toLocaleString()}h
    </strong>
    <p className="stat-description">recorded playback</p>
  </div>

  <div className="stat-card">
    <span className="stat-icon">₹</span>
    <small className="stat-label">TRANSACTION VALUE</small>
    <strong className="stat-value">
      {money(totalSpending)}
    </strong>
    <p className="stat-description">household records</p>
  </div>

  <div className="stat-card">
    <span className="stat-icon">⌖</span>
    <small className="stat-label">TOP PLACE</small>
    <strong className="stat-value">
      {topCity}
    </strong>
    <p className="stat-description">most recorded city</p>
  </div>

              <div className="stat-card">
  <span className="stat-icon">✦</span>
  <small className="stat-label">TOP ARTIST</small>
  <strong className="stat-value">
    {topArtist}
  </strong>
  <p className="stat-description">most repeated artist</p>
</div>

</div>

            <div className="insight-card">
              <div className="insight-icon">✦</div>
              <div>
                <p className="eyebrow">A FIRST INSIGHT</p>
                <h3>
                  The interesting part isn't each receipt. It's where they
                  overlap.
                </h3>
                <p>
                  The interface looks for dates where music, transactions and
                  places appear together — turning isolated records into
                  connected moments.
                </p>
              </div>
            </div>
          </section>
        )}

        {activeTab === "explore" && (
          <section className="page">
            <div className="section-heading large">
              <div>
                <p className="eyebrow">EXPLORE</p>
                <h1>Every receipt has a clue.</h1>
              </div>
              <span>{filteredReceipts.length.toLocaleString()} shown</span>
            </div>

            <div className="toolbar">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search songs, artists, cities, purchases..."
              />

              <div className="filters">
                {["All", "Music", "Purchase", "Place"].map((item) => (
                  <button
                    key={item}
                    className={filter === item ? "filter-active" : ""}
                    onClick={() => setFilter(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="receipt-grid">
              {filteredReceipts.slice(0, 120).map((item) => (
                <article className="receipt-card" key={item.id}>
                  <div className="receipt-top">
                    <span className="receipt-type">
                      {icons[item.type]} {item.type}
                    </span>
                    <span>{item.dateLabel}</span>
                  </div>

                  <h3>{item.title}</h3>
                  <p>{item.subtitle}</p>

                  {item.detail && <small>{item.detail}</small>}

                  <div className="receipt-line" />

                  <span className="receipt-value">
                    {item.type === "Music"
                      ? `${Math.round(item.value / 60000)} min`
                      : money(item.value)}
                  </span>
                </article>
              ))}
            </div>

            {filteredReceipts.length > 120 && (
              <p className="limit-note">
                Showing the first 120 matching receipts for a faster
                experience.
              </p>
            )}
          </section>
        )}

        {activeTab === "connections" && (
          <section className="page">
            <div className="section-heading large">
              <div>
                <p className="eyebrow">CONNECTIONS</p>
                <h1>Where the dots meet.</h1>
              </div>
            </div>

            <p className="intro">
              These are dates where different types of digital activity
              appear together. Instead of treating every record independently,
              we can see them as pieces of the same moment.
            </p>

            <div className="connection-list">
              {connections.map((item) => (
                <article className="connection-card" key={item.day}>
                  <div className="connection-date">
                    {new Date(`${item.day}T12:00:00`).toLocaleDateString(
                      "en-IN",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </div>

                  <div className="connection-flow">
                    {item.music > 0 && (
                      <div>
                        <span>♪</span>
                        <strong>{item.music}</strong>
                        <small>music records</small>
                      </div>
                    )}

                    {item.purchases > 0 && (
                      <div>
                        <span>₹</span>
                        <strong>{item.purchases}</strong>
                        <small>purchases</small>
                      </div>
                    )}

                    {item.places > 0 && (
                      <div>
                        <span>⌖</span>
                        <strong>{item.places}</strong>
                        <small>place records</small>
                      </div>
                    )}
                  </div>

                  <p>
                    Multiple digital trails intersected on this day — a
                    potential chapter hidden inside the raw data.
                  </p>
                </article>
              ))}

              {connections.length === 0 && (
                <div className="empty-state">
                  No strong cross-category date connections were found.
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "story" && (
          <section className="page story-page">
            <div className="story-intro">
              <p className="eyebrow">THE STORY</p>
              <h1>
                From data
                <br />
                <em>to meaning.</em>
              </h1>
              <p>
                A collection of digital fragments becomes more interesting when
                we stop asking only what happened — and start asking what the
                pattern means.
              </p>
            </div>

            <div className="chapters">
              {story.map((chapter) => (
                <article className="chapter" key={chapter.number}>
                  <div className="chapter-number">{chapter.number}</div>
                  <div>
                    <p className="eyebrow">CHAPTER {chapter.number}</p>
                    <h2>{chapter.title}</h2>
                    <p>{chapter.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer>
        <span>LIFE//RECEIPTS</span>
        <span>RAW DATA → INSIGHTS → CONNECTIONS → STORY</span>
      </footer>
    </div>
  );
}

export default App;
