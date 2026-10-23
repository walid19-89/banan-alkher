import { describe, expect, it } from "vitest";
import { createDemoSupabase, DEMO_WRITE_MSG } from "@/lib/demo";

describe("demo table builder", () => {
  const client = createDemoSupabase(() => {
    throw new Error("real client must not be created in demo");
  });

  it("returns mock rows for reads", async () => {
    const res = await client.from("fund_members").select("*").order("member_no");
    expect(res.error).toBeNull();
    expect(Array.isArray(res.data)).toBe(true);
    expect((res.data as unknown[]).length).toBeGreaterThan(3);
  });

  it("supports single() and maybeSingle()", async () => {
    const one = await client.from("fund_settings").select("*").limit(1).single();
    expect(one.error).toBeNull();
    expect((one.data as { fund_name: string }).fund_name).toContain("بنان");

    const prof = await client.from("fund_user_profiles").select("*").eq("user_id", "u1").maybeSingle();
    expect((prof.data as { user_id: string }).user_id).toBe("u1");
  });

  it("rejects writes with the demo message", async () => {
    const res = await client.from("fund_members").insert({ full_name: "x" });
    expect(res.error !== null).toBe(true);
    expect(res.error && res.error.message).toBe(DEMO_WRITE_MSG);
    const upd = await client.from("fund_members").update({ full_name: "x" }).eq("id", "m1");
    expect(upd.error !== null).toBe(true);
    expect(upd.error && upd.error.message).toBe(DEMO_WRITE_MSG);
  });

  it("serves rpc summary and branding, blocks rpc mutations", async () => {
    const client = createDemoSupabase(() => {
      throw new Error("real client must not be created in demo");
    });
    const sum = await client.rpc("fund_summary");
    expect(sum.error).toBeNull();
    expect((sum.data as { cash_balance: number }).cash_balance).toBeGreaterThan(0);

    const brand = await client.rpc("fund_public_branding");
    expect((brand.data as { fund_name: string }).fund_name).toContain("بنان");

    const pay = await client.rpc("fund_pay_subscription");
    expect(pay.error !== null).toBe(true);
    expect(pay.error && pay.error.message).toBe(DEMO_WRITE_MSG);
  });

  it("demo auth resolves an admin user without network", async () => {
    const client = createDemoSupabase(() => {
      throw new Error("real client must not be created in demo");
    });
    const { data } = await client.auth.getUser();
    expect(data.user?.id).toBe("u1");
    const out = await client.auth.signOut();
    expect(out.error).toBeNull();
  });

  it("storage uploads are blocked with demo message", async () => {
    const client = createDemoSupabase(() => {
      throw new Error("real client must not be created in demo");
    });
    const res = await client.storage.from("fund-documents").upload("x/y.png", new Blob());
    expect(res.error !== null).toBe(true);
    expect(res.error && res.error.message).toBe(DEMO_WRITE_MSG);
  });
});
