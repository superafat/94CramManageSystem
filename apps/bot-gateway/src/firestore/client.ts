import { Firestore } from '@google-cloud/firestore';
import { config } from '../config';

export const firestore = new Firestore({
  projectId: config.GCP_PROJECT_ID,
});
