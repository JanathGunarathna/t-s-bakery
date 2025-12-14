import { initializeApp } from "firebase/app";
import { getFirestore} from "@firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBIBHGEr8FzncJdx25SW7oScsOODasIhhE",
  authDomain: "t-and-s-bakery.firebaseapp.com",
  projectId: "t-and-s-bakery",
  storageBucket: "t-and-s-bakery.firebasestorage.app",
  messagingSenderId: "128633583907",
  appId: "1:128633583907:web:2f32fe2980535e2748b496"
};


const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);