const admin = require("firebase-admin");

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;

admin.initializeApp(projectId ? { projectId } : undefined);

const db = admin.firestore();

module.exports = {
  admin,
  db,
};
