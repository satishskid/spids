import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, setLogLevel, updateDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  setLogLevel("error");
  testEnv = await initializeTestEnvironment({
    projectId: "demo-skids-parent",
    firestore: {
      rules: readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8")
    }
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("firestore rules", () => {
  it("allows a parent to write and read own user document", async () => {
    const db = testEnv.authenticatedContext("parentA").firestore();
    await assertSucceeds(setDoc(doc(db, "users/parentA"), { name: "Parent A" }));
    await assertSucceeds(getDoc(doc(db, "users/parentA")));
  });

  it("blocks cross-user reads", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/parentA"), { name: "Parent A" });
    });

    const db = testEnv.authenticatedContext("parentB").firestore();
    await assertFails(getDoc(doc(db, "users/parentA")));
  });

  it("enforces single-child id == parent uid", async () => {
    const db = testEnv.authenticatedContext("parentA").firestore();

    await assertSucceeds(
      setDoc(doc(db, "children/parentA"), {
        parentId: "parentA",
        ageMonths: 36,
        createdAt: "2026-02-18T00:00:00.000Z"
      })
    );

    await assertFails(
      setDoc(doc(db, "children/not-parentA"), {
        parentId: "parentA",
        ageMonths: 36,
        createdAt: "2026-02-18T00:00:00.000Z"
      })
    );
  });

  it("enforces child ownership consistency in observations", async () => {
    const db = testEnv.authenticatedContext("parentA").firestore();

    await assertSucceeds(
      setDoc(doc(db, "observations/obs-ok"), {
        parentId: "parentA",
        childId: "parentA",
        createdAt: "2026-02-18T00:00:00.000Z"
      })
    );

    await assertFails(
      setDoc(doc(db, "observations/obs-bad"), {
        parentId: "parentA",
        childId: "someone-else",
        createdAt: "2026-02-18T00:00:00.000Z"
      })
    );
  });

  it("allows public read for milestone content", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "milestones/motor_36"), {
        domain: "motor",
        milestone_title: "Sample"
      });
    });

    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "milestones/motor_36")));
  });

  it("keeps screening credentials immutable after create", async () => {
    const db = testEnv.authenticatedContext("parentA").firestore();

    await assertSucceeds(
      setDoc(doc(db, "screeningCredentials/cred1"), {
        parentId: "parentA",
        childId: "parentA",
        version: "1.0",
        timestamp: "2026-02-18T00:00:00.000Z"
      })
    );

    await assertFails(
      updateDoc(doc(db, "screeningCredentials/cred1"), {
        version: "2.0"
      })
    );
  });
});
