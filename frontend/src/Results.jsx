import { useState } from "react";
import "./Results.css";

const API_URL = "http://127.0.0.1:8000";

function Results({
  situation = "",
  format = "mixed",
  tone = "Affectionate",
  language = "English",
  length = "Medium",
  emoji = "Minimal",
  capitalization = "normal",
  messageCount = 3,
  generatedMessages = [],
  writingStyle = "Natural",
  additionalPreferences = "",
  writingSample = "",
  selectedPreset = "",
  onBack = () => {},
}) {
  // Results is mounted after the API response arrives, so initialize
  // directly from the real backend response.
  const [messages, setMessages] = useState(() =>
    (Array.isArray(generatedMessages) ? generatedMessages : []).map(
      (message, index) => ({
        id: index + 1,
        type: message.type || "short",
        text: message.text || "",
      })
    )
  );

  const [editingId, setEditingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [error, setError] = useState("");

  const formatName = {
    paragraph: "Paragraph",
    separate: "Separate Messages",
    mixed: "Mixed Format",
    custom: "My Own Style",
  };

  async function copyText(text, id = null) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id ?? "all");
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      alert("Copy failed. Please select the text manually.");
    }
  }

  function updateMessage(id, newText) {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, text: newText } : message
      )
    );
  }

  function buildRequest(count, requestedFormat = format) {
    return {
      situation,
      format: requestedFormat,
      tone,
      language,
      length,
      emoji,
      capitalization,
      messageCount: count,
      writingStyle,
      additionalPreferences,
      writingSample,
      selectedPreset,
    };
  }

  async function requestAI(count, requestedFormat = format) {
    const response = await fetch(`${API_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRequest(count, requestedFormat)),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "AI generation failed.");
    }

    if (!Array.isArray(data.messages) || data.messages.length !== count) {
      throw new Error(
        `Expected ${count} messages, received ${
          Array.isArray(data.messages) ? data.messages.length : 0
        }.`
      );
    }

    return data.messages;
  }

  async function regenerateMessage(id) {
    if (regeneratingId !== null || regeneratingAll) return;

    const target = messages.find((message) => message.id === id);
    if (!target) return;

    setRegeneratingId(id);
    setError("");

    try {
      const requestedFormat =
        target.type === "paragraph" ? "paragraph" : "separate";
      const fresh = await requestAI(1, requestedFormat);

      setMessages((current) =>
        current.map((message) =>
          message.id === id
            ? {
                ...message,
                text: fresh[0].text,
                type: fresh[0].type || target.type,
              }
            : message
        )
      );
      setEditingId(null);
    } catch (err) {
      console.error("Regenerate message failed:", err);
      setError(err.message || "Could not regenerate this message.");
    } finally {
      setRegeneratingId(null);
    }
  }

  async function regenerateAll() {
    if (regeneratingAll || regeneratingId !== null) return;

    setRegeneratingAll(true);
    setError("");

    try {
      const fresh = await requestAI(messageCount);
      setMessages(
        fresh.map((message, index) => ({
          id: index + 1,
          type: message.type || "short",
          text: message.text || "",
        }))
      );
      setEditingId(null);
    } catch (err) {
      console.error("Regenerate all failed:", err);
      setError(err.message || "Could not regenerate messages.");
    } finally {
      setRegeneratingAll(false);
    }
  }

  const copyAll = messages.map((message) => message.text).join("\n\n");

  if (messages.length === 0) {
    return (
      <div className="results-page">
        <header className="results-navbar">
          <a href="#home" className="results-brand">
            <span>●</span> Reassure<span>AI</span>
          </a>
          <button className="back-button" onClick={onBack}>
            ← Go back
          </button>
        </header>
        <main className="results-container">
          <h1>No messages received from the backend.</h1>
          <p>
            The Results screen opened without message data. Go back and
            generate again. Check the browser console for the API response.
          </p>
          <button className="adjust-button" onClick={onBack}>
            Go back →
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="results-page">
      <header className="results-navbar">
        <a href="#home" className="results-brand">
          <span>●</span> Reassure<span>AI</span>
        </a>
        <button className="back-button" onClick={onBack}>
          ← Edit your story
        </button>
      </header>

      <main className="results-container">
        <div className="results-heading">
          <span className="results-eyebrow">YOUR MESSAGES</span>
          <h1>Your messages are ready.</h1>
          <p>
            Review each message, make it yours, and copy whenever you're ready.
          </p>
        </div>

        <div className="results-tags">
          <span>{formatName[format] || format}</span>
          <span>{tone}</span>
          <span>{language}</span>
          <span>{length}</span>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              color: "#b42318",
              background: "#fef3f2",
              padding: "12px 16px",
              borderRadius: "10px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        <div className="results-layout">
          <section className="message-list">
            {messages.map((message, index) => (
              <article
                key={message.id}
                className={`message-card ${message.type}`}
              >
                <div className="message-label">
                  <span className="message-number">{index + 1}</span>
                  {message.type === "short" ? "SHORT MESSAGE" : "PARAGRAPH"}
                </div>

                {editingId === message.id ? (
                  <textarea
                    className="edit-message"
                    value={message.text}
                    onChange={(event) =>
                      updateMessage(message.id, event.target.value)
                    }
                  />
                ) : (
                  <p className="message-text">{message.text}</p>
                )}

                <div className="message-actions">
                  <button
                    className="copy-button"
                    onClick={() => copyText(message.text, message.id)}
                  >
                    {copiedId === message.id ? "Copied ✓" : "Copy"}
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      setEditingId(editingId === message.id ? null : message.id)
                    }
                  >
                    {editingId === message.id ? "Done" : "Edit"}
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() => regenerateMessage(message.id)}
                    disabled={regeneratingId !== null || regeneratingAll}
                  >
                    {regeneratingId === message.id
                      ? "Generating..."
                      : "Regenerate"}
                  </button>
                </div>
              </article>
            ))}
          </section>

          <aside className="results-sidebar">
            <h2>Your settings</h2>

            <div className="setting-row">
              <span>Format</span>
              <strong>{formatName[format] || format}</strong>
            </div>
            <div className="setting-row">
              <span>Tone</span>
              <strong>{tone}</strong>
            </div>
            <div className="setting-row">
              <span>Language</span>
              <strong>{language}</strong>
            </div>
            <div className="setting-row">
              <span>Message length</span>
              <strong>{length}</strong>
            </div>
            <div className="setting-row">
              <span>Capitalization</span>
              <strong>{capitalization}</strong>
            </div>
            <div className="setting-row">
              <span>Emoji</span>
              <strong>{emoji}</strong>
            </div>
            <div className="setting-row">
              <span>Message count</span>
              <strong>{messages.length}</strong>
            </div>

            <button className="copy-all-button" onClick={() => copyText(copyAll)}>
              {copiedId === "all" ? "Copied all ✓" : "Copy all messages"}
            </button>

            <button
              className="regenerate-all-button"
              onClick={regenerateAll}
              disabled={regeneratingAll || regeneratingId !== null}
            >
              {regeneratingAll ? "Generating..." : "Regenerate all"}
            </button>

            <button className="adjust-button" onClick={onBack}>
              Adjust settings →
            </button>
          </aside>
        </div>

        <p className="results-note">
          Your messages are generated by ReassureAI. Edit them to make them
          your own.
        </p>
      </main>
    </div>
  );
}

export default Results;
