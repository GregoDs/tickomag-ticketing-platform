const fs = require("fs");
const path = require("path");
const { FieldValue } = require("firebase-admin/firestore");
const events = require("../data/events");

const projectConfigPath = path.resolve(__dirname, "../../.firebaserc");
const localKeyPath = path.resolve(__dirname, "../serviceAccountKey.json");

if (!process.env.GCLOUD_PROJECT && !process.env.GOOGLE_CLOUD_PROJECT) {
  const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, "utf8"));
  process.env.GCLOUD_PROJECT = projectConfig.projects.default;
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(localKeyPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = localKeyPath;
}

const { db } = require("../services/firebase.service");

async function seedEvents() {
  const batch = db.batch();
  events.forEach(({ id, ...event }) => {
    batch.set(db.collection("events").doc(id), {
      ...event,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  await batch.commit();
  console.log(`Seeded ${events.length} events.`);
}

seedEvents().then(() => process.exit(0)).catch((error) => {
  console.error("Event seed failed:", error);
  if (String(error.message).toLowerCase().includes("credential")) {
    console.error(
      "Authenticate with Application Default Credentials, or place an ignored " +
      "serviceAccountKey.json file in the functions directory."
    );
  }
  process.exit(1);
});
