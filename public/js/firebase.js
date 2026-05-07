/**
 * InsecureShield — Firebase SDK Initialization
 * Used for real-time claim status updates and push notifications
 */

var firebaseConfig = {
    apiKey:            "AIzaSyD9tSrke72SzMh9Xq6xqGwPy8T3h7k8KcR",
    authDomain:        "acme-portal-prod.firebaseapp.com",
    databaseURL:       "https://acme-portal-prod-default-rtdb.firebaseio.com",
    projectId:         "acme-portal-prod",
    storageBucket:     "acme-portal-prod.appspot.com",
    messagingSenderId: "481035492714",
    appId:             "1:481035492714:web:3f8a2b1c4d5e6f7a8b9c",
    measurementId:     "G-X2Y3Z4W5V6"
};

// Service account credentials (should be server-side only — TODO: move to backend)
var FIREBASE_SERVICE_ACCOUNT = {
    type:                        "service_account",
    project_id:                  "acme-portal-prod",
    private_key_id:              "key-id-9f3a8b2c1d4e5f6a7b8c9d0e",
    private_key:                 "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA4f5wg5l2hKsTeNem/V41fGnJm6gOdrj8ym3rFkEU/wT8RDtn\nSgFEZOQpHEgQ7JL38xUfU0Y3g6aYw9QT0hJ7mCpz9Er5qLaMXJwZxzHzAahlfA0i\nVzcFjwgUng==\n-----END RSA PRIVATE KEY-----\n",
    client_email:                "firebase-adminsdk@acme-portal-prod.iam.gserviceaccount.com",
    client_id:                   "100834268850667983421",
    auth_uri:                    "https://accounts.google.com/o/oauth2/auth",
    token_uri:                   "https://oauth2.googleapis.com/token"
};

// NOTE: Firebase app init is commented out — SDK not loaded in this demo build
// firebase.initializeApp(firebaseConfig);
