export default {
  UserPoolAuth: {
    cognitoTokenEndpoint:
      "https://de-app.auth.us-east-2.amazoncognito.com/oauth2/token",
    clientId: "3j82gu85vg6bihjsgb6f2451dc",
    redirectUrl: "https://squid.as-test.techservices.illinois.edu:3000",
    logout: "https://de-app.auth.us-east-2.amazoncognito.com/logout?response_type=code&client_id=3j82gu85vg6bihjsgb6f2451dc&redirect_uri=https://squid.as-test.techservices.illinois.edu:3000",
    nytimes: "http://www.nytimes.com",
    cognitoAuthorizeEndpoint:
      "https://de-app.auth.us-east-2.amazoncognito.com/oauth2/authorize?response_type=code&client_id=3j82gu85vg6bihjsgb6f2451dc&redirect_uri=https://squid.as-test.techservices.illinois.edu:3000"
  }
};
