import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

const SOURCES = {
  payments: "mpesaPayments",
  tickets: "tickets",
  requests: "ticketRequests",
  scans: "ticketScans",
};

export function subscribeToOperations(onData, onError) {
  const data = {
    payments: [],
    tickets: [],
    requests: [],
    scans: [],
  };
  const loaded = new Set();

  const unsubscribers = Object.entries(SOURCES).map(([key, collectionName]) =>
    onSnapshot(collection(db, collectionName), (snapshot) => {
      data[key] = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));
      loaded.add(key);
      onData({
        ...data,
        loading: loaded.size !== Object.keys(SOURCES).length,
        updatedAt: new Date(),
      });
    }, (error) => onError(error, collectionName))
  );

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
