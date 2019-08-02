/*
Module for handling low-level details of authentication with Cognito.

To understand Amazon Cognito user pool OAuth 2.0 grants refer:
https://aws.amazon.com/blogs/mobile/understanding-amazon-cognito-user-pool-oauth-2-0-grants/
https://docs.aws.amazon.com/cognito/latest/developerguide/token-endpoint.html
*/

import decode from 'jwt-decode';

export default class AuthService {

    // Store config object locally
    constructor (config) {
        this.config = config;
    }

    // if this method is going to be here, it needs to RETURN
    // the remote_user (and later, the groups if we do that)
    // and then the WithAuth will update state based on that.
    // Could return this in a promise, with WithAuth calling
    // authService.authenticate(code).then(setState{remote_user...})
    authenticate = async (oauthCode) => {
        let idToken = null;
  
        console.log('CALLING AuthService.authenticate()');
        console.log("AuthService.loggedIn: ", this.isLoggedIn());
  
        // if (! this.state.remoteUser) 
        // if (!authService.isLoggedIn())
        if (! this.isLoggedIn()) {
            console.log('AuthService.authenticate: isLoggedIn is false');

            // Code (obtained from Shibboleth) was sent in. WithAuth
            // should not call us if it didn't get a code. If code
            // is missing or bad, presumably Cognito will barf nicely.
            console.log('AuthService.authenticate: code from URL sent in is:', oauthCode);

            console.log('AuthService.authenticate: swap auth for token with Cognito');
            idToken = await this.login(oauthCode);
            console.log('GOT NEW ID_TOKEN:', idToken);

            // TODO: can decode() throw exceptions?  how to handle?
            // if the user manipulated the url to have an arbitrary code,
            // what will happen?
            // If this returns a promise now, can have a .err() on
            // the WithAuth caller, to nuke the state.
            console.log('DECODING TOKEN');
            const decodedIdToken = decode(idToken);
            if (decodedIdToken.profile) {
                console.log("DECODED IT OKAY");
                console.log('decodedIdToken', decodedIdToken);
                // Items returned here will come back in a promise
                return {
                    remoteUser: decodedIdToken.profile,
                    status: 'success'
                }
            }
            else {
                console.log("GOT EMPTY PROFILE");
                return {
                    remoteUser: '',
                    status: 'error'
                }
            }
        }
        else {
            console.log('AuthService.authenticate: Already logged in.)');
            idToken = this.getIdToken();
            console.log('GOT OLD TOKEN: ', idToken);
            console.log('DECODING TOKEN');
            const decodedIdToken = decode(idToken);

            if (decodedIdToken.profile) {
                console.log("DECODED IT OKAY");
                console.log('decodedIdToken', decodedIdToken);
                // Items returned here will come back in a promise
                return {
                    remoteUser: decodedIdToken.profile,
                    status: 'success'
                }
            }
            else {
                console.log("GOT EMPTY PROFILE");
                return {
                    remoteUser: '',
                    status: 'error'
                }
            }
        }
    }

    /************************************** */

    // Perform the actual login to Cognito.
    login = async (code) => {
        const clientId = this.config.UserPoolAuth.clientId;
        const redirectUrl = this.config.UserPoolAuth.redirectUrl;
        const cognitoTokenEndpoint = this.config.UserPoolAuth.cognitoTokenEndpoint;

        // Exchange code for a token from Cognito, using the fetch API
        const res = await this.fetchTokenFromCognito(
            code, clientId, redirectUrl, cognitoTokenEndpoint);
        // Save the returned tokens in localStorage
        this.setToken(await res); 

        // Return the retrieved token
        return Promise.resolve(this.getIdToken());
    }

    // True if have valid Cognito tokens, false if not
    isLoggedIn = () => {
        // get token from localStorage
        const id_token = this.getIdToken() 

        // we're good if it exists and isn't expired yet
        return !!id_token && !this.isTokenExpired(id_token);
    }

    // True if id_token is missing, broken, or expired
    isTokenExpired = id_token => {
        try {
            const decoded = decode(id_token);

            // Checking if id_token is expired 
            return decoded.exp < (Date.now() / 1000)
        }
        catch (err) {
            // if token can't be decoded, then consider it is expired
            return true;
        }
    }

    // Save user tokens to localStorage
    setToken = token => {
        localStorage.setItem('id_token', token.id_token);
        localStorage.setItem('access_token', token.access_token);
        localStorage.setItem('refresh_token', token.refresh_token);
    }

    // Retrieve the user id_token from localStorage
    getIdToken = () => {
        return localStorage.getItem('id_token');
    }

    // Retrieve the user access_token from localStorage
    getAccessToken = () => {
        return localStorage.getItem('access_token');
    }

    // Retrieve the user refresh_token from localStorage
    getRefreshToken = () => {
        return localStorage.getItem('refresh_token');
    }

    // TODO: Should this be "clearToken" and then logout both
    // call this and redirect to the Cognito endpoint?

    // Clear all user tokens and profile data from localStorage
    // Do we need this, or does cognito handle it?
    logout = () => {
        console.log('HEY HEY at top of logout()');
        localStorage.removeItem('id_token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }

    // Get profile from the stored user token
    getProfile = () => {
        // Using jwt-decode npm package to decode the token
        return decode(this.getIdToken());
    }

    // Swap the code we got from Shib for a token from Cognito
    fetchTokenFromCognito = (code, clientId, redirectUrl, cognitoTokenEndpoint) => {
        // Prepare data to call Cognito 
        const data = `grant_type=authorization_code&client_id=${
            clientId}&redirect_uri=${redirectUrl}&code=${code}`;
        console.log('authService.fetchTokenFromCognito.data is:', data);
        return fetch(cognitoTokenEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: data
        })
            .then(this.checkStatus)
            .then(response => response.json())
    }


    // Raise an error in case response status from Cognito is not success
    checkStatus = response => {
        // Success codes are all in 200 range
        if (response.status >= 200 && response.status < 300) { 
            return response
        } 
        else {
            const error = new Error(`Response code:${response.status}, ${response.statusText}`);
            error.response = response;
            throw error;
        }
    }
}
