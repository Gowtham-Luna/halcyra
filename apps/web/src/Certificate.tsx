import { useState } from "react";

interface Props {
  courseTitle: string;
  defaultName: string;
  onClose: () => void;
}

// Printable certificate (window.print → "Save as PDF"). A real PDF generator
// is slice 10's job (Export: PDF); this reuses the browser's print pipeline
// instead of adding a PDF dependency just for this.
export function Certificate({ courseTitle, defaultName, onClose }: Props) {
  const [name, setName] = useState(defaultName);
  const dateLabel = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="certificate-page">
      <div className="certificate-controls no-print">
        <button className="link" onClick={onClose}>← Back to course</button>
        <div className="certificate-name-field">
          <label htmlFor="cert-name">Name on certificate</label>
          <input id="cert-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button onClick={() => window.print()}>🖨 Print / Save as PDF</button>
      </div>

      <div className="certificate">
        <p className="certificate-eyebrow">Certificate of Completion</p>
        <h1 className="certificate-name">{name || "Learner"}</h1>
        <p className="certificate-body">has successfully completed</p>
        <h2 className="certificate-course">{courseTitle}</h2>
        <p className="certificate-date">{dateLabel}</p>
        <p className="certificate-brand">Halcyra</p>
      </div>
    </div>
  );
}
