
import { useState } from "react";
import "./App.css";
import Results from "./Results";

const API_URL = "http://127.0.0.1:8000";

const presets = [
  { id: "reassure", icon: "♥", label: "Reassure my partner", tone: "Affectionate" },
  { id: "apologize", icon: "♡", label: "Apologise sincerely", tone: "Sincere" },
  { id: "explain", icon: "☏", label: "Explain how I feel", tone: "Honest" },
  { id: "resolve", icon: "◇", label: "Resolve an argument", tone: "Mature" },
  { id: "miss", icon: "✧", label: "Tell them I miss them", tone: "Affectionate" },
];

const formats = [
  { id: "paragraph", icon: "¶", title: "Paragraph", description: "One flowing, thoughtful message." },
  { id: "separate", icon: "▤", title: "Separate Messages", description: "Short, chat-friendly texts sent one by one." },
  { id: "mixed", icon: "❖", title: "Mixed Format", description: "Short messages and small paragraphs." },
  { id: "custom", icon: "✎", title: "My Own Style", description: "Match the way you naturally write." },
];

const capitalizationOptions = [
  { id: "normal", icon: "Aa", title: "Normal", description: "Natural capitalization." },
  { id: "caps", icon: "AA", title: "ALL CAPS", description: "ENTIRE MESSAGE IN CAPS." },
  { id: "lowercase", icon: "aa", title: "lowercase", description: "everything lowercase." },
  { id: "myStyle", icon: "~", title: "My Style", description: "Match your capitalization." },
];

const toneOptions = [
  "Affectionate",
  "Casual",
  "Mature",
  "Supportive",
  "Honest",
  "Direct",
];

const languageOptions = ["English", "Tamil", "Tanglish"];

function ChoiceGroup({ label, options, value, onChange }) {
  return (
    <fieldset className="drawer-group">
      <legend>{label}</legend>

      <div className="choice-wrap">
        {options.map((option) => {
          const selected = value === option;

          return (
            <button
              key={option}
              type="button"
              className={`choice-pill ${selected ? "is-active" : ""}`}
              aria-pressed={selected}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function App() {
  const [situation, setSituation] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("reassure");
  const [format, setFormat] = useState("mixed");
  const [capitalization, setCapitalization] = useState("normal");
  const [messageCount, setMessageCount] = useState(3);

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [tone, setTone] = useState("Affectionate");
  const [length, setLength] = useState("Medium");
  const [emoji, setEmoji] = useState("Minimal");
  const [writingStyle, setWritingStyle] = useState("Natural");
  const [language, setLanguage] = useState("English");
  const [additionalPreferences, setAdditionalPreferences] = useState("");
  const [writingSample, setWritingSample] = useState("");

  const [showResults, setShowResults] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function choosePreset(preset) {
    setSelectedPreset(preset.id);
    setTone(preset.tone);
    setShowResults(false);
  }

  // Send the user's preferences to FastAPI.
  async function handleGenerate() {
    if (!situation.trim()) {
      document.getElementById("situation")?.focus();
      return;
    }

    setLoading(true);
    setError("");
    setShowResults(false);

    const requestData = {
      situation: situation.trim(),
      format,
      tone,
      language,
      length,
      emoji,
      capitalization,
      messageCount,
      writingStyle,
      additionalPreferences,
      writingSample,
      selectedPreset,
    };

    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      console.log("ReassureAI API response:", data);

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "AI generation failed."
        );
      }

      if (!Array.isArray(data.messages) || data.messages.length !== messageCount) {
        throw new Error(
          `Expected ${messageCount} messages, but the backend returned ${
            Array.isArray(data.messages) ? data.messages.length : 0
          }. Please try again.`
        );
      }

      // Store the actual API response before opening the Results screen.
      setGeneratedMessages(data.messages.map((message) => ({
        type: message.type || "short",
        text: String(message.text || ""),
      })));

      setCustomizeOpen(false);
      setShowResults(true);

    } catch (err) {
      console.error("ReassureAI generation error:", err);

      if (err instanceof TypeError) {
        setError(
          "Cannot connect to the backend. Make sure FastAPI is running."
        );
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function resetSettings() {
    setTone("Affectionate");
    setLength("Medium");
    setEmoji("Minimal");
    setWritingStyle("Natural");
    setLanguage("English");
    setAdditionalPreferences("");
    setWritingSample("");
    setFormat("mixed");
    setCapitalization("normal");
    setMessageCount(3);
  }

  // RESULTS SCREEN
  if (showResults) {
    return (
      <Results
        situation={situation}
        format={format}
        tone={tone}
        language={language}
        length={length}
        emoji={emoji}
        capitalization={capitalization}
        messageCount={messageCount}
        generatedMessages={generatedMessages}
        writingStyle={writingStyle}
        additionalPreferences={additionalPreferences}
        writingSample={writingSample}
        selectedPreset={selectedPreset}
        onBack={() => setShowResults(false)}
      />
    );
  }

  // HOMEPAGE
  return (
    <div className="app-shell">

      {/* Sidebar */}
      <aside className="sidebar" aria-label="Quick start options">

        <a className="brand" href="#home" aria-label="ReassureAI home">
          <span className="brand-mark">♥</span>
          <span className="brand-name">ReassureAI</span>
        </a>

        <p className="brand-subtitle">Your feelings, better words.</p>

        <div className="sidebar-section-label">QUICK START</div>

        <nav className="preset-list" aria-label="Message presets">
          {presets.map((preset) => (
            <button
              type="button"
              key={preset.id}
              className={`preset-button ${
                selectedPreset === preset.id ? "selected" : ""
              }`}
              onClick={() => choosePreset(preset)}
              aria-pressed={selectedPreset === preset.id}
            >
              <span className={`preset-icon preset-icon-${preset.id}`}>
                {preset.icon}
              </span>
              <span>{preset.label}</span>
            </button>
          ))}
        </nav>

        <button
          className={`customize-launcher ${
            customizeOpen ? "selected" : ""
          }`}
          type="button"
          onClick={() => setCustomizeOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={customizeOpen}
        >
          <span className="customize-symbol">⚙</span>
          <span>Customise</span>
          <span className="launcher-arrow">›</span>
        </button>

        <div className="sidebar-divider" />

        <div className="message-count-heading">
          <label htmlFor="message-count">Number of messages</label>
          <strong>{messageCount}</strong>
        </div>

        <input
          id="message-count"
          className="message-slider"
          type="range"
          min="1"
          max="10"
          value={messageCount}
          onChange={(event) =>
            setMessageCount(Number(event.target.value))
          }
          aria-label="Number of messages"
        />

        <div className="slider-limits">
          <span>1</span>
          <span>10</span>
        </div>
      </aside>

      {/* Main workspace */}
      <main className="main-workspace" id="home">

        <div className="workspace-topline">
          <span className="tiny-kicker">
            A LITTLE HELP, WHEN YOU NEED IT
          </span>

          <span
            className="status-dot"
            title="Ready"
            aria-label="Ready"
          />
        </div>

        {/* Hero */}
        <header className="hero-heading">
          <h1>
            Let’s find the <em>right words.</em>
          </h1>

          <p>
            Tell us what’s happening, and we’ll help you say it.
          </p>
        </header>

        {/* Situation input */}
        <section
          className="composer"
          aria-label="Describe your situation"
        >
          <label className="sr-only" htmlFor="situation">
            Tell us what is happening
          </label>

          <textarea
            id="situation"
            value={situation}
            onChange={(event) => {
              setSituation(event.target.value);
              setError("");
            }}
            maxLength={1000}
            placeholder="Tell us what’s happening between you and your partner..."
          />

          <div className="composer-footer">
            <span>
              {presets.find(
                (item) => item.id === selectedPreset
              )?.label}
            </span>

            <span>{situation.length}/1000</span>
          </div>
        </section>

        {/* Message formats */}
        <section
          className="selection-section"
          aria-labelledby="format-heading"
        >
          <div className="section-title-row">
            <h2 id="format-heading">Message format</h2>
            <span>Choose how your messages are written.</span>
          </div>

          <div className="option-card-grid">
            {formats.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`option-card ${
                  format === item.id ? "selected" : ""
                }`}
                onClick={() => setFormat(item.id)}
                aria-pressed={format === item.id}
              >
                <span className={`option-icon icon-${item.id}`}>
                  {item.icon}
                </span>

                <span className="option-copy">
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>

                {format === item.id && (
                  <span className="selected-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>

          {format === "custom" && (
            <div className="style-sample-inline">
              <label htmlFor="writing-sample">
                A sample of how you text (optional)
              </label>

              <textarea
                id="writing-sample"
                value={writingSample}
                onChange={(event) =>
                  setWritingSample(event.target.value)
                }
                placeholder="Paste a message you’ve written before..."
                rows={2}
              />
            </div>
          )}
        </section>

        {/* Capitalization */}
        <section
          className="selection-section capitalization-section"
          aria-labelledby="caps-heading"
        >
          <div className="section-title-row">
            <h2 id="caps-heading">
              <span className="aa-heading">Aa</span> Capitalization
            </h2>

            <span>Choose how the text is capitalized.</span>
          </div>

          <div className="option-card-grid caps-grid">
            {capitalizationOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`option-card caps-card ${
                  capitalization === item.id ? "selected" : ""
                }`}
                onClick={() => setCapitalization(item.id)}
                aria-pressed={capitalization === item.id}
              >
                <span className={`option-icon caps-icon caps-${item.id}`}>
                  {item.icon}
                </span>

                <span className="option-copy">
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>

                {capitalization === item.id && (
                  <span className="selected-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            style={{
              color: "#b42318",
              background: "#fef3f2",
              padding: "12px 16px",
              borderRadius: "10px",
              marginTop: "16px",
            }}
          >
            {error}
          </div>
        )}

        {/* Generate */}
        <button
          className="generate-button"
          type="button"
          onClick={handleGenerate}
          disabled={loading}
        >
          <span className="generate-sparkle">✦</span>

          {loading ? "Creating your messages..." : "Generate messages"}

          <span className="generate-arrow">
            {loading ? "..." : "→"}
          </span>
        </button>

      </main>

      {/* Customization drawer */}
      {customizeOpen && (
        <>
          <button
            className="drawer-backdrop"
            aria-label="Close customisation panel"
            type="button"
            onClick={() => setCustomizeOpen(false)}
          />

          <aside
            className="customize-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
          >
            <div className="drawer-header">
              <div>
                <h2 id="drawer-title">
                  Customise your message
                </h2>

                <p>
                  Fine-tune the message to match your style, tone and preferences.
                </p>
              </div>

              <button
                className="drawer-close"
                type="button"
                onClick={() => setCustomizeOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="drawer-content">

              <ChoiceGroup
                label="Tone"
                options={toneOptions}
                value={tone}
                onChange={setTone}
              />

              <ChoiceGroup
                label="Message length"
                options={["Short", "Medium", "Long"]}
                value={length}
                onChange={setLength}
              />

              <ChoiceGroup
                label="Emojis"
                options={["Off", "Minimal", "Natural"]}
                value={emoji}
                onChange={setEmoji}
              />

              <ChoiceGroup
                label="Writing style"
                options={["Natural", "My style"]}
                value={writingStyle}
                onChange={setWritingStyle}
              />

              {writingStyle === "My style" && (
                <div className="drawer-field">
                  <label htmlFor="drawer-writing-sample">
                    Writing sample
                  </label>

                  <textarea
                    id="drawer-writing-sample"
                    rows={3}
                    value={writingSample}
                    onChange={(event) =>
                      setWritingSample(event.target.value)
                    }
                    placeholder="Paste a message you’ve written before..."
                  />
                </div>
              )}

              <div className="drawer-field">
                <label htmlFor="language">Language</label>

                <select
                  id="language"
                  value={language}
                  onChange={(event) =>
                    setLanguage(event.target.value)
                  }
                >
                  {languageOptions.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="drawer-field">
                <label htmlFor="additional-preferences">
                  Additional preferences
                </label>

                <textarea
                  id="additional-preferences"
                  rows={3}
                  value={additionalPreferences}
                  onChange={(event) =>
                    setAdditionalPreferences(event.target.value)
                  }
                  placeholder="Any specific instructions?"
                />
              </div>

              <button
                className="reset-button"
                type="button"
                onClick={resetSettings}
              >
                Reset preferences
              </button>
            </div>

            <div className="drawer-footer">
              <button
                type="button"
                className="apply-button"
                onClick={() => setCustomizeOpen(false)}
              >
                Apply preferences
              </button>
            </div>
          </aside>
        </>
      )}

    </div>
  );
}

export default App;
