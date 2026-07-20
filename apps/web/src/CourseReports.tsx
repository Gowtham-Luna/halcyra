import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

interface Enrollment {
  learner_id: string;
  learner_email: string;
  enrolled_at: string;
}

interface Props {
  courseId: string;
  totalLessons: number;
}

// Author-side reporting: who's enrolled (self-enrolled by signing in on the
// public share link — see SharePlayer) and how far they've gotten. Lite by
// design: no groups/cohorts, just a per-learner completion rollup.
export function CourseReports({ courseId, totalLessons }: Props) {
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [completedCounts, setCompletedCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [enrollRes, completionsRes] = await Promise.all([
        supabase
          .from("enrollments")
          .select("learner_id, learner_email, enrolled_at")
          .eq("course_id", courseId)
          .order("enrolled_at", { ascending: false }),
        supabase.from("completions").select("learner_id").eq("course_id", courseId),
      ]);
      if (enrollRes.error) {
        setError(`Failed to load reports: ${enrollRes.error.message}`);
        return;
      }
      if (completionsRes.error) {
        setError(`Failed to load reports: ${completionsRes.error.message}`);
        return;
      }
      const counts: Record<string, number> = {};
      for (const row of completionsRes.data) {
        counts[row.learner_id] = (counts[row.learner_id] ?? 0) + 1;
      }
      setCompletedCounts(counts);
      setEnrollments(enrollRes.data);
    }
    load();
  }, [courseId]);

  if (error) return <p className="message error">{error}</p>;
  if (enrollments === null) return <p className="message">Loading reports…</p>;
  if (enrollments.length === 0) {
    return (
      <p className="message">
        No learners yet — enrollment happens automatically when someone signs in on your course's public
        share link.
      </p>
    );
  }

  return (
    <div className="table-scroll">
      <table className="table-view reports-table">
        <thead>
          <tr>
            <th>Learner</th>
            <th>Enrolled</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map((e) => {
            const done = completedCounts[e.learner_id] ?? 0;
            const pct = totalLessons > 0 ? Math.round((done / totalLessons) * 100) : 0;
            return (
              <tr key={e.learner_id}>
                <td>{e.learner_email}</td>
                <td>{new Date(e.enrolled_at).toLocaleDateString()}</td>
                <td>
                  <div className="reports-progress">
                    <div className="player-progress-bar reports-progress-bar">
                      <div className="player-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span>
                      {pct}% ({done}/{totalLessons})
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
