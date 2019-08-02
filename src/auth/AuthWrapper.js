import React, { Component } from "react";
import { BrowserRouter, Route, Redirect, Switch } from "react-router-dom";

// TODO: How to make a new AuthService obj from the class?
// Or should we instantiate one and pass it in? The latter?
// then index.js has to:
// const authModule = new AuthService(config);
// const WrappedApp = withAuthentication(App, authModule);
// Then, just instantiate a WrappedApp instead of App:
// ReactDOM.render(<WrappedApp foo=bar />, document.getElementById("root"));

/********************************************** */

function withAuthentication(WrappedComponent, authModule) {
    // stuff
    return class extends Component {

        constructor(props) {
            super(props);
            // have waiting_on_login so we can know whether to
            // redirect (to shib, etc) or to just print nothing 
            // (when waiting for async login to finish)? if so,
            // right before we start login we'd set waiting to true,
            // then clear when done. Alternatively we can set
            // something in the authModule and test that?
            this.state = {
                remoteUser: '',
                accessToken: '',
                error: false
            }
        }

        getOauthCodeFromCurrentURL = () => {
            const urlParts = window.location.href.split('code=');
            if (urlParts.length === 2) {
                return urlParts[1];
            }
            return '';
        }

        renderWrappedComponentAndStatusBar = props => {
            // IF ERROR: bail out immediately (logout)
            if (this.state.error) {
                return (
                    <Redirect to={{ pathname: '/logout' }} />
                )
            }

            // IF NOT LOGGED IN (NO REMOTEUSER): ATTEMPT TO LOGIN
            const oauthCode = this.getOauthCodeFromCurrentURL();

            // if have oathCode, we've been to Shibboleth.
            if (oauthCode) {

                // if no remote_user is set, or if the authModule
                // is not logged in, call the authModule to get 
                // the remoteUser.
                // This will either return remoteUser from local storage
                // (if authModule is logged in but we just lost the
                // remoteUser for some reason) or will go out to 
                // Cognito to get fresh tokens and a new remoteUser (if
                // the authModule isn't logged in).
                if ((!this.state.remoteUser) ||
                    (!authModule.isLoggedIn())) {
                    console.log('Not logged in (no token), must authenticate');
                    authModule.authenticate(oauthCode)
                        .then(results => {
                            console.log('AuthWrapper.authenticate: STATUS of LOGIN response is:', results.status)
                            if (results.status === 'success') {
                                console.log('AuthWrapper.authenticate: SETTING REMOTE USER to', results.remote_user)
                                this.setState({
                                    remoteUser: results.remoteUser,
                                    accessToken: authModule.getAccessToken(),
                                    error: false
                                });
                            }
                            else {
                                this.setState({
                                    remoteUser: '',
                                    error: true
                                });
                            }
                        })
                        .catch(err => {
                            this.setState({
                                remoteUser: '',
                                error: true
                            });
                        })
                    // This code executes WHILE the asynchronous
                    // auth call is out doing its thing. We have no
                    // valid remoteUser at this point. Render
                    // nothing or "Loading..." or spinner, or?
                    return (null);
                }

                // This code executes if we had oauthCode AND
                // are already logged in. 
                return (
                    <>
                    <div className='status-bar'>Logged in as: {this.state.remoteUser} <a href='/logout'>Logout</a></div>
                    <WrappedComponent remoteUser={this.state.remoteUser} accessToken={this.state.accessToken} {...this.props} />
                    </>
                );
                // TODO: Also want to render a <div status bar>
                // which should have a "logged in as..." area and
                // a logout button. 
            }

            // if no oathCode we've not even been to Shibboleth yet,
            // so redirect the user there.
            else {
                return (
                    <Redirect to={{ pathname: '/login' }} />
                )
            }
        }

        render() {
            // return either <App... or else some redirects
            // also if we render app, print the frame with our ID
            // and the logout button on it
            return (
                <BrowserRouter>
                  <Switch>
                    <Route path='/login' component={() => {
                      window.location.href = authModule.config.UserPoolAuth.cognitoAuthorizeEndpoint;
                      return null;
                    }} />
                    <Route path='/logout' component={() => {
                      window.location.href = authModule.config.UserPoolAuth.logout;
                      return null;
                    }} />
                    <Route render={this.renderWrappedComponentAndStatusBar} />
                  </Switch>
                </BrowserRouter>
            );
        }
    }
}

export default withAuthentication;
