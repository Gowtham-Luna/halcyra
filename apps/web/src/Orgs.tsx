import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

interface Props {
  userId: string;
  userEmail: string;
  onBack: () => void;
}

interface MyOrg {
  org_id: string;
  role: "owner" | "admin" | "member";
  name: string;
}

interface Member {
  id: string;
  invited_email: string;
  role: "owner" | "admin" | "member";
  user_id: string | null;
  joined_at: string | null;
}

// Orgs/teams (no billing — see CLAUDE.md, payment collection is explicitly
// out of scope). Invites are claimed automatically on sign-in (App.tsx), not
// delivered by email — the admin has to tell the invitee some other way.
export function Orgs({ userId, userEmail, onBack }: Props) {
  const [orgs, setOrgs] = useState<MyOrg[] | null>(null);
  const [selected, setSelected] = useState<MyOrg | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOrgs() {
    const { data, error } = await supabase
      .from("org_members")
      .select("org_id, role, organizations(name)")
      .eq("user_id", userId);
    if (error) {
      setError(`Failed to load organizations: ${error.message}`);
      return;
    }
    const rows = (data as unknown as { org_id: string; role: MyOrg["role"]; organizations: { name: string } | null }[]).map(
      (r) => ({ org_id: r.org_id, role: r.role, name: r.organizations?.name ?? "Untitled org" }),
    );
    setOrgs(rows);
  }

  useEffect(() => {
    loadOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadMembers(orgId: string) {
    const { data, error } = await supabase
      .from("org_members")
      .select("id, invited_email, role, user_id, joined_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });
    if (error) setError(`Failed to load members: ${error.message}`);
    else setMembers(data);
  }

  async function createOrg() {
    const name = newOrgName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name, created_by: userId })
        .select("id")
        .single();
      if (orgError) throw new Error(orgError.message);
      const { error: memberError } = await supabase
        .from("org_members")
        .insert({ org_id: org.id, user_id: userId, invited_email: userEmail, role: "owner", joined_at: new Date().toISOString() });
      if (memberError) throw new Error(memberError.message);
      setNewOrgName("");
      await loadOrgs();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function invite() {
    if (!selected) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from("org_members")
      .insert({ org_id: selected.org_id, invited_email: email, role: "member" });
    if (error) setError(`Invite failed: ${error.message}`);
    else {
      setInviteEmail("");
      await loadMembers(selected.org_id);
    }
    setBusy(false);
  }

  async function setRole(member: Member, role: Member["role"]) {
    const { error } = await supabase.from("org_members").update({ role }).eq("id", member.id);
    if (error) setError(`Update failed: ${error.message}`);
    else if (selected) await loadMembers(selected.org_id);
  }

  async function removeMember(member: Member) {
    if (!window.confirm(`Remove ${member.invited_email} from this org?`)) return;
    const { error } = await supabase.from("org_members").delete().eq("id", member.id);
    if (error) setError(`Remove failed: ${error.message}`);
    else if (selected) await loadMembers(selected.org_id);
  }

  const canManage = selected?.role === "owner" || selected?.role === "admin";

  return (
    <div>
      <button className="link back" onClick={onBack}>← Back</button>
      <h1 className="view-lesson-heading">Teams</h1>

      {error && <p className="message error">{error}</p>}

      {!selected ? (
        <>
          <div className="generate-row">
            <input
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="New organization name"
              onKeyDown={(e) => e.key === "Enter" && createOrg()}
            />
            <button onClick={createOrg} disabled={busy || !newOrgName.trim()}>
              Create organization
            </button>
          </div>

          {orgs === null ? (
            <p className="message">Loading…</p>
          ) : orgs.length === 0 ? (
            <p className="message">You're not part of an organization yet — create one above.</p>
          ) : (
            <ul className="course-list">
              {orgs.map((org) => (
                <li key={org.org_id} className="course-item">
                  <button
                    className="course-open"
                    onClick={() => {
                      setSelected(org);
                      loadMembers(org.org_id);
                    }}
                  >
                    <span className="course-title">{org.name}</span>
                    <span className="course-meta">Your role: {org.role}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <button className="link" onClick={() => setSelected(null)}>← All teams</button>
          <h2 className="view-heading">{selected.name}</h2>

          {canManage && (
            <div className="generate-row">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Invite by email"
                onKeyDown={(e) => e.key === "Enter" && invite()}
              />
              <button onClick={invite} disabled={busy || !inviteEmail.trim()}>
                Invite
              </button>
            </div>
          )}
          <p className="message">
            Invites aren't emailed automatically — let the person know to sign in with that address; membership
            activates the next time they do.
          </p>

          {members === null ? (
            <p className="message">Loading members…</p>
          ) : (
            <div className="table-scroll">
              <table className="table-view reports-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    {canManage && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>{m.invited_email}</td>
                      <td>
                        {canManage && m.role !== "owner" ? (
                          <select value={m.role} onChange={(e) => setRole(m, e.target.value as Member["role"])}>
                            <option value="member">member</option>
                            <option value="admin">admin</option>
                          </select>
                        ) : (
                          m.role
                        )}
                      </td>
                      <td>{m.joined_at ? "Joined" : "Pending"}</td>
                      {canManage && (
                        <td>
                          {m.role !== "owner" && (
                            <button onClick={() => removeMember(m)} aria-label={`Remove ${m.invited_email}`}>
                              ✕
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
