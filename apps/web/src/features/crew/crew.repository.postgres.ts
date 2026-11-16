import type { Pool } from "pg";

import { fullName, generateCrewVitals, pickTitle } from "./crew.generate.ts";
import { memberIdForUser } from "./crew.member-id.ts";
import type { CrewRepository, NewCrewMember } from "./crew.repository.ts";
import { crewMemberSchema } from "./crew.schema.ts";
import type { CrewMember } from "./crew.types.ts";

type Row = {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  vitals: unknown;
  history: unknown;
  cumulative_dose_msv: number;
  last_check_in: Date;
};

const COLUMNS = "id, first_name, last_name, title, vitals, history, cumulative_dose_msv, last_check_in";

function toMember(row: Row): CrewMember {
  return crewMemberSchema.parse({
    id: row.id,
    name: fullName(row.first_name, row.last_name),
    role: row.title,
    vitals: row.vitals,
    history: row.history,
    cumulativeDoseMsv: row.cumulative_dose_msv,
    lastCheckIn: row.last_check_in.toISOString(),
  });
}

export function createPostgresCrewRepository(pool: Pool): CrewRepository {
  async function getByUser(userId: string): Promise<CrewMember | null> {
    const { rows } = await pool.query<Row>(`select ${COLUMNS} from crew_members where clerk_user_id = $1`, [userId]);
    return rows[0] ? toMember(rows[0]) : null;
  }

  return {
    list: async () => {
      const { rows } = await pool.query<Row>(`select ${COLUMNS} from crew_members order by created_at, id`);
      return rows.map(toMember);
    },
    get: async (id) => {
      const { rows } = await pool.query<Row>(`select ${COLUMNS} from crew_members where id = $1`, [id]);
      return rows[0] ? toMember(rows[0]) : null;
    },
    getByUser,
    ensure: async (input: NewCrewMember) => {
      const existing = await getByUser(input.userId);
      if (existing) return existing;
      const generated = generateCrewVitals(input.userId, input.role, new Date());
      await pool.query(
        `insert into crew_members
           (id, clerk_user_id, first_name, last_name, app_role, title, profile, vitals, history, cumulative_dose_msv, last_check_in)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         on conflict (clerk_user_id) do nothing`,
        [
          memberIdForUser(input.userId),
          input.userId,
          input.firstName.trim(),
          input.lastName.trim(),
          input.role,
          pickTitle(input.userId, input.role),
          JSON.stringify(generated.profile),
          JSON.stringify(generated.vitals),
          JSON.stringify(generated.history),
          generated.cumulativeDoseMsv,
          generated.lastCheckIn,
        ],
      );
      const created = await getByUser(input.userId);
      if (!created) throw new Error("Could not create the crew member");
      return created;
    },
  };
}
