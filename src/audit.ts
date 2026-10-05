// Append-only audit trail. Optionally mirrored to a JSONL file.
import { appendFileSync } from "node:fs";

export interface AuditEvent {
  seq: number;
  caseId: string;
  at: string;
  type: string;
  data: unknown;
}

export class AuditLog {
  #events: AuditEvent[] = [];
  #filePath: string | null;
  #clock: () => Date;

  constructor(clock: () => Date, filePath: string | null = null) {
    this.#clock = clock;
    this.#filePath = filePath;
  }

  append(caseId: string, type: string, data: unknown): AuditEvent {
    const event: AuditEvent = {
      seq: this.#events.length + 1,
      caseId,
      at: this.#clock().toISOString(),
      type,
      data: structuredClone(data),
    };
    this.#events.push(event);
    // Sync write keeps ordering simple; a failed write must not be silent.
    if (this.#filePath) appendFileSync(this.#filePath, JSON.stringify(event) + "\n");
    return event;
  }

  forCase(caseId: string): AuditEvent[] {
    return this.#events.filter((e) => e.caseId === caseId).map((e) => structuredClone(e));
  }
}
