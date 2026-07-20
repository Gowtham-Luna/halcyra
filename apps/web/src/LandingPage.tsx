import "./LandingPage.css";

interface Props {
  onGetStarted: () => void;
}

// Marketing landing page shown to signed-out visitors (see App.tsx). Visual
// system is intentionally self-contained (glass/clay/aurora) — see
// LandingPage.css for why it's scoped under .landing rather than sharing
// tokens with the authenticated app's --accent theme.
export function LandingPage({ onGetStarted }: Props) {
  return (
    <div className="landing">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <symbol id="i-sparkle" viewBox="0 0 24 24">
          <polygon className="filled" points="12,2 14,10 22,12 14,14 12,22 10,14 2,12 10,10" />
        </symbol>
        <symbol id="i-layers" viewBox="0 0 24 24">
          <polygon points="12,3 21,8 12,13 3,8" />
          <polyline points="3,13 12,18 21,13" />
        </symbol>
        <symbol id="i-send" viewBox="0 0 24 24">
          <polygon points="3,11 21,3 13,21 11,13" />
        </symbol>
        <symbol id="i-check" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <polyline points="8,12 11,15 16,9" />
        </symbol>
        <symbol id="i-image" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <polyline points="4,17 9,12 13,15 16,11 20,16" />
        </symbol>
        <symbol id="i-chart" viewBox="0 0 24 24">
          <rect x="4" y="12" width="4" height="8" rx="1" />
          <rect x="10" y="7" width="4" height="13" rx="1" />
          <rect x="16" y="3" width="4" height="17" rx="1" />
        </symbol>
        <symbol id="i-chat" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="13" rx="5" />
          <polygon className="filled" points="8,17 8,21 13,17" />
        </symbol>
        <symbol id="i-flip" viewBox="0 0 24 24">
          <rect x="3" y="6" width="13" height="15" rx="3" />
          <rect x="8" y="3" width="13" height="15" rx="3" />
        </symbol>
        <symbol id="i-target" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle className="filled" cx="12" cy="12" r="1.6" />
        </symbol>
        <symbol id="i-puzzle" viewBox="0 0 24 24">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <circle cx="12" cy="4" r="2" />
        </symbol>
      </svg>

      <a className="skip-link" href="#landing-main">Skip to content</a>

      <header className="site">
        <div className="wrap">
          <nav className="glass nav-glass">
            <span className="wordmark">
              <svg className="icon filled">
                <use href="#i-sparkle" />
              </svg>
              Halcyra
            </span>
            <button type="button" className="btn clay nav-cta" onClick={onGetStarted}>
              Start building
            </button>
          </nav>
        </div>
      </header>

      <main id="landing-main">
        <section className="hero">
          <div className="aurora" aria-hidden="true"></div>
          <div className="wrap hero-inner">
            <div className="hero-copy">
              <span className="tag eyebrow">
                <svg className="icon filled" style={{ width: 14, height: 14 }}>
                  <use href="#i-sparkle" />
                </svg>
                AI-assisted course authoring
              </span>
              <h1>
                Type a topic.
                <br />
                Get a <span>course</span>.
              </h1>
              <p className="hero-sub">
                Halcyra drafts full lessons, quizzes, and images from a single line of text —
                then hands you real, editable blocks instead of a black box.
              </p>
              <div className="glass prompt-card">
                <div className="clay-well well">
                  <span className="cursor" aria-hidden="true">&gt;</span>
                  <span className="topic">Workplace fire safety basics</span>
                </div>
                <button type="button" className="clay" onClick={onGetStarted}>
                  Draft with AI
                </button>
              </div>
              <p className="hero-hint">No credit card. Export whenever you're ready.</p>
            </div>

            <div className="scene" aria-hidden="true">
              <svg className="icon filled sparkle s1">
                <use href="#i-sparkle" />
              </svg>
              <svg className="icon filled sparkle s2">
                <use href="#i-sparkle" />
              </svg>
              <svg className="icon filled sparkle s3">
                <use href="#i-sparkle" />
              </svg>

              <div className="glass float-card f1">
                <div className="badge">
                  <svg className="icon">
                    <use href="#i-check" />
                  </svg>
                </div>
                <span className="tag">Quiz</span>
                <p>Which extinguisher works on an electrical fire?</p>
              </div>
              <div className="glass float-card f2">
                <div className="badge">
                  <svg className="icon">
                    <use href="#i-chat" />
                  </svg>
                </div>
                <span className="tag">Scenario</span>
                <p>The alarm sounds. What do you do first?</p>
              </div>
              <div className="glass float-card f3">
                <div className="badge">
                  <svg className="icon">
                    <use href="#i-image" />
                  </svg>
                </div>
                <span className="tag">Image</span>
                <p>Exit route, floor 3 — auto-captioned.</p>
              </div>
              <div className="glass float-card f4">
                <div className="badge">
                  <svg className="icon">
                    <use href="#i-layers" />
                  </svg>
                </div>
                <span className="tag">Heading</span>
                <p>Know the fire classes before you evacuate.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <span className="tag eyebrow">How it works</span>
              <h2>Three steps, in the order you'd actually do them</h2>
            </div>
            <div className="process-grid">
              <div className="glass process-card">
                <div className="badge">
                  <svg className="icon">
                    <use href="#i-send" />
                  </svg>
                </div>
                <span className="step-num">STEP 01</span>
                <h3>Describe the topic</h3>
                <p>Tell Halcyra what the course should cover. It drafts a full outline in seconds.</p>
              </div>
              <div className="glass process-card">
                <div className="badge">
                  <svg className="icon">
                    <use href="#i-puzzle" />
                  </svg>
                </div>
                <span className="step-num">STEP 02</span>
                <h3>Edit real blocks</h3>
                <p>
                  Every lesson breaks into blocks — paragraphs, quizzes, charts, branching scenarios. Rearrange,
                  rewrite, or hand any block back to AI.
                </p>
              </div>
              <div className="glass process-card">
                <div className="badge">
                  <svg className="icon">
                    <use href="#i-target" />
                  </svg>
                </div>
                <span className="step-num">STEP 03</span>
                <h3>Export anywhere</h3>
                <p>Package to SCORM 1.2, SCORM 2004, or xAPI, or share a link directly. No LMS required.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <span className="tag eyebrow">The building blocks</span>
              <h2>Every lesson is made of pieces you can see and rearrange</h2>
            </div>
            <div className="block-grid">
              <div className="glass block-card">
                <div className="badge">
                  <svg className="icon">
                    <use href="#i-check" />
                  </svg>
                </div>
                <span className="tag">Multiple choice</span>
                <p>Ask a question, grade it automatically, explain the answer.</p>
              </div>
              <div className="glass block-card">
                <div className="badge">
                  <svg className="icon">
                    <use href="#i-layers" />
                  </svg>
                </div>
                <span className="tag">Fill in the blank</span>
                <p>Test recall, not just recognition.</p>
              </div>
              <div className="glass block-card">
                <div className="badge">
                  <svg className="icon">
                    <use href="#i-image" />
                  </svg>
                </div>
                <span className="tag">Labeled graphic</span>
                <p>Turn a diagram into hotspots learners click through.</p>
              </div>
              <div className="glass block-card">
                <div className="badge">
                  <svg className="icon">
                    <use href="#i-chat" />
                  </svg>
                </div>
                <span className="tag">Scenario</span>
                <p>Branch a conversation by the choice a learner makes.</p>
              </div>
              <div className="glass block-card">
                <div className="badge">
                  <svg className="icon">
                    <use href="#i-chart" />
                  </svg>
                </div>
                <span className="tag">Chart</span>
                <p>Show a trend without leaving the lesson.</p>
              </div>
              <div className="glass block-card">
                <div className="badge">
                  <svg className="icon">
                    <use href="#i-flip" />
                  </svg>
                </div>
                <span className="tag">Flashcards</span>
                <p>Front, back, flip to check yourself.</p>
              </div>
              <div className="glass block-card">
                <div className="badge">
                  <svg className="icon">
                    <use href="#i-target" />
                  </svg>
                </div>
                <span className="tag">Matching</span>
                <p>Pair terms with definitions, shuffled per attempt.</p>
              </div>
              <div className="glass block-card">
                <div className="badge">
                  <svg className="icon">
                    <use href="#i-puzzle" />
                  </svg>
                </div>
                <span className="tag">Timeline</span>
                <p>Lay a process out in the order it happens.</p>
              </div>
            </div>
            <p className="block-count">Shown: 8 of 30+ block types</p>
          </div>
        </section>

        <section className="cta-section" id="cta">
          <div className="wrap">
            <div className="glass cta-card">
              <h2>Draft your first course</h2>
              <p>Free to start. Nothing to install. Export whenever you're ready to put it in front of learners.</p>
              <button type="button" className="clay" onClick={onGetStarted}>
                Start building
              </button>
              <p className="cta-fine">Takes about as long as writing the topic.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="site">
        <div className="wrap">
          <div className="glass footer-glass">
            <span className="wordmark" style={{ fontSize: "1.05rem" }}>
              <svg className="icon filled" style={{ width: 17, height: 17 }}>
                <use href="#i-sparkle" />
              </svg>
              Halcyra
            </span>
            <span className="footer-tag">Built for people who'd rather teach than fight software.</span>
            <span className="footer-tag">© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
