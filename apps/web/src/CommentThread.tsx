import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

interface Comment {
  id: string;
  author_name: string;
  body: string;
  resolved: boolean;
  created_at: string;
}

interface Props {
  courseId: string;
  lessonId: string | null; // null = general/course-level tab
  title: string;
  /** Author view: can resolve/delete. Reviewer view: can only read + post. */
  canModerate: boolean;
  /** Reviewer's chosen display name, remembered across the review session. */
  reviewerName?: string;
}

export function CommentThread({ courseId, lessonId, title, canModerate, reviewerName }: Props) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    let query = supabase
      .from("comments")
      .select("id, author_name, body, resolved, created_at")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true });
    query = lessonId ? query.eq("lesson_id", lessonId) : query.is("lesson_id", null);
    const { data, error } = await query;
    if (error) setError(error.message);
    else setComments(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, lessonId]);

  async function post() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("comments").insert({
      course_id: courseId,
      lesson_id: lessonId,
      author_name: canModerate ? "Author" : reviewerName?.trim() || "Anonymous reviewer",
      body: trimmed,
    });
    if (error) setError(error.message);
    else {
      setBody("");
      await load();
    }
    setBusy(false);
  }

  async function toggleResolved(comment: Comment) {
    const { error } = await supabase
      .from("comments")
      .update({ resolved: !comment.resolved })
      .eq("id", comment.id);
    if (error) setError(error.message);
    else load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) setError(error.message);
    else load();
  }

  const unresolvedCount = comments?.filter((c) => !c.resolved).length ?? 0;

  return (
    <div className="comment-thread">
      <p className="comment-thread-title">
        💬 {title}
        {unresolvedCount > 0 && <span className="comment-count-badge">{unresolvedCount}</span>}
      </p>
      {error && <p className="message error">{error}</p>}
      {comments === null ? (
        <p className="message">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="message">No comments yet.</p>
      ) : (
        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c.id} className={`comment-item ${c.resolved ? "resolved" : ""}`}>
              <div className="comment-meta">
                <span className="comment-author">{c.author_name}</span>
                <span className="comment-date">{new Date(c.created_at).toLocaleString()}</span>
                {canModerate && (
                  <>
                    <button className="link" onClick={() => toggleResolved(c)}>
                      {c.resolved ? "Reopen" : "Resolve"}
                    </button>
                    <button className="link" onClick={() => remove(c.id)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
              <p className="comment-body">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="comment-compose">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={canModerate ? "Reply as the author…" : "Leave feedback…"}
          rows={2}
          maxLength={2000}
        />
        <button onClick={post} disabled={busy || !body.trim()}>
          {busy ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
