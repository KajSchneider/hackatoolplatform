import { describe, it, expect } from "vitest";

describe("isTeamActive", () => {
  const isTeamActive = (startDate: Date | null, endDate: Date | null) => {
    const now = new Date();
    if (!startDate && !endDate) return true;
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    return true;
  };

  it("returns true when no dates are set", () => {
    expect(isTeamActive(null, null)).toBe(true);
  });

  it("returns true when current date is within range", () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(isTeamActive(past, future)).toBe(true);
  });

  it("returns false when hackathon hasn't started yet", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(isTeamActive(future, null)).toBe(false);
  });

  it("returns false when hackathon has ended", () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    expect(isTeamActive(null, past)).toBe(false);
  });

  it("returns false when current date is before start date", () => {
    const start = new Date();
    start.setDate(start.getDate() + 5);
    const end = new Date();
    end.setDate(end.getDate() + 10);
    expect(isTeamActive(start, end)).toBe(false);
  });

  it("returns false when current date is after end date", () => {
    const start = new Date();
    start.setDate(start.getDate() - 20);
    const end = new Date();
    end.setDate(end.getDate() - 10);
    expect(isTeamActive(start, end)).toBe(false);
  });

  it("returns true when current date equals start date", () => {
    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 10);
    expect(isTeamActive(now, end)).toBe(true);
  });

  it("returns true when current date equals end date", () => {
    const start = new Date();
    start.setDate(start.getDate() - 10);
    const now = new Date();
    expect(isTeamActive(start, now)).toBe(true);
  });
});
